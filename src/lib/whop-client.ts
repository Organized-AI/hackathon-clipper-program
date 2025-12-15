import { getConfig } from './config.js';
import { createLogger } from './logger.js';

const logger = createLogger('WhopClient');

/**
 * Custom error class for Whop API errors
 */
export class WhopApiError extends Error {
  public readonly statusCode: number;
  public readonly endpoint: string;
  public readonly responseBody: unknown;

  constructor(message: string, statusCode: number, endpoint: string, responseBody?: unknown) {
    super(message);
    this.name = 'WhopApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.responseBody = responseBody;
  }
}

/**
 * Pagination options for list endpoints
 */
export interface PaginationOptions {
  perPage?: number;
  after?: string;
}

/**
 * Paginated response from Whop API
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    next_cursor?: string;
    has_more: boolean;
  };
}

/**
 * Request options
 */
interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
}

/**
 * Whop API client wrapper with authentication and error handling
 */
export class WhopClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    const config = getConfig();
    this.apiKey = apiKey || config.whop.apiKey;
    this.baseUrl = baseUrl || config.whop.baseUrl;
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Make authenticated request to Whop API
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    const { method, endpoint, body, params } = options;
    const url = this.buildUrl(endpoint, params);

    logger.debug(`${method} ${endpoint}`, { params });

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    let responseBody: unknown;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    if (!response.ok) {
      logger.error(`API error: ${response.status}`, { endpoint, responseBody });
      throw new WhopApiError(
        `Whop API error: ${response.status} ${response.statusText}`,
        response.status,
        endpoint,
        responseBody
      );
    }

    logger.debug(`Response received`, { endpoint, status: response.status });
    return responseBody as T;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
    return this.request<T>({ method: 'GET', endpoint, params });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: 'POST', endpoint, body });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: 'PUT', endpoint, body });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: 'PATCH', endpoint, body });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>({ method: 'DELETE', endpoint });
  }

  /**
   * Paginated GET request - fetches all pages
   */
  async *paginate<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>,
    options?: PaginationOptions
  ): AsyncGenerator<T[], void, unknown> {
    let cursor: string | undefined = options?.after;
    const perPage = options?.perPage || 20;

    do {
      const response = await this.get<PaginatedResponse<T>>(endpoint, {
        ...params,
        per_page: perPage,
        after: cursor,
      });

      yield response.data;

      cursor = response.pagination.next_cursor;
    } while (cursor);
  }

  /**
   * Fetch all items from a paginated endpoint
   */
  async fetchAll<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>,
    options?: PaginationOptions
  ): Promise<T[]> {
    const items: T[] = [];

    for await (const page of this.paginate<T>(endpoint, params, options)) {
      items.push(...page);
    }

    return items;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to list products as a connection test
      await this.get('/products', { per_page: 1 });
      return true;
    } catch (error) {
      if (error instanceof WhopApiError) {
        logger.error('API connection test failed', {
          statusCode: error.statusCode,
          message: error.message
        });
      }
      return false;
    }
  }
}

/**
 * Create a WhopClient instance
 */
export function createWhopClient(apiKey?: string, baseUrl?: string): WhopClient {
  return new WhopClient(apiKey, baseUrl);
}
