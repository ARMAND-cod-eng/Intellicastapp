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
// AI Content Processor - Shared utility for generating comprehensive answers
// ============================================================================

class AIContentProcessor {
  /**
   * Generate comprehensive AI summary from search results
   * This creates detailed, well-structured answers with proper citations
   */
  generateComprehensiveAnswer(query: string, results: TavilyResult[], intent: QueryIntent): string {
    if (!results || results.length === 0) {
      return this.generateFallbackAnswer(query, intent);
    }

    // Extract key information from search results
    const keyPoints = this.extractKeyInformation(results, intent);
    const citations = this.buildCitations(results);

    // Generate structured answer based on intent
    return this.synthesizeAnswer(query, keyPoints, citations, intent);
  }

  /**
   * Generate intelligent follow-up questions based on search results and content
   */
  generateIntelligentFollowUpQuestions(query: string, intent: QueryIntent, results: TavilyResult[]): string[] {
    const mainTopic = this.extractMainTopic(query);
    const questions: string[] = [];

    // Extract related topics from search results
    const relatedTopics = this.extractRelatedTopics(results);

    // Intent-specific intelligent questions
    switch (intent) {
      case 'news':
        questions.push(
          `What are the latest developments in ${mainTopic}?`,
          `How will ${mainTopic} impact the industry?`,
          `Who are the key players involved in ${mainTopic}?`,
          `What are the implications of ${mainTopic}?`
        );
        break;

      case 'howto':
        questions.push(
          `What tools are needed for ${mainTopic}?`,
          `What are common mistakes when ${mainTopic}?`,
          `How long does it take to ${mainTopic}?`,
          `What are advanced techniques for ${mainTopic}?`
        );
        break;

      case 'factual':
        questions.push(
          `What are the key characteristics of ${mainTopic}?`,
          `How does ${mainTopic} compare to alternatives?`,
          `What are the applications of ${mainTopic}?`,
          `What is the history of ${mainTopic}?`
        );
        break;

      case 'research':
        questions.push(
          `What does recent research say about ${mainTopic}?`,
          `What are the limitations of current ${mainTopic} studies?`,
          `How is ${mainTopic} being studied?`,
          `What are future research directions for ${mainTopic}?`
        );
        break;

      default:
        questions.push(
          `What are the benefits of ${mainTopic}?`,
          `How can I learn more about ${mainTopic}?`,
          `What are real-world examples of ${mainTopic}?`,
          `What should I know about ${mainTopic}?`
        );
    }

    // Add questions based on related topics found in results
    relatedTopics.slice(0, 2).forEach(topic => {
      questions.push(`How does ${topic} relate to ${mainTopic}?`);
    });

    return questions.slice(0, 6); // Return top 6 questions
  }

  /**
   * Extract key information from search results based on intent
   */
  private extractKeyInformation(results: TavilyResult[], intent: QueryIntent): string[] {
    const keyPoints: string[] = [];

    // Sort results by relevance score
    const sortedResults = results.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Extract main points from top results
    sortedResults.slice(0, 5).forEach((result, index) => {
      const content = result.content || result.snippet || '';

      // Extract sentences that contain key information
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);

      // Select most relevant sentences based on intent
      const relevantSentences = this.selectRelevantSentences(sentences, intent);

      relevantSentences.forEach(sentence => {
        if (sentence.trim() && !keyPoints.some(existing =>
          this.similarityScore(existing, sentence) > 0.7
        )) {
          keyPoints.push(sentence.trim());
        }
      });
    });

    return keyPoints.slice(0, 8); // Limit to 8 key points
  }

  /**
   * Select relevant sentences based on query intent
   */
  private selectRelevantSentences(sentences: string[], intent: QueryIntent): string[] {
    const relevantSentences: string[] = [];

    const intentKeywords = {
      news: ['recent', 'latest', 'new', 'announced', 'reported', 'today', 'breaking', 'update'],
      howto: ['how', 'step', 'process', 'method', 'way', 'guide', 'tutorial', 'first', 'next'],
      factual: ['is', 'are', 'definition', 'means', 'refers', 'concept', 'theory', 'principle'],
      research: ['study', 'research', 'findings', 'data', 'analysis', 'evidence', 'results'],
      local: ['location', 'area', 'near', 'local', 'place', 'where', 'address', 'nearby'],
      general: ['important', 'key', 'main', 'primary', 'significant', 'essential']
    };

    const keywords = intentKeywords[intent] || intentKeywords.general;

    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      const relevanceScore = keywords.reduce((score, keyword) => {
        return lowerSentence.includes(keyword) ? score + 1 : score;
      }, 0);

      if (relevanceScore > 0 || sentence.length > 50) {
        relevantSentences.push(sentence);
      }
    });

    return relevantSentences.slice(0, 3); // Top 3 relevant sentences per result
  }

  /**
   * Calculate similarity between two strings (simple Jaccard similarity)
   */
  private similarityScore(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Build citation mapping for sources
   */
  private buildCitations(results: TavilyResult[]): Map<number, TavilyResult> {
    const citations = new Map<number, TavilyResult>();
    results.forEach((result, index) => {
      citations.set(index + 1, result);
    });
    return citations;
  }

  /**
   * Synthesize comprehensive answer with proper structure and citations
   */
  private synthesizeAnswer(query: string, keyPoints: string[], citations: Map<number, TavilyResult>, intent: QueryIntent): string {
    if (keyPoints.length === 0) {
      return this.generateFallbackAnswer(query, intent);
    }

    let answer = '';

    // Create opening statement based on intent
    const openingStatements = {
      news: `Recent developments in ${this.extractMainTopic(query)} show significant activity across multiple areas.`,
      howto: `To ${query.replace(/^how\s+to\s+/i, '').replace(/^how\s+/i, '')}, several key approaches and best practices have been identified.`,
      factual: `${this.extractMainTopic(query)} encompasses several important aspects and characteristics that define its nature and applications.`,
      research: `Current research on ${this.extractMainTopic(query)} reveals important insights and findings across multiple studies.`,
      local: `Information about ${this.extractMainTopic(query)} varies by location, but several common patterns and options are available.`,
      general: `${this.extractMainTopic(query)} involves multiple dimensions and considerations worth understanding.`
    };

    answer = openingStatements[intent] || openingStatements.general;

    // Add key points with citations
    keyPoints.forEach((point, index) => {
      const citationNumber = index + 1;

      // Clean up the point and add proper citation
      let cleanPoint = point
        .replace(/^[^a-zA-Z]*/, '') // Remove leading non-letters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Ensure point ends with proper punctuation
      if (!/[.!?]$/.test(cleanPoint)) {
        cleanPoint += '.';
      }

      // Add citation
      cleanPoint = cleanPoint.replace(/\.$/, ` [${citationNumber}].`);

      // Add to answer with proper spacing
      if (index === 0) {
        answer += ` ${cleanPoint}`;
      } else {
        answer += ` • ${cleanPoint}`;
      }
    });

    // Add concluding statement based on intent
    const conclusions = {
      news: ` These developments indicate ongoing evolution and continued attention in this area.`,
      howto: ` Following these guidelines and best practices will help ensure successful implementation and optimal results.`,
      factual: ` Understanding these fundamental aspects provides a comprehensive foundation for further exploration and application.`,
      research: ` These findings contribute to our growing understanding and inform future research directions in this field.`,
      local: ` Local variations should be considered when making specific decisions or seeking services in your area.`,
      general: ` These considerations provide a well-rounded perspective on the topic and its various implications.`
    };

    if (keyPoints.length >= 3) {
      answer += conclusions[intent] || conclusions.general;
    }

    return answer;
  }

  /**
   * Extract main topic from query for better answer generation
   */
  private extractMainTopic(query: string): string {
    // Remove common question words and prepositions
    const cleanQuery = query
      .replace(/^(what|how|when|where|why|who|which)\s+(is|are|do|does|can|should|will|would)?\s*/i, '')
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/\?$/, '')
      .trim();

    // Take first few words as main topic
    const words = cleanQuery.split(/\s+/);
    return words.slice(0, Math.min(words.length, 4)).join(' ');
  }

  /**
   * Extract related topics from search results
   */
  private extractRelatedTopics(results: TavilyResult[]): string[] {
    const topics: string[] = [];
    const topicFrequency = new Map<string, number>();

    results.forEach(result => {
      const content = (result.content || result.snippet || '').toLowerCase();
      const title = result.title.toLowerCase();

      // Extract potential topics (capitalized words, technical terms)
      const words = (content + ' ' + title).match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];

      words.forEach(word => {
        if (word.length > 3 && word.length < 30) {
          const count = topicFrequency.get(word) || 0;
          topicFrequency.set(word, count + 1);
        }
      });
    });

    // Sort by frequency and return top topics
    return Array.from(topicFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  /**
   * Generate fallback answer when no results are available
   */
  private generateFallbackAnswer(query: string, intent: QueryIntent): string {
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
  private aiProcessor = new AIContentProcessor();

  generateMockResponse(query: string, options: TavilySearchOptions = {}): TavilySearchResponse {
    const intent = new QueryIntentDetector().detectIntent(query);
    const results = this.generateMockResults(query, options.maxResults || 8);

    return {
      answer: this.aiProcessor.generateComprehensiveAnswer(query, results, intent),
      query,
      response_time: Math.random() * 2 + 0.5,
      images: this.generateMockImages(query),
      follow_up_questions: this.aiProcessor.generateIntelligentFollowUpQuestions(query, intent, results),
      results,
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
        api_version: '1.0.0-enhanced'
      }
    };
  }


  private generateMockAnswer(query: string, intent: QueryIntent): string {
    // For development/demo purposes when API key is not available
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
    const domains = ['wikipedia.org', 'britannica.com', 'nature.com', 'sciencedirect.com', 'medium.com', 'techcrunch.com', 'forbes.com', 'harvard.edu'];
    const intent = new QueryIntentDetector().detectIntent(query);
    const mainTopic = this.extractMainTopic(query);

    return Array.from({ length: count }, (_, index) => {
      const domain = domains[index % domains.length];
      const contentVariations = this.generateRealisticContent(query, intent, index, domain);

      return {
        title: contentVariations.title,
        url: `https://${domain}/article/${query.replace(/\s+/g, '-').toLowerCase()}-${index + 1}`,
        content: contentVariations.content,
        raw_content: contentVariations.rawContent,
        published_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        score: Math.random() * 0.3 + 0.7,
        snippet: contentVariations.snippet,
        favicon: `https://${domain}/favicon.ico`,
        domain
      };
    });
  }

  /**
   * Generate realistic, varied content for mock results
   */
  private generateRealisticContent(query: string, intent: QueryIntent, index: number, domain: string): {
    title: string;
    content: string;
    rawContent: string;
    snippet: string;
  } {
    const mainTopic = this.extractMainTopic(query);

    const titleVariations = {
      news: [
        `Breaking: Latest Developments in ${mainTopic}`,
        `${mainTopic}: What You Need to Know Now`,
        `Industry Analysis: ${mainTopic} Trends and Updates`,
        `Expert Commentary on ${mainTopic} Developments`
      ],
      howto: [
        `Complete Guide to ${mainTopic}: Step-by-Step Instructions`,
        `Mastering ${mainTopic}: Best Practices and Techniques`,
        `${mainTopic} Tutorial: From Beginner to Expert`,
        `Professional Approach to ${mainTopic}: Expert Methods`
      ],
      factual: [
        `Understanding ${mainTopic}: Comprehensive Overview`,
        `${mainTopic} Explained: Key Concepts and Principles`,
        `The Science Behind ${mainTopic}: Research and Facts`,
        `Deep Dive into ${mainTopic}: Analysis and Insights`
      ],
      research: [
        `Research Findings on ${mainTopic}: Latest Studies`,
        `Academic Analysis of ${mainTopic}: Peer-Reviewed Research`,
        `Scientific Investigation into ${mainTopic}: Results and Implications`,
        `Empirical Study of ${mainTopic}: Data and Conclusions`
      ],
      general: [
        `Comprehensive Analysis of ${mainTopic}`,
        `${mainTopic}: Essential Information and Insights`,
        `Understanding ${mainTopic}: Expert Perspective`,
        `${mainTopic} Overview: Key Points and Applications`
      ]
    };

    const contentVariations = {
      news: [
        `Recent developments in ${mainTopic} have shown significant progress across multiple sectors. Industry experts report substantial advancements in key areas, with major announcements expected to shape future trends. The impact of these changes extends beyond immediate applications, influencing broader market dynamics and strategic planning.`,
        `Breaking news in ${mainTopic} reveals important shifts in industry standards and practices. Leading organizations have announced major initiatives that demonstrate commitment to innovation and improvement. These developments represent a significant milestone in the evolution of ${mainTopic}.`,
        `Latest updates on ${mainTopic} indicate accelerating momentum in research and development efforts. Key stakeholders have unveiled new approaches that promise to transform current methodologies and establish new benchmarks for success.`
      ],
      howto: [
        `Implementing ${mainTopic} requires careful planning and systematic execution. The process begins with thorough preparation and assessment of requirements, followed by structured implementation phases. Key success factors include proper resource allocation, stakeholder engagement, and continuous monitoring of progress indicators.`,
        `To achieve optimal results with ${mainTopic}, experts recommend following established best practices and proven methodologies. The approach involves multiple stages, each building upon previous foundations to ensure comprehensive coverage and sustainable outcomes.`,
        `Successful ${mainTopic} implementation depends on understanding fundamental principles and applying them systematically. The methodology includes detailed planning, careful execution, and ongoing evaluation to ensure objectives are met effectively.`
      ],
      factual: [
        `${mainTopic} represents a complex field with multiple interconnected components and applications. The fundamental principles underlying ${mainTopic} have been extensively studied and documented, providing a solid foundation for understanding its broader implications and practical applications.`,
        `Understanding ${mainTopic} requires examination of its core characteristics, historical development, and current state of knowledge. Research has revealed key patterns and relationships that inform both theoretical frameworks and practical applications.`,
        `The nature of ${mainTopic} encompasses several important dimensions that define its scope and significance. Current understanding integrates multiple perspectives and approaches, creating a comprehensive view of the subject.`
      ],
      research: [
        `Research on ${mainTopic} has produced significant findings that advance our understanding of key mechanisms and processes. Studies employing rigorous methodologies have identified important correlations and causal relationships that inform both theory and practice.`,
        `Scientific investigation of ${mainTopic} has revealed crucial insights into underlying principles and their applications. The research methodology includes comprehensive data collection, statistical analysis, and peer review to ensure validity and reliability of conclusions.`,
        `Academic studies on ${mainTopic} demonstrate clear evidence of important trends and patterns. The research findings contribute to growing knowledge base and provide foundation for future investigations and practical applications.`
      ],
      general: [
        `${mainTopic} encompasses multiple aspects that are important for comprehensive understanding. The subject involves various components and considerations that interact in complex ways, creating a rich field of study and application.`,
        `Exploring ${mainTopic} reveals important connections and relationships that extend across multiple domains. The comprehensive view includes both theoretical foundations and practical implications for real-world applications.`,
        `${mainTopic} represents an important area with significant implications for multiple stakeholders. Understanding its various dimensions provides valuable insights for both academic study and practical implementation.`
      ]
    };

    const intentTemplates = intent in titleVariations ? intent : 'general';
    const titles = titleVariations[intentTemplates];
    const contents = contentVariations[intentTemplates];

    const title = titles[index % titles.length];
    const content = contents[index % contents.length];
    const snippet = content.substring(0, 150) + '...';
    const rawContent = content + ` This detailed analysis of ${mainTopic} provides comprehensive coverage including background information, current developments, key considerations, and future outlook. The content integrates multiple perspectives and sources to deliver authoritative information on this important topic.`;

    return { title, content, rawContent, snippet };
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
  private readonly aiProcessor = new AIContentProcessor();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_TAVILY_API_KEY || '';

    if (this.apiKey && this.apiKey !== 'your-tavily-api-key-here') {
      console.log('✅ Tavily API configured - using real search results');
    } else {
      console.warn('⚠️ Tavily API key not configured - using enhanced mock data');
      console.log('Add your API key to .env file: VITE_TAVILY_API_KEY=your-key-here');
      console.log('Get your free API key at: https://tavily.com/');
    }
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

      // Use enhanced mock data if no valid API key is available
      if (!this.apiKey || this.apiKey === 'your-tavily-api-key-here') {
        console.warn('🔄 Using enhanced mock data (configure VITE_TAVILY_API_KEY for real results)');
        return this.mockGenerator.generateMockResponse(query, options);
      }

      console.log('🔍 Using Tavily API for real search results...');

      // Detect query intent and optimize
      const intent = this.intentDetector.detectIntent(query);
      const optimizedQuery = this.intentDetector.optimizeQuery(query, intent);

      // Build search parameters
      const searchParams = this.buildSearchParams(optimizedQuery, options, intent);

      // Perform API request
      const response = await this.makeRequest(searchParams);

      // Process and enhance response with comprehensive AI summary
      return this.processResponseWithAISummary(response, intent, optimizedQuery);

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
   * Process API response with comprehensive AI summary generation
   */
  private processResponseWithAISummary(response: any, intent: QueryIntent, query: string): TavilySearchResponse {
    // Enhance response with metadata
    const enhancedResponse: TavilySearchResponse = {
      ...response,
      metadata: {
        total_results: response.results?.length || 0,
        query_intent: intent,
        processing_time_ms: Math.floor((response.response_time || 0) * 1000),
        api_version: '1.0.0-ai-enhanced'
      }
    };

    // Ensure required fields exist
    enhancedResponse.images = enhancedResponse.images || [];
    enhancedResponse.results = enhancedResponse.results || [];

    // Sort results by score (descending)
    enhancedResponse.results.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Generate comprehensive AI answer if Tavily didn't provide one or it's generic
    if (!response.answer || this.isGenericAnswer(response.answer)) {
      enhancedResponse.answer = this.aiProcessor.generateComprehensiveAnswer(query, enhancedResponse.results, intent);
    } else {
      // Enhance existing answer with better structure and citations
      enhancedResponse.answer = this.enhanceExistingAnswer(response.answer, enhancedResponse.results);
    }

    // Generate intelligent follow-up questions
    enhancedResponse.follow_up_questions = this.aiProcessor.generateIntelligentFollowUpQuestions(
      query,
      intent,
      enhancedResponse.results
    );

    return enhancedResponse;
  }

  /**
   * Check if answer is generic or template-based
   */
  private isGenericAnswer(answer: string): boolean {
    const genericPhrases = [
      'according to the search results',
      'based on the information provided',
      'the search results indicate',
      'from the available sources'
    ];

    const lowerAnswer = answer.toLowerCase();
    return genericPhrases.some(phrase => lowerAnswer.includes(phrase)) ||
           answer.length < 100 ||
           (answer.match(/\[\d+\]/g) || []).length < 2;
  }

  /**
   * Enhance existing Tavily answer with better structure
   */
  private enhanceExistingAnswer(originalAnswer: string, results: TavilyResult[]): string {
    // If the original answer is already well-structured, return it
    if (originalAnswer.length > 300 && (originalAnswer.match(/\[\d+\]/g) || []).length >= 3) {
      return originalAnswer;
    }

    // Otherwise, enhance it with additional context from results
    let enhancedAnswer = originalAnswer;

    // Add additional insights from top results if original answer is short
    if (originalAnswer.length < 200 && results.length > 0) {
      const additionalContext = this.extractAdditionalContext(results.slice(0, 3));
      if (additionalContext) {
        enhancedAnswer += ` ${additionalContext}`;
      }
    }

    return enhancedAnswer;
  }

  /**
   * Extract additional context from search results
   */
  private extractAdditionalContext(results: TavilyResult[]): string {
    if (!results || results.length === 0) return '';

    const contexts: string[] = [];
    let citationIndex = 1;

    results.forEach((result, index) => {
      const content = result.content || result.snippet || '';
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 40);

      // Find the most informative sentence
      const bestSentence = sentences.find(s =>
        s.length > 50 &&
        s.length < 200 &&
        !s.toLowerCase().includes('click here') &&
        !s.toLowerCase().includes('read more')
      );

      if (bestSentence && contexts.length < 2) {
        contexts.push(`${bestSentence.trim()} [${citationIndex + index}]`);
      }
    });

    return contexts.length > 0 ? ' • ' + contexts.join(' • ') : '';
  }

  /**
   * Check if API key is configured and valid
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your-tavily-api-key-here';
  }

  /**
   * Get API configuration status
   */
  getApiStatus(): { configured: boolean; using: 'real-api' | 'mock-data'; message: string } {
    if (this.isConfigured()) {
      return {
        configured: true,
        using: 'real-api',
        message: 'Using Tavily API for real search results and AI summaries'
      };
    } else {
      return {
        configured: false,
        using: 'mock-data',
        message: 'Using enhanced mock data. Add VITE_TAVILY_API_KEY to .env for real results'
      };
    }
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
 * Enhanced search function with comprehensive AI summaries
 */
export async function performEnhancedSearch(
  query: string,
  options: TavilySearchOptions & { apiKey?: string } = {}
): Promise<TavilySearchResponse> {
  const client = new TavilyClient(options.apiKey);
  return await client.search(query, options);
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