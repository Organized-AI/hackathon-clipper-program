# Phase 0: Project Setup

**Phase:** 0 of 6  
**Name:** Project Setup  
**Dependencies:** None

---

## Context

You are setting up the Hackathon Clipper Program - a TypeScript application that integrates with Whop's Content Rewards system via the @whop/mcp SDK. This phase establishes the project foundation.

---

## Tasks

### Task 1: Initialize package.json

Create `package.json` with the following configuration:

```json
{
  "name": "hackathon-clipper-program",
  "version": "0.1.0",
  "description": "Whop-powered clipper program management for hackathon events",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "test": "vitest"
  },
  "dependencies": {
    "@whop/sdk": "^0.1.0",
    "dotenv": "^16.3.1",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsx": "^4.6.0",
    "typescript": "^5.3.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "vitest": "^1.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Task 2: Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Task 3: Create .env.example

```env
# Whop API Configuration
# Get these from https://whop.com/dashboard/developer

WHOP_API_KEY=your_api_key_here
WHOP_WEBHOOK_SECRET=your_webhook_secret_here
WHOP_APP_ID=app_xxxxxxxxxxxxxx

# Application Settings
NODE_ENV=development
LOG_LEVEL=debug
```

### Task 4: Create .gitignore

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Test coverage
coverage/
```

### Task 5: Create CLAUDE.md

```markdown
# Hackathon Clipper Program

## Overview
TypeScript application for managing clipper programs via Whop's Content Rewards API.

## Quick Start
\`\`\`bash
npm install
cp .env.example .env
# Add your Whop credentials to .env
npm run dev
\`\`\`

## Project Structure
- `src/lib/` - Core utilities (Whop client, config, logger)
- `src/services/` - Business logic (campaigns, submissions, payouts)
- `src/types/` - TypeScript type definitions
- `PLANNING/` - Phase prompts and master plan

## Key Commands
- `npm run dev` - Development with hot reload
- `npm run build` - Production build
- `npm test` - Run tests

## API Integration
Uses @whop/mcp SDK with these core services:
- Campaign Management: Products, Plans, Promo Codes
- Submission Workflow: Entries (approve/deny)
- Payouts: Transfers, Ledger
- Community: Courses, Forums, Notifications

## Current Phase
See `PLANNING/IMPLEMENTATION-MASTER-PLAN.md` for progress.
```

### Task 6: Create Claude Code MCP Configuration

Create `.claude/settings.local.json`:

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

### Task 7: Create Placeholder Entry Point

Create `src/index.ts`:

```typescript
import 'dotenv/config';

console.log('🎬 Hackathon Clipper Program');
console.log('Phase 0 Setup Complete');
console.log('Run: npm install && npm run dev');
```

### Task 8: Run npm install

Execute `npm install` to install all dependencies.

---

## Success Criteria

- [ ] `package.json` created with correct dependencies
- [ ] `tsconfig.json` configured for ES modules
- [ ] `.env.example` created with all required variables
- [ ] `.gitignore` prevents sensitive files from being tracked
- [ ] `CLAUDE.md` provides project overview
- [ ] `.claude/settings.local.json` has MCP configuration
- [ ] `npm install` completes without errors
- [ ] `npm run dev` executes without errors

---

## Completion Template

After completing all tasks, create `PLANNING/implementation-phases/PHASE-0-COMPLETE.md`:

```markdown
# Phase 0 Complete

**Completed:** [DATE]
**Duration:** [TIME]

## Implemented
- [x] Package.json with @whop/sdk dependency
- [x] TypeScript configuration (ES2022, NodeNext)
- [x] Environment configuration template
- [x] Git ignore patterns
- [x] Project documentation
- [x] MCP server configuration

## Verified
- [x] npm install successful
- [x] npm run dev executes

## Next Phase
Read `PLANNING/implementation-phases/PHASE-1-PROMPT.md`
```

---

## Git Commit

```bash
git add -A
git commit -m "feat(phase-0): Project setup complete

- Initialize TypeScript project with @whop/sdk
- Configure ES2022 modules with NodeNext resolution
- Add environment configuration template
- Setup MCP server integration for Claude Code
- Create project documentation (CLAUDE.md)

Ready for Phase 1: Core Infrastructure"
```
