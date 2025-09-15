/**
 * NewsAPI Integration with Smart Rate Limiting
 * Handles NewsAPI.org requests with intelligent rate limiting and caching
 */

import { NewsSource, Article, FetchResult, RateLimitInfo } from '../types/NewsTypes';
import { createHash } from 'crypto';

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIConfig {
  apiKey: string;
  baseUrl?: string;
  dailyLimit?: number;
  requestsPerHour?: number;
  timeout?: number;
}

export class NewsAPISource implements NewsSource {
  private apiKey: string;
  private baseUrl: string;
  private dailyLimit: number;
  private requestsPerHour: number;
  private timeout: number;
  private requestCount: number = 0;
  private hourlyRequestCount: number = 0;
  private lastHourReset: number = Date.now();
  private lastRequestTime: number = 0;
  private minRequestInterval: number;

  constructor(config: NewsAPIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://newsapi.org/v2';
    this.dailyLimit = config.dailyLimit || 100;
    this.requestsPerHour = config.requestsPerHour || 50;
    this.timeout = config.timeout || 30000;
    this.minRequestInterval = Math.ceil(3600000 / this.requestsPerHour); // ms between requests
  }

  async fetchArticles(options: {
    endpoint?: string;
    category?: string;
    country?: string;
    sources?: string;
    q?: string;
    from?: string;
    to?: string;
    sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
    pageSize?: number;
    page?: number;
  } = {}): Promise<FetchResult> {
    const startTime = Date.now();

    try {
      // Check rate limits before making request
      const rateLimitCheck = await this.checkRateLimit();
      if (!rateLimitCheck.canProceed) {
        throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
      }

      // Enforce minimum interval between requests
      await this.enforceRequestInterval();

      // Build request URL
      const url = this.buildRequestUrl(options);

      // Make the API request
      const response = await this.makeRequest(url);

      // Update rate limit counters
      this.updateRateLimitCounters();

      // Process response
      const articles = this.processArticles(response.articles);

      const duration = Date.now() - startTime;

      return {
        success: true,
        articles,
        totalResults: response.totalResults,
        source: 'newsapi',
        duration,
        rateLimitInfo: this.getCurrentRateLimitInfo(),
        metadata: {
          endpoint: options.endpoint || 'top-headlines',
          category: options.category,
          country: options.country,
          pageSize: options.pageSize || 20
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        articles: [],
        totalResults: 0,
        source: 'newsapi',
        duration,
        error: error instanceof Error ? error.message : String(error),
        rateLimitInfo: this.getCurrentRateLimitInfo()
      };
    }
  }

  async fetchTopHeadlines(options: {
    category?: string;
    country?: string;
    sources?: string;
    q?: string;
    pageSize?: number;
  } = {}): Promise<FetchResult> {
    return this.fetchArticles({
      endpoint: 'top-headlines',
      ...options
    });
  }

  async fetchEverything(options: {
    q?: string;
    sources?: string;
    domains?: string;
    from?: string;
    to?: string;
    sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
    pageSize?: number;
  } = {}): Promise<FetchResult> {
    return this.fetchArticles({
      endpoint: 'everything',
      ...options
    });
  }

  async searchArticles(query: string, options: {
    sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
    from?: string;
    to?: string;
    pageSize?: number;
  } = {}): Promise<FetchResult> {
    return this.fetchEverything({
      q: query,
      ...options
    });
  }

  private async checkRateLimit(): Promise<{
    canProceed: boolean;
    reason?: string;
    waitTime?: number;
  }> {
    // Reset hourly counter if needed
    const now = Date.now();
    if (now - this.lastHourReset > 3600000) { // 1 hour
      this.hourlyRequestCount = 0;
      this.lastHourReset = now;
    }

    // Check daily limit
    if (this.requestCount >= this.dailyLimit) {
      return {
        canProceed: false,
        reason: `Daily limit of ${this.dailyLimit} requests exceeded`
      };
    }

    // Check hourly limit
    if (this.hourlyRequestCount >= this.requestsPerHour) {
      const waitTime = 3600000 - (now - this.lastHourReset);
      return {
        canProceed: false,
        reason: `Hourly limit of ${this.requestsPerHour} requests exceeded`,
        waitTime
      };
    }

    // Check minimum interval
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      return {
        canProceed: false,
        reason: `Minimum request interval not met`,
        waitTime
      };
    }

    return { canProceed: true };
  }

  private async enforceRequestInterval(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private buildRequestUrl(options: any): string {
    const endpoint = options.endpoint || 'top-headlines';
    const url = new URL(`${this.baseUrl}/${endpoint}`);

    // Add API key
    url.searchParams.set('apiKey', this.apiKey);

    // Add parameters based on endpoint
    if (endpoint === 'top-headlines') {
      if (options.category) url.searchParams.set('category', options.category);
      if (options.country) url.searchParams.set('country', options.country);
      if (options.sources) url.searchParams.set('sources', options.sources);
      if (options.q) url.searchParams.set('q', options.q);
    } else if (endpoint === 'everything') {
      if (options.q) url.searchParams.set('q', options.q);
      if (options.sources) url.searchParams.set('sources', options.sources);
      if (options.domains) url.searchParams.set('domains', options.domains);
      if (options.from) url.searchParams.set('from', options.from);
      if (options.to) url.searchParams.set('to', options.to);
      if (options.sortBy) url.searchParams.set('sortBy', options.sortBy);
    }

    // Common parameters
    if (options.pageSize) url.searchParams.set('pageSize', options.pageSize.toString());
    if (options.page) url.searchParams.set('page', options.page.toString());

    return url.toString();
  }

  private async makeRequest(url: string): Promise<NewsAPIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'NewsAggregator/1.0',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // Use default error message
        }

        throw new Error(errorMessage);
      }

      const data: NewsAPIResponse = await response.json();

      if (data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${JSON.stringify(data)}`);
      }

      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }

      throw error;
    }
  }

  private processArticles(apiArticles: NewsAPIArticle[]): Article[] {
    return apiArticles
      .filter(apiArticle => this.isValidArticle(apiArticle))
      .map(apiArticle => this.convertToArticle(apiArticle));
  }

  private isValidArticle(apiArticle: NewsAPIArticle): boolean {
    // Filter out invalid or removed articles
    if (!apiArticle.title || apiArticle.title.toLowerCase().includes('[removed]')) {
      return false;
    }

    if (!apiArticle.url || !apiArticle.publishedAt) {
      return false;
    }

    if (!apiArticle.description || apiArticle.description.toLowerCase().includes('[removed]')) {
      return false;
    }

    return true;
  }

  private convertToArticle(apiArticle: NewsAPIArticle): Article {
    const urlHash = createHash('sha256').update(apiArticle.url).digest('hex');

    return {
      title: this.cleanText(apiArticle.title),
      description: this.cleanText(apiArticle.description || ''),
      content: this.cleanText(apiArticle.content || ''),
      url: apiArticle.url,
      urlHash,
      sourceName: apiArticle.source.name,
      author: apiArticle.author ? this.cleanText(apiArticle.author) : null,
      publishedAt: new Date(apiArticle.publishedAt),
      imageUrl: apiArticle.urlToImage,
      category: 'general', // Will be classified later
      priority: this.determinePriority(apiArticle),
      wordCount: this.calculateWordCount(apiArticle.content || apiArticle.description || ''),
      language: 'en' // NewsAPI is primarily English
    };
  }

  private cleanText(text: string): string {
    return text
      .trim()
      .replace(/\[Removed\]/gi, '')
      .replace(/\[removed\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private determinePriority(apiArticle: NewsAPIArticle): 'breaking' | 'trending' | 'regular' {
    const title = apiArticle.title.toLowerCase();
    const description = (apiArticle.description || '').toLowerCase();

    // Breaking news indicators
    const breakingKeywords = [
      'breaking', 'urgent', 'alert', 'developing', 'live',
      'just in', 'update', 'emergency', 'crisis'
    ];

    const trendingKeywords = [
      'viral', 'trending', 'popular', 'exclusive', 'major',
      'significant', 'important', 'announcement'
    ];

    const text = `${title} ${description}`;

    if (breakingKeywords.some(keyword => text.includes(keyword))) {
      return 'breaking';
    }

    if (trendingKeywords.some(keyword => text.includes(keyword))) {
      return 'trending';
    }

    return 'regular';
  }

  private calculateWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private updateRateLimitCounters(): void {
    this.requestCount++;
    this.hourlyRequestCount++;
    this.lastRequestTime = Date.now();
  }

  private getCurrentRateLimitInfo(): RateLimitInfo {
    const now = Date.now();
    const hourlyResetTime = this.lastHourReset + 3600000;

    return {
      dailyLimit: this.dailyLimit,
      dailyRemaining: Math.max(0, this.dailyLimit - this.requestCount),
      hourlyLimit: this.requestsPerHour,
      hourlyRemaining: Math.max(0, this.requestsPerHour - this.hourlyRequestCount),
      resetTime: new Date(hourlyResetTime),
      canMakeRequest: this.requestCount < this.dailyLimit && this.hourlyRequestCount < this.requestsPerHour
    };
  }

  // Utility methods
  async getRateLimitStatus(): Promise<RateLimitInfo> {
    return this.getCurrentRateLimitInfo();
  }

  resetDailyCounter(): void {
    this.requestCount = 0;
  }

  resetHourlyCounter(): void {
    this.hourlyRequestCount = 0;
    this.lastHourReset = Date.now();
  }

  // Static method to get available categories
  static getAvailableCategories(): string[] {
    return [
      'general',
      'business',
      'entertainment',
      'health',
      'science',
      'sports',
      'technology'
    ];
  }

  // Static method to get available countries
  static getAvailableCountries(): Record<string, string> {
    return {
      'us': 'United States',
      'gb': 'United Kingdom',
      'ca': 'Canada',
      'au': 'Australia',
      'in': 'India',
      'de': 'Germany',
      'fr': 'France',
      'it': 'Italy',
      'jp': 'Japan',
      'kr': 'South Korea',
      'cn': 'China',
      'br': 'Brazil'
    };
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      const rateLimitInfo = this.getCurrentRateLimitInfo();

      if (rateLimitInfo.dailyRemaining === 0) {
        return {
          status: 'unhealthy',
          details: {
            error: 'Daily rate limit exhausted',
            rateLimitInfo
          }
        };
      }

      if (rateLimitInfo.hourlyRemaining < 5) {
        return {
          status: 'degraded',
          details: {
            warning: 'Low hourly requests remaining',
            rateLimitInfo
          }
        };
      }

      return {
        status: 'healthy',
        details: {
          rateLimitInfo,
          apiKey: this.apiKey ? 'configured' : 'missing'
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
}