import { createPayoutService, PayoutError, PayoutErrorCode, type PayoutRequest, type TransferFilters } from '../services/payout-service.js';
import { createLogger } from '../lib/index.js';

const logger = createLogger('PayoutCLI');

/**
 * CLI command result
 */
interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Get current balance
 */
export async function balanceCommand(): Promise<CommandResult> {
  const service = createPayoutService();

  try {
    logger.info('Getting balance...');

    const balance = await service.getBalance();

    return {
      success: true,
      message: 'Current balance',
      data: {
        balance: `$${balance.balance.toFixed(2)}`,
        availableBalance: `$${balance.availableBalance.toFixed(2)}`,
        currency: balance.currency.toUpperCase(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to get balance: ${message}`,
    };
  }
}

/**
 * Send a payout to a clipper
 */
export async function sendPayoutCommand(args: {
  recipientId: string;
  amount: number;
  submissionId?: string;
  note?: string;
}): Promise<CommandResult> {
  const service = createPayoutService();

  try {
    logger.info('Sending payout...', { recipientId: args.recipientId, amount: args.amount });

    const request: PayoutRequest = {
      recipientId: args.recipientId,
      amount: args.amount,
      submissionId: args.submissionId,
      note: args.note,
    };

    const transfer = await service.sendPayout(request);

    return {
      success: true,
      message: `Payout of $${args.amount.toFixed(2)} sent successfully`,
      data: {
        transferId: transfer.id,
        amount: `$${(transfer.amount / 100).toFixed(2)}`,
        status: transfer.status,
        recipient: transfer.recipient_id,
        created: transfer.created_at,
      },
    };
  } catch (error) {
    if (error instanceof PayoutError) {
      return {
        success: false,
        message: error.message,
        data: {
          code: error.code,
          details: error.details,
        },
      };
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to send payout: ${message}`,
    };
  }
}

/**
 * List payouts with optional filters
 */
export async function listPayoutsCommand(args: {
  recipientId?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}): Promise<CommandResult> {
  const service = createPayoutService();

  try {
    logger.info('Listing payouts...', args);

    const filters: TransferFilters = {
      recipientId: args.recipientId,
      status: args.status as TransferFilters['status'],
      perPage: args.limit,
      after: args.cursor,
    };

    const result = await service.listTransfers(filters);

    const transfers = result.transfers.map((t) => ({
      id: t.id,
      amount: `$${(t.amount / 100).toFixed(2)}`,
      status: t.status,
      recipient: t.recipient_id,
      created: t.created_at,
    }));

    return {
      success: true,
      message: `Found ${transfers.length} payout(s)${result.hasMore ? ' (more available)' : ''}`,
      data: {
        transfers,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to list payouts: ${message}`,
    };
  }
}

/**
 * Get transfer status
 */
export async function getTransferStatusCommand(args: {
  transferId: string;
}): Promise<CommandResult> {
  const service = createPayoutService();

  try {
    logger.info('Getting transfer status...', { transferId: args.transferId });

    const transfer = await service.getTransferStatus(args.transferId);

    return {
      success: true,
      message: `Transfer status: ${transfer.status}`,
      data: {
        id: transfer.id,
        amount: `$${(transfer.amount / 100).toFixed(2)}`,
        status: transfer.status,
        recipient: transfer.recipient_id,
        created: transfer.created_at,
        updated: transfer.updated_at,
        metadata: transfer.metadata,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to get transfer status: ${message}`,
    };
  }
}

/**
 * Get payout summary
 */
export async function payoutSummaryCommand(args: {
  days?: number;
}): Promise<CommandResult> {
  const service = createPayoutService();

  try {
    logger.info('Getting payout summary...');

    const options: { since?: Date; until?: Date } = {};
    if (args.days) {
      options.since = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000);
    }

    const summary = await service.getPayoutSummary(options);

    const statusBreakdown = Object.entries(summary.byStatus).map(([status, data]) => ({
      status,
      count: data.count,
      amount: `$${data.amount.toFixed(2)}`,
    }));

    return {
      success: true,
      message: `Payout summary${args.days ? ` (last ${args.days} days)` : ''}`,
      data: {
        totalPaid: `$${summary.totalPaid.toFixed(2)}`,
        transferCount: summary.transferCount,
        averageAmount: `$${summary.avgPayoutAmount.toFixed(2)}`,
        byStatus: statusBreakdown,
        currency: summary.currency.toUpperCase(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to get payout summary: ${message}`,
    };
  }
}

/**
 * Get total paid to a recipient
 */
export async function totalPaidCommand(args: {
  recipientId?: string;
  days?: number;
}): Promise<CommandResult> {
  const service = createPayoutService();

  try {
    logger.info('Getting total paid...', args);

    const options: { recipientId?: string; since?: Date } = {
      recipientId: args.recipientId,
    };
    if (args.days) {
      options.since = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000);
    }

    const result = await service.getTotalPaid(options);

    return {
      success: true,
      message: `Total paid${args.recipientId ? ` to ${args.recipientId}` : ''}${args.days ? ` (last ${args.days} days)` : ''}`,
      data: {
        totalPaid: `$${result.totalPaid.toFixed(2)}`,
        transferCount: result.transferCount,
        currency: result.currency.toUpperCase(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to get total paid: ${message}`,
    };
  }
}

/**
 * Process batch payouts from file
 */
export async function batchPayoutCommand(args: {
  payouts: Array<{ recipientId: string; amount: number; submissionId?: string }>;
}): Promise<CommandResult> {
  const service = createPayoutService();

  try {
    logger.info('Processing batch payouts...', { count: args.payouts.length });

    const result = await service.processBatchPayouts(args.payouts);

    return {
      success: result.failed === 0,
      message: `Batch complete: ${result.successful} successful, ${result.failed} failed`,
      data: {
        successful: result.successful,
        failed: result.failed,
        totalAmount: `$${result.totalAmount.toFixed(2)}`,
        transfers: result.transfers.map((t) => ({
          id: t.id,
          amount: `$${(t.amount / 100).toFixed(2)}`,
          recipient: t.recipient_id,
        })),
        errors: result.errors,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to process batch payouts: ${message}`,
    };
  }
}
