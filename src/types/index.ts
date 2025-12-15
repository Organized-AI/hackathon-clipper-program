// Clipper types
export {
  // Schemas
  PlatformSchema,
  PricingModelSchema,
  SubmissionStatusSchema,
  CampaignConfigSchema,
  SubmissionSchema,
  PayoutCalculationSchema,
  ClipperProfileSchema,

  // Types
  type Platform,
  type PricingModel,
  type SubmissionStatus,
  type CampaignConfig,
  type Submission,
  type PayoutCalculation,
  type ClipperProfile,

  // Helper functions
  calculatePayout,
  meetsMinimumThreshold,
  minimumViewsForPayout,
} from './clipper.js';
