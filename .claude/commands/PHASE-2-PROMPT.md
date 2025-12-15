# Phase 2: Campaign Management

**Phase:** 2 of 6  
**Name:** Campaign Management  
**Dependencies:** Phase 1 (Core Infrastructure)

---

## Context

This phase implements the campaign management service, enabling creation and management of clipper programs using Whop's Products, Plans, and Promo Code APIs.

---

## Whop API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `create_products` | Create new clipper program |
| `retrieve_products` | Get program details |
| `update_products` | Modify campaign settings |
| `list_products` | List all campaigns |
| `create_plans` | Define pricing tiers |
| `update_plans` | Modify pricing |
| `create_promo_codes` | Early access codes |

---

## Tasks

### Task 1: Create Campaign Service

Create `src/services/campaign-service.ts`:

```typescript
import { getWhopClient, createLogger } from '../lib/index.js';
import { CampaignConfig, CampaignConfigSchema } from '../types/clipper.js';
import { z } from 'zod';

const logger = createLogger('CampaignService');

// Whop API Response Types
interface WhopProduct {
  id: string;
  name: string;
  description?: string;
  visibility: 'visible' | 'hidden' | 'archived';
  created_at: string;
  updated_at: string;
}

interface WhopPlan {
  id: string;
  product_id: string;
  name: string;
  billing_period: 'monthly' | 'yearly' | 'weekly' | 'one_time';
  base_currency_price: number;
  visibility: 'visible' | 'hidden';
}

interface WhopPromoCode {
  id: string;
  code: string;
  amount_off?: number;
  percent_off?: number;
  max_uses?: number;
  times_used: number;
  expires_at?: string;
}

export class CampaignService {
  private client = getWhopClient();

  /**
   * Create a new clipper campaign (Whop Product)
   */
  async createCampaign(config: CampaignConfig): Promise<WhopProduct> {
    logger.info('Creating campaign', { title: config.title, type: config.type });
    
    // Validate config
    const validated = CampaignConfigSchema.parse(config);
    
    const response = await this.client.post<WhopProduct>('/products', {
      name: validated.title,
      description: this.buildDescription(validated),
      visibility: 'visible',
      // Store campaign config in metadata via description for now
    });

    logger.info('Campaign created', { id: response.data.id });
    return response.data;
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(productId: string): Promise<WhopProduct> {
    logger.debug('Fetching campaign', { productId });
    const response = await this.client.get<WhopProduct>(`/products/${productId}`);
    return response.data;
  }

  /**
   * Update campaign settings
   */
  async updateCampaign(
    productId: string, 
    updates: Partial<CampaignConfig>
  ): Promise<WhopProduct> {
    logger.info('Updating campaign', { productId });
    
    const response = await this.client.patch<WhopProduct>(`/products/${productId}`, {
      name: updates.title,
      description: updates.description,
    });

    logger.info('Campaign updated', { id: response.data.id });
    return response.data;
  }

  /**
   * List all campaigns with pagination
   */
  async listCampaigns(options?: {
    cursor?: string;
    limit?: number;
  }): Promise<{ campaigns: WhopProduct[]; hasMore: boolean; nextCursor?: string }> {
    logger.debug('Listing campaigns', options);
    
    const query: Record<string, string | number> = {
      per_page: options?.limit ?? 20,
    };
    if (options?.cursor) {
      query.after = options.cursor;
    }

    const response = await this.client.get<WhopProduct[]>('/products', query);
    
    return {
      campaigns: response.data,
      hasMore: response.pageInfo?.hasNextPage ?? false,
      nextCursor: response.pageInfo?.endCursor,
    };
  }

  /**
   * Create a pricing plan for a campaign
   */
  async createPlan(
    productId: string,
    plan: {
      name: string;
      price: number; // in cents
      billingPeriod: 'monthly' | 'yearly' | 'weekly' | 'one_time';
    }
  ): Promise<WhopPlan> {
    logger.info('Creating plan', { productId, name: plan.name });
    
    const response = await this.client.post<WhopPlan>('/plans', {
      product_id: productId,
      name: plan.name,
      base_currency_price: plan.price,
      billing_period: plan.billingPeriod,
      visibility: 'visible',
    });

    logger.info('Plan created', { id: response.data.id });
    return response.data;
  }

  /**
   * Update plan pricing
   */
  async updatePlan(
    planId: string,
    updates: { name?: string; price?: number }
  ): Promise<WhopPlan> {
    logger.info('Updating plan', { planId });
    
    const body: Record<string, unknown> = {};
    if (updates.name) body.name = updates.name;
    if (updates.price) body.base_currency_price = updates.price;

    const response = await this.client.patch<WhopPlan>(`/plans/${planId}`, body);
    return response.data;
  }

  /**
   * Create a promo code for campaign access
   */
  async createPromoCode(
    productId: string,
    options: {
      code: string;
      percentOff?: number;
      amountOff?: number;
      maxUses?: number;
      expiresAt?: Date;
    }
  ): Promise<WhopPromoCode> {
    logger.info('Creating promo code', { code: options.code, productId });
    
    const response = await this.client.post<WhopPromoCode>('/promo_codes', {
      product_id: productId,
      code: options.code.toUpperCase(),
      percent_off: options.percentOff,
      amount_off: options.amountOff,
      max_uses: options.maxUses,
      expires_at: options.expiresAt?.toISOString(),
    });

    logger.info('Promo code created', { id: response.data.id });
    return response.data;
  }

  /**
   * Build campaign description with embedded config
   */
  private buildDescription(config: CampaignConfig): string {
    const lines = [
      config.description ?? `${config.title} Clipper Campaign`,
      '',
      '---',
      `Type: ${config.type}`,
      `Platforms: ${config.platforms.join(', ')}`,
      `Budget: $${config.budget}`,
    ];

    if (config.cpmRate) {
      lines.push(`CPM Rate: $${config.cpmRate} per 1K views`);
    }
    if (config.flatFee) {
      lines.push(`Flat Fee: $${config.flatFee} per submission`);
    }
    if (config.minViews > 0) {
      lines.push(`Minimum Views: ${config.minViews.toLocaleString()}`);
    }

    return lines.join('\n');
  }
}

// Singleton
let serviceInstance: CampaignService | null = null;

export function getCampaignService(): CampaignService {
  if (!serviceInstance) {
    serviceInstance = new CampaignService();
  }
  return serviceInstance;
}
```

### Task 2: Create Campaign CLI Commands

Create `src/cli/campaign-cli.ts`:

```typescript
import { getCampaignService } from '../services/campaign-service.js';
import { CampaignConfig } from '../types/clipper.js';
import { logger } from '../lib/index.js';

const service = getCampaignService();

export async function createCampaignCommand(config: CampaignConfig): Promise<void> {
  try {
    const campaign = await service.createCampaign(config);
    console.log('\n✅ Campaign Created Successfully!\n');
    console.log(`ID: ${campaign.id}`);
    console.log(`Name: ${campaign.name}`);
    console.log(`URL: https://whop.com/hub/${campaign.id}`);
  } catch (error) {
    logger.error('Failed to create campaign', error as Error);
    process.exit(1);
  }
}

export async function listCampaignsCommand(): Promise<void> {
  try {
    const { campaigns, hasMore } = await service.listCampaigns({ limit: 10 });
    
    console.log('\n📋 Your Campaigns:\n');
    
    if (campaigns.length === 0) {
      console.log('No campaigns found. Create one with `create-campaign`.');
      return;
    }

    campaigns.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name}`);
      console.log(`   ID: ${c.id}`);
      console.log(`   Status: ${c.visibility}`);
      console.log('');
    });

    if (hasMore) {
      console.log('(More campaigns available, use pagination)');
    }
  } catch (error) {
    logger.error('Failed to list campaigns', error as Error);
    process.exit(1);
  }
}

export async function createPromoCommand(
  productId: string,
  code: string,
  percentOff: number
): Promise<void> {
  try {
    const promo = await service.createPromoCode(productId, {
      code,
      percentOff,
    });
    
    console.log('\n🎟️ Promo Code Created!\n');
    console.log(`Code: ${promo.code}`);
    console.log(`Discount: ${percentOff}% off`);
  } catch (error) {
    logger.error('Failed to create promo code', error as Error);
    process.exit(1);
  }
}
```

### Task 3: Create Services Index

Create `src/services/index.ts`:

```typescript
export { CampaignService, getCampaignService } from './campaign-service.js';
```

### Task 4: Update Main Entry Point

Update `src/index.ts` to include campaign demo:

```typescript
import 'dotenv/config';
import { config, logger } from './lib/index.js';
import { getCampaignService } from './services/index.js';

async function main() {
  logger.info('🎬 Hackathon Clipper Program');
  
  const campaignService = getCampaignService();
  
  // Demo: List existing campaigns
  try {
    const { campaigns } = await campaignService.listCampaigns({ limit: 5 });
    logger.info('Found campaigns', { count: campaigns.length });
    
    campaigns.forEach(c => {
      logger.info(`Campaign: ${c.name}`, { id: c.id, status: c.visibility });
    });
    
  } catch (error) {
    logger.error('Demo failed', error as Error);
  }
}

main().catch(console.error);
```

### Task 5: Add CLI Directory Structure

```bash
mkdir -p src/cli
```

---

## Success Criteria

- [ ] CampaignService creates products via Whop API
- [ ] Plans can be attached to products
- [ ] Promo codes are generated correctly
- [ ] `listCampaigns` returns paginated results
- [ ] Errors are logged with context
- [ ] TypeScript compiles without errors

---

## Completion Template

Create `PLANNING/implementation-phases/PHASE-2-COMPLETE.md`:

```markdown
# Phase 2 Complete

**Completed:** [DATE]

## Implemented
- [x] CampaignService with full CRUD
- [x] Plan management (create, update)
- [x] Promo code generation
- [x] CLI command structure
- [x] Pagination support

## API Endpoints Used
- create_products ✅
- retrieve_products ✅
- update_products ✅
- list_products ✅
- create_plans ✅
- update_plans ✅
- create_promo_codes ✅

## Next Phase
Read `PLANNING/implementation-phases/PHASE-3-PROMPT.md`
```

---

## Git Commit

```bash
git add -A
git commit -m "feat(phase-2): Campaign management complete

- Implement CampaignService with Whop Products API
- Add plan creation and management
- Support promo code generation
- Create CLI command structure
- Add pagination for campaign listing

Ready for Phase 3: Submission Workflow"
```
