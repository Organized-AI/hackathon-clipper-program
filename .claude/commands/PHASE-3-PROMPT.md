# Phase 3: Submission Workflow Engine

**Phase:** 3 of 6  
**Name:** Submission Workflow  
**Dependencies:** Phase 2 (Campaign Management)

---

## Context

This phase implements the core submission workflow - the heart of any clipper program. Clippers submit content URLs, and this service manages the approval/rejection flow with automatic payout calculation.

---

## Whop API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `list_entries` | Get pending submissions |
| `retrieve_entries` | Get submission details |
| `approve_entries` | Accept and trigger payout |
| `deny_entries` | Reject with reason |

---

## Tasks

### Task 1: Create Submission Service

Create `src/services/submission-service.ts`:

```typescript
import { getWhopClient, createLogger, config } from '../lib/index.js';
import { 
  Submission, 
  SubmissionSchema, 
  PayoutCalculation,
  calculatePayout,
  meetsMinimumThreshold 
} from '../types/clipper.js';

const logger = createLogger('SubmissionService');

// Whop Entry Types
interface WhopEntry {
  id: string;
  experience_id: string;
  user: {
    id: string;
    username: string;
    email?: string;
  };
  status: 'pending' | 'approved' | 'denied' | 'flagged';
  content_url?: string;
  view_count?: number;
  platform?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

interface ApprovalResult {
  entryId: string;
  status: 'approved' | 'denied';
  payout?: PayoutCalculation;
  reason?: string;
}

export interface SubmissionFilters {
  status?: 'pending' | 'approved' | 'denied' | 'flagged';
  experienceId?: string;
  userId?: string;
  cursor?: string;
  limit?: number;
}

export class SubmissionService {
  private client = getWhopClient();

  /**
   * List submissions with optional filters
   */
  async listSubmissions(filters?: SubmissionFilters): Promise<{
    submissions: Submission[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    logger.debug('Listing submissions', filters);

    const query: Record<string, string | number> = {
      per_page: filters?.limit ?? 20,
    };

    if (filters?.status) query.status = filters.status;
    if (filters?.experienceId) query.experience_id = filters.experienceId;
    if (filters?.userId) query.user_id = filters.userId;
    if (filters?.cursor) query.after = filters.cursor;

    const response = await this.client.get<WhopEntry[]>('/entries', query);
    
    const submissions = response.data.map(this.mapEntryToSubmission);

    return {
      submissions,
      hasMore: response.pageInfo?.hasNextPage ?? false,
      nextCursor: response.pageInfo?.endCursor,
    };
  }

  /**
   * Get a single submission by ID
   */
  async getSubmission(entryId: string): Promise<Submission> {
    logger.debug('Fetching submission', { entryId });
    
    const response = await this.client.get<WhopEntry>(`/entries/${entryId}`);
    return this.mapEntryToSubmission(response.data);
  }

  /**
   * Approve a submission and calculate payout
   */
  async approveSubmission(
    entryId: string,
    options: {
      cpmRate: number;
      flatFee?: number;
      maxCap?: number;
      viewCount: number;
    }
  ): Promise<ApprovalResult> {
    logger.info('Approving submission', { entryId, viewCount: options.viewCount });

    // Check minimum threshold
    if (!meetsMinimumThreshold(
      options.viewCount, 
      options.cpmRate, 
      config.clipper.minPayoutThreshold
    )) {
      logger.warn('Submission below minimum threshold', { 
        entryId, 
        viewCount: options.viewCount,
        threshold: config.clipper.minPayoutThreshold
      });
    }

    // Calculate payout
    const payout = calculatePayout(
      options.viewCount,
      options.cpmRate,
      options.flatFee ?? 0,
      options.maxCap ?? config.clipper.maxPayoutCap
    );

    // Call Whop API to approve
    await this.client.post(`/entries/${entryId}/approve`, {
      payout_amount: payout.cappedAmount,
      metadata: {
        views: options.viewCount,
        cpm_rate: options.cpmRate,
        flat_fee: options.flatFee ?? 0,
        calculated_amount: payout.calculatedAmount,
        capped: payout.calculatedAmount !== payout.cappedAmount,
      },
    });

    logger.info('Submission approved', { 
      entryId, 
      payout: payout.cappedAmount 
    });

    return {
      entryId,
      status: 'approved',
      payout,
    };
  }

  /**
   * Reject a submission with reason
   */
  async rejectSubmission(
    entryId: string, 
    reason: string
  ): Promise<ApprovalResult> {
    logger.info('Rejecting submission', { entryId, reason });

    await this.client.post(`/entries/${entryId}/deny`, {
      reason,
    });

    logger.info('Submission rejected', { entryId });

    return {
      entryId,
      status: 'denied',
      reason,
    };
  }

  /**
   * Bulk approve pending submissions (with review)
   */
  async bulkReview(
    experienceId: string,
    options: {
      cpmRate: number;
      flatFee?: number;
      maxCap?: number;
      autoApproveUnflagged?: boolean;
    }
  ): Promise<{
    approved: ApprovalResult[];
    flagged: Submission[];
    rejected: ApprovalResult[];
    errors: { entryId: string; error: string }[];
  }> {
    logger.info('Starting bulk review', { experienceId });

    const { submissions } = await this.listSubmissions({
      experienceId,
      status: 'pending',
      limit: 100,
    });

    const results = {
      approved: [] as ApprovalResult[],
      flagged: [] as Submission[],
      rejected: [] as ApprovalResult[],
      errors: [] as { entryId: string; error: string }[],
    };

    for (const submission of submissions) {
      try {
        // Check if flagged
        if (submission.status === 'flagged') {
          results.flagged.push(submission);
          continue;
        }

        // Auto-approve if enabled and meets criteria
        if (options.autoApproveUnflagged && submission.viewCount > 0) {
          const result = await this.approveSubmission(submission.id, {
            cpmRate: options.cpmRate,
            flatFee: options.flatFee,
            maxCap: options.maxCap,
            viewCount: submission.viewCount,
          });
          results.approved.push(result);
        }
      } catch (error) {
        results.errors.push({
          entryId: submission.id,
          error: (error as Error).message,
        });
      }
    }

    logger.info('Bulk review complete', {
      approved: results.approved.length,
      flagged: results.flagged.length,
      errors: results.errors.length,
    });

    return results;
  }

  /**
   * Get submission statistics for a campaign
   */
  async getStats(experienceId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    flagged: number;
    totalViews: number;
    totalPayout: number;
  }> {
    logger.debug('Getting submission stats', { experienceId });

    // Fetch all submissions (paginated)
    let allSubmissions: Submission[] = [];
    let cursor: string | undefined;
    
    do {
      const { submissions, hasMore, nextCursor } = await this.listSubmissions({
        experienceId,
        cursor,
        limit: 100,
      });
      allSubmissions = allSubmissions.concat(submissions);
      cursor = hasMore ? nextCursor : undefined;
    } while (cursor);

    const stats = {
      total: allSubmissions.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      flagged: 0,
      totalViews: 0,
      totalPayout: 0,
    };

    allSubmissions.forEach(s => {
      stats[s.status as keyof typeof stats]++;
      stats.totalViews += s.viewCount;
      if (s.payoutAmount) {
        stats.totalPayout += s.payoutAmount;
      }
    });

    return stats;
  }

  /**
   * Map Whop entry to our Submission type
   */
  private mapEntryToSubmission(entry: WhopEntry): Submission {
    return SubmissionSchema.parse({
      id: entry.id,
      campaignId: entry.experience_id,
      clipperId: entry.user.id,
      clipperUsername: entry.user.username,
      platform: entry.platform ?? 'unknown',
      contentUrl: entry.content_url ?? '',
      viewCount: entry.view_count ?? 0,
      status: entry.status === 'denied' ? 'rejected' : entry.status,
      submittedAt: new Date(entry.created_at),
      payoutAmount: entry.metadata?.payout_amount as number | undefined,
    });
  }
}

// Singleton
let serviceInstance: SubmissionService | null = null;

export function getSubmissionService(): SubmissionService {
  if (!serviceInstance) {
    serviceInstance = new SubmissionService();
  }
  return serviceInstance;
}
```

### Task 2: Create Submission Queue Processor

Create `src/services/queue-processor.ts`:

```typescript
import { getSubmissionService } from './submission-service.js';
import { createLogger, config } from '../lib/index.js';

const logger = createLogger('QueueProcessor');

interface QueueConfig {
  experienceId: string;
  cpmRate: number;
  flatFee?: number;
  maxCap?: number;
  batchSize: number;
  intervalMs: number;
}

export class QueueProcessor {
  private service = getSubmissionService();
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  async start(queueConfig: QueueConfig): Promise<void> {
    if (this.isRunning) {
      logger.warn('Queue processor already running');
      return;
    }

    logger.info('Starting queue processor', { 
      experienceId: queueConfig.experienceId,
      intervalMs: queueConfig.intervalMs 
    });

    this.isRunning = true;

    // Process immediately, then on interval
    await this.processQueue(queueConfig);

    this.intervalId = setInterval(
      () => this.processQueue(queueConfig),
      queueConfig.intervalMs
    );
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    logger.info('Queue processor stopped');
  }

  private async processQueue(config: QueueConfig): Promise<void> {
    logger.debug('Processing queue batch');

    try {
      const { submissions } = await this.service.listSubmissions({
        experienceId: config.experienceId,
        status: 'pending',
        limit: config.batchSize,
      });

      if (submissions.length === 0) {
        logger.debug('No pending submissions');
        return;
      }

      logger.info(`Processing ${submissions.length} submissions`);

      for (const submission of submissions) {
        try {
          // Skip flagged submissions
          if (submission.status === 'flagged') {
            logger.debug('Skipping flagged submission', { id: submission.id });
            continue;
          }

          // Check auto-approve eligibility
          const hoursOld = (Date.now() - submission.submittedAt.getTime()) / (1000 * 60 * 60);
          
          if (hoursOld >= config.clipper.autoApproveHours) {
            await this.service.approveSubmission(submission.id, {
              cpmRate: config.cpmRate,
              flatFee: config.flatFee,
              maxCap: config.maxCap,
              viewCount: submission.viewCount,
            });
          }
        } catch (error) {
          logger.error('Failed to process submission', error as Error, {
            submissionId: submission.id,
          });
        }
      }
    } catch (error) {
      logger.error('Queue processing failed', error as Error);
    }
  }
}

export function createQueueProcessor(): QueueProcessor {
  return new QueueProcessor();
}
```

### Task 3: Add Submission CLI Commands

Create `src/cli/submission-cli.ts`:

```typescript
import { getSubmissionService } from '../services/submission-service.js';
import { logger } from '../lib/index.js';

const service = getSubmissionService();

export async function listPendingCommand(experienceId: string): Promise<void> {
  try {
    const { submissions, hasMore } = await service.listSubmissions({
      experienceId,
      status: 'pending',
      limit: 20,
    });

    console.log(`\n📋 Pending Submissions (${submissions.length}):\n`);

    if (submissions.length === 0) {
      console.log('No pending submissions.');
      return;
    }

    submissions.forEach((s, i) => {
      console.log(`${i + 1}. @${s.clipperUsername ?? 'unknown'}`);
      console.log(`   Platform: ${s.platform}`);
      console.log(`   Views: ${s.viewCount.toLocaleString()}`);
      console.log(`   URL: ${s.contentUrl}`);
      console.log(`   ID: ${s.id}`);
      console.log('');
    });

    if (hasMore) {
      console.log('(More submissions available)');
    }
  } catch (error) {
    logger.error('Failed to list submissions', error as Error);
    process.exit(1);
  }
}

export async function approveCommand(
  entryId: string,
  viewCount: number,
  cpmRate: number
): Promise<void> {
  try {
    const result = await service.approveSubmission(entryId, {
      cpmRate,
      viewCount,
    });

    console.log('\n✅ Submission Approved!\n');
    console.log(`Entry ID: ${result.entryId}`);
    console.log(`Views: ${result.payout?.views.toLocaleString()}`);
    console.log(`Payout: $${result.payout?.cappedAmount.toFixed(2)}`);
    
    if (result.payout?.calculatedAmount !== result.payout?.cappedAmount) {
      console.log(`(Capped from $${result.payout?.calculatedAmount.toFixed(2)})`);
    }
  } catch (error) {
    logger.error('Failed to approve', error as Error);
    process.exit(1);
  }
}

export async function rejectCommand(
  entryId: string,
  reason: string
): Promise<void> {
  try {
    const result = await service.rejectSubmission(entryId, reason);

    console.log('\n❌ Submission Rejected\n');
    console.log(`Entry ID: ${result.entryId}`);
    console.log(`Reason: ${result.reason}`);
  } catch (error) {
    logger.error('Failed to reject', error as Error);
    process.exit(1);
  }
}

export async function statsCommand(experienceId: string): Promise<void> {
  try {
    const stats = await service.getStats(experienceId);

    console.log('\n📊 Campaign Statistics:\n');
    console.log(`Total Submissions: ${stats.total}`);
    console.log(`  Pending: ${stats.pending}`);
    console.log(`  Approved: ${stats.approved}`);
    console.log(`  Rejected: ${stats.rejected}`);
    console.log(`  Flagged: ${stats.flagged}`);
    console.log('');
    console.log(`Total Views: ${stats.totalViews.toLocaleString()}`);
    console.log(`Total Payout: $${stats.totalPayout.toFixed(2)}`);
  } catch (error) {
    logger.error('Failed to get stats', error as Error);
    process.exit(1);
  }
}
```

### Task 4: Update Services Index

Update `src/services/index.ts`:

```typescript
export { CampaignService, getCampaignService } from './campaign-service.js';
export { 
  SubmissionService, 
  getSubmissionService,
  type SubmissionFilters,
} from './submission-service.js';
export { QueueProcessor, createQueueProcessor } from './queue-processor.js';
```

---

## Success Criteria

- [ ] `listSubmissions` returns filtered results
- [ ] `approveSubmission` calculates payout correctly
- [ ] `rejectSubmission` records reason
- [ ] `bulkReview` processes multiple entries
- [ ] Queue processor runs on interval
- [ ] Stats aggregation works correctly

---

## Completion Template

Create `PLANNING/implementation-phases/PHASE-3-COMPLETE.md`:

```markdown
# Phase 3 Complete

**Completed:** [DATE]

## Implemented
- [x] SubmissionService with full CRUD
- [x] Payout calculation with caps
- [x] Bulk review functionality
- [x] Queue processor for auto-approve
- [x] Statistics aggregation
- [x] CLI commands for review

## API Endpoints Used
- list_entries ✅
- retrieve_entries ✅
- approve_entries ✅
- deny_entries ✅

## Next Phase
Read `PLANNING/implementation-phases/PHASE-4-PROMPT.md`
```

---

## Git Commit

```bash
git add -A
git commit -m "feat(phase-3): Submission workflow complete

- Implement SubmissionService with approval/rejection
- Add payout calculation with CPM and caps
- Create bulk review functionality
- Add queue processor for auto-approval
- Implement statistics aggregation
- Create CLI commands for review workflow

Ready for Phase 4: Payout System"
```
