# Whop Content Rewards Platform

Guide to Whop's Content Rewards system for clipper programs.

## Platform Overview

- **$1.5 billion** total sales processed
- **3.5 billion views** generated
- **Hourly automatic payouts**
- **$10 minimum withdrawal**

## Configuration (Dashboard Only)

Content Rewards is configured via Whop dashboard, not API.

### Dashboard Path
```
Whop Dashboard → Apps → Content Rewards → Configure Campaign
```

### Campaign Settings

| Setting | Options |
|---------|---------|
| CPM Rate | $0.10 - $50.00 |
| Flat Fee | $0 - $50.00 |
| Total Budget | Any amount |
| Per-Clip Cap | Any amount |
| Auto-Approve | On/Off (48 hours) |

### Approved Platforms
- TikTok
- YouTube Shorts
- Instagram Reels
- X (Twitter)

## Pricing Tiers

| Tier | CPM Rate |
|------|----------|
| Budget | $0.10-$0.30 |
| Standard | $0.60-$1.00 |
| Common | $1.00-$2.00 |
| Premium | $3.00-$6.00 |
| Elite | $5.00-$50.00 |

## Payout Calculation

```
payout = (views / 1000) × cpm_rate + flat_fee
final = min(payout, per_clip_cap)
```

### Example: $20 CPM with $100 cap
```
50,000 views → $1,000 → capped at $100
5,000 views → $100
2,000 views → $40
```

## Submission States

| State | Description |
|-------|-------------|
| Pending | Awaiting review |
| Approved | Payout triggered |
| Flagged | Manual review needed |
| Rejected | Did not meet requirements |

## View Verification

Views are pulled directly from platform APIs (not self-reported):
- TikTok Official API
- YouTube Official API
- Instagram Official API
- X Official API

## Best Practices

1. **Set appropriate rates** by content type
2. **Configure budget controls** (caps, thresholds)
3. **Provide clear guidelines** with examples
4. **Enable auto-approve** for trusted clippers