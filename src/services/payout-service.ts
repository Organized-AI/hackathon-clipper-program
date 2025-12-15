import { createWhopClient, createLogger, WhopApiError, getConfig } from '../lib/index.js';

const logger = createLogger('PayoutService');

/**
 * Custom error class for payout-specific errors
 */
export class PayoutError extends Error {
  public readonly code: PayoutErrorCode;
  public readonly details?: unknown;

  constructor(message: string, code: PayoutErrorCode, details?: unknown) {
    super(message);
    this.name = 'PayoutError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Payout error codes
 */
export enum PayoutErrorCode {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  BELOW_MINIMUM_THRESHOLD = 'BELOW_MINIMUM_THRESHOLD',
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  TRANSFER_FAILED = 'TRANSFER_FAILED',
  ALREADY_PAID = 'ALREADY_PAID',
  API_ERROR = 'API_ERROR',
}

/**
 * Whop Transfer response
 */
interface WhopTransfer {
  id: string;
  amount: number; // In cents
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recipient_id: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Whop Ledger Account response
 */
interface WhopLedgerAccount {
  id: string;
  balance: number; // In cents
  currency: string;
  available_balance: number;
}

/**
 * Payout request
 */
export interface PayoutRequest {
  recipientId: string;
  amount: number; // In dollars
  currency?: string;
  submissionId?: string;
  note?: string;
}

/**
 * Transfer filter options
 */
export interface TransferFilters {
  recipientId?: string;
  status?: WhopTransfer['status'];
  perPage?: number;
  after?: string;
}

/**
 * Batch payout item
 */
export interface BatchPayoutItem {
  recipientId: string;
  amount: number;
  submissionId?: string;
}

/**
 * Batch payout result
 */
export interface BatchPayoutResult {
  successful: number;
  failed: number;
  totalAmount: number;
  transfers: WhopTransfer[];
  errors: Array<{ item: BatchPayoutItem; error: string }>;
}

/**
 * Payout Service for managing clipper payments
 */
export class PayoutService {
  private client = createWhopClient();
  private config = getConfig();

  /**
   * Get current balance
   */
  async getBalance(): Promise<{
    balance: number;
    availableBalance: number;
    currency: string;
  }> {
    logger.debug('Getting balance');

    try {
      const account = await this.client.get<WhopLedgerAccount>('/ledger/accounts');

      return {
        balance: account.balance / 100, // Convert from cents
        availableBalance: account.available_balance / 100,
        currency: account.currency,
      };
    } catch (error) {
      logger.error('Failed to get balance', { error });
      throw new PayoutError(
        'Failed to retrieve balance',
        PayoutErrorCode.API_ERROR,
        error
      );
    }
  }

  /**
   * Send a payout to a clipper
   */
  async sendPayout(request: PayoutRequest): Promise<WhopTransfer> {
    logger.info('Sending payout', {
      recipientId: request.recipientId,
      amount: request.amount,
    });

    // Validate minimum threshold
    if (request.amount < this.config.clipper.minPayoutThreshold) {
      throw new PayoutError(
        `Amount $${request.amount} is below minimum threshold of $${this.config.clipper.minPayoutThreshold}`,
        PayoutErrorCode.BELOW_MINIMUM_THRESHOLD,
        { amount: request.amount, minimum: this.config.clipper.minPayoutThreshold }
      );
    }

    // Check available balance
    try {
      const { availableBalance } = await this.getBalance();
      if (request.amount > availableBalance) {
        throw new PayoutError(
          `Insufficient balance. Available: $${availableBalance}, Requested: $${request.amount}`,
          PayoutErrorCode.INSUFFICIENT_BALANCE,
          { available: availableBalance, requested: request.amount }
        );
      }
    } catch (error) {
      if (error instanceof PayoutError) throw error;
      // Continue if balance check fails - let API handle it
      logger.warn('Could not verify balance, proceeding with payout', { error });
    }

    try {
      const amountInCents = Math.round(request.amount * 100);

      const transfer = await this.client.post<WhopTransfer>('/transfers', {
        recipient_id: request.recipientId,
        amount: amountInCents,
        currency: request.currency || 'usd',
        metadata: {
          submission_id: request.submissionId,
          note: request.note,
          source: 'clipper-program',
        },
      });

      logger.info('Payout sent successfully', {
        transferId: transfer.id,
        amount: request.amount,
        status: transfer.status,
      });

      return transfer;
    } catch (error) {
      logger.error('Failed to send payout', { error });

      if (error instanceof WhopApiError) {
        if (error.statusCode === 400) {
          throw new PayoutError(
            'Invalid recipient or amount',
            PayoutErrorCode.INVALID_RECIPIENT,
            error.responseBody
          );
        }
        if (error.statusCode === 402) {
          throw new PayoutError(
            'Insufficient balance',
            PayoutErrorCode.INSUFFICIENT_BALANCE,
            error.responseBody
          );
        }
      }

      throw new PayoutError(
        'Failed to send payout',
        PayoutErrorCode.TRANSFER_FAILED,
        error
      );
    }
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(transferId: string): Promise<WhopTransfer> {
    logger.debug('Getting transfer status', { transferId });

    try {
      const transfer = await this.client.get<WhopTransfer>(`/transfers/${transferId}`);
      return transfer;
    } catch (error) {
      if (error instanceof WhopApiError && error.statusCode === 404) {
        throw new PayoutError(
          `Transfer not found: ${transferId}`,
          PayoutErrorCode.API_ERROR
        );
      }
      throw error;
    }
  }

  /**
   * List transfers with filters
   */
  async listTransfers(filters: TransferFilters = {}): Promise<{
    transfers: WhopTransfer[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    logger.debug('Listing transfers', { ...filters });

    try {
      const params: Record<string, string | number | undefined> = {
        per_page: filters.perPage || 20,
        after: filters.after,
      };

      if (filters.recipientId) params.recipient_id = filters.recipientId;
      if (filters.status) params.status = filters.status;

      const response = await this.client.get<{
        data: WhopTransfer[];
        pagination: { next_cursor?: string; has_more: boolean };
      }>('/transfers', params);

      return {
        transfers: response.data,
        nextCursor: response.pagination.next_cursor,
        hasMore: response.pagination.has_more,
      };
    } catch (error) {
      logger.error('Failed to list transfers', { error });
      throw error;
    }
  }

  /**
   * Get all transfers for a recipient
   */
  async getRecipientTransfers(recipientId: string): Promise<WhopTransfer[]> {
    const allTransfers: WhopTransfer[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.listTransfers({ recipientId, after: cursor });
      allTransfers.push(...result.transfers);
      cursor = result.nextCursor;
    } while (cursor);

    return allTransfers;
  }

  /**
   * Process batch payouts
   */
  async processBatchPayouts(payouts: BatchPayoutItem[]): Promise<BatchPayoutResult> {
    logger.info('Processing batch payouts', { count: payouts.length });

    const result: BatchPayoutResult = {
      successful: 0,
      failed: 0,
      totalAmount: 0,
      transfers: [],
      errors: [],
    };

    for (const item of payouts) {
      try {
        const transfer = await this.sendPayout({
          recipientId: item.recipientId,
          amount: item.amount,
          submissionId: item.submissionId,
        });

        result.successful++;
        result.totalAmount += item.amount;
        result.transfers.push(transfer);
      } catch (error) {
        result.failed++;
        result.errors.push({
          item,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Batch payouts complete', {
      successful: result.successful,
      failed: result.failed,
      totalAmount: result.totalAmount,
    });

    return result;
  }

  /**
   * Get total paid amount
   */
  async getTotalPaid(options: {
    recipientId?: string;
    since?: Date;
    until?: Date;
  } = {}): Promise<{
    totalPaid: number;
    transferCount: number;
    currency: string;
  }> {
    logger.debug('Calculating total paid', { ...options });

    const allTransfers: WhopTransfer[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.listTransfers({
        recipientId: options.recipientId,
        status: 'completed',
        after: cursor,
      });
      allTransfers.push(...result.transfers);
      cursor = result.nextCursor;
    } while (cursor);

    // Filter by date range if specified
    let filteredTransfers = allTransfers;
    if (options.since || options.until) {
      filteredTransfers = allTransfers.filter((t) => {
        const date = new Date(t.created_at);
        if (options.since && date < options.since) return false;
        if (options.until && date > options.until) return false;
        return true;
      });
    }

    const totalInCents = filteredTransfers.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalPaid: totalInCents / 100,
      transferCount: filteredTransfers.length,
      currency: 'usd',
    };
  }

  /**
   * Get payout summary for a time period
   */
  async getPayoutSummary(options: {
    since?: Date;
    until?: Date;
  } = {}): Promise<{
    totalPaid: number;
    transferCount: number;
    byStatus: Record<string, { count: number; amount: number }>;
    avgPayoutAmount: number;
    currency: string;
  }> {
    logger.debug('Getting payout summary');

    const allTransfers: WhopTransfer[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.listTransfers({ after: cursor, perPage: 100 });
      allTransfers.push(...result.transfers);
      cursor = result.nextCursor;
    } while (cursor);

    // Filter by date range
    let filteredTransfers = allTransfers;
    if (options.since || options.until) {
      filteredTransfers = allTransfers.filter((t) => {
        const date = new Date(t.created_at);
        if (options.since && date < options.since) return false;
        if (options.until && date > options.until) return false;
        return true;
      });
    }

    // Group by status
    const byStatus: Record<string, { count: number; amount: number }> = {};
    for (const transfer of filteredTransfers) {
      if (!byStatus[transfer.status]) {
        byStatus[transfer.status] = { count: 0, amount: 0 };
      }
      byStatus[transfer.status].count++;
      byStatus[transfer.status].amount += transfer.amount / 100;
    }

    const totalInCents = filteredTransfers.reduce((sum, t) => sum + t.amount, 0);
    const totalPaid = totalInCents / 100;

    return {
      totalPaid,
      transferCount: filteredTransfers.length,
      byStatus,
      avgPayoutAmount: filteredTransfers.length > 0
        ? Math.round((totalPaid / filteredTransfers.length) * 100) / 100
        : 0,
      currency: 'usd',
    };
  }
}

/**
 * Create a PayoutService instance
 */
export function createPayoutService(): PayoutService {
  return new PayoutService();
}
