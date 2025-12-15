// Campaign Service
export {
  CampaignService,
  createCampaignService,
  type CreatePlanOptions,
  type CreatePromoOptions,
  type ListCampaignsOptions,
} from './campaign-service.js';

// Submission Service
export {
  SubmissionService,
  createSubmissionService,
  type SubmissionFilters,
  type ApprovalOptions,
  type RejectionOptions,
  type BulkReviewOptions,
  type SubmissionStats,
} from './submission-service.js';

// Queue Processor
export {
  QueueProcessor,
  createQueueProcessor,
  type QueueProcessorConfig,
} from './queue-processor.js';
