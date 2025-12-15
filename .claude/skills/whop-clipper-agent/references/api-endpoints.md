# Whop API Endpoints Reference

Complete reference for all available Whop SDK API endpoints.

## Products

| Endpoint | Operation | Description |
|----------|-----------|-------------|
| `create_products` | write | Create new product |
| `retrieve_products` | read | Get product by ID |
| `update_products` | write | Update product |
| `list_products` | read | List products |
| `delete_products` | write | Delete product |

### Product Schema
```json
{
  "id": "prod_xxx",
  "title": "string",
  "description": "string",
  "visibility": "visible|hidden|archived",
  "industry_type": "clipping|ai|marketing_agency"
}
```

## Plans

| Endpoint | Operation | Description |
|----------|-----------|-------------|
| `create_plans` | write | Create pricing plan |
| `retrieve_plans` | read | Get plan by ID |
| `update_plans` | write | Update plan |
| `list_plans` | read | List plans |

### Plan Schema
```json
{
  "id": "plan_xxx",
  "product_id": "prod_xxx",
  "name": "string",
  "billing_period": "monthly|yearly|weekly|one_time",
  "base_currency_price": 0,
  "visibility": "visible|hidden"
}
```

## Entries (Submissions)

| Endpoint | Operation | Description |
|----------|-----------|-------------|
| `list_entries` | read | List submissions |
| `retrieve_entries` | read | Get entry details |
| `approve_entries` | write | Approve submission |
| `deny_entries` | write | Reject submission |

### Entry Schema
```json
{
  "id": "ent_xxx",
  "experience_id": "exp_xxx",
  "user": { "id": "user_xxx", "username": "string" },
  "status": "pending|approved|denied|flagged",
  "content_url": "string",
  "view_count": 0,
  "platform": "tiktok|youtube|instagram|x"
}
```

## Transfers (Payouts)

| Endpoint | Operation | Description |
|----------|-----------|-------------|
| `create_transfers` | write | Send payout |
| `retrieve_transfers` | read | Get transfer status |
| `list_transfers` | read | List transfers |

### Transfer Schema
```json
{
  "id": "txn_xxx",
  "amount": 10000,
  "currency": "usd",
  "status": "pending|processing|completed|failed",
  "recipient_id": "user_xxx"
}
```

**Note:** Amount is in cents (10000 = $100.00)

## Ledger

| Endpoint | Operation | Description |
|----------|-----------|-------------|
| `retrieve_ledger_accounts` | read | Get account balance |

## Courses

| Endpoint | Operation | Description |
|----------|-----------|-------------|
| `create_courses` | write | Create course |
| `create_course_chapters` | write | Add chapter |
| `create_course_lessons` | write | Add lesson |

## Forums

| Endpoint | Operation | Description |
|----------|-----------|-------------|
| `create_forum_posts` | write | Create post |
| `list_forum_posts` | read | List posts |

## Notifications

| Endpoint | Operation | Description |
|----------|-----------|-------------|
| `create_notifications` | write | Send notification |

## Pagination

All list endpoints support:
```json
{
  "per_page": 20,
  "after": "cursor_string"
}
```

## jq_filter Parameter

Always use to reduce response size:
```
jq_filter: ".data[] | {id, title, status}"
```