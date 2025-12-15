# Whop API Endpoints Reference

Complete reference for all Whop API endpoints organized by resource.

-----

## 🏢 Core Platform

### Apps

|Endpoint       |Operation|Description        |
|---------------|---------|-------------------|
|`create_apps`  |write    |Create a new App   |
|`retrieve_apps`|read     |Get app by ID      |
|`update_apps`  |write    |Update app settings|
|`list_apps`    |read     |List all apps      |

### App Builds

|Endpoint             |Operation|Description                |
|---------------------|---------|---------------------------|
|`create_app_builds`  |write    |Create a new app build     |
|`retrieve_app_builds`|read     |Get build by ID            |
|`list_app_builds`    |read     |List all builds            |
|`promote_app_builds` |write    |Promote build to production|

### Companies

|Endpoint            |Operation|Description         |
|--------------------|---------|--------------------|
|`create_companies`  |write    |Create a new company|
|`retrieve_companies`|read     |Get company by ID   |
|`list_companies`    |read     |List all companies  |

-----

## 📦 Products & Plans

### Products

|Endpoint           |Operation|Description           |
|-------------------|---------|----------------------|
|`create_products`  |write    |Create a new product  |
|`retrieve_products`|read     |Get product by ID     |
|`update_products`  |write    |Update product details|
|`list_products`    |read     |List all products     |
|`delete_products`  |write    |Delete a product      |

### Plans

|Endpoint        |Operation|Description          |
|----------------|---------|---------------------|
|`create_plans`  |write    |Create a pricing plan|
|`retrieve_plans`|read     |Get plan by ID       |
|`update_plans`  |write    |Update plan details  |
|`list_plans`    |read     |List all plans       |
|`delete_plans`  |write    |Delete a plan        |

### Promo Codes

|Endpoint              |Operation|Description         |
|----------------------|---------|--------------------|
|`create_promo_codes`  |write    |Create a promo code |
|`retrieve_promo_codes`|read     |Get promo code by ID|
|`list_promo_codes`    |read     |List all promo codes|
|`delete_promo_codes`  |write    |Delete a promo code |

-----

## 💳 Commerce

### Checkout Configurations

|Endpoint                          |Operation|Description            |
|----------------------------------|---------|-----------------------|
|`create_checkout_configurations`  |write    |Create checkout session|
|`retrieve_checkout_configurations`|read     |Get checkout config    |
|`list_checkout_configurations`    |read     |List checkout configs  |

### Payments

|Endpoint           |Operation|Description         |
|-------------------|---------|--------------------|
|`retrieve_payments`|read     |Get payment by ID   |
|`list_payments`    |read     |List all payments   |
|`refund_payments`  |write    |Refund a payment    |
|`retry_payments`   |write    |Retry failed payment|
|`void_payments`    |write    |Void a payment      |

### Invoices

|Endpoint           |Operation|Description      |
|-------------------|---------|-----------------|
|`create_invoices`  |write    |Create an invoice|
|`retrieve_invoices`|read     |Get invoice by ID|
|`list_invoices`    |read     |List all invoices|
|`void_invoices`    |write    |Void an invoice  |

### Transfers

|Endpoint            |Operation|Description             |
|--------------------|---------|------------------------|
|`create_transfers`  |write    |Create a transfer/payout|
|`retrieve_transfers`|read     |Get transfer by ID      |
|`list_transfers`    |read     |List all transfers      |

### Ledger Accounts

|Endpoint                  |Operation|Description               |
|--------------------------|---------|--------------------------|
|`retrieve_ledger_accounts`|read     |Get ledger account balance|

-----

## 👥 Membership & Access

### Users

|Endpoint            |Operation|Description                  |
|--------------------|---------|-----------------------------|
|`retrieve_users`    |read     |Get user by ID               |
|`check_access_users`|read     |Check user access to resource|

### Members

|Endpoint          |Operation|Description     |
|------------------|---------|----------------|
|`retrieve_members`|read     |Get member by ID|
|`list_members`    |read     |List all members|

### Memberships

|Endpoint              |Operation|Description             |
|----------------------|---------|------------------------|
|`retrieve_memberships`|read     |Get membership by ID    |
|`update_memberships`  |write    |Update membership       |
|`list_memberships`    |read     |List all memberships    |
|`cancel_memberships`  |write    |Cancel a membership     |
|`pause_memberships`   |write    |Pause a membership      |
|`resume_memberships`  |write    |Resume paused membership|

### Authorized Users

|Endpoint                   |Operation|Description          |
|---------------------------|---------|---------------------|
|`retrieve_authorized_users`|read     |Get authorized user  |
|`list_authorized_users`    |read     |List authorized users|

### Access Tokens

|Endpoint              |Operation|Description        |
|----------------------|---------|-------------------|
|`create_access_tokens`|write    |Create access token|

-----

## 📚 Content & Experiences

### Experiences

|Endpoint               |Operation|Description                   |
|-----------------------|---------|------------------------------|
|`create_experiences`   |write    |Create an experience          |
|`retrieve_experiences` |read     |Get experience by ID          |
|`update_experiences`   |write    |Update experience             |
|`list_experiences`     |read     |List all experiences          |
|`delete_experiences`   |write    |Delete an experience          |
|`attach_experiences`   |write    |Attach experience to product  |
|`detach_experiences`   |write    |Detach experience from product|
|`duplicate_experiences`|write    |Duplicate an experience       |

### Courses

|Endpoint          |Operation|Description     |
|------------------|---------|----------------|
|`create_courses`  |write    |Create a course |
|`retrieve_courses`|read     |Get course by ID|
|`update_courses`  |write    |Update course   |
|`list_courses`    |read     |List all courses|
|`delete_courses`  |write    |Delete a course |

### Course Chapters

|Endpoint                  |Operation|Description      |
|--------------------------|---------|-----------------|
|`create_course_chapters`  |write    |Create a chapter |
|`retrieve_course_chapters`|read     |Get chapter by ID|
|`update_course_chapters`  |write    |Update chapter   |
|`list_course_chapters`    |read     |List all chapters|
|`delete_course_chapters`  |write    |Delete a chapter |

### Course Lessons

|Endpoint                 |Operation|Description     |
|-------------------------|---------|----------------|
|`create_course_lessons`  |write    |Create a lesson |
|`retrieve_course_lessons`|read     |Get lesson by ID|
|`update_course_lessons`  |write    |Update lesson   |
|`list_course_lessons`    |read     |List all lessons|
|`delete_course_lessons`  |write    |Delete a lesson |

### Course Students

|Endpoint                  |Operation|Description         |
|--------------------------|---------|--------------------|
|`retrieve_course_students`|read     |Get student progress|
|`list_course_students`    |read     |List all students   |

### Course Lesson Interactions

|Endpoint                             |Operation|Description           |
|-------------------------------------|---------|----------------------|
|`retrieve_course_lesson_interactions`|read     |Get lesson interaction|
|`list_course_lesson_interactions`    |read     |List interactions     |

-----

## 💬 Community

### Chat Channels

|Endpoint                |Operation|Description            |
|------------------------|---------|-----------------------|
|`retrieve_chat_channels`|read     |Get channel by ID      |
|`update_chat_channels`  |write    |Update channel settings|
|`list_chat_channels`    |read     |List all channels      |

### Messages

|Endpoint           |Operation|Description             |
|-------------------|---------|------------------------|
|`create_messages`  |write    |Send a message          |
|`retrieve_messages`|read     |Get message by ID       |
|`update_messages`  |write    |Edit a message          |
|`list_messages`    |read     |List messages in channel|

### Forums

|Endpoint         |Operation|Description          |
|-----------------|---------|---------------------|
|`retrieve_forums`|read     |Get forum by ID      |
|`update_forums`  |write    |Update forum settings|
|`list_forums`    |read     |List all forums      |

### Forum Posts

|Endpoint              |Operation|Description        |
|----------------------|---------|-------------------|
|`create_forum_posts`  |write    |Create a forum post|
|`retrieve_forum_posts`|read     |Get post by ID     |
|`update_forum_posts`  |write    |Edit a post        |
|`list_forum_posts`    |read     |List forum posts   |

### Reactions

|Endpoint            |Operation|Description       |
|--------------------|---------|------------------|
|`create_reactions`  |write    |Add a reaction    |
|`retrieve_reactions`|read     |Get reaction by ID|
|`list_reactions`    |read     |List reactions    |

### Support Channels

|Endpoint                   |Operation|Description           |
|---------------------------|---------|----------------------|
|`create_support_channels`  |write    |Create support channel|
|`retrieve_support_channels`|read     |Get support channel   |
|`list_support_channels`    |read     |List support channels |

-----

## 🎬 Content Rewards (Clipper Program)

### Entries

|Endpoint          |Operation|Description         |
|------------------|---------|--------------------|
|`retrieve_entries`|read     |Get submission entry|
|`list_entries`    |read     |List all entries    |
|`approve_entries` |write    |Approve a submission|
|`deny_entries`    |write    |Reject a submission |

### Reviews

|Endpoint          |Operation|Description     |
|------------------|---------|----------------|
|`retrieve_reviews`|read     |Get review by ID|
|`list_reviews`    |read     |List all reviews|

### Notifications

|Endpoint              |Operation|Description               |
|----------------------|---------|--------------------------|
|`create_notifications`|write    |Send notification to users|

### Shipments

|Endpoint            |Operation|Description       |
|--------------------|---------|------------------|
|`create_shipments`  |write    |Create a shipment |
|`retrieve_shipments`|read     |Get shipment by ID|
|`list_shipments`    |read     |List all shipments|

-----

## Summary Statistics

|Category             |Resources|Endpoints|
|---------------------|---------|---------|
|Core Platform        |3        |11       |
|Products & Plans     |3        |14       |
|Commerce             |5        |15       |
|Membership & Access  |5        |12       |
|Content & Experiences|6        |30       |
|Community            |6        |17       |
|Content Rewards      |4        |8        |
|**Total**            |**32**   |**107**  |

-----

## Clipper Program Critical Endpoints

For the Hackathon Clipper Program, these are the key endpoints:

```
# Campaign Setup
products → create_products, update_products
plans → create_plans (CPM/hybrid pricing)
experiences → create_experiences (Content Rewards app)

# Clipper Management
memberships → list_memberships, update_memberships
authorized_users → list_authorized_users

# Submission Workflow
entries → list_entries, approve_entries, deny_entries

# Payouts
transfers → create_transfers (automated payouts)
payments → list_payments (track earnings)
ledger_accounts → retrieve_ledger_accounts (budget tracking)

# Communication
notifications → create_notifications
messages → create_messages
```

-----

## Authentication

All endpoints require authentication via:

- `WHOP_API_KEY` - API key for your app
- `WHOP_APP_ID` - Your app identifier
- `WHOP_WEBHOOK_SECRET` - For webhook verification

```bash
export WHOP_API_KEY="your_api_key"
export WHOP_APP_ID="app_xxxxxxxxxxxxxx"
export WHOP_WEBHOOK_SECRET="your_webhook_secret"
```

-----

## MCP Server Configuration

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
