# Campaign Configuration Examples

## Example 1: DGX Spark Hackathon (Elite Tier)

```yaml
Campaign: DGX Spark Frontier Hackathon Clips
Company: Organized AI (biz_157ccz38dAMlyE)
Source: twitch.tv/jordaaanhill

Budget Settings:
  Total Budget: $200
  CPM Rate: $20.00 per 1K views
  Per-Clip Cap: $100
  Minimum Threshold: $2 (100 views)

Platforms:
  - TikTok
  - YouTube Shorts
  - Instagram Reels
  - X (Twitter)

Approval:
  Auto-Approve: Enable after 48 hours
  AI Moderation: ON
```

### Budget Math
```
$200 ÷ $20 CPM = 10,000 total views
$100 cap ÷ $20 CPM = 5,000 views max per clip
```

## Example 2: Standard Creator Program

```yaml
Budget Settings:
  Total Budget: $5,000
  CPM Rate: $2.00 per 1K views
  Flat Bonus: $5.00 per clip
  Per-Clip Cap: $500
```

## Example 3: Music Audio (Budget Tier)

```yaml
Budget Settings:
  Total Budget: $1,000
  CPM Rate: $0.10 per 1K views
  Per-Clip Cap: $50
  Min Threshold: $1 (10,000 views)
```

## Quick Setup Templates

### Test Campaign
```yaml
Budget: $100-$200
CPM: $2.00
Per-Clip Cap: $50
Auto-Approve: ON
```

### Sustained Program
```yaml
Budget: $1,000-$5,000
CPM: $1.50-$3.00
Flat Bonus: $5.00
Per-Clip Cap: $250
```

### Viral Push
```yaml
Budget: $10,000+
CPM: $3.00-$5.00
Flat Bonus: $10.00
Per-Clip Cap: $1,000
```

## API Implementation Pattern

```javascript
// 1. Create Product
await whop.create_products({
  title: "My Clipper Program",
  industry_type: "clipping"
});

// 2. Create free access plan
await whop.create_plans({
  product_id: "prod_xxx",
  name: "Clipper Access",
  billing_period: "one_time",
  base_currency_price: 0
});

// 3. Create experience
await whop.create_experiences({
  product_id: "prod_xxx",
  name: "Content Rewards"
});

// 4. Configure in dashboard (not API)
```