type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface LogContext {
  [key: string]: unknown;
}

/**
 * Simple structured logger with context support
 */
export class Logger {
  private context: string;
  private minLevel: LogLevel;
  private additionalContext: LogContext;

  constructor(context: string, minLevel: LogLevel = 'info', additionalContext: LogContext = {}) {
    this.context = context;
    this.minLevel = minLevel;
    this.additionalContext = additionalContext;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, data?: LogContext): string {
    const logEntry = {
      timestamp: this.formatTimestamp(),
      level: level.toUpperCase(),
      context: this.context,
      message,
      ...this.additionalContext,
      ...data,
    };

    // In production, use JSON; otherwise use readable format
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(logEntry);
    }

    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${logEntry.timestamp}] ${logEntry.level.padEnd(5)} [${this.context}] ${message}${dataStr}`;
  }

  debug(message: string, data?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, data?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(
      this.context,
      this.minLevel,
      { ...this.additionalContext, ...additionalContext }
    );
  }

  /**
   * Create a child logger with a new context name
   */
  withContext(newContext: string): Logger {
    return new Logger(
      `${this.context}:${newContext}`,
      this.minLevel,
      this.additionalContext
    );
  }
}

/**
 * Create a logger instance
 */
export function createLogger(context: string, minLevel?: LogLevel): Logger {
  const level = minLevel || (process.env.LOG_LEVEL as LogLevel) || 'info';
  return new Logger(context, level);
}
