import { createCampaignService, type CreatePlanOptions, type CreatePromoOptions } from '../services/campaign-service.js';
import { createLogger } from '../lib/index.js';

const logger = createLogger('CampaignCLI');

/**
 * CLI command result
 */
interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Create a new clipper campaign
 */
export async function createCampaignCommand(args: {
  name: string;
  description?: string;
  cpmRate?: number;
  flatFee?: number;
}): Promise<CommandResult> {
  const service = createCampaignService();

  try {
    logger.info('Creating campaign...', { name: args.name });

    const campaign = await service.createCampaign({
      name: args.name,
      description: args.description,
    });

    return {
      success: true,
      message: `Campaign "${campaign.title}" created successfully`,
      data: {
        id: campaign.id,
        title: campaign.title,
        visibility: campaign.visibility,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to create campaign: ${message}`,
    };
  }
}

/**
 * List all clipper campaigns
 */
export async function listCampaignsCommand(args: {
  limit?: number;
  cursor?: string;
  all?: boolean;
}): Promise<CommandResult> {
  const service = createCampaignService();

  try {
    logger.info('Listing campaigns...');

    if (args.all) {
      const campaigns = await service.getAllCampaigns();
      return {
        success: true,
        message: `Found ${campaigns.length} campaign(s)`,
        data: campaigns.map((c) => ({
          id: c.id,
          title: c.title,
          visibility: c.visibility,
          created: c.created_at,
        })),
      };
    }

    const result = await service.listCampaigns({
      perPage: args.limit,
      after: args.cursor,
    });

    return {
      success: true,
      message: `Found ${result.campaigns.length} campaign(s)${result.hasMore ? ' (more available)' : ''}`,
      data: {
        campaigns: result.campaigns.map((c) => ({
          id: c.id,
          title: c.title,
          visibility: c.visibility,
        })),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to list campaigns: ${message}`,
    };
  }
}

/**
 * Get campaign details
 */
export async function getCampaignCommand(args: {
  productId: string;
}): Promise<CommandResult> {
  const service = createCampaignService();

  try {
    logger.info('Getting campaign...', { productId: args.productId });

    const campaign = await service.getCampaign(args.productId);

    return {
      success: true,
      message: `Campaign: ${campaign.title}`,
      data: campaign,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to get campaign: ${message}`,
    };
  }
}

/**
 * Update a campaign
 */
export async function updateCampaignCommand(args: {
  productId: string;
  name?: string;
  description?: string;
  active?: boolean;
}): Promise<CommandResult> {
  const service = createCampaignService();

  try {
    logger.info('Updating campaign...', { productId: args.productId });

    const updates: Record<string, unknown> = {};
    if (args.name) updates.name = args.name;
    if (args.description) updates.description = args.description;
    if (args.active !== undefined) updates.isActive = args.active;

    const campaign = await service.updateCampaign(args.productId, updates);

    return {
      success: true,
      message: `Campaign "${campaign.title}" updated successfully`,
      data: campaign,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to update campaign: ${message}`,
    };
  }
}

/**
 * Create a pricing plan for a campaign
 */
export async function createPlanCommand(args: {
  productId: string;
  name: string;
  price: number;
  period: 'monthly' | 'yearly' | 'weekly' | 'one_time';
}): Promise<CommandResult> {
  const service = createCampaignService();

  try {
    logger.info('Creating plan...', { productId: args.productId, name: args.name });

    const options: CreatePlanOptions = {
      name: args.name,
      billingPeriod: args.period,
      price: Math.round(args.price * 100), // Convert to cents
    };

    const plan = await service.createPlan(args.productId, options);

    return {
      success: true,
      message: `Plan "${plan.name}" created successfully`,
      data: {
        id: plan.id,
        name: plan.name,
        price: plan.base_currency_price / 100,
        period: plan.billing_period,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to create plan: ${message}`,
    };
  }
}

/**
 * Create a promo code for a campaign
 */
export async function createPromoCommand(args: {
  productId: string;
  code: string;
  percentOff?: number;
  amountOff?: number;
  maxUses?: number;
}): Promise<CommandResult> {
  const service = createCampaignService();

  try {
    logger.info('Creating promo code...', { productId: args.productId, code: args.code });

    const options: CreatePromoOptions = {
      code: args.code,
      percentOff: args.percentOff,
      amountOff: args.amountOff ? Math.round(args.amountOff * 100) : undefined,
      maxUses: args.maxUses,
    };

    const promo = await service.createPromoCode(args.productId, options);

    return {
      success: true,
      message: `Promo code "${promo.code}" created successfully`,
      data: {
        id: promo.id,
        code: promo.code,
        percentOff: promo.percent_off,
        amountOff: promo.amount_off ? promo.amount_off / 100 : undefined,
        maxUses: promo.max_uses,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to create promo code: ${message}`,
    };
  }
}

/**
 * Archive a campaign
 */
export async function archiveCampaignCommand(args: {
  productId: string;
}): Promise<CommandResult> {
  const service = createCampaignService();

  try {
    logger.info('Archiving campaign...', { productId: args.productId });

    const campaign = await service.archiveCampaign(args.productId);

    return {
      success: true,
      message: `Campaign "${campaign.title}" archived successfully`,
      data: campaign,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to archive campaign: ${message}`,
    };
  }
}
