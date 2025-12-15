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

Create `src/services/payout-service.ts`:

```typescript
import { getWhopClient, createLogger, config } from '../lib/index.js';
import { PayoutCalculation } from '../types/clipper.js';

const logger = createLogger('PayoutService');

// Whop Transfer Types
interface WhopTransfer {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recipient_id: string;
  recipient_type: 'user' | 'company';
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
  failure_reason?: string;
}

interface WhopLedgerAccount {
  id: string;
  balance: number;
  currency: string;
  available_balance: number;
  pending_balance: number;
}

export interface PayoutRequest {
  recipientId: string;
  amount: number;
  description?: string;
  submissionId?: string;
  breakdown?: PayoutCalculation;
}

export interface PayoutResult {
  transferId: string;
  status: WhopTransfer['status'];
  amount: number;
  recipientId: string;
  createdAt: Date;
}

export class PayoutService {
  private client = getWhopClient();

  /**
   * Send payout to a clipper
   */
  async sendPayout(request: PayoutRequest): Promise<PayoutResult> {
    logger.info('Initiating payout', { 
      recipientId: request.recipientId, 
      amount: request.amount 
    });

    // Validate minimum payout
    if (request.amount < config.clipper.minPayoutThreshold) {
      throw new PayoutError(
        'BELOW_THRESHOLD',
        `Payout amount $${request.amount} is below minimum threshold $${config.clipper.minPayoutThreshold}`
      );
    }

    // Check available balance first
    const balance = await this.getBalance();
    if (balance.available < request.amount) {
      throw new PayoutError(
        'INSUFFICIENT_FUNDS',
        `Insufficient balance. Available: $${balance.available}, Required: $${request.amount}`
      );
    }

    const response = await this.client.post<WhopTransfer>('/transfers', {
      amount: Math.round(request.amount * 100), // Convert to cents
      currency: 'usd',
      recipient_id: request.recipientId,
      recipient_type: 'user',
      description: request.description ?? 'Clipper payout',
      metadata: {
        submission_id: request.submissionId,
        breakdown: request.breakdown,
        source: 'hackathon-clipper-program',
      },
    });

    logger.info('Payout initiated', { 
      transferId: response.data.id,
      status: response.data.status 
    });

    return {
      transferId: response.data.id,
      status: response.data.status,
      amount: request.amount,
      recipientId: request.recipientId,
      createdAt: new Date(response.data.created_at),
    };
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(transferId: string): Promise<PayoutResult> {
    logger.debug('Fetching transfer status', { transferId });
    
    const response = await this.client.get<WhopTransfer>(`/transfers/${transferId}`);
    
    return {
      transferId: response.data.id,
      status: response.data.status,
      amount: response.data.amount / 100, // Convert from cents
      recipientId: response.data.recipient_id,
      createdAt: new Date(response.data.created_at),
    };
  }

  /**
   * List transfer history
   */
  async listTransfers(options?: {
    recipientId?: string;
    status?: WhopTransfer['status'];
    cursor?: string;
    limit?: number;
  }): Promise<{
    transfers: PayoutResult[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    logger.debug('Listing transfers', options);

    const query: Record<string, string | number> = {
      per_page: options?.limit ?? 20,
    };

    if (options?.recipientId) query.recipient_id = options.recipientId;
    if (options?.status) query.status = options.status;
    if (options?.cursor) query.after = options.cursor;

    const response = await this.client.get<WhopTransfer[]>('/transfers', query);

    const transfers = response.data.map(t => ({
      transferId: t.id,
      status: t.status,
      amount: t.amount / 100,
      recipientId: t.recipient_id,
      createdAt: new Date(t.created_at),
    }));

    return {
      transfers,
      hasMore: response.pageInfo?.hasNextPage ?? false,
      nextCursor: response.pageInfo?.endCursor,
    };
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{
    total: number;
    available: number;
    pending: number;
  }> {
    logger.debug('Fetching ledger balance');

    const response = await this.client.get<WhopLedgerAccount>('/ledger_accounts');

    return {
      total: response.data.balance / 100,
      available: response.data.available_balance / 100,
      pending: response.data.pending_balance / 100,
    };
  }

  /**
   * Batch process payouts for approved submissions
   */
  async processBatchPayouts(payouts: PayoutRequest[]): Promise<{
    successful: PayoutResult[];
    failed: { request: PayoutRequest; error: string }[];
  }> {
    logger.info('Processing batch payouts', { count: payouts.length });

    const results = {
      successful: [] as PayoutResult[],
      failed: [] as { request: PayoutRequest; error: string }[],
    };

    // Check total required vs available
    const totalRequired = payouts.reduce((sum, p) => sum + p.amount, 0);
    const balance = await this.getBalance();

    if (balance.available < totalRequired) {
      logger.warn('Insufficient funds for full batch', {
        available: balance.available,
        required: totalRequired,
      });
    }

    // Process each payout
    for (const request of payouts) {
      try {
        const result = await this.sendPayout(request);
        results.successful.push(result);
      } catch (error) {
        results.failed.push({
          request,
          error: (error as Error).message,
        });
      }
    }

    logger.info('Batch payouts complete', {
      successful: results.successful.length,
      failed: results.failed.length,
    });

    return results;
  }

  /**
   * Calculate total payouts for a period
   */
  async getTotalPaid(options?: {
    startDate?: Date;
    endDate?: Date;
    recipientId?: string;
  }): Promise<{
    totalAmount: number;
    transferCount: number;
    byStatus: Record<string, { count: number; amount: number }>;
  }> {
    logger.debug('Calculating total paid', options);

    let allTransfers: PayoutResult[] = [];
    let cursor: string | undefined;

    // Paginate through all transfers
    do {
      const { transfers, hasMore, nextCursor } = await this.listTransfers({
        recipientId: options?.recipientId,
        cursor,
        limit: 100,
      });
      allTransfers = allTransfers.concat(transfers);
      cursor = hasMore ? nextCursor : undefined;
    } while (cursor);

    // Filter by date if specified
    if (options?.startDate || options?.endDate) {
      allTransfers = allTransfers.filter(t => {
        const date = t.createdAt;
        if (options.startDate && date < options.startDate) return false;
        if (options.endDate && date > options.endDate) return false;
        return true;
      });
    }

    const byStatus: Record<string, { count: number; amount: number }> = {};
    let totalAmount = 0;

    allTransfers.forEach(t => {
      if (!byStatus[t.status]) {
        byStatus[t.status] = { count: 0, amount: 0 };
      }
      byStatus[t.status].count++;
      byStatus[t.status].amount += t.amount;
      
      if (t.status === 'completed') {
        totalAmount += t.amount;
      }
    });

    return {
      totalAmount,
      transferCount: allTransfers.length,
      byStatus,
    };
  }
}

export class PayoutError extends Error {
  constructor(
    public code: 'BELOW_THRESHOLD' | 'INSUFFICIENT_FUNDS' | 'TRANSFER_FAILED',
    message: string
  ) {
    super(message);
    this.name = 'PayoutError';
  }
}

// Singleton
let serviceInstance: PayoutService | null = null;

export function getPayoutService(): PayoutService {
  if (!serviceInstance) {
    serviceInstance = new PayoutService();
  }
  return serviceInstance;
}
```

### Task 2: Create Payout CLI Commands

Create `src/cli/payout-cli.ts`:

```typescript
import { getPayoutService } from '../services/payout-service.js';
import { logger } from '../lib/index.js';

const service = getPayoutService();

export async function balanceCommand(): Promise<void> {
  try {
    const balance = await service.getBalance();

    console.log('\n💰 Account Balance:\n');
    console.log(`Total:     $${balance.total.toFixed(2)}`);
    console.log(`Available: $${balance.available.toFixed(2)}`);
    console.log(`Pending:   $${balance.pending.toFixed(2)}`);
  } catch (error) {
    logger.error('Failed to get balance', error as Error);
    process.exit(1);
  }
}

export async function sendPayoutCommand(
  recipientId: string,
  amount: number,
  description?: string
): Promise<void> {
  try {
    const result = await service.sendPayout({
      recipientId,
      amount,
      description,
    });

    console.log('\n✅ Payout Initiated!\n');
    console.log(`Transfer ID: ${result.transferId}`);
    console.log(`Amount: $${result.amount.toFixed(2)}`);
    console.log(`Status: ${result.status}`);
    console.log(`Recipient: ${result.recipientId}`);
  } catch (error) {
    logger.error('Failed to send payout', error as Error);
    process.exit(1);
  }
}

export async function listPayoutsCommand(recipientId?: string): Promise<void> {
  try {
    const { transfers, hasMore } = await service.listTransfers({
      recipientId,
      limit: 20,
    });

    console.log('\n📋 Recent Payouts:\n');

    if (transfers.length === 0) {
      console.log('No payouts found.');
      return;
    }

    transfers.forEach((t, i) => {
      const statusIcon = {
        pending: '⏳',
        processing: '🔄',
        completed: '✅',
        failed: '❌',
      }[t.status];

      console.log(`${i + 1}. ${statusIcon} $${t.amount.toFixed(2)}`);
      console.log(`   ID: ${t.transferId}`);
      console.log(`   Recipient: ${t.recipientId}`);
      console.log(`   Date: ${t.createdAt.toLocaleDateString()}`);
      console.log('');
    });

    if (hasMore) {
      console.log('(More payouts available)');
    }
  } catch (error) {
    logger.error('Failed to list payouts', error as Error);
    process.exit(1);
  }
}

export async function payoutSummaryCommand(): Promise<void> {
  try {
    const summary = await service.getTotalPaid();

    console.log('\n📊 Payout Summary:\n');
    console.log(`Total Paid: $${summary.totalAmount.toFixed(2)}`);
    console.log(`Total Transfers: ${summary.transferCount}`);
    console.log('');
    console.log('By Status:');
    
    Object.entries(summary.byStatus).forEach(([status, data]) => {
      console.log(`  ${status}: ${data.count} transfers ($${data.amount.toFixed(2)})`);
    });
  } catch (error) {
    logger.error('Failed to get summary', error as Error);
    process.exit(1);
  }
}
```

### Task 3: Update Services Index

Update `src/services/index.ts`:

```typescript
export { CampaignService, getCampaignService } from './campaign-service.js';
export { 
  SubmissionService, 
  getSubmissionService,
  type SubmissionFilters,
} from './submission-service.js';
export { QueueProcessor, createQueueProcessor } from './queue-processor.js';
export {
  PayoutService,
  getPayoutService,
  PayoutError,
  type PayoutRequest,
  type PayoutResult,
} from './payout-service.js';
```

---

## Success Criteria

- [ ] `sendPayout` validates minimum threshold
- [ ] `sendPayout` checks available balance
- [ ] `getBalance` returns correct amounts
- [ ] `listTransfers` supports pagination
- [ ] `processBatchPayouts` handles failures gracefully
- [ ] PayoutError provides clear error codes

---

## Completion Template

Create `PLANNING/implementation-phases/PHASE-4-COMPLETE.md`:

```markdown
# Phase 4 Complete

**Completed:** [DATE]

## Implemented
- [x] PayoutService with transfer management
- [x] Balance checking before payouts
- [x] Batch payout processing
- [x] Payout summary statistics
- [x] CLI commands for payout management

## API Endpoints Used
- create_transfers ✅
- retrieve_transfers ✅
- list_transfers ✅
- retrieve_ledger_accounts ✅

## Next Phase
Read `PLANNING/implementation-phases/PHASE-5-PROMPT.md`
```

---

## Git Commit

```bash
git add -A
git commit -m "feat(phase-4): Payout system complete

- Implement PayoutService with transfer management
- Add balance validation before payouts
- Create batch payout processing
- Add payout summary and history
- Implement CLI commands for payouts

Ready for Phase 5: Community Features"
```
