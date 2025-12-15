import { createWhopClient, createLogger, WhopApiError } from '../lib/index.js';
import type { CampaignConfig } from '../types/index.js';

const logger = createLogger('CampaignService');

/**
 * Whop Product response
 */
interface WhopProduct {
  id: string;
  title: string;
  description?: string;
  visibility: string;
  created_at: string;
  updated_at: string;
}

/**
 * Whop Plan response
 */
interface WhopPlan {
  id: string;
  product_id: string;
  name: string;
  billing_period: string;
  base_currency_price: number;
  visibility: string;
}

/**
 * Whop Promo Code response
 */
interface WhopPromoCode {
  id: string;
  code: string;
  amount_off?: number;
  percent_off?: number;
  max_uses?: number;
  uses: number;
}

/**
 * Plan creation options
 */
export interface CreatePlanOptions {
  name: string;
  billingPeriod: 'monthly' | 'yearly' | 'weekly' | 'one_time';
  price: number; // In cents
  visibility?: 'visible' | 'hidden';
}

/**
 * Promo code creation options
 */
export interface CreatePromoOptions {
  code: string;
  percentOff?: number;
  amountOff?: number; // In cents
  maxUses?: number;
  expiresAt?: string;
}

/**
 * List campaigns options
 */
export interface ListCampaignsOptions {
  perPage?: number;
  after?: string;
  visibility?: 'visible' | 'hidden' | 'archived';
}

/**
 * Campaign Service for managing Whop clipper programs
 */
export class CampaignService {
  private client = createWhopClient();

  /**
   * Create a new clipper campaign (Whop Product)
   */
  async createCampaign(config: Partial<CampaignConfig> & { name: string }): Promise<WhopProduct> {
    logger.info('Creating campaign', { name: config.name });

    try {
      const product = await this.client.post<WhopProduct>('/products', {
        title: config.name,
        description: config.description || `Clipper program: ${config.name}`,
        visibility: config.isActive ? 'visible' : 'hidden',
        // Note: Custom fields like CPM rates would be stored in product metadata
        // or in a separate database for the clipper program
      });

      logger.info('Campaign created', { productId: product.id, title: product.title });
      return product;
    } catch (error) {
      logger.error('Failed to create campaign', { name: config.name, error });
      throw error;
    }
  }

  /**
   * Get campaign details by product ID
   */
  async getCampaign(productId: string): Promise<WhopProduct> {
    logger.debug('Getting campaign', { productId });

    try {
      const product = await this.client.get<WhopProduct>(`/products/${productId}`);
      return product;
    } catch (error) {
      if (error instanceof WhopApiError && error.statusCode === 404) {
        logger.warn('Campaign not found', { productId });
      }
      throw error;
    }
  }

  /**
   * Update campaign settings
   */
  async updateCampaign(
    productId: string,
    updates: Partial<Pick<CampaignConfig, 'name' | 'description' | 'isActive'>>
  ): Promise<WhopProduct> {
    logger.info('Updating campaign', { productId, updates });

    try {
      const payload: Record<string, unknown> = {};

      if (updates.name) payload.title = updates.name;
      if (updates.description) payload.description = updates.description;
      if (updates.isActive !== undefined) {
        payload.visibility = updates.isActive ? 'visible' : 'hidden';
      }

      const product = await this.client.patch<WhopProduct>(`/products/${productId}`, payload);
      logger.info('Campaign updated', { productId });
      return product;
    } catch (error) {
      logger.error('Failed to update campaign', { productId, error });
      throw error;
    }
  }

  /**
   * List all campaigns with pagination
   */
  async listCampaigns(options: ListCampaignsOptions = {}): Promise<{
    campaigns: WhopProduct[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    logger.debug('Listing campaigns', { ...options });

    try {
      const params: Record<string, string | number | undefined> = {
        per_page: options.perPage || 20,
        after: options.after,
      };

      if (options.visibility) {
        params.visibility = options.visibility;
      }

      const response = await this.client.get<{
        data: WhopProduct[];
        pagination: { next_cursor?: string; has_more: boolean };
      }>('/products', params);

      return {
        campaigns: response.data,
        nextCursor: response.pagination.next_cursor,
        hasMore: response.pagination.has_more,
      };
    } catch (error) {
      logger.error('Failed to list campaigns', { error });
      throw error;
    }
  }

  /**
   * Get all campaigns (handles pagination automatically)
   */
  async getAllCampaigns(): Promise<WhopProduct[]> {
    const allCampaigns: WhopProduct[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.listCampaigns({ after: cursor });
      allCampaigns.push(...result.campaigns);
      cursor = result.nextCursor;
    } while (cursor);

    return allCampaigns;
  }

  /**
   * Create a pricing plan for a campaign
   */
  async createPlan(productId: string, options: CreatePlanOptions): Promise<WhopPlan> {
    logger.info('Creating plan', { productId, name: options.name });

    try {
      const plan = await this.client.post<WhopPlan>('/plans', {
        product_id: productId,
        name: options.name,
        billing_period: options.billingPeriod,
        base_currency_price: options.price,
        visibility: options.visibility || 'visible',
      });

      logger.info('Plan created', { planId: plan.id, productId });
      return plan;
    } catch (error) {
      logger.error('Failed to create plan', { productId, error });
      throw error;
    }
  }

  /**
   * List plans for a product
   */
  async listPlans(productId: string): Promise<WhopPlan[]> {
    logger.debug('Listing plans', { productId });

    try {
      const response = await this.client.get<{ data: WhopPlan[] }>('/plans', {
        product_id: productId,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to list plans', { productId, error });
      throw error;
    }
  }

  /**
   * Create a promo code for a campaign
   */
  async createPromoCode(productId: string, options: CreatePromoOptions): Promise<WhopPromoCode> {
    logger.info('Creating promo code', { productId, code: options.code });

    try {
      const payload: Record<string, unknown> = {
        product_id: productId,
        code: options.code,
      };

      if (options.percentOff !== undefined) {
        payload.percent_off = options.percentOff;
      }
      if (options.amountOff !== undefined) {
        payload.amount_off = options.amountOff;
      }
      if (options.maxUses !== undefined) {
        payload.max_uses = options.maxUses;
      }
      if (options.expiresAt) {
        payload.expires_at = options.expiresAt;
      }

      const promo = await this.client.post<WhopPromoCode>('/promo_codes', payload);
      logger.info('Promo code created', { promoId: promo.id, code: promo.code });
      return promo;
    } catch (error) {
      logger.error('Failed to create promo code', { productId, error });
      throw error;
    }
  }

  /**
   * Archive a campaign (soft delete)
   */
  async archiveCampaign(productId: string): Promise<WhopProduct> {
    logger.info('Archiving campaign', { productId });
    return this.client.patch<WhopProduct>(`/products/${productId}`, {
      visibility: 'archived',
    });
  }

  /**
   * Delete a campaign permanently
   */
  async deleteCampaign(productId: string): Promise<void> {
    logger.info('Deleting campaign', { productId });
    await this.client.delete(`/products/${productId}`);
    logger.info('Campaign deleted', { productId });
  }
}

/**
 * Create a CampaignService instance
 */
export function createCampaignService(): CampaignService {
  return new CampaignService();
}
