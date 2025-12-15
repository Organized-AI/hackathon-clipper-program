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
| 0 | Project Setup | ⏳ |
| 1 | Core Infrastructure | ⏳ |
| 2 | Campaign Management | ⏳ |
| 3 | Submission Workflow | ⏳ |
| 4 | Payout System | ⏳ |
| 5 | Community Features | ⏳ |
| 6 | Integration & Testing | ⏳ |

## Project Structure

```
├── .claude/              # Claude Code configuration
│   └── agents/           # Agent definitions
├── PLANNING/             # Implementation phases
│   ├── IMPLEMENTATION-MASTER-PLAN.md
│   └── implementation-phases/
│       ├── PHASE-0-PROMPT.md
│       ├── PHASE-1-PROMPT.md
│       └── ...
├── src/
│   ├── lib/              # Core utilities
│   ├── services/         # Business logic
│   ├── types/            # Type definitions
│   └── index.ts          # CLI entry point
└── CLAUDE-CODE-PHASE-0.md  # Quick start
```

## How to Build

### Using Claude Code

```bash
cd /Users/supabowl/Library/Mobile\ Documents/com~apple~CloudDocs/BHT\ Promo\ iCloud/Organized\ AI/Windsurf/hackathon-clipper-program
claude --dangerously-skip-permissions

# Then in Claude Code:
"Read PLANNING/implementation-phases/PHASE-0-PROMPT.md and execute all tasks"
```

### Phase-by-Phase

Each phase prompt contains:
- Complete code to implement
- Success criteria to verify
- Completion template to create
- Git commit message

## Whop API Integration

Uses `@whop/mcp` SDK with these endpoint groups:

| Category | Endpoints |
|----------|-----------|
| Products | create, retrieve, update, list |
| Plans | create, update, list |
| Entries | list, retrieve, approve, deny |
| Transfers | create, retrieve, list |
| Courses | create courses, chapters, lessons |
| Forums | create posts, list posts |
| Notifications | create |

## Environment Variables

```env
WHOP_API_KEY=your_api_key       # Required
WHOP_WEBHOOK_SECRET=webhook_key # Optional
WHOP_APP_ID=app_xxx             # Optional
```

## Key Documentation

- [Implementation Master Plan](PLANNING/IMPLEMENTATION-MASTER-PLAN.md)
- [Phase 0: Project Setup](PLANNING/implementation-phases/PHASE-0-PROMPT.md)
- [Whop API Docs](https://docs.whop.com/apps)
