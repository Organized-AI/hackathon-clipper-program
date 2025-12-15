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

Create `src/lib/config.ts`:

```typescript
import { z } from 'zod';
import 'dotenv/config';

const ConfigSchema = z.object({
  whop: z.object({
    apiKey: z.string().min(1, 'WHOP_API_KEY is required'),
    webhookSecret: z.string().optional(),
    appId: z.string().optional(),
    baseUrl: z.string().default('https://api.whop.com/api/v1'),
  }),
  app: z.object({
    env: z.enum(['development', 'production', 'test']).default('development'),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
  clipper: z.object({
    defaultCpmRate: z.number().default(2.0), // $2 per 1K views
    minPayoutThreshold: z.number().default(10), // $10 minimum
    maxPayoutCap: z.number().default(1000), // $1000 max per submission
    autoApproveHours: z.number().default(48),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const rawConfig = {
    whop: {
      apiKey: process.env.WHOP_API_KEY ?? '',
      webhookSecret: process.env.WHOP_WEBHOOK_SECRET,
      appId: process.env.WHOP_APP_ID,
      baseUrl: process.env.WHOP_BASE_URL ?? 'https://api.whop.com/api/v1',
    },
    app: {
      env: process.env.NODE_ENV ?? 'development',
      logLevel: process.env.LOG_LEVEL ?? 'info',
    },
    clipper: {
      defaultCpmRate: Number(process.env.DEFAULT_CPM_RATE) || 2.0,
      minPayoutThreshold: Number(process.env.MIN_PAYOUT_THRESHOLD) || 10,
      maxPayoutCap: Number(process.env.MAX_PAYOUT_CAP) || 1000,
      autoApproveHours: Number(process.env.AUTO_APPROVE_HOURS) || 48,
    },
  };

  const result = ConfigSchema.safeParse(rawConfig);
  
  if (!result.success) {
    console.error('Configuration validation failed:');
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
```

### Task 2: Create Logger Utility

Create `src/lib/logger.ts`:

```typescript
import { config } from './config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: number;
  private context?: string;

  constructor(context?: string) {
    this.level = LOG_LEVELS[config.app.logLevel];
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}${metaStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.level;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      const errorMeta = error ? { ...meta, error: error.message, stack: error.stack } : meta;
      console.error(this.formatMessage('error', message, errorMeta));
    }
  }

  child(context: string): Logger {
    return new Logger(this.context ? `${this.context}:${context}` : context);
  }
}

export const logger = new Logger();
export const createLogger = (context: string) => new Logger(context);
```

### Task 3: Create Whop Client Wrapper

Create `src/lib/whop-client.ts`:

```typescript
import { config } from './config.js';
import { createLogger } from './logger.js';

const logger = createLogger('WhopClient');

export interface WhopRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  query?: Record<string, string | number | boolean>;
}

export interface WhopResponse<T> {
  data: T;
  pageInfo?: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
}

export class WhopClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.whop.baseUrl;
    this.apiKey = config.whop.apiKey;
    logger.info('Whop client initialized', { baseUrl: this.baseUrl });
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean>): string {
    const url = new URL(path, this.baseUrl);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  async request<T>(options: WhopRequestOptions): Promise<WhopResponse<T>> {
    const url = this.buildUrl(options.path, options.query);
    
    logger.debug('Making Whop API request', { 
      method: options.method, 
      path: options.path 
    });

    const response = await fetch(url, {
      method: options.method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Whop API error', new Error(errorBody), {
        status: response.status,
        path: options.path,
      });
      throw new WhopApiError(response.status, errorBody, options.path);
    }

    const data = await response.json();
    logger.debug('Whop API response received', { path: options.path });
    
    return {
      data: data.data ?? data,
      pageInfo: data.page_info,
    };
  }

  // Convenience methods
  async get<T>(path: string, query?: Record<string, string | number | boolean>): Promise<WhopResponse<T>> {
    return this.request<T>({ method: 'GET', path, query });
  }

  async post<T>(path: string, body?: Record<string, unknown>): Promise<WhopResponse<T>> {
    return this.request<T>({ method: 'POST', path, body });
  }

  async put<T>(path: string, body?: Record<string, unknown>): Promise<WhopResponse<T>> {
    return this.request<T>({ method: 'PUT', path, body });
  }

  async patch<T>(path: string, body?: Record<string, unknown>): Promise<WhopResponse<T>> {
    return this.request<T>({ method: 'PATCH', path, body });
  }

  async delete<T>(path: string): Promise<WhopResponse<T>> {
    return this.request<T>({ method: 'DELETE', path });
  }
}

export class WhopApiError extends Error {
  constructor(
    public statusCode: number,
    public body: string,
    public path: string
  ) {
    super(`Whop API Error [${statusCode}] at ${path}: ${body}`);
    this.name = 'WhopApiError';
  }
}

// Singleton instance
let clientInstance: WhopClient | null = null;

export function getWhopClient(): WhopClient {
  if (!clientInstance) {
    clientInstance = new WhopClient();
  }
  return clientInstance;
}
```

### Task 4: Create Clipper Type Definitions

Create `src/types/clipper.ts`:

```typescript
import { z } from 'zod';

// Campaign Configuration
export const CampaignConfigSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['pure_cpm', 'flat_fee', 'hybrid']),
  budget: z.number().positive(),
  cpmRate: z.number().positive().optional(), // Per 1K views
  flatFee: z.number().nonnegative().optional(), // Per submission
  platforms: z.array(z.enum(['tiktok', 'youtube_shorts', 'instagram_reels', 'x'])),
  minViews: z.number().int().nonnegative().default(0),
  maxPayoutPerSubmission: z.number().positive().optional(),
  maxPayoutPerClipper: z.number().positive().optional(),
  autoApprove: z.boolean().default(false),
  autoApproveDelayHours: z.number().int().positive().default(48),
});

export type CampaignConfig = z.infer<typeof CampaignConfigSchema>;

// Submission Entry
export const SubmissionSchema = z.object({
  id: z.string(),
  campaignId: z visiblestring(),
  clipperId: z.string(),
  clipperUsername: z.string().optional(),
  platform: z.enum(['tiktok', 'youtube_shorts', 'instagram_reels', 'x']),
  contentUrl: z.string().url(),
  mediaFileUrl: z.string().url().optional(),
  viewCount: z.number().int().nonnegative(),
  status: z.enum(['pending', 'approved', 'rejected', 'flagged', 'paid']),
  submittedAt: z.coerce.date(),
  reviewedAt: z.coerce.date().optional(),
  reviewedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
  payoutAmount: z.number().nonnegative().optional(),
});

export type Submission = z.infer<typeof SubmissionSchema>;

// Payout Calculation
export const PayoutCalculationSchema = z.object({
  views: z.number().int().nonnegative(),
  cpmRate: z.number().positive(),
  flatFee: z.number().nonnegative().default(0),
  calculatedAmount: z.number().nonnegative(),
  cappedAmount: z.number().nonnegative(),
  maxCap: z.number().positive().optional(),
});

export type PayoutCalculation = z.infer<typeof PayoutCalculationSchema>;

// Clipper Profile
export const ClipperProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email().optional(),
  tier: z.enum(['beginner', 'standard', 'premium', 'elite']).default('beginner'),
  totalSubmissions: z.number().int().nonnegative().default(0),
  approvedSubmissions: z.number().int().nonnegative().default(0),
  totalViews: z.number().int().nonnegative().default(0),
  totalEarnings: z.number().nonnegative().default(0),
  joinedAt: z.coerce.date(),
  isBanned: z.boolean().default(false),
  bannedReason: z.string().optional(),
});

export type ClipperProfile = z.infer<typeof ClipperProfileSchema>;

// Helper Functions
export function calculatePayout(
  views: number,
  cpmRate: number,
  flatFee: number = 0,
  maxCap?: number
): PayoutCalculation {
  const cpmPayout = (views / 1000) * cpmRate;
  const calculatedAmount = cpmPayout + flatFee;
  const cappedAmount = maxCap ? Math.min(calculatedAmount, maxCap) : calculatedAmount;

  return {
    views,
    cpmRate,
    flatFee,
    calculatedAmount,
    cappedAmount,
    maxCap,
  };
}

export function meetsMinimumThreshold(
  views: number,
  cpmRate: number,
  minThreshold: number
): boolean {
  const potentialPayout = (views / 1000) * cpmRate;
  return potentialPayout >= minThreshold;
}
```

### Task 5: Create Index Export

Create `src/lib/index.ts`:

```typescript
export { config, type Config } from './config.js';
export { logger, createLogger } from './logger.js';
export { 
  WhopClient, 
  WhopApiError, 
  getWhopClient,
  type WhopRequestOptions,
  type WhopResponse,
} from './whop-client.js';
```

### Task 6: Update Main Entry Point

Update `src/index.ts`:

```typescript
import 'dotenv/config';
import { config, logger, getWhopClient } from './lib/index.js';

async function main() {
  logger.info('🎬 Hackathon Clipper Program Starting');
  logger.info('Environment', { env: config.app.env });
  
  try {
    const client = getWhopClient();
    logger.info('Whop client initialized successfully');
    
    // Test connection by fetching companies
    const response = await client.get('/companies');
    logger.info('Connected to Whop API', { 
      hasData: !!response.data 
    });
    
  } catch (error) {
    logger.error('Failed to initialize', error as Error);
    process.exit(1);
  }
}

main().catch(console.error);
```

---

## Success Criteria

- [ ] Configuration loads and validates with Zod
- [ ] Logger outputs with proper formatting and levels
- [ ] WhopClient makes authenticated requests
- [ ] Type definitions compile without errors
- [ ] `npm run dev` connects to Whop API
- [ ] Missing API key shows clear error message

---

## Completion Template

Create `PLANNING/implementation-phases/PHASE-1-COMPLETE.md`:

```markdown
# Phase 1 Complete

**Completed:** [DATE]

## Implemented
- [x] Configuration manager with Zod validation
- [x] Structured logger with levels and context
- [x] Whop API client wrapper
- [x] Clipper-specific type definitions
- [x] Payout calculation utilities

## Verified
- [x] Config validation catches missing API key
- [x] Logger respects LOG_LEVEL setting
- [x] Client successfully authenticates with Whop
- [x] Types compile without errors

## Next Phase
Read `PLANNING/implementation-phases/PHASE-2-PROMPT.md`
```

---

## Git Commit

```bash
git add -A
git commit -m "feat(phase-1): Core infrastructure complete

- Add configuration manager with Zod validation
- Create structured logger with context support
- Implement Whop API client wrapper
- Define clipper-specific TypeScript types
- Add payout calculation utilities

Ready for Phase 2: Campaign Management"
```
