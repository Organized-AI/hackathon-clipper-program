#!/usr/bin/env node
import 'dotenv/config';
import { getConfig, createLogger, createWhopClient, WhopApiError } from './lib/index.js';
import {
  // Campaign commands
  createCampaignCommand,
  listCampaignsCommand,
  getCampaignCommand,
  updateCampaignCommand,
  createPlanCommand,
  createPromoCommand,
  archiveCampaignCommand,
  // Submission commands
  listPendingCommand,
  listSubmissionsCommand,
  approveCommand,
  rejectCommand,
  statsCommand,
  bulkReviewCommand,
  startProcessorCommand,
  // Payout commands
  balanceCommand,
  sendPayoutCommand,
  listPayoutsCommand,
  getTransferStatusCommand,
  payoutSummaryCommand,
  totalPaidCommand,
  batchPayoutCommand,
  // Community commands
  createOnboardingCommand,
  createCourseCommand,
  listCoursesCommand,
  postAnnouncementCommand,
  createPostCommand,
  listPostsCommand,
  sendNotificationCommand,
  sendBulkNotificationCommand,
} from './cli/index.js';

const logger = createLogger('CLI');

/**
 * Print CLI help
 */
function printHelp(): void {
  console.log(`
Hackathon Clipper Program CLI
==============================

A Whop-powered clipper program management tool.

USAGE:
  npm run dev <command> [options]

CAMPAIGN COMMANDS:
  campaign:create <name> [description]     Create a new campaign
  campaign:list [--all]                    List campaigns
  campaign:get <productId>                 Get campaign details
  campaign:update <productId> [options]    Update campaign
  campaign:archive <productId>             Archive campaign
  plan:create <productId> <name> <price>   Create pricing plan
  promo:create <productId> <code> [opts]   Create promo code

SUBMISSION COMMANDS:
  submissions:pending [experienceId]       List pending submissions
  submissions:list [options]               List all submissions
  submissions:approve <entryId> [opts]     Approve submission
  submissions:reject <entryId> <reason>    Reject submission
  submissions:stats [experienceId]         Get submission stats
  submissions:bulk-review <experienceId>   Run bulk auto-approve
  processor:start <experienceIds>          Start queue processor

PAYOUT COMMANDS:
  payout:balance                           Check current balance
  payout:send <recipientId> <amount>       Send payout
  payout:list [options]                    List payouts
  payout:status <transferId>               Get transfer status
  payout:summary [--days N]                Get payout summary
  payout:total [--recipient] [--days]      Get total paid

COMMUNITY COMMANDS:
  community:onboarding <experienceId>      Create onboarding course
  community:course <experienceId> <title>  Create custom course
  community:courses <experienceId>         List courses
  community:announce <feedId> <title>      Post announcement
  community:post <feedId> <content>        Create forum post
  community:posts <feedId>                 List forum posts
  community:notify <experienceId> <title>  Send notification

OTHER COMMANDS:
  help                                     Show this help message
  version                                  Show version info
  test-connection                          Test Whop API connection

EXAMPLES:
  npm run dev campaign:create "Summer Clips" "Summer promotion"
  npm run dev submissions:approve ent_123 --viewCount 50000
  npm run dev payout:send user_456 25.00
  npm run dev community:onboarding exp_789

ENVIRONMENT:
  WHOP_API_KEY          Your Whop API key (required)
  WHOP_WEBHOOK_SECRET   Webhook verification secret (optional)
  WHOP_APP_ID           Your Whop app ID (optional)
  LOG_LEVEL             Logging level: debug|info|warn|error

For more information, see the README.md file.
`);
}

/**
 * Print version info
 */
function printVersion(): void {
  console.log('Hackathon Clipper Program v0.1.0');
  console.log('Built with @whop/sdk');
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): { command: string; params: string[]; flags: Record<string, string | boolean> } {
  const [command = 'help', ...rest] = args;
  const params: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = rest[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        flags[key] = nextArg;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      params.push(arg);
    }
  }

  return { command, params, flags };
}

/**
 * Print command result
 */
function printResult(result: { success: boolean; message: string; data?: unknown }): void {
  if (result.success) {
    console.log(`\n[OK] ${result.message}`);
  } else {
    console.log(`\n[ERROR] ${result.message}`);
  }

  if (result.data) {
    console.log('\nDetails:');
    console.log(JSON.stringify(result.data, null, 2));
  }
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, params, flags } = parseArgs(args);

  try {
    // Load config for all commands
    const config = getConfig();

    switch (command) {
      // Help and info
      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;

      case 'version':
      case '--version':
      case '-v':
        printVersion();
        break;

      case 'test-connection': {
        console.log('Testing Whop API connection...');
        if (!config.whop.apiKey || config.whop.apiKey === 'your_api_key_here') {
          console.log('[ERROR] WHOP_API_KEY not configured');
          process.exit(1);
        }
        const client = createWhopClient();
        const connected = await client.testConnection();
        if (connected) {
          console.log('[OK] Whop API connection successful');
        } else {
          console.log('[ERROR] Whop API connection failed');
          process.exit(1);
        }
        break;
      }

      // Campaign commands
      case 'campaign:create': {
        const result = await createCampaignCommand({
          name: params[0] || 'New Campaign',
          description: params[1],
        });
        printResult(result);
        break;
      }

      case 'campaign:list': {
        const result = await listCampaignsCommand({
          all: Boolean(flags.all),
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
        });
        printResult(result);
        break;
      }

      case 'campaign:get': {
        if (!params[0]) {
          console.log('[ERROR] Product ID required');
          process.exit(1);
        }
        const result = await getCampaignCommand({ productId: params[0] });
        printResult(result);
        break;
      }

      case 'campaign:update': {
        if (!params[0]) {
          console.log('[ERROR] Product ID required');
          process.exit(1);
        }
        const result = await updateCampaignCommand({
          productId: params[0],
          name: flags.name as string,
          description: flags.description as string,
          active: flags.active ? flags.active === 'true' : undefined,
        });
        printResult(result);
        break;
      }

      case 'campaign:archive': {
        if (!params[0]) {
          console.log('[ERROR] Product ID required');
          process.exit(1);
        }
        const result = await archiveCampaignCommand({ productId: params[0] });
        printResult(result);
        break;
      }

      case 'plan:create': {
        if (!params[0] || !params[1] || !params[2]) {
          console.log('[ERROR] Usage: plan:create <productId> <name> <price>');
          process.exit(1);
        }
        const result = await createPlanCommand({
          productId: params[0],
          name: params[1],
          price: parseFloat(params[2]),
          period: (flags.period as 'monthly' | 'yearly' | 'weekly' | 'one_time') || 'one_time',
        });
        printResult(result);
        break;
      }

      case 'promo:create': {
        if (!params[0] || !params[1]) {
          console.log('[ERROR] Usage: promo:create <productId> <code>');
          process.exit(1);
        }
        const result = await createPromoCommand({
          productId: params[0],
          code: params[1],
          percentOff: flags.percentOff ? parseInt(flags.percentOff as string, 10) : undefined,
          amountOff: flags.amountOff ? parseFloat(flags.amountOff as string) : undefined,
          maxUses: flags.maxUses ? parseInt(flags.maxUses as string, 10) : undefined,
        });
        printResult(result);
        break;
      }

      // Submission commands
      case 'submissions:pending': {
        const result = await listPendingCommand({
          experienceId: params[0],
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
        });
        printResult(result);
        break;
      }

      case 'submissions:list': {
        const result = await listSubmissionsCommand({
          experienceId: flags.experienceId as string,
          status: flags.status as string,
          platform: flags.platform as string,
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
        });
        printResult(result);
        break;
      }

      case 'submissions:approve': {
        if (!params[0]) {
          console.log('[ERROR] Entry ID required');
          process.exit(1);
        }
        const result = await approveCommand({
          entryId: params[0],
          viewCount: flags.viewCount ? parseInt(flags.viewCount as string, 10) : undefined,
          cpmRate: flags.cpmRate ? parseFloat(flags.cpmRate as string) : undefined,
          note: flags.note as string,
        });
        printResult(result);
        break;
      }

      case 'submissions:reject': {
        if (!params[0] || !params[1]) {
          console.log('[ERROR] Usage: submissions:reject <entryId> <reason>');
          process.exit(1);
        }
        const result = await rejectCommand({
          entryId: params[0],
          reason: params[1],
          notifyUser: flags.notify !== 'false',
        });
        printResult(result);
        break;
      }

      case 'submissions:stats': {
        const result = await statsCommand({
          experienceId: params[0],
        });
        printResult(result);
        break;
      }

      case 'submissions:bulk-review': {
        if (!params[0]) {
          console.log('[ERROR] Experience ID required');
          process.exit(1);
        }
        const result = await bulkReviewCommand({
          experienceId: params[0],
          autoApproveHours: flags.hours ? parseInt(flags.hours as string, 10) : undefined,
          minViews: flags.minViews ? parseInt(flags.minViews as string, 10) : undefined,
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
        });
        printResult(result);
        break;
      }

      case 'processor:start': {
        if (!params[0]) {
          console.log('[ERROR] Experience IDs required (comma-separated)');
          process.exit(1);
        }
        const result = startProcessorCommand({
          experienceIds: params[0].split(','),
          intervalMinutes: flags.interval ? parseInt(flags.interval as string, 10) : undefined,
        });
        printResult(result);
        break;
      }

      // Payout commands
      case 'payout:balance': {
        const result = await balanceCommand();
        printResult(result);
        break;
      }

      case 'payout:send': {
        if (!params[0] || !params[1]) {
          console.log('[ERROR] Usage: payout:send <recipientId> <amount>');
          process.exit(1);
        }
        const result = await sendPayoutCommand({
          recipientId: params[0],
          amount: parseFloat(params[1]),
          submissionId: flags.submissionId as string,
          note: flags.note as string,
        });
        printResult(result);
        break;
      }

      case 'payout:list': {
        const result = await listPayoutsCommand({
          recipientId: flags.recipient as string,
          status: flags.status as string,
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
        });
        printResult(result);
        break;
      }

      case 'payout:status': {
        if (!params[0]) {
          console.log('[ERROR] Transfer ID required');
          process.exit(1);
        }
        const result = await getTransferStatusCommand({ transferId: params[0] });
        printResult(result);
        break;
      }

      case 'payout:summary': {
        const result = await payoutSummaryCommand({
          days: flags.days ? parseInt(flags.days as string, 10) : undefined,
        });
        printResult(result);
        break;
      }

      case 'payout:total': {
        const result = await totalPaidCommand({
          recipientId: flags.recipient as string,
          days: flags.days ? parseInt(flags.days as string, 10) : undefined,
        });
        printResult(result);
        break;
      }

      // Community commands
      case 'community:onboarding': {
        if (!params[0]) {
          console.log('[ERROR] Experience ID required');
          process.exit(1);
        }
        const result = await createOnboardingCommand({ experienceId: params[0] });
        printResult(result);
        break;
      }

      case 'community:course': {
        if (!params[0] || !params[1]) {
          console.log('[ERROR] Usage: community:course <experienceId> <title>');
          process.exit(1);
        }
        const result = await createCourseCommand({
          experienceId: params[0],
          title: params[1],
          description: flags.description as string,
        });
        printResult(result);
        break;
      }

      case 'community:courses': {
        if (!params[0]) {
          console.log('[ERROR] Experience ID required');
          process.exit(1);
        }
        const result = await listCoursesCommand({ experienceId: params[0] });
        printResult(result);
        break;
      }

      case 'community:announce': {
        if (!params[0] || !params[1]) {
          console.log('[ERROR] Usage: community:announce <feedId> <title>');
          process.exit(1);
        }
        const result = await postAnnouncementCommand({
          feedId: params[0],
          title: params[1],
          content: (flags.content as string) || params[1],
        });
        printResult(result);
        break;
      }

      case 'community:post': {
        if (!params[0] || !params[1]) {
          console.log('[ERROR] Usage: community:post <feedId> <content>');
          process.exit(1);
        }
        const result = await createPostCommand({
          feedId: params[0],
          content: params[1],
          title: flags.title as string,
          pinned: Boolean(flags.pinned),
        });
        printResult(result);
        break;
      }

      case 'community:posts': {
        if (!params[0]) {
          console.log('[ERROR] Feed ID required');
          process.exit(1);
        }
        const result = await listPostsCommand({
          feedId: params[0],
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
          pinnedOnly: Boolean(flags.pinnedOnly),
        });
        printResult(result);
        break;
      }

      case 'community:notify': {
        if (!params[0] || !params[1]) {
          console.log('[ERROR] Usage: community:notify <experienceId> <title>');
          process.exit(1);
        }
        const result = await sendNotificationCommand({
          experienceId: params[0],
          title: params[1],
          body: (flags.body as string) || params[1],
          url: flags.url as string,
        });
        printResult(result);
        break;
      }

      default:
        console.log(`Unknown command: ${command}`);
        console.log('Run "npm run dev help" for usage information.');
        process.exit(1);
    }
  } catch (error) {
    if (error instanceof WhopApiError) {
      logger.error('Whop API Error', {
        statusCode: error.statusCode,
        endpoint: error.endpoint,
        message: error.message,
      });
    } else if (error instanceof Error) {
      logger.error('Error', { message: error.message });
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
