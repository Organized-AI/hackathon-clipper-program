import { createSubmissionService, type SubmissionFilters, type ApprovalOptions, type RejectionOptions } from '../services/submission-service.js';
import { createQueueProcessor, type QueueProcessorConfig } from '../services/queue-processor.js';
import { createLogger } from '../lib/index.js';

const logger = createLogger('SubmissionCLI');

/**
 * CLI command result
 */
interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * List pending submissions
 */
export async function listPendingCommand(args: {
  experienceId?: string;
  limit?: number;
  cursor?: string;
}): Promise<CommandResult> {
  const service = createSubmissionService();

  try {
    logger.info('Listing pending submissions...');

    const filters: SubmissionFilters = {
      status: 'pending',
      experienceId: args.experienceId,
      perPage: args.limit,
      after: args.cursor,
    };

    const result = await service.listSubmissions(filters);

    const submissions = result.submissions.map((s) => ({
      id: s.id,
      user: s.user.username,
      contentUrl: s.content_url,
      viewCount: s.view_count || 0,
      platform: s.platform,
      submitted: s.created_at,
    }));

    return {
      success: true,
      message: `Found ${submissions.length} pending submission(s)${result.hasMore ? ' (more available)' : ''}`,
      data: {
        submissions,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to list submissions: ${message}`,
    };
  }
}

/**
 * List all submissions with optional filters
 */
export async function listSubmissionsCommand(args: {
  experienceId?: string;
  status?: string;
  platform?: string;
  limit?: number;
  cursor?: string;
}): Promise<CommandResult> {
  const service = createSubmissionService();

  try {
    logger.info('Listing submissions...', args);

    const filters: SubmissionFilters = {
      experienceId: args.experienceId,
      status: args.status as SubmissionFilters['status'],
      platform: args.platform,
      perPage: args.limit,
      after: args.cursor,
    };

    const result = await service.listSubmissions(filters);

    const submissions = result.submissions.map((s) => ({
      id: s.id,
      user: s.user.username,
      status: s.status,
      contentUrl: s.content_url,
      viewCount: s.view_count || 0,
      platform: s.platform,
      submitted: s.created_at,
    }));

    return {
      success: true,
      message: `Found ${submissions.length} submission(s)`,
      data: {
        submissions,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to list submissions: ${message}`,
    };
  }
}

/**
 * Approve a submission
 */
export async function approveCommand(args: {
  entryId: string;
  viewCount?: number;
  cpmRate?: number;
  flatFee?: number;
  note?: string;
}): Promise<CommandResult> {
  const service = createSubmissionService();

  try {
    logger.info('Approving submission...', { entryId: args.entryId });

    const options: ApprovalOptions = {
      viewCount: args.viewCount,
      note: args.note,
    };

    if (args.cpmRate || args.flatFee) {
      options.campaignConfig = {
        cpmRate: args.cpmRate,
        flatFee: args.flatFee,
      };
    }

    const { entry, payout } = await service.approveSubmission(args.entryId, options);

    return {
      success: true,
      message: `Submission approved - Payout: $${payout.finalPayout.toFixed(2)}`,
      data: {
        entryId: entry.id,
        status: entry.status,
        viewCount: payout.viewCount,
        breakdown: {
          cpmPayout: payout.cpmPayout,
          flatFee: payout.flatFee,
          bonusPayout: payout.bonusPayout,
          grossTotal: payout.grossTotal,
          finalPayout: payout.finalPayout,
        },
        wasCapped: payout.wasCapped,
        meetsMinimum: payout.meetsMinimum,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to approve submission: ${message}`,
    };
  }
}

/**
 * Reject a submission
 */
export async function rejectCommand(args: {
  entryId: string;
  reason: string;
  notifyUser?: boolean;
}): Promise<CommandResult> {
  const service = createSubmissionService();

  try {
    logger.info('Rejecting submission...', { entryId: args.entryId });

    const options: RejectionOptions = {
      reason: args.reason,
      notifyUser: args.notifyUser,
    };

    const entry = await service.rejectSubmission(args.entryId, options);

    return {
      success: true,
      message: `Submission rejected`,
      data: {
        entryId: entry.id,
        status: entry.status,
        reason: args.reason,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to reject submission: ${message}`,
    };
  }
}

/**
 * Get submission statistics
 */
export async function statsCommand(args: {
  experienceId?: string;
}): Promise<CommandResult> {
  const service = createSubmissionService();

  try {
    logger.info('Getting submission stats...');

    const stats = await service.getStats(args.experienceId);

    return {
      success: true,
      message: 'Submission statistics',
      data: {
        total: stats.total,
        pending: stats.pending,
        approved: stats.approved,
        rejected: stats.rejected,
        flagged: stats.flagged,
        totalViews: stats.totalViews,
        averageViews: stats.averageViews,
        approvalRate: stats.total > 0
          ? `${((stats.approved / stats.total) * 100).toFixed(1)}%`
          : 'N/A',
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to get stats: ${message}`,
    };
  }
}

/**
 * Run bulk review
 */
export async function bulkReviewCommand(args: {
  experienceId: string;
  autoApproveHours?: number;
  minViews?: number;
  limit?: number;
  cpmRate?: number;
}): Promise<CommandResult> {
  const service = createSubmissionService();

  try {
    logger.info('Running bulk review...', { experienceId: args.experienceId });

    const result = await service.bulkReview(args.experienceId, {
      autoApproveAfterHours: args.autoApproveHours,
      minViewCount: args.minViews,
      limit: args.limit,
      campaignConfig: args.cpmRate ? { cpmRate: args.cpmRate } : undefined,
    });

    return {
      success: true,
      message: `Bulk review complete`,
      data: {
        approved: result.approved,
        rejected: result.rejected,
        skipped: result.skipped,
        totalPayout: `$${result.totalPayout.toFixed(2)}`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to run bulk review: ${message}`,
    };
  }
}

/**
 * Start the queue processor
 */
export function startProcessorCommand(args: {
  experienceIds: string[];
  intervalMinutes?: number;
  autoApproveHours?: number;
  minViews?: number;
  batchSize?: number;
}): CommandResult {
  try {
    logger.info('Starting queue processor...', args);

    const config: Partial<QueueProcessorConfig> = {
      experienceIds: args.experienceIds,
      intervalMs: (args.intervalMinutes || 5) * 60 * 1000,
      autoApproveAfterHours: args.autoApproveHours,
      minViewCount: args.minViews,
      batchSize: args.batchSize,
    };

    const processor = createQueueProcessor(config);
    processor.start();

    return {
      success: true,
      message: 'Queue processor started',
      data: processor.getStatus(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to start processor: ${message}`,
    };
  }
}
