# Hackathon Clipper Program - Implementation Master Plan

**Created:** December 2024  
**Project Path:** `/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/hackathon-clipper-program`  
**Runtime:** TypeScript/Node.js with @whop/mcp SDK

---

## Pre-Implementation Checklist

### ✅ Documentation (Complete)
| Component | Location | Status |
|-----------|----------|--------|
| Whop API Research | Project Knowledge | ✅ |
| Content Rewards System | Project Knowledge | ✅ |
| MCP Server Docs | @whop/mcp README | ✅ |

### ⏳ Code Implementation (To Build)
| Component | Location | Status |
|-----------|----------|--------|
| Project Setup | `package.json`, `tsconfig.json` | ⏳ Phase 0 |
| Core Infrastructure | `src/lib/*` | ⏳ Phase 1 |
| Campaign Management | `src/services/campaign-service.ts` | ⏳ Phase 2 |
| Submission Workflow | `src/services/submission-service.ts` | ⏳ Phase 3 |
| Payout System | `src/services/payout-service.ts` | ⏳ Phase 4 |
| Community Features | `src/services/community-service.ts` | ⏳ Phase 5 |
| Integration & CLI | `src/index.ts`, tests | ⏳ Phase 6 |

---

## Implementation Phases Overview

| Phase | Name | Files | Dependencies |
|-------|------|-------|--------------|
| 0 | Project Setup | package.json, tsconfig.json, .env | None |
| 1 | Core Infrastructure | src/lib/*, src/types/* | Phase 0 |
| 2 | Campaign Management | src/services/campaign-service.ts | Phase 1 |
| 3 | Submission Workflow | src/services/submission-service.ts | Phase 2 |
| 4 | Payout System | src/services/payout-service.ts | Phase 3 |
| 5 | Community Features | src/services/community-service.ts | Phase 1 |
| 6 | Integration & Testing | src/index.ts, tests/ | All phases |

---

## Environment Configuration

### Required Environment Variables

```env
WHOP_API_KEY=your_api_key_here
WHOP_WEBHOOK_SECRET=your_webhook_secret_here
WHOP_APP_ID=app_xxxxxxxxxxxxxx
```

### MCP Server Configuration

```json
{
  "mcpServers": {
    "whop_sdk_api": {
      "command": "npx",
      "args": ["-y", "@whop/mcp", "--client=claude", "--tools=dynamic"],
      "env": {
        "WHOP_API_KEY": "${WHOP_API_KEY}",
        "WHOP_WEBHOOK_SECRET": "${WHOP_WEBHOOK_SECRET}",
        "WHOP_APP_ID": "${WHOP_APP_ID}"
      }
    }
  }
}
```

---

## Whop API Endpoint Mapping

### Campaign Management (Phase 2)
| Operation | Endpoint | Purpose |
|-----------|----------|---------|
| Create Program | `create_products` | Initialize clipper program |
| Update Program | `update_products` | Modify campaign settings |
| Create Pricing | `create_plans` | Set CPM rates, flat fees |
| Promo Codes | `create_promo_codes` | Early access, discounts |

### Submission Workflow (Phase 3)
| Operation | Endpoint | Purpose |
|-----------|----------|---------|
| List Pending | `list_entries` | Get submission queue |
| Get Details | `retrieve_entries` | View submission info |
| Approve | `approve_entries` | Accept submission → trigger payout |
| Reject | `deny_entries` | Deny with reason |

### Payout System (Phase 4)
| Operation | Endpoint | Purpose |
|-----------|----------|---------|
| Send Payment | `create_transfers` | Initiate payout |
| List Payouts | `list_transfers` | View payment history |
| Check Balance | `retrieve_ledger_accounts` | Verify budget |

### Community Features (Phase 5)
| Operation | Endpoint | Purpose |
|-----------|----------|---------|
| Training | `create_courses`, `create_course_lessons` | Clipper education |
| Forums | `create_forum_posts`, `list_forum_posts` | Community discussion |
| Alerts | `create_notifications` | Status updates |

---

## Clipper Program Business Logic

### Pricing Models Supported

1. **Pure CPM**: Payment per 1,000 verified views
2. **Flat Fee**: Fixed payment per approved submission
3. **Hybrid**: Flat fee + CPM bonus
4. **Tiered**: Different rates based on clipper level

### Submission States

```
PENDING → APPROVED → PAID
         ↓
       FLAGGED → MANUAL_REVIEW → APPROVED/REJECTED
         ↓
       REJECTED
```

### Budget Controls

- **Minimum Payout Threshold**: Only process if views × rate ≥ threshold
- **Maximum Payout Cap**: Limit per-submission earnings
- **Per-Clipper Cap**: Daily/weekly earning limits
- **Auto-Approve**: Clean submissions approved after 48 hours

---

## Git Commit Strategy

Each phase completion should use this format:

```
feat(phase-X): [Phase Name] complete

- [Bullet point of what was implemented]
- [Another implementation detail]

Success criteria verified:
- [ ] Criterion 1
- [ ] Criterion 2
```

---

## Quick Start

```bash
# Navigate to project
cd /Users/supabowl/Library/Mobile\ Documents/com~apple~CloudDocs/BHT\ Promo\ iCloud/Organized\ AI/Windsurf/hackathon-clipper-program

# Start Claude Code with permissions
claude --dangerously-skip-permissions

# Execute first phase
"Read PLANNING/implementation-phases/PHASE-0-PROMPT.md and execute all tasks"
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Campaign Creation | < 30 seconds |
| Submission Processing | < 5 seconds per entry |
| Payout Initiation | Real-time on approval |
| API Response Caching | 5 minute TTL |
