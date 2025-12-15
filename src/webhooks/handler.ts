import { createHmac } from 'crypto';
import { getConfig, createLogger } from '../lib/index.js';
import { createSubmissionService } from '../services/submission-service.js';
import { createPayoutService } from '../services/payout-service.js';

const logger = createLogger('WebhookHandler');

/**
 * Webhook event types
 */
export enum WebhookEventType {
  // Entry events
  ENTRY_CREATED = 'entry.created',
  ENTRY_APPROVED = 'entry.approved',
  ENTRY_DENIED = 'entry.denied',

  // Transfer events
  TRANSFER_CREATED = 'transfer.created',
  TRANSFER_COMPLETED = 'transfer.completed',
  TRANSFER_FAILED = 'transfer.failed',

  // Membership events
  MEMBERSHIP_CREATED = 'membership.created',
  MEMBERSHIP_UPDATED = 'membership.updated',
  MEMBERSHIP_DELETED = 'membership.deleted',
}

/**
 * Webhook event payload
 */
export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  created_at: string;
  data: Record<string, unknown>;
}

/**
 * Webhook handler result
 */
export interface WebhookResult {
  success: boolean;
  message: string;
  eventId: string;
  eventType: WebhookEventType;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret?: string
): boolean {
  const webhookSecret = secret || getConfig().whop.webhookSecret;

  if (!webhookSecret) {
    logger.warn('Webhook secret not configured - skipping signature verification');
    return true; // Allow in development
  }

  try {
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    return expectedSignature === providedSignature;
  } catch (error) {
    logger.error('Signature verification failed', { error });
    return false;
  }
}

/**
 * Parse webhook payload
 */
export function parseWebhookPayload(body: string): WebhookEvent {
  try {
    return JSON.parse(body) as WebhookEvent;
  } catch (error) {
    throw new Error('Invalid webhook payload');
  }
}

/**
 * Webhook event handlers
 */
const eventHandlers: Record<WebhookEventType, (data: Record<string, unknown>) => Promise<void>> = {
  // Entry events
  [WebhookEventType.ENTRY_CREATED]: async (data) => {
    logger.info('New entry created', {
      entryId: data.id,
      userId: data.user_id,
      experienceId: data.experience_id,
    });
    // Could trigger notifications, validation, etc.
  },

  [WebhookEventType.ENTRY_APPROVED]: async (data) => {
    logger.info('Entry approved', {
      entryId: data.id,
      userId: data.user_id,
    });

    // Entry was approved - could trigger additional actions
    // Payout is typically handled during approval, but this
    // could be used for post-approval workflows
  },

  [WebhookEventType.ENTRY_DENIED]: async (data) => {
    logger.info('Entry denied', {
      entryId: data.id,
      userId: data.user_id,
      reason: data.reason,
    });
    // Could trigger notifications, analytics, etc.
  },

  // Transfer events
  [WebhookEventType.TRANSFER_CREATED]: async (data) => {
    logger.info('Transfer initiated', {
      transferId: data.id,
      amount: data.amount,
      recipientId: data.recipient_id,
    });
  },

  [WebhookEventType.TRANSFER_COMPLETED]: async (data) => {
    logger.info('Transfer completed', {
      transferId: data.id,
      amount: data.amount,
      recipientId: data.recipient_id,
    });
    // Could trigger confirmation notifications
  },

  [WebhookEventType.TRANSFER_FAILED]: async (data) => {
    logger.error('Transfer failed', {
      transferId: data.id,
      amount: data.amount,
      recipientId: data.recipient_id,
      error: data.error,
    });
    // Could trigger retry logic or admin alerts
  },

  // Membership events
  [WebhookEventType.MEMBERSHIP_CREATED]: async (data) => {
    logger.info('New membership', {
      membershipId: data.id,
      userId: data.user_id,
      productId: data.product_id,
    });
    // Could trigger onboarding, welcome notifications
  },

  [WebhookEventType.MEMBERSHIP_UPDATED]: async (data) => {
    logger.info('Membership updated', {
      membershipId: data.id,
      status: data.status,
    });
  },

  [WebhookEventType.MEMBERSHIP_DELETED]: async (data) => {
    logger.info('Membership deleted', {
      membershipId: data.id,
      userId: data.user_id,
    });
    // Could trigger cleanup, exit surveys
  },
};

/**
 * Handle webhook event
 */
export async function handleWebhookEvent(event: WebhookEvent): Promise<WebhookResult> {
  logger.info('Processing webhook event', {
    eventId: event.id,
    eventType: event.type,
  });

  const handler = eventHandlers[event.type];

  if (!handler) {
    logger.warn('No handler for event type', { eventType: event.type });
    return {
      success: true,
      message: `No handler for event type: ${event.type}`,
      eventId: event.id,
      eventType: event.type,
    };
  }

  try {
    await handler(event.data);

    return {
      success: true,
      message: 'Event processed successfully',
      eventId: event.id,
      eventType: event.type,
    };
  } catch (error) {
    logger.error('Event handler failed', {
      eventId: event.id,
      eventType: event.type,
      error,
    });

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Handler failed',
      eventId: event.id,
      eventType: event.type,
    };
  }
}

/**
 * Process raw webhook request
 */
export async function processWebhook(
  body: string,
  signature?: string
): Promise<WebhookResult> {
  // Verify signature if provided
  if (signature && !verifyWebhookSignature(body, signature)) {
    logger.error('Invalid webhook signature');
    throw new Error('Invalid webhook signature');
  }

  // Parse payload
  const event = parseWebhookPayload(body);

  // Handle event
  return handleWebhookEvent(event);
}

/**
 * Register custom event handler
 */
export function registerEventHandler(
  eventType: WebhookEventType,
  handler: (data: Record<string, unknown>) => Promise<void>
): void {
  eventHandlers[eventType] = handler;
  logger.info('Registered custom handler', { eventType });
}
