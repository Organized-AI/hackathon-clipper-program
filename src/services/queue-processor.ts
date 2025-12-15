import { createLogger, getConfig } from '../lib/index.js';
import { createSubmissionService, type BulkReviewOptions } from './submission-service.js';
import type { CampaignConfig } from '../types/index.js';

const logger = createLogger('QueueProcessor');

/**
 * Queue processor configuration
 */
export interface QueueProcessorConfig {
  /** Processing interval in milliseconds */
  intervalMs: number;
  /** Experience IDs to process */
  experienceIds: string[];
  /** Auto-approve submissions older than this many hours */
  autoApproveAfterHours: number;
  /** Minimum view count for auto-approve */
  minViewCount: number;
  /** Maximum submissions to process per batch */
  batchSize: number;
  /** Campaign configuration for payout calculation */
  campaignConfig?: Partial<CampaignConfig>;
}

/**
 * Processing result
 */
interface ProcessingResult {
  experienceId: string;
  approved: number;
  rejected: number;
  skipped: number;
  totalPayout: number;
  processedAt: Date;
}

/**
 * Queue processor for automated submission review
 */
export class QueueProcessor {
  private config: QueueProcessorConfig;
  private submissionService = createSubmissionService();
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;
  private results: ProcessingResult[] = [];

  constructor(config: Partial<QueueProcessorConfig> = {}) {
    const appConfig = getConfig();

    this.config = {
      intervalMs: config.intervalMs || 5 * 60 * 1000, // 5 minutes default
      experienceIds: config.experienceIds || [],
      autoApproveAfterHours: config.autoApproveAfterHours || appConfig.clipper.autoApproveHours,
      minViewCount: config.minViewCount || 0,
      batchSize: config.batchSize || 50,
      campaignConfig: config.campaignConfig,
    };
  }

  /**
   * Start the queue processor
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Queue processor is already running');
      return;
    }

    logger.info('Starting queue processor', {
      intervalMs: this.config.intervalMs,
      experienceIds: this.config.experienceIds,
    });

    this.isRunning = true;

    // Run immediately
    this.processAll().catch((error) => {
      logger.error('Initial processing failed', { error });
    });

    // Schedule recurring processing
    this.intervalHandle = setInterval(() => {
      this.processAll().catch((error) => {
        logger.error('Scheduled processing failed', { error });
      });
    }, this.config.intervalMs);
  }

  /**
   * Stop the queue processor
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Queue processor is not running');
      return;
    }

    logger.info('Stopping queue processor');

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.isRunning = false;
  }

  /**
   * Process all configured experiences
   */
  async processAll(): Promise<ProcessingResult[]> {
    logger.info('Processing all experiences');
    const results: ProcessingResult[] = [];

    for (const experienceId of this.config.experienceIds) {
      try {
        const result = await this.processExperience(experienceId);
        results.push(result);
        this.results.push(result);
      } catch (error) {
        logger.error('Failed to process experience', { experienceId, error });
      }
    }

    // Keep only last 100 results
    if (this.results.length > 100) {
      this.results = this.results.slice(-100);
    }

    return results;
  }

  /**
   * Process a single experience
   */
  async processExperience(experienceId: string): Promise<ProcessingResult> {
    logger.info('Processing experience', { experienceId });

    const options: BulkReviewOptions = {
      autoApproveAfterHours: this.config.autoApproveAfterHours,
      minViewCount: this.config.minViewCount,
      limit: this.config.batchSize,
      campaignConfig: this.config.campaignConfig,
    };

    const result = await this.submissionService.bulkReview(experienceId, options);

    return {
      experienceId,
      ...result,
      processedAt: new Date(),
    };
  }

  /**
   * Run a single processing cycle (for manual triggering)
   */
  async runOnce(): Promise<ProcessingResult[]> {
    return this.processAll();
  }

  /**
   * Add an experience to process
   */
  addExperience(experienceId: string): void {
    if (!this.config.experienceIds.includes(experienceId)) {
      this.config.experienceIds.push(experienceId);
      logger.info('Added experience to processor', { experienceId });
    }
  }

  /**
   * Remove an experience from processing
   */
  removeExperience(experienceId: string): void {
    const index = this.config.experienceIds.indexOf(experienceId);
    if (index !== -1) {
      this.config.experienceIds.splice(index, 1);
      logger.info('Removed experience from processor', { experienceId });
    }
  }

  /**
   * Get processor status
   */
  getStatus(): {
    isRunning: boolean;
    config: QueueProcessorConfig;
    recentResults: ProcessingResult[];
  } {
    return {
      isRunning: this.isRunning,
      config: { ...this.config },
      recentResults: this.results.slice(-10),
    };
  }

  /**
   * Update processor configuration
   */
  updateConfig(updates: Partial<QueueProcessorConfig>): void {
    Object.assign(this.config, updates);
    logger.info('Updated processor config', { updates });

    // Restart if running with new interval
    if (this.isRunning && updates.intervalMs) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get processing history
   */
  getHistory(limit = 10): ProcessingResult[] {
    return this.results.slice(-limit);
  }

  /**
   * Clear processing history
   */
  clearHistory(): void {
    this.results = [];
  }
}

/**
 * Create a QueueProcessor instance
 */
export function createQueueProcessor(config?: Partial<QueueProcessorConfig>): QueueProcessor {
  return new QueueProcessor(config);
}
