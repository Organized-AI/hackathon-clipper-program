# Phase 3: Submission Workflow Engine

**Phase:** 3 of 6  
**Name:** Submission Workflow  
**Dependencies:** Phase 2 (Campaign Management)

---

## Context

This phase implements the core submission workflow - the heart of any clipper program. Clippers submit content URLs, and this service manages the approval/rejection flow with automatic payout calculation.

---

## Whop API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `list_entries` | Get pending submissions |
| `retrieve_entries` | Get submission details |
| `approve_entries` | Accept and trigger payout |
| `deny_entries` | Reject with reason |

---

## Tasks

### Task 1: Create Submission Service

Create `src/services/submission-service.ts` with:
- listSubmissions(filters) with pagination
- getSubmission(entryId)
- approveSubmission(entryId, options) with payout calculation
- rejectSubmission(entryId, reason)
- bulkReview(experienceId, options)
- getStats(experienceId)

### Task 2: Create Queue Processor

Create `src/services/queue-processor.ts` with:
- Interval-based processing
- Auto-approve after configured hours
- Batch processing

### Task 3: Add Submission CLI Commands

Create `src/cli/submission-cli.ts` with:
- listPendingCommand
- approveCommand
- rejectCommand
- statsCommand

---

## Success Criteria

- [ ] `listSubmissions` returns filtered results
- [ ] `approveSubmission` calculates payout correctly
- [ ] `rejectSubmission` records reason
- [ ] Queue processor runs on interval

---

## Git Commit

```bash
git commit -m "feat(phase-3): Submission workflow complete"
```