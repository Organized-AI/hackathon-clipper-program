# Phase 1: Core Infrastructure

**Phase:** 1 of 6  
**Name:** Core Infrastructure  
**Dependencies:** Phase 0 (Project Setup)

---

## Context

With the project foundation in place, this phase builds the core infrastructure: Whop client wrapper, configuration management, logging utilities, and type definitions specific to clipper programs.

---

## Tasks

### Task 1: Create Configuration Manager

Create `src/lib/config.ts` with Zod validation for:
- Whop API settings (apiKey, webhookSecret, appId, baseUrl)
- App settings (env, logLevel)
- Clipper settings (defaultCpmRate, minPayoutThreshold, maxPayoutCap, autoApproveHours)

### Task 2: Create Logger Utility

Create `src/lib/logger.ts` with:
- Log levels (debug, info, warn, error)
- Structured output with timestamps
- Context support via child loggers

### Task 3: Create Whop Client Wrapper

Create `src/lib/whop-client.ts` with:
- Authenticated fetch wrapper
- GET, POST, PUT, PATCH, DELETE methods
- Error handling with WhopApiError class
- Pagination support

### Task 4: Create Clipper Type Definitions

Create `src/types/clipper.ts` with Zod schemas for:
- CampaignConfig
- Submission
- PayoutCalculation
- ClipperProfile
- Helper functions: calculatePayout, meetsMinimumThreshold

### Task 5: Create Index Export

Create `src/lib/index.ts` exporting all utilities.

### Task 6: Update Main Entry Point

Update `src/index.ts` to test connection to Whop API.

---

## Success Criteria

- [ ] Configuration loads and validates with Zod
- [ ] Logger outputs with proper formatting and levels
- [ ] WhopClient makes authenticated requests
- [ ] Type definitions compile without errors
- [ ] `npm run dev` connects to Whop API

---

## Git Commit

```bash
git commit -m "feat(phase-1): Core infrastructure complete"
```