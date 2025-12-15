---
name: whop-clipper-agent
description: Comprehensive Whop platform integration for clipper programs, Content Rewards campaigns, and creator economy management. Use when creating Whop apps, configuring clipper campaigns, managing submissions/entries, processing payouts, setting up courses/training, or any Whop API operations.
---

# Whop Clipper Agent

Manages Whop platform operations for clipper programs via the `whop_sdk_api` MCP server.

## MCP Server: whop_sdk_api

### ⚠️ CRITICAL: Endpoint Discovery Order

**ALWAYS check `references/api-endpoints.md` FIRST before using `whop_sdk_api:list_api_endpoints`.**

The `list_api_endpoints` tool returns a massive response that consumes significant context. The local reference file contains all 60+ endpoints with schemas and is much more efficient.

**Correct order:**
1. Search `references/api-endpoints.md` for the endpoint you need
2. Use `whop_sdk_api:get_api_endpoint_schema` if you need parameter details
3. Use `whop_sdk_api:invoke_api_endpoint` to execute the call
4. **ONLY** use `list_api_endpoints` as a last resort if the endpoint isn't documented

### Available MCP Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `whop_sdk_api:list_api_endpoints` | List/search all endpoints | **LAST RESORT ONLY** |
| `whop_sdk_api:get_api_endpoint_schema` | Get schema for specific endpoint | When you need exact parameter details |
| `whop_sdk_api:invoke_api_endpoint` | Execute an API endpoint | Primary tool for all API operations |

## Core Workflows

### 1. Campaign Setup Flow
```
1. Create Product → create_products
2. Create Plan → create_plans
3. Create Experience → create_experiences
4. Configure Content Rewards (dashboard only)
```

### 2. Submission Review Flow
```
1. List pending → list_entries (status="pending")
2. Review details → retrieve_entries
3. Approve/Reject → approve_entries / deny_entries
```

### 3. Payout Flow
```
1. Check balance → retrieve_ledger_accounts
2. Send transfer → create_transfers
3. Verify → retrieve_transfers
```

## API Endpoint Quick Reference

| Category | Endpoints |
|----------|-----------|
| **Products** | create_products, retrieve_products, update_products, list_products |
| **Plans** | create_plans, retrieve_plans, update_plans, list_plans |
| **Entries** | list_entries, retrieve_entries, approve_entries, deny_entries |
| **Transfers** | create_transfers, retrieve_transfers, list_transfers |
| **Ledger** | retrieve_ledger_accounts |
| **Courses** | create_courses, create_course_chapters, create_course_lessons |
| **Forums** | create_forum_posts, list_forum_posts |
| **Notifications** | create_notifications |

For complete schemas: See `references/api-endpoints.md`

## Payout Calculation

```
CPM Payout = (views / 1000) × cpm_rate
Total = CPM Payout + flat_fee
Final = min(Total, max_cap)
```

## Whop Company Reference

**Organized AI**
- Company ID: `biz_157ccz38dAMlyE`
- Dashboard: https://whop.com/dashboard/biz_157ccz38dAMlyE/