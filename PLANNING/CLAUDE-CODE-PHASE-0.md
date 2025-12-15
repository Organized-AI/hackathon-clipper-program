# 🚀 Quick Start: Hackathon Clipper Program

**Copy this entire file's content into Claude Code to begin Phase 0.**

---

## Project Context

You are building a **Hackathon Clipper Program** - a TypeScript application that integrates with Whop's Content Rewards API to manage clipper campaigns, submissions, and payouts.

## Setup Instructions

```bash
cd /Users/supabowl/Library/Mobile\ Documents/com~apple~CloudDocs/BHT\ Promo\ iCloud/Organized\ AI/Windsurf/hackathon-clipper-program
claude --dangerously-skip-permissions
```

## Phase 0 Tasks

Execute these tasks in order:

### 1. Read the Phase 0 Prompt
```
Read PLANNING/implementation-phases/PHASE-0-PROMPT.md and execute all tasks
```

### 2. Verify Success Criteria
After completing Phase 0:
- `npm install` completes without errors
- `npm run dev` executes without errors
- `.env.example` exists with Whop credentials template
- MCP configuration exists in `.claude/settings.local.json`

### 3. Proceed to Phase 1
```
Read PLANNING/implementation-phases/PHASE-1-PROMPT.md and execute all tasks
```

---

## Full Implementation Path

| Phase | Focus | Key Files |
|-------|-------|-----------|
| 0 | Project Setup | package.json, tsconfig.json |
| 1 | Core Infrastructure | src/lib/* |
| 2 | Campaign Management | src/services/campaign-service.ts |
| 3 | Submission Workflow | src/services/submission-service.ts |
| 4 | Payout System | src/services/payout-service.ts |
| 5 | Community Features | src/services/community-service.ts |
| 6 | Integration & Testing | src/index.ts, tests/* |

---

## Environment Setup Required

Before starting, ensure you have:
1. **WHOP_API_KEY** - From https://whop.com/dashboard/developer
2. **WHOP_APP_ID** - Your app identifier
3. **Node.js 18+** installed

---

## MCP Server for Claude Code

Add to your Claude Code configuration:

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

**Ready? Start Claude Code and execute Phase 0!**
