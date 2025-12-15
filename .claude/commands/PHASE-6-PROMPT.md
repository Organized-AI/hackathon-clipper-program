# Phase 6: Integration & Testing

**Phase:** 6 of 6  
**Name:** Integration & Testing  
**Dependencies:** All Previous Phases

---

## Context

This final phase integrates all services into a cohesive CLI application, adds webhook handling for real-time events, and creates end-to-end tests to verify the complete workflow.

---

## Tasks

### Task 1: Create Main CLI Application

Update `src/index.ts`:

```typescript
import 'dotenv/config';
import { config, logger } from './lib/index.js';
import { getCampaignService } from './services/campaign-service.js';
import { getSubmissionService } from './services/submission-service.js';
import { getPayoutService } from './services/payout-service.js';
import { getCommunityService } from './services/community-service.js';
import { CampaignConfig } from './types/clipper.js';

const commands = {
  // Campaign commands
  'campaign:create': createCampaign,
  'campaign:list': listCampaigns,
  'campaign:get': getCampaign,

  // Submission commands
  'submission:list': listSubmissions,
  'submission:approve': approveSubmission,
  'submission:reject': rejectSubmission,
  'submission:stats': getStats,

  // Payout commands
  'payout:balance': getBalance,
  'payout:send': sendPayout,
  'payout:list': listPayouts,
  'payout:summary': getPayoutSummary,

  // Community commands
  'community:onboarding': createOnboarding,
  'community:post': createPost,
  'community:notify': sendNotification,

  // Utility
  'help': showHelp,
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  const handler = commands[command as keyof typeof commands];
  
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.log('Run with "help" to see available commands');
    process.exit(1);
  }

  try {
    await handler(args.slice(1));
  } catch (error) {
    logger.error('Command failed', error as Error);
    process.exit(1);
  }
}

// ========== CAMPAIGN COMMANDS ==========

async function createCampaign(args: string[]) {
  const [title, type, budget, cpmRate] = args;
  
  if (!title || !type || !budget) {
    console.log('Usage: campaign:create <title> <type> <budget> [cpmRate]');
    console.log('Types: pure_cpm, flat_fee, hybrid');
    return;
  }

  const campaignService = getCampaignService();
  const campaignConfig: CampaignConfig = {
    title,
    type: type as 'pure_cpm' | 'flat_fee' | 'hybrid',
    budget: parseFloat(budget),
    cpmRate: cpmRate ? parseFloat(cpmRate) : 2.0,
    platforms: ['tiktok', 'youtube_shorts', 'instagram_reels'],
  };

  const campaign = await campaignService.createCampaign(campaignConfig);
  
  console.log('\n✅ Campaign Created!\n');
  console.log(`ID: ${campaign.id}`);
  console.log(`Name: ${campaign.name}`);
}

async function listCampaigns() {
  const campaignService = getCampaignService();
  const { campaigns } = await campaignService.listCampaigns({ limit: 10 });
  
  console.log('\n📋 Your Campaigns:\n');
  
  if (campaigns.length === 0) {
    console.log('No campaigns found.');
    return;
  }

  campaigns.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (${c.id})`);
  });
}

async function getCampaign(args: string[]) {
  const [productId] = args;
  
  if (!productId) {
    console.log('Usage: campaign:get <productId>');
    return;
  }

  const campaignService = getCampaignService();
  const campaign = await campaignService.getCampaign(productId);
  
  console.log('\n📋 Campaign Details:\n');
  console.log(`ID: ${campaign.id}`);
  console.log(`Name: ${campaign.name}`);
  console.log(`Status: ${campaign.visibility}`);
  console.log(`Description:\n${campaign.description}`);
}

// ========== SUBMISSION COMMANDS ==========

async function listSubmissions(args: string[]) {
  const [experienceId, status] = args;
  
  if (!experienceId) {
    console.log('Usage: submission:list <experienceId> [status]');
    return;
  }

  const submissionService = getSubmissionService();
  const { submissions } = await submissionService.listSubmissions({
    experienceId,
    status: status as any,
    limit: 20,
  });

  console.log(`\n📋 Submissions (${submissions.length}):\n`);

  submissions.forEach((s, i) => {
    console.log(`${i + 1}. @${s.clipperUsername ?? 'unknown'} - ${s.status}`);
    console.log(`   Views: ${s.viewCount.toLocaleString()}`);
    console.log(`   Platform: ${s.platform}`);
    console.log(`   ID: ${s.id}`);
    console.log('');
  });
}

async function approveSubmission(args: string[]) {
  const [entryId, viewCount, cpmRate] = args;
  
  if (!entryId || !viewCount) {
    console.log('Usage: submission:approve <entryId> <viewCount> [cpmRate]');
    return;
  }

  const submissionService = getSubmissionService();
  const result = await submissionService.approveSubmission(entryId, {
    viewCount: parseInt(viewCount),
    cpmRate: cpmRate ? parseFloat(cpmRate) : config.clipper.defaultCpmRate,
  });

  console.log('\n✅ Approved!\n');
  console.log(`Payout: $${result.payout?.cappedAmount.toFixed(2)}`);
}

async function rejectSubmission(args: string[]) {
  const [entryId, ...reasonParts] = args;
  const reason = reasonParts.join(' ');
  
  if (!entryId || !reason) {
    console.log('Usage: submission:reject <entryId> <reason>');
    return;
  }

  const submissionService = getSubmissionService();
  await submissionService.rejectSubmission(entryId, reason);

  console.log('\n❌ Rejected\n');
  console.log(`Reason: ${reason}`);
}

async function getStats(args: string[]) {
  const [experienceId] = args;
  
  if (!experienceId) {
    console.log('Usage: submission:stats <experienceId>');
    return;
  }

  const submissionService = getSubmissionService();
  const stats = await submissionService.getStats(experienceId);

  console.log('\n📊 Campaign Statistics:\n');
  console.log(`Total: ${stats.total}`);
  console.log(`  Pending: ${stats.pending}`);
  console.log(`  Approved: ${stats.approved}`);
  console.log(`  Rejected: ${stats.rejected}`);
  console.log(`  Flagged: ${stats.flagged}`);
  console.log(`\nTotal Views: ${stats.totalViews.toLocaleString()}`);
  console.log(`Total Paid: $${stats.totalPayout.toFixed(2)}`);
}

// ========== PAYOUT COMMANDS ==========

async function getBalance() {
  const payoutService = getPayoutService();
  const balance = await payoutService.getBalance();

  console.log('\n💰 Account Balance:\n');
  console.log(`Total:     $${balance.total.toFixed(2)}`);
  console.log(`Available: $${balance.available.toFixed(2)}`);
  console.log(`Pending:   $${balance.pending.toFixed(2)}`);
}

async function sendPayout(args: string[]) {
  const [recipientId, amount, ...descParts] = args;
  const description = descParts.join(' ') || undefined;
  
  if (!recipientId || !amount) {
    console.log('Usage: payout:send <recipientId> <amount> [description]');
    return;
  }

  const payoutService = getPayoutService();
  const result = await payoutService.sendPayout({
    recipientId,
    amount: parseFloat(amount),
    description,
  });

  console.log('\n✅ Payout Initiated!\n');
  console.log(`Transfer ID: ${result.transferId}`);
  console.log(`Amount: $${result.amount.toFixed(2)}`);
  console.log(`Status: ${result.status}`);
}

async function listPayouts(args: string[]) {
  const [recipientId] = args;

  const payoutService = getPayoutService();
  const { transfers } = await payoutService.listTransfers({
    recipientId,
    limit: 20,
  });

  console.log('\n📋 Recent Payouts:\n');

  transfers.forEach((t, i) => {
    const icon = { pending: '⏳', processing: '🔄', completed: '✅', failed: '❌' }[t.status];
    console.log(`${i + 1}. ${icon} $${t.amount.toFixed(2)} - ${t.recipientId}`);
  });
}

async function getPayoutSummary() {
  const payoutService = getPayoutService();
  const summary = await payoutService.getTotalPaid();

  console.log('\n📊 Payout Summary:\n');
  console.log(`Total Paid: $${summary.totalAmount.toFixed(2)}`);
  console.log(`Transfers: ${summary.transferCount}`);
}

// ========== COMMUNITY COMMANDS ==========

async function createOnboarding(args: string[]) {
  const [experienceId] = args;
  
  if (!experienceId) {
    console.log('Usage: community:onboarding <experienceId>');
    return;
  }

  const communityService = getCommunityService();
  const course = await communityService.createClipperOnboarding(experienceId);

  console.log('\n📚 Onboarding Created!\n');
  console.log(`Course ID: ${course.id}`);
}

async function createPost(args: string[]) {
  const [feedId, title, ...bodyParts] = args;
  const body = bodyParts.join(' ');
  
  if (!feedId || !title || !body) {
    console.log('Usage: community:post <feedId> <title> <body>');
    return;
  }

  const communityService = getCommunityService();
  const post = await communityService.createPost(feedId, { title, body });

  console.log('\n📢 Posted!\n');
  console.log(`Post ID: ${post.id}`);
}

async function sendNotification(args: string[]) {
  const [experienceId, title, ...bodyParts] = args;
  const body = bodyParts.join(' ');
  
  if (!experienceId || !title || !body) {
    console.log('Usage: community:notify <experienceId> <title> <body>');
    return;
  }

  const communityService = getCommunityService();
  await communityService.sendNotification(experienceId, { title, body });

  console.log('\n🔔 Notification Sent!');
}

// ========== HELP ==========

function showHelp() {
  console.log(`
🎬 Hackathon Clipper Program CLI

CAMPAIGN COMMANDS
  campaign:create <title> <type> <budget> [cpmRate]  Create new campaign
  campaign:list                                      List all campaigns
  campaign:get <productId>                           Get campaign details

SUBMISSION COMMANDS
  submission:list <experienceId> [status]           List submissions
  submission:approve <entryId> <viewCount> [cpm]    Approve submission
  submission:reject <entryId> <reason>              Reject submission
  submission:stats <experienceId>                   Get campaign stats

PAYOUT COMMANDS
  payout:balance                                    Check account balance
  payout:send <recipientId> <amount> [desc]        Send payout
  payout:list [recipientId]                         List recent payouts
  payout:summary                                    Get payout summary

COMMUNITY COMMANDS
  community:onboarding <experienceId>              Create onboarding course
  community:post <feedId> <title> <body>           Create forum post
  community:notify <experienceId> <title> <body>   Send notification

EXAMPLES
  npm run dev campaign:create "Summer Clips" pure_cpm 5000 2.50
  npm run dev submission:list exp_xxx pending
  npm run dev submission:approve ent_xxx 50000 2.00
  npm run dev payout:balance
  `);
}

main().catch(console.error);
```

### Task 2: Create Webhook Handler

Create `src/webhooks/handler.ts`:

```typescript
import { createLogger, config } from '../lib/index.js';
import { getSubmissionService } from '../services/submission-service.js';
import { getPayoutService } from '../services/payout-service.js';
import crypto from 'crypto';

const logger = createLogger('WebhookHandler');

interface WhopWebhookPayload {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  signature?: string;
}

export class WebhookHandler {
  private submissionService = getSubmissionService();
  private payoutService = getPayoutService();

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!config.whop.webhookSecret) {
      logger.warn('Webhook secret not configured');
      return false;
    }

    const expectedSig = crypto
      .createHmac('sha256', config.whop.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig)
    );
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(payload: WhopWebhookPayload): Promise<void> {
    logger.info('Webhook received', { type: payload.type });

    switch (payload.type) {
      case 'entry.created':
        await this.handleEntryCreated(payload.data);
        break;

      case 'entry.approved':
        await this.handleEntryApproved(payload.data);
        break;

      case 'entry.denied':
        await this.handleEntryDenied(payload.data);
        break;

      case 'transfer.completed':
        await this.handleTransferCompleted(payload.data);
        break;

      case 'transfer.failed':
        await this.handleTransferFailed(payload.data);
        break;

      case 'membership.created':
        await this.handleMembershipCreated(payload.data);
        break;

      default:
        logger.debug('Unhandled webhook type', { type: payload.type });
    }
  }

  private async handleEntryCreated(data: Record<string, unknown>): Promise<void> {
    logger.info('New submission received', {
      entryId: data.id,
      experienceId: data.experience_id,
    });
    // Could trigger notification to reviewers
  }

  private async handleEntryApproved(data: Record<string, unknown>): Promise<void> {
    logger.info('Entry approved', { entryId: data.id });
    // Could trigger automatic payout if not already done
  }

  private async handleEntryDenied(data: Record<string, unknown>): Promise<void> {
    logger.info('Entry denied', { entryId: data.id });
    // Could send notification to clipper
  }

  private async handleTransferCompleted(data: Record<string, unknown>): Promise<void> {
    logger.info('Transfer completed', { transferId: data.id });
    // Could update internal tracking
  }

  private async handleTransferFailed(data: Record<string, unknown>): Promise<void> {
    logger.error('Transfer failed', new Error('Transfer failure'), {
      transferId: data.id,
      reason: data.failure_reason,
    });
    // Could trigger retry or alert
  }

  private async handleMembershipCreated(data: Record<string, unknown>): Promise<void> {
    logger.info('New clipper joined', {
      membershipId: data.id,
      userId: data.user_id,
    });
    // Could send welcome notification
  }
}

export const webhookHandler = new WebhookHandler();
```

### Task 3: Create Test Suite

Create `tests/integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { config } from '../src/lib/config.js';
import { getCampaignService } from '../src/services/campaign-service.js';
import { getSubmissionService } from '../src/services/submission-service.js';
import { getPayoutService } from '../src/services/payout-service.js';
import { calculatePayout, meetsMinimumThreshold } from '../src/types/clipper.js';

describe('Payout Calculations', () => {
  it('calculates CPM payout correctly', () => {
    const result = calculatePayout(50000, 2.0, 0);
    expect(result.calculatedAmount).toBe(100); // 50K views * $2/1K = $100
  });

  it('applies flat fee correctly', () => {
    const result = calculatePayout(50000, 2.0, 10);
    expect(result.calculatedAmount).toBe(110); // $100 + $10 flat fee
  });

  it('respects max cap', () => {
    const result = calculatePayout(1000000, 5.0, 0, 500);
    expect(result.cappedAmount).toBe(500);
    expect(result.calculatedAmount).toBe(5000);
  });

  it('checks minimum threshold', () => {
    expect(meetsMinimumThreshold(5000, 2.0, 10)).toBe(true); // $10 >= $10
    expect(meetsMinimumThreshold(2000, 2.0, 10)).toBe(false); // $4 < $10
  });
});

describe('Configuration', () => {
  it('loads config correctly', () => {
    expect(config.app.env).toBeDefined();
    expect(config.clipper.defaultCpmRate).toBeGreaterThan(0);
    expect(config.clipper.minPayoutThreshold).toBeGreaterThan(0);
  });
});

// Integration tests (require API key)
describe.skipIf(!process.env.WHOP_API_KEY)('API Integration', () => {
  describe('CampaignService', () => {
    it('lists campaigns', async () => {
      const service = getCampaignService();
      const { campaigns, hasMore } = await service.listCampaigns({ limit: 5 });
      
      expect(Array.isArray(campaigns)).toBe(true);
      expect(typeof hasMore).toBe('boolean');
    });
  });

  describe('PayoutService', () => {
    it('gets balance', async () => {
      const service = getPayoutService();
      const balance = await service.getBalance();
      
      expect(typeof balance.total).toBe('number');
      expect(typeof balance.available).toBe('number');
      expect(typeof balance.pending).toBe('number');
    });
  });
});
```

### Task 4: Create Vitest Config

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### Task 5: Update Package Scripts

Update `package.json` scripts section:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Task 6: Create Final CLAUDE.md

Update `CLAUDE.md` with complete documentation:

```markdown
# Hackathon Clipper Program

A TypeScript CLI application for managing Whop-powered clipper programs.

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Whop credentials

# Run CLI
npm run dev help
\`\`\`

## Commands

### Campaign Management
\`\`\`bash
npm run dev campaign:create "My Campaign" pure_cpm 5000 2.50
npm run dev campaign:list
npm run dev campaign:get prod_xxx
\`\`\`

### Submission Review
\`\`\`bash
npm run dev submission:list exp_xxx pending
npm run dev submission:approve ent_xxx 50000 2.00
npm run dev submission:reject ent_xxx "Does not meet guidelines"
npm run dev submission:stats exp_xxx
\`\`\`

### Payouts
\`\`\`bash
npm run dev payout:balance
npm run dev payout:send usr_xxx 100.00 "Monthly bonus"
npm run dev payout:list
npm run dev payout:summary
\`\`\`

### Community
\`\`\`bash
npm run dev community:onboarding exp_xxx
npm run dev community:post feed_xxx "New Campaign!" "Check out our latest..."
npm run dev community:notify exp_xxx "Bonus Week!" "Double CPM this week only!"
\`\`\`

## Architecture

\`\`\`
src/
├── lib/           # Core utilities
│   ├── config.ts      # Environment configuration
│   ├── logger.ts      # Structured logging
│   └── whop-client.ts # API client wrapper
├── services/      # Business logic
│   ├── campaign-service.ts   # Products & Plans
│   ├── submission-service.ts # Entry workflow
│   ├── payout-service.ts     # Transfers & Ledger
│   └── community-service.ts  # Courses & Forums
├── types/         # Type definitions
│   └── clipper.ts # Domain types
├── webhooks/      # Event handlers
│   └── handler.ts
└── index.ts       # CLI entry point
\`\`\`

## Whop API Endpoints

| Service | Endpoints |
|---------|-----------|
| Campaign | create_products, update_products, create_plans |
| Submission | list_entries, approve_entries, deny_entries |
| Payout | create_transfers, list_transfers, retrieve_ledger_accounts |
| Community | create_courses, create_forum_posts, create_notifications |

## Testing

\`\`\`bash
npm test            # Run all tests
npm run test:watch  # Watch mode
npm run test:coverage # With coverage
\`\`\`

## MCP Integration

Configure in Claude Code's \`.claude.json\`:

\`\`\`json
{
  "mcpServers": {
    "whop_sdk_api": {
      "command": "npx",
      "args": ["-y", "@whop/mcp", "--client=claude", "--tools=dynamic"],
      "env": {
        "WHOP_API_KEY": "your_key",
        "WHOP_APP_ID": "app_xxx"
      }
    }
  }
}
\`\`\`
```

---

## Success Criteria

- [ ] CLI executes all commands correctly
- [ ] `npm run dev help` shows complete usage
- [ ] Webhook handler processes events
- [ ] Unit tests pass
- [ ] Integration tests pass (with API key)
- [ ] Documentation is complete

---

## Completion Template

Create `PLANNING/implementation-phases/PHASE-6-COMPLETE.md`:

```markdown
# Phase 6 Complete

**Completed:** [DATE]

## Implemented
- [x] Full CLI application with all commands
- [x] Webhook handler for real-time events
- [x] Test suite with unit and integration tests
- [x] Complete documentation

## All Phases Complete
- Phase 0: Project Setup ✅
- Phase 1: Core Infrastructure ✅
- Phase 2: Campaign Management ✅
- Phase 3: Submission Workflow ✅
- Phase 4: Payout System ✅
- Phase 5: Community Features ✅
- Phase 6: Integration & Testing ✅

## Project Ready for Use! 🎉
```

---

## Git Commit

```bash
git add -A
git commit -m "feat(phase-6): Integration complete - Project ready!

- Create unified CLI application
- Add webhook handler for events
- Implement test suite
- Complete documentation

🎉 Hackathon Clipper Program v0.1.0 complete!"
```
