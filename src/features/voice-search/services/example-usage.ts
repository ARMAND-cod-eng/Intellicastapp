/**
 * Example usage of the Tavily API Client
 * This file demonstrates how to use the TavilyClient with various scenarios
 */

import {
  TavilyClient,
  createTavilyClient,
  shouldIncludeNews,
  recommendSearchDepth,
  TavilyError,
  type TavilySearchResponse
} from './tavily-client';

// ============================================================================
// Basic Usage Examples
// ============================================================================

/**
 * Example 1: Simple search with default options
 */
export async function basicSearchExample() {
  try {
    const tavily = new TavilyClient();
    const results = await tavily.search('quantum computing');

    console.log('Search Results:', results);
    console.log('AI Answer:', results.answer);
    console.log('Images found:', results.images.length);
    console.log('Follow-up questions:', results.follow_up_questions);

    return results;
  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
}

/**
 * Example 2: Advanced search with custom options
 */
export async function advancedSearchExample() {
  try {
    const tavily = createTavilyClient();

    const results = await tavily.search('artificial intelligence trends 2024', {
      includeNews: true,
      searchDepth: 'advanced',
      maxResults: 15,
      timeframe: 30, // Last 30 days for news
      excludeDomains: ['spam-site.com', 'low-quality.net']
    });

    console.log('Advanced Search Results:');
    console.log('- Query Intent:', results.metadata.query_intent);
    console.log('- Total Results:', results.metadata.total_results);
    console.log('- Processing Time:', results.metadata.processing_time_ms + 'ms');
    console.log('- News Results:', results.news_results?.length || 0);

    return results;
  } catch (error) {
    if (error instanceof TavilyError) {
      console.error(`Tavily Error [${error.code}]:`, error.message);

      // Handle specific error types
      switch (error.code) {
        case 'RATE_LIMIT_EXCEEDED':
          console.log('Consider implementing exponential backoff');
          break;
        case 'INVALID_API_KEY':
          console.log('Check your API key configuration');
          break;
        case 'TIMEOUT':
          console.log('Try reducing max_results or use basic search_depth');
          break;
      }
    }
    throw error;
  }
}

/**
 * Example 3: News-focused search
 */
export async function newsSearchExample() {
  try {
    const tavily = new TavilyClient();
    const query = 'latest developments in renewable energy';

    // Automatically detect if news search is beneficial
    const includeNews = shouldIncludeNews(query);

    const results = await tavily.search(query, {
      includeNews,
      searchDepth: 'advanced',
      timeframe: 7, // Last week
      maxResults: 10
    });

    console.log('News Search Results:');
    console.log('- Main Answer:', results.answer);
    console.log('- Regular Results:', results.results.length);
    console.log('- News Results:', results.news_results?.length || 0);

    // Process news results separately
    if (results.news_results) {
      results.news_results.forEach((news, index) => {
        console.log(`News ${index + 1}:`, {
          title: news.title,
          author: news.author,
          published: news.published_date,
          domain: news.domain
        });
      });
    }

    return results;
  } catch (error) {
    console.error('News search failed:', error);
    throw error;
  }
}

/**
 * Example 4: Local search with location
 */
export async function localSearchExample() {
  try {
    const tavily = new TavilyClient();

    const results = await tavily.search('best coffee shops near me', {
      location: 'San Francisco, CA',
      maxResults: 8,
      searchDepth: 'basic' // Local searches often don't need advanced depth
    });

    console.log('Local Search Results:');
    console.log('- Intent detected:', results.metadata.query_intent);
    console.log('- Results found:', results.results.length);

    return results;
  } catch (error) {
    console.error('Local search failed:', error);
    throw error;
  }
}

/**
 * Example 5: Research-focused search
 */
export async function researchSearchExample() {
  try {
    const tavily = new TavilyClient();
    const query = 'peer reviewed studies on climate change impact';

    // Automatically determine optimal search depth
    const searchDepth = recommendSearchDepth(query);

    const results = await tavily.search(query, {
      searchDepth,
      maxResults: 20,
      includeDomains: [
        'nature.com',
        'science.org',
        'ncbi.nlm.nih.gov',
        'scholar.google.com'
      ]
    });

    console.log('Research Search Results:');
    console.log('- Search Depth Used:', searchDepth);
    console.log('- High-quality sources:', results.results.filter(r => r.score && r.score > 0.8).length);

    return results;
  } catch (error) {
    console.error('Research search failed:', error);
    throw error;
  }
}

// ============================================================================
// Error Handling Examples
// ============================================================================

/**
 * Example 6: Comprehensive error handling
 */
export async function errorHandlingExample() {
  const tavily = new TavilyClient();

  try {
    const results = await tavily.search('test query', {
      maxResults: 100 // This might hit rate limits
    });

    return results;
  } catch (error) {
    if (error instanceof TavilyError) {
      // Handle specific Tavily errors
      switch (error.code) {
        case 'INVALID_API_KEY':
          console.error('❌ API Key Error:', error.message);
          // Fallback to mock data
          return tavily.getMockResponse('test query');

        case 'RATE_LIMIT_EXCEEDED':
          console.error('⏱️ Rate Limit Error:', error.message);
          if (error.details?.retryAfter) {
            console.log(`Retry after ${error.details.retryAfter} seconds`);
          }
          break;

        case 'TIMEOUT':
          console.error('⏰ Timeout Error:', error.message);
          // Retry with reduced parameters
          return tavily.search('test query', {
            maxResults: 5,
            searchDepth: 'basic'
          });

        case 'NETWORK_ERROR':
          console.error('🌐 Network Error:', error.message);
          break;

        default:
          console.error('❓ Unknown Tavily Error:', error.message);
      }
    } else {
      console.error('💥 Unexpected Error:', error);
    }

    throw error;
  }
}

// ============================================================================
// Utility Functions Examples
// ============================================================================

/**
 * Example 7: Using utility functions
 */
export function utilityFunctionsExample() {
  const queries = [
    'how to make coffee',
    'latest news about space exploration',
    'comprehensive analysis of machine learning algorithms',
    'restaurants near downtown Seattle'
  ];

  queries.forEach(query => {
    console.log(`Query: "${query}"`);
    console.log('- Should include news:', shouldIncludeNews(query));
    console.log('- Recommended depth:', recommendSearchDepth(query));
    console.log('---');
  });
}

/**
 * Example 8: Mock data for development
 */
export function mockDataExample() {
  const tavily = new TavilyClient(); // No API key provided

  // This will automatically use mock data
  const mockResults = tavily.getMockResponse('artificial intelligence', {
    includeNews: true,
    maxResults: 5
  });

  console.log('Mock Data Example:');
  console.log('- Answer:', mockResults.answer.substring(0, 100) + '...');
  console.log('- Images:', mockResults.images.length);
  console.log('- Results:', mockResults.results.length);
  console.log('- Intent:', mockResults.metadata.query_intent);

  return mockResults;
}

// ============================================================================
// Integration Examples
// ============================================================================

/**
 * Example 9: React component integration
 */
export async function reactIntegrationExample(query: string, setResults: (results: TavilySearchResponse) => void, setError: (error: string) => void) {
  try {
    const tavily = new TavilyClient();
    const results = await tavily.search(query, {
      searchDepth: 'advanced',
      includeNews: shouldIncludeNews(query),
      maxResults: 10
    });

    setResults(results);
  } catch (error) {
    const errorMessage = error instanceof TavilyError
      ? `Search failed: ${error.message}`
      : 'An unexpected error occurred';

    setError(errorMessage);
  }
}

/**
 * Example 10: Streaming/Progressive results (simulation)
 */
export async function progressiveSearchExample(query: string, onProgress: (results: Partial<TavilySearchResponse>) => void) {
  const tavily = new TavilyClient();

  try {
    // Simulate progressive loading
    onProgress({ query, metadata: { query_intent: 'general' } as any });

    const results = await tavily.search(query);

    // Simulate streaming results
    onProgress({ ...results, results: results.results.slice(0, 3) });

    setTimeout(() => {
      onProgress(results);
    }, 500);

    return results;
  } catch (error) {
    console.error('Progressive search failed:', error);
    throw error;
  }
}

// ============================================================================
// Configuration Examples
// ============================================================================

/**
 * Example 11: Custom client configuration
 */
export function configurationExample() {
  // Option 1: Use environment variable (recommended)
  const defaultClient = new TavilyClient();

  // Option 2: Provide API key explicitly
  const customClient = new TavilyClient('your-api-key-here');

  // Option 3: Use factory function
  const factoryClient = createTavilyClient(process.env.CUSTOM_TAVILY_KEY);

  // Check configuration
  console.log('Default client configured:', defaultClient.isConfigured());
  console.log('Custom client configured:', customClient.isConfigured());
  console.log('Factory client configured:', factoryClient.isConfigured());

  return { defaultClient, customClient, factoryClient };
}

// Export all examples for easy testing
export const examples = {
  basicSearchExample,
  advancedSearchExample,
  newsSearchExample,
  localSearchExample,
  researchSearchExample,
  errorHandlingExample,
  utilityFunctionsExample,
  mockDataExample,
  reactIntegrationExample,
  progressiveSearchExample,
  configurationExample
};

export default examples;