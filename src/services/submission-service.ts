import { createWhopClient, createLogger, WhopApiError, getConfig } from '../lib/index.js';
import { calculatePayout, type Submission, type SubmissionStatus, type PayoutCalculation, type CampaignConfig } from '../types/index.js';

const logger = createLogger('SubmissionService');

/**
 * Whop Entry (Submission) response
 */
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

/**
 * Submission filter options
 */
export interface SubmissionFilters {
  experienceId?: string;
  status?: SubmissionStatus;
  userId?: string;
  platform?: string;
  perPage?: number;
  after?: string;
}

/**
 * Approval options
 */
export interface ApprovalOptions {
  /** Campaign configuration for payout calculation */
  campaignConfig?: Partial<CampaignConfig>;
  /** Override view count */
  viewCount?: number;
  /** Optional note */
  note?: string;
}

/**
 * Rejection options
 */
export interface RejectionOptions {
  reason: string;
  /** Whether to notify the user */
  notifyUser?: boolean;
}

/**
 * Bulk review options
 */
export interface BulkReviewOptions {
  /** Auto-approve if older than this many hours */
  autoApproveAfterHours?: number;
  /** Minimum view count for auto-approve */
  minViewCount?: number;
  /** Maximum submissions to process */
  limit?: number;
  /** Campaign config for payout calculation */
  campaignConfig?: Partial<CampaignConfig>;
}

/**
 * Submission statistics
 */
export interface SubmissionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  totalViews: number;
  totalPayout: number;
  averageViews: number;
}

/**
 * Submission Service for managing clipper submissions
 */
export class SubmissionService {
  private client = createWhopClient();
  private config = getConfig();

  /**
   * List submissions with filters
   */
  async listSubmissions(filters: SubmissionFilters = {}): Promise<{
    submissions: WhopEntry[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    logger.debug('Listing submissions', { ...filters });

    try {
      const params: Record<string, string | number | undefined> = {
        per_page: filters.perPage || 20,
        after: filters.after,
      };

      if (filters.experienceId) params.experience_id = filters.experienceId;
      if (filters.status) params.status = filters.status;
      if (filters.userId) params.user_id = filters.userId;

      const response = await this.client.get<{
        data: WhopEntry[];
        pagination: { next_cursor?: string; has_more: boolean };
      }>('/entries', params);

      // Filter by platform if specified (client-side)
      let submissions = response.data;
      if (filters.platform) {
        submissions = submissions.filter((s) => s.platform === filters.platform);
      }

      return {
        submissions,
        nextCursor: response.pagination.next_cursor,
        hasMore: response.pagination.has_more,
      };
    } catch (error) {
      logger.error('Failed to list submissions', { error });
      throw error;
    }
  }

  /**
   * Get all pending submissions
   */
  async getPendingSubmissions(experienceId?: string): Promise<WhopEntry[]> {
    const allPending: WhopEntry[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.listSubmissions({
        experienceId,
        status: 'pending',
        after: cursor,
        perPage: 50,
      });
      allPending.push(...result.submissions);
      cursor = result.nextCursor;
    } while (cursor);

    return allPending;
  }

  /**
   * Get submission details by entry ID
   */
  async getSubmission(entryId: string): Promise<WhopEntry> {
    logger.debug('Getting submission', { entryId });

    try {
      const entry = await this.client.get<WhopEntry>(`/entries/${entryId}`);
      return entry;
    } catch (error) {
      if (error instanceof WhopApiError && error.statusCode === 404) {
        logger.warn('Submission not found', { entryId });
      }
      throw error;
    }
  }

  /**
   * Calculate payout for a submission
   */
  calculateSubmissionPayout(
    viewCount: number,
    campaignConfig?: Partial<CampaignConfig>
  ): PayoutCalculation {
    const config = {
      cpmRate: campaignConfig?.cpmRate || this.config.clipper.defaultCpmRate,
      flatFee: campaignConfig?.flatFee || 0,
      bonusRate: campaignConfig?.bonusRate,
      minPayoutThreshold: campaignConfig?.minPayoutThreshold || this.config.clipper.minPayoutThreshold,
      maxPayoutCap: campaignConfig?.maxPayoutCap || this.config.clipper.maxPayoutCap,
    };

    return calculatePayout(viewCount, config);
  }

  /**
   * Approve a submission and calculate payout
   */
  async approveSubmission(
    entryId: string,
    options: ApprovalOptions = {}
  ): Promise<{
    entry: WhopEntry;
    payout: PayoutCalculation;
  }> {
    logger.info('Approving submission', { entryId });

    try {
      // Get current entry to get view count
      const currentEntry = await this.getSubmission(entryId);
      const viewCount = options.viewCount ?? currentEntry.view_count ?? 0;

      // Calculate payout
      const payout = this.calculateSubmissionPayout(viewCount, options.campaignConfig);
      payout.submissionId = entryId;

      // Approve via API
      const entry = await this.client.post<WhopEntry>(`/entries/${entryId}/approve`, {
        metadata: {
          payout_amount: payout.finalPayout,
          view_count: viewCount,
          note: options.note,
        },
      });

      logger.info('Submission approved', {
        entryId,
        viewCount,
        payout: payout.finalPayout,
      });

      return { entry, payout };
    } catch (error) {
      logger.error('Failed to approve submission', { entryId, error });
      throw error;
    }
  }

  /**
   * Reject a submission with reason
   */
  async rejectSubmission(
    entryId: string,
    options: RejectionOptions
  ): Promise<WhopEntry> {
    logger.info('Rejecting submission', { entryId, reason: options.reason });

    try {
      const entry = await this.client.post<WhopEntry>(`/entries/${entryId}/deny`, {
        reason: options.reason,
        notify_user: options.notifyUser ?? true,
      });

      logger.info('Submission rejected', { entryId });
      return entry;
    } catch (error) {
      logger.error('Failed to reject submission', { entryId, error });
      throw error;
    }
  }

  /**
   * Bulk review submissions for an experience
   */
  async bulkReview(
    experienceId: string,
    options: BulkReviewOptions = {}
  ): Promise<{
    approved: number;
    rejected: number;
    skipped: number;
    totalPayout: number;
  }> {
    logger.info('Starting bulk review', { experienceId, ...options });

    const results = {
      approved: 0,
      rejected: 0,
      skipped: 0,
      totalPayout: 0,
    };

    const pending = await this.getPendingSubmissions(experienceId);
    const toProcess = options.limit ? pending.slice(0, options.limit) : pending;

    const autoApproveHours = options.autoApproveAfterHours || this.config.clipper.autoApproveHours;
    const minViewCount = options.minViewCount || 0;
    const cutoffTime = new Date(Date.now() - autoApproveHours * 60 * 60 * 1000);

    for (const submission of toProcess) {
      const createdAt = new Date(submission.created_at);
      const viewCount = submission.view_count || 0;

      // Check if should auto-approve
      if (createdAt < cutoffTime && viewCount >= minViewCount) {
        try {
          const { payout } = await this.approveSubmission(submission.id, {
            campaignConfig: options.campaignConfig,
          });
          results.approved++;
          results.totalPayout += payout.finalPayout;
        } catch (error) {
          logger.error('Failed to auto-approve', { entryId: submission.id, error });
          results.skipped++;
        }
      } else {
        results.skipped++;
      }
    }

    logger.info('Bulk review complete', results);
    return results;
  }

  /**
   * Get submission statistics for an experience
   */
  async getStats(experienceId?: string): Promise<SubmissionStats> {
    logger.debug('Getting submission stats', { experienceId });

    const stats: SubmissionStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      flagged: 0,
      totalViews: 0,
      totalPayout: 0,
      averageViews: 0,
    };

    // Fetch all submissions
    const allSubmissions: WhopEntry[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.listSubmissions({
        experienceId,
        after: cursor,
        perPage: 100,
      });
      allSubmissions.push(...result.submissions);
      cursor = result.nextCursor;
    } while (cursor);

    stats.total = allSubmissions.length;

    for (const submission of allSubmissions) {
      switch (submission.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'approved':
          stats.approved++;
          stats.totalViews += submission.view_count || 0;
          // Note: Actual payout would need to be retrieved from transfer records
          break;
        case 'denied':
          stats.rejected++;
          break;
        case 'flagged':
          stats.flagged++;
          break;
      }
    }

    stats.averageViews = stats.approved > 0 ? Math.round(stats.totalViews / stats.approved) : 0;

    return stats;
  }

  /**
   * Convert Whop entry to internal Submission type
   */
  toSubmission(entry: WhopEntry, campaignId: string): Submission {
    return {
      id: entry.id,
      campaignId,
      entryId: entry.id,
      userId: entry.user.id,
      username: entry.user.username,
      contentUrl: entry.content_url || '',
      platform: (entry.platform || 'other') as Submission['platform'],
      viewCount: entry.view_count || 0,
      status: entry.status as SubmissionStatus,
      submittedAt: entry.created_at,
      reviewedAt: entry.status !== 'pending' ? entry.updated_at : undefined,
    };
  }
}

/**
 * Create a SubmissionService instance
 */
export function createSubmissionService(): SubmissionService {
  return new SubmissionService();
}
