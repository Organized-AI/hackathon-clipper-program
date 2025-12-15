import 'dotenv/config';
import { getConfig, createLogger, createWhopClient, WhopApiError } from './lib/index.js';
import { calculatePayout, minimumViewsForPayout } from './types/index.js';

const logger = createLogger('Main');

async function main() {
  logger.info('Hackathon Clipper Program starting...');

  try {
    // Load and validate configuration
    const config = getConfig();
    logger.info('Configuration loaded', {
      env: config.app.env,
      logLevel: config.app.logLevel,
      defaultCpmRate: config.clipper.defaultCpmRate,
    });

    // Test payout calculation
    const testPayout = calculatePayout(10000, {
      cpmRate: config.clipper.defaultCpmRate,
      flatFee: 0,
      minPayoutThreshold: config.clipper.minPayoutThreshold,
      maxPayoutCap: config.clipper.maxPayoutCap,
    });
    logger.info('Payout calculation test', {
      views: 10000,
      payout: `$${testPayout.finalPayout}`,
    });

    // Calculate minimum views needed
    const minViews = minimumViewsForPayout({
      cpmRate: config.clipper.defaultCpmRate,
      flatFee: 0,
      minPayoutThreshold: config.clipper.minPayoutThreshold,
    });
    logger.info('Minimum views for payout', { minViews });

    // Test Whop API connection if API key is configured
    if (config.whop.apiKey && config.whop.apiKey !== 'your_api_key_here') {
      logger.info('Testing Whop API connection...');
      const client = createWhopClient();
      const connected = await client.testConnection();

      if (connected) {
        logger.info('Whop API connection successful');
      } else {
        logger.warn('Whop API connection failed - check your API key');
      }
    } else {
      logger.info('Skipping API test - WHOP_API_KEY not configured');
      logger.info('Set your API key in .env to enable API features');
    }

    logger.info('Phase 1 Core Infrastructure complete');

  } catch (error) {
    if (error instanceof WhopApiError) {
      logger.error('Whop API Error', {
        statusCode: error.statusCode,
        endpoint: error.endpoint,
        message: error.message,
      });
    } else if (error instanceof Error) {
      logger.error('Startup error', { message: error.message });
    }
    process.exit(1);
  }
}

main().catch(console.error);
