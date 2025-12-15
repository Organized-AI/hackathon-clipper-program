# Phase 4: Payout System

**Phase:** 4 of 6  
**Name:** Payout System  
**Dependencies:** Phase 3 (Submission Workflow)

---

## Context

This phase implements the payout system for processing clipper earnings. It integrates with Whop's Transfers and Ledger APIs to manage payments to clippers.

---

## Whop API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `create_transfers` | Initiate payout to clipper |
| `retrieve_transfers` | Get transfer status |
| `list_transfers` | View payment history |
| `retrieve_ledger_accounts` | Check budget balance |

---

## Tasks

### Task 1: Create Payout Service

Create `src/services/payout-service.ts` with:
- sendPayout(request) with balance validation
- getTransferStatus(transferId)
- listTransfers(options) with pagination
- getBalance()
- processBatchPayouts(payouts)
- getTotalPaid(options)

### Task 2: Create Payout CLI Commands

Create `src/cli/payout-cli.ts` with:
- balanceCommand
- sendPayoutCommand
- listPayoutsCommand
- payoutSummaryCommand

---

## Success Criteria

- [ ] `sendPayout` validates minimum threshold
- [ ] `sendPayout` checks available balance
- [ ] `getBalance` returns correct amounts
- [ ] PayoutError provides clear error codes

---

## Git Commit

```bash
git commit -m "feat(phase-4): Payout system complete"
```