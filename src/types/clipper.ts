import { z } from 'zod';

/**
 * Supported social media platforms
 */
export const PlatformSchema = z.enum(['tiktok', 'youtube', 'instagram', 'x', 'other']);
export type Platform = z.infer<typeof PlatformSchema>;

/**
 * Pricing model types
 */
export const PricingModelSchema = z.enum(['cpm', 'flat', 'hybrid', 'tiered']);
export type PricingModel = z.infer<typeof PricingModelSchema>;

/**
 * Submission status values
 */
export const SubmissionStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'flagged',
  'paid',
  'manual_review'
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

/**
 * Campaign configuration for clipper programs
 */
export const CampaignConfigSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  description: z.string().optional(),

  // Pricing configuration
  pricingModel: PricingModelSchema,
  cpmRate: z.number().positive().default(5.00), // $ per 1000 views
  flatFee: z.number().nonnegative().default(0), // Fixed payment per submission
  bonusRate: z.number().nonnegative().optional(), // Extra CPM for high performers

  // Budget controls
  minPayoutThreshold: z.number().nonnegative().default(1.00),
  maxPayoutCap: z.number().positive().default(500.00),
  dailyBudget: z.number().positive().optional(),
  totalBudget: z.number().positive().optional(),

  // Platform restrictions
  allowedPlatforms: z.array(PlatformSchema).default(['tiktok', 'youtube', 'instagram', 'x']),
  minViewCount: z.number().nonnegative().default(0),

  // Automation settings
  autoApproveEnabled: z.boolean().default(false),
  autoApproveHours: z.number().positive().default(48),

  // Metadata
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

export type CampaignConfig = z.infer<typeof CampaignConfigSchema>;

/**
 * Clipper submission
 */
export const SubmissionSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  entryId: z.string(), // Whop entry ID
  userId: z.string(),
  username: z.string().optional(),

  // Content information
  contentUrl: z.string().url(),
  platform: PlatformSchema,
  viewCount: z.number().nonnegative().default(0),

  // Status tracking
  status: SubmissionStatusSchema,
  statusReason: z.string().optional(),

  // Payout information
  calculatedPayout: z.number().nonnegative().optional(),
  actualPayout: z.number().nonnegative().optional(),
  transferId: z.string().optional(),

  // Timestamps
  submittedAt: z.string().datetime(),
  reviewedAt: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
});

export type Submission = z.infer<typeof SubmissionSchema>;

/**
 * Payout calculation details
 */
export const PayoutCalculationSchema = z.object({
  submissionId: z.string(),
  viewCount: z.number().nonnegative(),

  // Calculation breakdown
  cpmPayout: z.number().nonnegative(), // (views / 1000) * cpmRate
  flatFee: z.number().nonnegative(),
  bonusPayout: z.number().nonnegative().default(0),

  // Totals
  grossTotal: z.number().nonnegative(),
  cappedTotal: z.number().nonnegative(),
  finalPayout: z.number().nonnegative(),

  // Metadata
  meetsMinimum: z.boolean(),
  wasCapped: z.boolean(),
  currency: z.string().default('usd'),
});

export type PayoutCalculation = z.infer<typeof PayoutCalculationSchema>;

/**
 * Clipper profile
 */
export const ClipperProfileSchema = z.object({
  userId: z.string(),
  username: z.string(),
  email: z.string().email().optional(),

  // Stats
  totalSubmissions: z.number().nonnegative().default(0),
  approvedSubmissions: z.number().nonnegative().default(0),
  rejectedSubmissions: z.number().nonnegative().default(0),
  totalViews: z.number().nonnegative().default(0),
  totalEarnings: z.number().nonnegative().default(0),

  // Performance
  approvalRate: z.number().min(0).max(100).default(0),
  averageViews: z.number().nonnegative().default(0),

  // Tier/Level
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).default('bronze'),

  // Timestamps
  joinedAt: z.string().datetime().optional(),
  lastSubmissionAt: z.string().datetime().optional(),
});

export type ClipperProfile = z.infer<typeof ClipperProfileSchema>;

/**
 * Calculate payout for a submission
 */
export function calculatePayout(
  viewCount: number,
  config: Pick<CampaignConfig, 'cpmRate' | 'flatFee' | 'bonusRate' | 'minPayoutThreshold' | 'maxPayoutCap'>
): PayoutCalculation {
  // CPM calculation: (views / 1000) * rate
  const cpmPayout = (viewCount / 1000) * config.cpmRate;
  const flatFee = config.flatFee || 0;
  const bonusPayout = config.bonusRate ? (viewCount / 1000) * config.bonusRate : 0;

  // Calculate totals
  const grossTotal = cpmPayout + flatFee + bonusPayout;
  const cappedTotal = Math.min(grossTotal, config.maxPayoutCap);
  const meetsMinimum = cappedTotal >= config.minPayoutThreshold;
  const finalPayout = meetsMinimum ? cappedTotal : 0;

  return {
    submissionId: '', // To be set by caller
    viewCount,
    cpmPayout: Math.round(cpmPayout * 100) / 100,
    flatFee,
    bonusPayout: Math.round(bonusPayout * 100) / 100,
    grossTotal: Math.round(grossTotal * 100) / 100,
    cappedTotal: Math.round(cappedTotal * 100) / 100,
    finalPayout: Math.round(finalPayout * 100) / 100,
    meetsMinimum,
    wasCapped: grossTotal > config.maxPayoutCap,
    currency: 'usd',
  };
}

/**
 * Check if a submission meets minimum payout threshold
 */
export function meetsMinimumThreshold(
  viewCount: number,
  config: Pick<CampaignConfig, 'cpmRate' | 'flatFee' | 'minPayoutThreshold'>
): boolean {
  const cpmPayout = (viewCount / 1000) * config.cpmRate;
  const total = cpmPayout + (config.flatFee || 0);
  return total >= config.minPayoutThreshold;
}

/**
 * Calculate minimum views needed to meet threshold
 */
export function minimumViewsForPayout(
  config: Pick<CampaignConfig, 'cpmRate' | 'flatFee' | 'minPayoutThreshold'>
): number {
  const remainingAfterFlat = config.minPayoutThreshold - (config.flatFee || 0);
  if (remainingAfterFlat <= 0) return 0;
  return Math.ceil((remainingAfterFlat / config.cpmRate) * 1000);
}
