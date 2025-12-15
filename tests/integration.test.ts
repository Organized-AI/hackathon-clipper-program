import { describe, it, expect, beforeEach } from 'vitest';
import { calculatePayout, meetsMinimumThreshold, minimumViewsForPayout } from '../src/types/clipper.js';
import { loadConfig, resetConfig } from '../src/lib/config.js';
import { Logger, createLogger } from '../src/lib/logger.js';
import { verifyWebhookSignature, parseWebhookPayload, WebhookEventType } from '../src/webhooks/handler.js';

describe('Payout Calculations', () => {
  const defaultConfig = {
    cpmRate: 5.00, // $5 per 1000 views
    flatFee: 0,
    minPayoutThreshold: 1.00,
    maxPayoutCap: 500.00,
  };

  describe('calculatePayout', () => {
    it('should calculate basic CPM payout', () => {
      const result = calculatePayout(10000, defaultConfig);

      expect(result.viewCount).toBe(10000);
      expect(result.cpmPayout).toBe(50.00); // 10000 / 1000 * 5
      expect(result.finalPayout).toBe(50.00);
      expect(result.meetsMinimum).toBe(true);
      expect(result.wasCapped).toBe(false);
    });

    it('should include flat fee in calculation', () => {
      const config = { ...defaultConfig, flatFee: 10.00 };
      const result = calculatePayout(10000, config);

      expect(result.cpmPayout).toBe(50.00);
      expect(result.flatFee).toBe(10.00);
      expect(result.grossTotal).toBe(60.00);
      expect(result.finalPayout).toBe(60.00);
    });

    it('should cap payout at maxPayoutCap', () => {
      const result = calculatePayout(200000, defaultConfig); // Would be $1000 uncapped

      expect(result.grossTotal).toBe(1000.00);
      expect(result.cappedTotal).toBe(500.00);
      expect(result.finalPayout).toBe(500.00);
      expect(result.wasCapped).toBe(true);
    });

    it('should return zero if below minimum threshold', () => {
      const result = calculatePayout(100, defaultConfig); // Only $0.50

      expect(result.cpmPayout).toBe(0.50);
      expect(result.meetsMinimum).toBe(false);
      expect(result.finalPayout).toBe(0);
    });

    it('should include bonus rate when specified', () => {
      const config = { ...defaultConfig, bonusRate: 2.00 };
      const result = calculatePayout(10000, config);

      expect(result.cpmPayout).toBe(50.00);
      expect(result.bonusPayout).toBe(20.00); // 10000 / 1000 * 2
      expect(result.grossTotal).toBe(70.00);
    });

    it('should handle zero views', () => {
      const result = calculatePayout(0, defaultConfig);

      expect(result.viewCount).toBe(0);
      expect(result.cpmPayout).toBe(0);
      expect(result.finalPayout).toBe(0);
      expect(result.meetsMinimum).toBe(false);
    });
  });

  describe('meetsMinimumThreshold', () => {
    it('should return true when above threshold', () => {
      expect(meetsMinimumThreshold(1000, defaultConfig)).toBe(true); // $5 > $1
    });

    it('should return false when below threshold', () => {
      expect(meetsMinimumThreshold(100, defaultConfig)).toBe(false); // $0.50 < $1
    });

    it('should account for flat fee', () => {
      const config = { ...defaultConfig, flatFee: 0.50 };
      // 100 views = $0.50 CPM + $0.50 flat = $1.00 exactly
      expect(meetsMinimumThreshold(100, config)).toBe(true);
    });
  });

  describe('minimumViewsForPayout', () => {
    it('should calculate minimum views needed', () => {
      const minViews = minimumViewsForPayout(defaultConfig);
      // Need $1 at $5 CPM = 200 views
      expect(minViews).toBe(200);
    });

    it('should return 0 if flat fee covers threshold', () => {
      const config = { ...defaultConfig, flatFee: 2.00 };
      expect(minimumViewsForPayout(config)).toBe(0);
    });

    it('should account for partial coverage by flat fee', () => {
      const config = { ...defaultConfig, flatFee: 0.50 };
      // Need $0.50 more at $5 CPM = 100 views
      expect(minimumViewsForPayout(config)).toBe(100);
    });
  });
});

describe('Configuration', () => {
  beforeEach(() => {
    resetConfig();
  });

  it('should load configuration with defaults', () => {
    // Set minimal required env
    process.env.WHOP_API_KEY = 'test_key';

    const config = loadConfig();

    expect(config.whop.apiKey).toBe('test_key');
    // NODE_ENV is 'test' when running vitest
    expect(['development', 'test', 'production']).toContain(config.app.env);
    expect(config.clipper.defaultCpmRate).toBeDefined();
    expect(config.clipper.minPayoutThreshold).toBeDefined();
    expect(config.clipper.maxPayoutCap).toBeDefined();
  });

  it('should throw error when API key is missing', () => {
    delete process.env.WHOP_API_KEY;

    expect(() => loadConfig()).toThrow();
  });
});

describe('Logger', () => {
  it('should create logger with context', () => {
    const logger = createLogger('TestContext');
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should create child logger with additional context', () => {
    const logger = createLogger('Parent');
    const childLogger = logger.child({ requestId: '123' });

    expect(childLogger).toBeInstanceOf(Logger);
  });

  it('should create logger with new context name', () => {
    const logger = createLogger('Parent');
    const childLogger = logger.withContext('Child');

    expect(childLogger).toBeInstanceOf(Logger);
  });
});

describe('Webhook Handler', () => {
  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      const payload = '{"test": "data"}';
      const secret = 'test_secret';

      // Generate valid signature
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = '{"test": "data"}';
      const secret = 'test_secret';
      const invalidSignature = 'invalid_signature';

      expect(verifyWebhookSignature(payload, invalidSignature, secret)).toBe(false);
    });
  });

  describe('parseWebhookPayload', () => {
    it('should parse valid JSON payload', () => {
      const payload = JSON.stringify({
        id: 'evt_123',
        type: WebhookEventType.ENTRY_CREATED,
        created_at: '2024-01-01T00:00:00Z',
        data: { foo: 'bar' },
      });

      const event = parseWebhookPayload(payload);

      expect(event.id).toBe('evt_123');
      expect(event.type).toBe(WebhookEventType.ENTRY_CREATED);
      expect(event.data).toEqual({ foo: 'bar' });
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseWebhookPayload('not json')).toThrow('Invalid webhook payload');
    });
  });
});

describe('Edge Cases', () => {
  describe('Payout with extreme values', () => {
    const config = {
      cpmRate: 5.00,
      flatFee: 0,
      minPayoutThreshold: 1.00,
      maxPayoutCap: 500.00,
    };

    it('should handle very large view counts', () => {
      const result = calculatePayout(1_000_000_000, config);

      expect(result.wasCapped).toBe(true);
      expect(result.finalPayout).toBe(500.00);
    });

    it('should handle decimal view counts', () => {
      const result = calculatePayout(1500, config);

      expect(result.cpmPayout).toBe(7.5);
      expect(result.finalPayout).toBe(7.5);
    });

    it('should handle very small CPM rates', () => {
      const lowCpmConfig = { ...config, cpmRate: 0.01 };
      const result = calculatePayout(10000, lowCpmConfig);

      expect(result.cpmPayout).toBe(0.1);
      expect(result.meetsMinimum).toBe(false);
    });
  });
});
