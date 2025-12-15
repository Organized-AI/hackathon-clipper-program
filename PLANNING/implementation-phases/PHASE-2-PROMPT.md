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
| `create_promo_codes` | Early access codes |

---

## Tasks

### Task 1: Create Campaign Service

Create `src/services/campaign-service.ts` with:
- createCampaign(config: CampaignConfig)
- getCampaign(productId)
- updateCampaign(productId, updates)
- listCampaigns(options) with pagination
- createPlan(productId, plan)
- createPromoCode(productId, options)

### Task 2: Create Campaign CLI Commands

Create `src/cli/campaign-cli.ts` with:
- createCampaignCommand
- listCampaignsCommand
- createPromoCommand

### Task 3: Create Services Index

Create `src/services/index.ts` exporting all services.

---

## Success Criteria

- [ ] CampaignService creates products via Whop API
- [ ] Plans can be attached to products
- [ ] Promo codes are generated correctly
- [ ] `listCampaigns` returns paginated results

---

## Git Commit

```bash
git commit -m "feat(phase-2): Campaign management complete"
```