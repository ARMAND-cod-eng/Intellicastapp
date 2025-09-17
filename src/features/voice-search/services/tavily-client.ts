/**
 * Tavily API Client with comprehensive TypeScript support
 * Provides intelligent search capabilities with error handling and mock data
 */

// ============================================================================
// TypeScript Interfaces and Types
// ============================================================================

export type SearchDepth = 'basic' | 'advanced';
export type QueryIntent = 'news' | 'howto' | 'factual' | 'local' | 'research' | 'general';

export interface TavilySearchParams {
  query: string;
  search_depth?: SearchDepth;
  include_answer?: boolean;
  include_images?: boolean;
  include_news?: boolean;
  include_raw_content?: boolean;
  max_results?: number;
  include_domains?: string[];
  exclude_domains?: string[];
  topic?: 'general' | 'news';
  days?: number; // For news searches
  location?: string; // For local searches
}

export interface TavilySearchOptions {
  includeNews?: boolean;
  searchDepth?: SearchDepth;
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  timeframe?: number; // days
  location?: string;
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  raw_content?: string;
  published_date?: string;
  score?: number;
  snippet?: string;
  favicon?: string;
  domain?: string;
}

export interface TavilyNewsResult extends TavilyResult {
  author?: string;
  category?: string;
  language?: string;
  country?: string;
  thumbnail?: string;
}

export interface TavilySearchResponse {
  answer: string;
  query: string;
  response_time: number;
  images: string[];
  follow_up_questions: string[];
  results: TavilyResult[];
  news_results?: TavilyNewsResult[];
  search_parameters: {
    search_depth: SearchDepth;
    include_answer: boolean;
    include_images: boolean;
    include_news: boolean;
    max_results: number;
  };
  metadata: {
    total_results: number;
    query_intent: QueryIntent;
    processing_time_ms: number;
    api_version: string;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export class TavilyError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'TavilyError';
  }
}

export class TavilyAPIKeyError extends TavilyError {
  constructor() {
    super('Invalid or missing Tavily API key', 'INVALID_API_KEY', 401);
  }
}

export class TavilyRateLimitError extends TavilyError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
  }
}

export class TavilyTimeoutError extends TavilyError {
  constructor() {
    super('Request timeout after 30 seconds', 'TIMEOUT', 408);
  }
}

export class TavilyNetworkError extends TavilyError {
  constructor(originalError: Error) {
    super(`Network error: ${originalError.message}`, 'NETWORK_ERROR', 0, originalError);
  }
}

// ============================================================================
// Query Intent Detection
// ============================================================================

class QueryIntentDetector {
  private readonly newsKeywords = [
    'news', 'latest', 'breaking', 'today', 'yesterday', 'recent', 'current',
    'headlines', 'update', 'announcement', 'report', 'happens', 'happening'
  ];

  private readonly howToKeywords = [
    'how to', 'how do', 'how can', 'tutorial', 'guide', 'step by step',
    'learn', 'teach', 'instruction', 'method', 'way to', 'process'
  ];

  private readonly localKeywords = [
    'near me', 'nearby', 'local', 'in my area', 'around', 'close to',
    'restaurant', 'store', 'shop', 'service', 'location'
  ];

  private readonly researchKeywords = [
    'study', 'research', 'analysis', 'data', 'statistics', 'findings',
    'evidence', 'academic', 'scientific', 'peer reviewed', 'journal'
  ];

  detectIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();

    if (this.newsKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'news';
    }

    if (this.howToKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'howto';
    }

    if (this.localKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'local';
    }

    if (this.researchKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'research';
    }

    // Check for factual questions (who, what, when, where, why)
    if (/^(who|what|when|where|why|which|whose)\s/i.test(lowerQuery)) {
      return 'factual';
    }

    return 'general';
  }

  optimizeQuery(query: string, intent: QueryIntent): string {
    let optimizedQuery = query.trim();

    switch (intent) {
      case 'news':
        if (!optimizedQuery.includes('latest') && !optimizedQuery.includes('recent')) {
          optimizedQuery = `latest ${optimizedQuery}`;
        }
        break;

      case 'howto':
        if (!optimizedQuery.toLowerCase().startsWith('how')) {
          optimizedQuery = `how to ${optimizedQuery}`;
        }
        break;

      case 'research':
        optimizedQuery += ' research study analysis';
        break;
    }

    return optimizedQuery;
  }
}

// ============================================================================
// Mock Data Generator
// ============================================================================

class MockDataGenerator {
  generateMockResponse(query: string, options: TavilySearchOptions = {}): TavilySearchResponse {
    const intent = new QueryIntentDetector().detectIntent(query);

    return {
      answer: this.generateMockAnswer(query, intent),
      query,
      response_time: Math.random() * 2 + 0.5,
      images: this.generateMockImages(query),
      follow_up_questions: this.generateFollowUpQuestions(query, intent),
      results: this.generateMockResults(query, options.maxResults || 8),
      news_results: options.includeNews ? this.generateMockNewsResults(query) : undefined,
      search_parameters: {
        search_depth: options.searchDepth || 'advanced',
        include_answer: true,
        include_images: true,
        include_news: options.includeNews || false,
        max_results: options.maxResults || 8
      },
      metadata: {
        total_results: options.maxResults || 8,
        query_intent: intent,
        processing_time_ms: Math.floor(Math.random() * 500 + 100),
        api_version: '1.0.0-mock'
      }
    };
  }

  private generateMockAnswer(query: string, intent: QueryIntent): string {
    const templates = {
      news: `Recent developments regarding ${query} indicate significant activity in this area. [1] According to multiple sources, there have been notable updates and announcements. [2] The latest information suggests continued interest and ongoing developments. [3]`,

      howto: `To ${query.replace(/^how to\s?/i, '')}, follow these key steps: First, understand the basic requirements and prepare necessary materials. [1] Next, implement the core process systematically. [2] Finally, verify results and make adjustments as needed. [3] This approach has proven effective across various scenarios.`,

      factual: `${query} refers to a significant concept with multiple aspects worth understanding. [1] The primary characteristics include several key features that define its nature and scope. [2] Current understanding is based on extensive research and documented evidence. [3]`,

      local: `${query} can be found in various locations depending on your specific area and requirements. [1] Most communities offer several options with different features and accessibility. [2] It's recommended to check local directories and reviews for the best options near you. [3]`,

      research: `Research on ${query} has revealed important insights and findings. [1] Scientific studies demonstrate significant correlations and patterns in this area. [2] Current academic consensus supports evidence-based conclusions with ongoing investigation. [3]`,

      general: `${query} is a topic with multiple dimensions and practical applications. [1] Understanding its core principles helps in grasping its broader implications and uses. [2] Current knowledge combines theoretical foundations with real-world experience and documentation. [3]`
    };

    return templates[intent] || templates.general;
  }

  private generateMockImages(query: string): string[] {
    const imageIds = Array.from({ length: 4 }, () => Math.floor(Math.random() * 1000) + 100);
    return imageIds.map(id => `https://picsum.photos/300/300?random=${id}&query=${encodeURIComponent(query)}`);
  }

  private generateFollowUpQuestions(query: string, intent: QueryIntent): string[] {
    const baseQuestions = [
      `What are the benefits of ${query}?`,
      `How does ${query} work in practice?`,
      `What are alternatives to ${query}?`,
      `What experts say about ${query}?`
    ];

    const intentSpecific = {
      news: [
        `Latest updates on ${query}`,
        `Who is involved in ${query}?`,
        `What caused ${query}?`,
        `Impact of ${query} on industry`
      ],
      howto: [
        `Best practices for ${query}`,
        `Common mistakes in ${query}`,
        `Tools needed for ${query}`,
        `Advanced techniques for ${query}`
      ],
      research: [
        `Scientific studies on ${query}`,
        `Data and statistics about ${query}`,
        `Future research directions for ${query}`,
        `Methodology for studying ${query}`
      ]
    };

    return intentSpecific[intent] || baseQuestions;
  }

  private generateMockResults(query: string, count: number): TavilyResult[] {
    const domains = ['wikipedia.org', 'britannica.com', 'nature.com', 'sciencedirect.com', 'medium.com', 'blog.example.com'];

    return Array.from({ length: count }, (_, index) => ({
      title: `${query} - Comprehensive Guide ${index + 1}`,
      url: `https://${domains[index % domains.length]}/article/${query.replace(/\s+/g, '-').toLowerCase()}-${index + 1}`,
      content: `This comprehensive article explores ${query} in detail, covering its main aspects, applications, and implications. The content provides valuable insights based on current research and expert analysis. Key points include fundamental concepts, practical applications, and future perspectives in this important area.`,
      raw_content: `Full detailed content about ${query} with extensive information, data, and analysis. This includes background information, current state, trends, challenges, and opportunities. The article covers multiple perspectives and provides comprehensive coverage of the topic.`,
      published_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      score: Math.random() * 0.3 + 0.7,
      snippet: `Key information about ${query} highlighting important aspects and main points.`,
      favicon: `https://${domains[index % domains.length]}/favicon.ico`,
      domain: domains[index % domains.length]
    }));
  }

  private generateMockNewsResults(query: string): TavilyNewsResult[] {
    const newsOutlets = ['CNN', 'BBC', 'Reuters', 'Associated Press', 'The Guardian'];

    return Array.from({ length: 5 }, (_, index) => ({
      title: `Breaking: ${query} Development Announced`,
      url: `https://news.example${index + 1}.com/article/${query.replace(/\s+/g, '-')}-news`,
      content: `Latest news regarding ${query} with important updates and developments. This breaking story covers recent announcements and their potential impact on the industry and stakeholders.`,
      author: `Reporter ${index + 1}`,
      category: 'Technology',
      language: 'en',
      country: 'US',
      published_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      score: Math.random() * 0.2 + 0.8,
      thumbnail: `https://picsum.photos/200/150?random=${index + 100}`,
      domain: `news.example${index + 1}.com`
    }));
  }
}

// ============================================================================
// Main Tavily Client Class
// ============================================================================

export class TavilyClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tavily.com';
  private readonly timeout = 30000; // 30 seconds
  private readonly intentDetector = new QueryIntentDetector();
  private readonly mockGenerator = new MockDataGenerator();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_TAVILY_API_KEY || '';
  }

  /**
   * Perform intelligent search with comprehensive error handling
   */
  async search(query: string, options: TavilySearchOptions = {}): Promise<TavilySearchResponse> {
    try {
      // Validate inputs
      if (!query?.trim()) {
        throw new TavilyError('Query cannot be empty', 'INVALID_QUERY');
      }

      // Use mock data if no API key is available
      if (!this.apiKey) {
        console.warn('Tavily API key not found, using mock data for development');
        return this.mockGenerator.generateMockResponse(query, options);
      }

      // Detect query intent and optimize
      const intent = this.intentDetector.detectIntent(query);
      const optimizedQuery = this.intentDetector.optimizeQuery(query, intent);

      // Build search parameters
      const searchParams = this.buildSearchParams(optimizedQuery, options, intent);

      // Perform API request
      const response = await this.makeRequest(searchParams);

      // Process and enhance response
      return this.processResponse(response, intent);

    } catch (error) {
      if (error instanceof TavilyError) {
        throw error;
      }

      // Handle unknown errors
      console.error('Unexpected error in Tavily search:', error);
      throw new TavilyError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Build comprehensive search parameters
   */
  private buildSearchParams(query: string, options: TavilySearchOptions, intent: QueryIntent): TavilySearchParams {
    const params: TavilySearchParams = {
      query,
      search_depth: options.searchDepth || 'advanced',
      include_answer: true,
      include_images: true,
      include_raw_content: true,
      max_results: Math.min(options.maxResults || 20, 50), // Cap at 50
      include_news: options.includeNews || intent === 'news'
    };

    // Add intent-specific parameters
    switch (intent) {
      case 'news':
        params.topic = 'news';
        params.days = options.timeframe || 7;
        break;

      case 'local':
        if (options.location) {
          params.location = options.location;
        }
        break;
    }

    // Add domain filters if specified
    if (options.includeDomains?.length) {
      params.include_domains = options.includeDomains;
    }

    if (options.excludeDomains?.length) {
      params.exclude_domains = options.excludeDomains;
    }

    return params;
  }

  /**
   * Make HTTP request with comprehensive error handling
   */
  private async makeRequest(params: TavilySearchParams): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(params),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle HTTP error responses
      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TavilyTimeoutError();
      }

      if (error instanceof TavilyError) {
        throw error;
      }

      throw new TavilyNetworkError(error as Error);
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleHttpError(response: Response): Promise<never> {
    let errorDetails;
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = { message: 'Unknown error' };
    }

    switch (response.status) {
      case 401:
        throw new TavilyAPIKeyError();

      case 429:
        const retryAfter = response.headers.get('Retry-After');
        throw new TavilyRateLimitError(retryAfter ? parseInt(retryAfter) : undefined);

      case 400:
        throw new TavilyError(
          errorDetails.message || 'Invalid request parameters',
          'INVALID_REQUEST',
          400,
          errorDetails
        );

      case 403:
        throw new TavilyError(
          'Access forbidden - check your subscription plan',
          'ACCESS_FORBIDDEN',
          403
        );

      case 500:
        throw new TavilyError(
          'Tavily API server error',
          'SERVER_ERROR',
          500
        );

      default:
        throw new TavilyError(
          `HTTP ${response.status}: ${errorDetails.message || 'Unknown error'}`,
          'HTTP_ERROR',
          response.status,
          errorDetails
        );
    }
  }

  /**
   * Process and enhance API response
   */
  private processResponse(response: any, intent: QueryIntent): TavilySearchResponse {
    // Enhance response with metadata
    const enhancedResponse: TavilySearchResponse = {
      ...response,
      metadata: {
        total_results: response.results?.length || 0,
        query_intent: intent,
        processing_time_ms: Math.floor((response.response_time || 0) * 1000),
        api_version: '1.0.0'
      }
    };

    // Ensure required fields exist
    enhancedResponse.images = enhancedResponse.images || [];
    enhancedResponse.follow_up_questions = enhancedResponse.follow_up_questions || [];
    enhancedResponse.results = enhancedResponse.results || [];

    // Sort results by score (descending)
    enhancedResponse.results.sort((a, b) => (b.score || 0) - (a.score || 0));

    return enhancedResponse;
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get mock response for testing
   */
  getMockResponse(query: string, options: TavilySearchOptions = {}): TavilySearchResponse {
    return this.mockGenerator.generateMockResponse(query, options);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a configured Tavily client instance
 */
export function createTavilyClient(apiKey?: string): TavilyClient {
  return new TavilyClient(apiKey);
}

/**
 * Detect if a query is likely to benefit from news search
 */
export function shouldIncludeNews(query: string): boolean {
  const newsIndicators = [
    'news', 'latest', 'recent', 'today', 'breaking', 'current',
    'update', 'announcement', 'happening', 'development'
  ];

  const lowerQuery = query.toLowerCase();
  return newsIndicators.some(indicator => lowerQuery.includes(indicator));
}

/**
 * Optimize search depth based on query complexity
 */
export function recommendSearchDepth(query: string): SearchDepth {
  // Use advanced search for complex queries
  const complexityIndicators = [
    'research', 'analysis', 'comprehensive', 'detailed', 'in-depth',
    'academic', 'scientific', 'study', 'comparison', 'evaluation'
  ];

  const lowerQuery = query.toLowerCase();
  const isComplex = complexityIndicators.some(indicator => lowerQuery.includes(indicator)) ||
                   query.split(' ').length > 5 ||
                   /[?!]/.test(query);

  return isComplex ? 'advanced' : 'basic';
}

// Export default instance
export default new TavilyClient();