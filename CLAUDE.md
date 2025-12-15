# Hackathon Clipper Program

TypeScript CLI application for managing Whop-powered clipper programs.

## Overview

This project enables:
- **Campaign Management**: Create and manage clipper programs with CPM/flat-fee pricing
- **Submission Workflow**: Process clipper submissions with approval/rejection flow
- **Automated Payouts**: Calculate and send payments based on verified views
- **Community Features**: Training courses, forum posts, and notifications

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Whop credentials from https://whop.com/dashboard/developer

# Run CLI
npm run dev help
```

## Implementation Status

| Phase | Name | Status |
|-------|------|--------|
| 0 | Project Setup | ✅ |
| 1 | Core Infrastructure | ✅ |
| 2 | Campaign Management | ✅ |
| 3 | Submission Workflow | ✅ |
| 4 | Payout System | ✅ |
| 5 | Community Features | ✅ |
| 6 | Integration & Testing | ✅ |

## Project Structure

```
├── src/
│   ├── lib/              # Core utilities
│   │   ├── config.ts     # Zod-validated configuration
│   │   ├── logger.ts     # Structured logging
│   │   └── whop-client.ts # API client wrapper
│   ├── services/         # Business logic
│   │   ├── campaign-service.ts
│   │   ├── submission-service.ts
│   │   ├── payout-service.ts
│   │   ├── community-service.ts
│   │   └── queue-processor.ts
│   ├── cli/              # CLI command handlers
│   │   ├── campaign-cli.ts
│   │   ├── submission-cli.ts
│   │   ├── payout-cli.ts
│   │   └── community-cli.ts
│   ├── types/            # Type definitions
│   │   └── clipper.ts    # Clipper-specific types
│   ├── webhooks/         # Webhook handlers
│   │   └── handler.ts
│   └── index.ts          # CLI entry point
├── tests/                # Test suite
│   └── integration.test.ts
├── PLANNING/             # Implementation phases
│   └── implementation-phases/
└── vitest.config.ts      # Test configuration
```

## CLI Usage

```bash
# Show help
npm run dev help

# Test API connection
npm run dev test-connection
```

### Campaign Commands

```bash
# Create a campaign
npm run dev campaign:create "Summer Clips" "Summer clipper promotion"

# List all campaigns
npm run dev campaign:list --all

# Get campaign details
npm run dev campaign:get prod_xxx

# Update campaign
npm run dev campaign:update prod_xxx --name "New Name"

# Create pricing plan
npm run dev plan:create prod_xxx "Basic Plan" 9.99

# Create promo code
npm run dev promo:create prod_xxx SUMMER50 --percentOff 50
```

### Submission Commands

```bash
# List pending submissions
npm run dev submissions:pending exp_xxx

# List all submissions
npm run dev submissions:list --status approved

# Approve submission
npm run dev submissions:approve ent_xxx --viewCount 50000

# Reject submission
npm run dev submissions:reject ent_xxx "Content violates guidelines"

# Get statistics
npm run dev submissions:stats exp_xxx

# Bulk review (auto-approve)
npm run dev submissions:bulk-review exp_xxx --hours 48 --minViews 1000
```

### Payout Commands

```bash
# Check balance
npm run dev payout:balance

# Send payout
npm run dev payout:send user_xxx 25.00 --note "Summer bonus"

# List payouts
npm run dev payout:list --recipient user_xxx

# Get transfer status
npm run dev payout:status txn_xxx

# Get payout summary
npm run dev payout:summary --days 30

# Get total paid
npm run dev payout:total --recipient user_xxx
```

### Community Commands

```bash
# Create onboarding course
npm run dev community:onboarding exp_xxx

# Create custom course
npm run dev community:course exp_xxx "Advanced Editing"

# List courses
npm run dev community:courses exp_xxx

# Post announcement
npm run dev community:announce feed_xxx "Important Update" --content "Details here..."

# Send notification
npm run dev community:notify exp_xxx "New Feature!" --body "Check out..."
```

## Environment Variables

```env
# Required
WHOP_API_KEY=your_api_key_here

# Optional
WHOP_WEBHOOK_SECRET=your_webhook_secret
WHOP_APP_ID=app_xxxxxxxxxxxxxx
NODE_ENV=development
LOG_LEVEL=debug

# Clipper Settings (optional, has defaults)
DEFAULT_CPM_RATE=5.00
MIN_PAYOUT_THRESHOLD=1.00
MAX_PAYOUT_CAP=500.00
AUTO_APPROVE_HOURS=48
```

## Payout Calculation

```
CPM Payout = (views / 1000) × cpm_rate
Total = CPM Payout + flat_fee + bonus_payout
Final = min(Total, max_cap)

Only paid if Final >= min_threshold
```

**Example:**
- Views: 50,000
- CPM Rate: $5.00
- Flat Fee: $0
- Payout: (50000 / 1000) × 5 = $250.00

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Webhook Integration

The webhook handler supports:
- `entry.created` - New submission received
- `entry.approved` - Submission approved
- `entry.denied` - Submission rejected
- `transfer.created` - Payout initiated
- `transfer.completed` - Payout successful
- `transfer.failed` - Payout failed
- `membership.created` - New clipper joined
- `membership.deleted` - Clipper left

## Whop API Integration

Uses `@whop/sdk` with these endpoint groups:

| Category | Endpoints |
|----------|-----------|
| Products | create, retrieve, update, list, delete |
| Plans | create, retrieve, update, list |
| Entries | list, retrieve, approve, deny |
| Transfers | create, retrieve, list |
| Ledger | retrieve accounts |
| Courses | create courses, chapters, lessons |
| Forums | create posts, list posts |
| Notifications | create |

## Key Documentation

- [Implementation Master Plan](PLANNING/IMPLEMENTATION-MASTER-PLAN.md)
- [Whop API Docs](https://docs.whop.com/apps)
- [Whop MCP SDK](https://github.com/whopio/whop-mcp)
