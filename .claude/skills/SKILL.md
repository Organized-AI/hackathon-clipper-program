---
name: whop-clipper-agent
description: Comprehensive Whop platform integration for clipper programs, Content Rewards campaigns, and creator economy management. Use when creating Whop apps, configuring clipper campaigns, managing submissions/entries, processing payouts, setting up courses/training, or any Whop API operations. Triggers include "Whop", "clipper program", "Content Rewards", "CPM campaign", "submission workflow", "clipper payout", "create Whop app", "manage entries", "approve submissions", or when working with Whop MCP tools.
---

# Whop Clipper Agent

Manages Whop platform operations for clipper programs via the `whop_sdk_api` MCP server.

## MCP Configuration

```json
{
  "mcpServers": {
    "whop_sdk_api": {
      "command": "npx",
      "args": ["-y", "@whop/mcp", "--client=claude", "--tools=dynamic"],
      "env": {
        "WHOP_API_KEY": "${WHOP_API_KEY}",
        "WHOP_APP_ID": "${WHOP_APP_ID}"
      }
    }
  }
}
```

## Core Workflows

### 1. Campaign Setup Flow

```
1. Create Product (clipper program container)
   → create_products: name, description, visibility, industry_type="clipping"

2. Create Plan (pricing tier)
   → create_plans: product_id, name, billing_period, base_currency_price

3. Create Experience (app instance)
   → create_experiences: product_id, name

4. Configure Content Rewards (dashboard only - no API)
   → Set CPM rate, budget, platforms, caps in Whop dashboard
```

### 2. Submission Review Flow

```
1. List pending entries
   → list_entries: status="pending", experience_id

2. Review submission details
   → retrieve_entries: entry_id

3. Approve or reject
   → approve_entries: entry_id, payout_amount
   → deny_entries: entry_id, reason
```

### 3. Payout Flow

```
1. Check balance
   → retrieve_ledger_accounts

2. Send transfer
   → create_transfers: recipient_id, amount, currency

3. Verify transfer
   → retrieve_transfers: transfer_id
```

## API Endpoint Quick Reference

| Category | Endpoints |
|----------|-----------|
| **Products** | `create_products`, `retrieve_products`, `update_products`, `list_products`, `delete_products` |
| **Plans** | `create_plans`, `retrieve_plans`, `update_plans`, `list_plans`, `delete_plans` |
| **Entries** | `list_entries`, `retrieve_entries`, `approve_entries`, `deny_entries` |
| **Transfers** | `create_transfers`, `retrieve_transfers`, `list_transfers` |
| **Ledger** | `retrieve_ledger_accounts` |
| **Courses** | `create_courses`, `create_course_chapters`, `create_course_lessons` |
| **Forums** | `create_forum_posts`, `list_forum_posts`, `update_forum_posts` |
| **Notifications** | `create_notifications` |
| **Apps** | `create_apps`, `retrieve_apps`, `update_apps`, `list_apps` |

For complete endpoint schemas: See `references/api-endpoints.md`

## Content Rewards Configuration

Content Rewards is configured via Whop dashboard, not API. Key settings:

| Setting | Description |
|---------|-------------|
| **CPM Rate** | $0.10-$50 per 1K verified views |
| **Flat Fee** | $0-$50 per approved submission |
| **Budget** | Total campaign spend limit |
| **Per-Clip Cap** | Max payout per submission |
| **Min Threshold** | Minimum views to qualify |
| **Platforms** | TikTok, YouTube Shorts, Reels, X |
| **Auto-Approve** | Enable after 48 hours |

For detailed Content Rewards documentation: See `references/content-rewards.md`

## Campaign Templates

### Elite Tier (e.g., DGX Spark Hackathon)
```
Budget: $200
CPM: $20/1K views
Per-Clip Cap: $100
Source: Twitch/livestream
Platforms: TikTok, YouTube Shorts, Reels, X
```

### Standard Tier
```
Budget: $1,000-$5,000
CPM: $2-$3/1K views
Per-Clip Cap: $500
Flat Bonus: $5-$10/submission
```

### Budget Tier
```
Budget: $500
CPM: $0.50-$1/1K views
Per-Clip Cap: $100
High volume, faceless content
```

For more examples: See `references/campaign-examples.md`

## Tool Calling Patterns

### Always use `jq_filter` parameter
```
whop_sdk_api:invoke_api_endpoint
  endpoint_name: "list_products"
  args: { jq_filter: ".data[] | {id, title, visibility}" }
```

### Pagination pattern
```
1. Initial call with per_page
2. Check page_info.has_next_page
3. Use page_info.end_cursor as "after" parameter
```

### Error handling
- Check response for error fields
- Log failed operations with context
- Retry with exponential backoff for rate limits

## Key Business Logic

### Payout Calculation
```
CPM Payout = (views / 1000) × cpm_rate
Total = CPM Payout + flat_fee
Final = min(Total, max_cap)
```

### Minimum Threshold Check
```
eligible = (views / 1000) × cpm_rate >= min_threshold
```

### Budget Depletion
```
remaining = total_budget - sum(approved_payouts)
campaign_active = remaining > 0
```

## Whop Company Reference

**Organized AI**
- Company ID: `biz_157ccz38dAMlyE`
- Dashboard: https://whop.com/dashboard/biz_157ccz38dAMlyE/
- Industry: AI/Clipping
