import { z } from 'zod';

/**
 * Configuration schema with Zod validation
 */
const ConfigSchema = z.object({
  // Whop API settings
  whop: z.object({
    apiKey: z.string().min(1, 'WHOP_API_KEY is required'),
    webhookSecret: z.string().optional(),
    appId: z.string().optional(),
    baseUrl: z.string().url().default('https://api.whop.com/api/v5'),
  }),

  // Application settings
  app: z.object({
    env: z.enum(['development', 'production', 'test']).default('development'),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),

  // Clipper program settings
  clipper: z.object({
    defaultCpmRate: z.number().positive().default(5.00), // $5 per 1000 views
    minPayoutThreshold: z.number().nonnegative().default(1.00), // $1 minimum
    maxPayoutCap: z.number().positive().default(500.00), // $500 max per submission
    autoApproveHours: z.number().positive().default(48), // 48 hour auto-approve
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  const rawConfig = {
    whop: {
      apiKey: process.env.WHOP_API_KEY || '',
      webhookSecret: process.env.WHOP_WEBHOOK_SECRET,
      appId: process.env.WHOP_APP_ID,
      baseUrl: process.env.WHOP_BASE_URL || 'https://api.whop.com/api/v5',
    },
    app: {
      env: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
    },
    clipper: {
      defaultCpmRate: parseFloat(process.env.DEFAULT_CPM_RATE || '5.00'),
      minPayoutThreshold: parseFloat(process.env.MIN_PAYOUT_THRESHOLD || '1.00'),
      maxPayoutCap: parseFloat(process.env.MAX_PAYOUT_CAP || '500.00'),
      autoApproveHours: parseInt(process.env.AUTO_APPROVE_HOURS || '48', 10),
    },
  };

  return ConfigSchema.parse(rawConfig);
}

/**
 * Get configuration (singleton pattern)
 */
let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Reset cached config (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}
