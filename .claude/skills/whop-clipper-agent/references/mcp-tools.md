# Whop MCP Server Tools Reference

## Server Configuration

```json
{
  "mcpServers": {
    "whop_sdk_api": {
      "command": "npx",
      "args": ["-y", "@whop/mcp", "--client=claude", "--tools=dynamic"],
      "env": {
        "WHOP_API_KEY": "your_api_key",
        "WHOP_APP_ID": "app_xxx"
      }
    }
  }
}
```

## Available Tools

### 1. list_api_endpoints

**Purpose:** List or search all available API endpoints

```
whop_sdk_api:list_api_endpoints
  args: { "search_query": "entries" }
```

### 2. get_api_endpoint_schema

**Purpose:** Get the full schema for a specific endpoint

```
whop_sdk_api:get_api_endpoint_schema
  args: { "endpoint": "approve_entries" }
```

### 3. invoke_api_endpoint

**Purpose:** Execute an API endpoint with provided arguments

```
whop_sdk_api:invoke_api_endpoint
  endpoint_name: "list_entries"
  args: {
    "experience_id": "exp_xxx",
    "status": "pending",
    "per_page": 20
  }
```

## Common Tool Call Examples

### Products
```
# List all products
endpoint_name: "list_products"
args: { "jq_filter": ".data[] | {id, title}" }

# Create product
endpoint_name: "create_products"
args: {
  "title": "My Clipper Program",
  "visibility": "visible",
  "industry_type": "clipping"
}
```

### Entries
```
# List pending
endpoint_name: "list_entries"
args: {
  "experience_id": "exp_xxx",
  "status": "pending"
}

# Approve
endpoint_name: "approve_entries"
args: {
  "id": "ent_xxx",
  "payout_amount": 50.00
}

# Reject
endpoint_name: "deny_entries"
args: {
  "id": "ent_xxx",
  "reason": "Does not meet guidelines"
}
```

### Transfers
```
# Check balance
endpoint_name: "retrieve_ledger_accounts"
args: {}

# Send payout
endpoint_name: "create_transfers"
args: {
  "recipient_id": "user_xxx",
  "amount": 10000,
  "currency": "usd"
}
```

## Pagination Pattern

```
# First page
args: { "per_page": 20 }

# Response includes:
# { "page_info": { "has_next_page": true, "end_cursor": "xxx" } }

# Next page
args: { "per_page": 20, "after": "xxx" }
```

## jq_filter Examples

```
# Get only IDs and titles
".data[] | {id, title}"

# Count results
".data | length"

# First item only
".data[0]"

# Filter by status
".data[] | select(.status == \"pending\")"
```