# 🔍 Tavily API Client

A comprehensive TypeScript client for the Tavily Search API with advanced features, error handling, and smart search capabilities.

## ✨ Features

- **🎯 Smart Search Intelligence**: Automatic query intent detection and optimization
- **🔧 Complete TypeScript Support**: Full type safety with comprehensive interfaces
- **🛡️ Robust Error Handling**: Detailed error types and recovery strategies
- **🎭 Mock Data Support**: Development-friendly mock responses
- **⚡ Performance Optimized**: Timeout handling and rate limiting support
- **🧠 Intent Detection**: Automatically optimizes searches based on query type
- **📊 Rich Response Types**: Support for regular results, news, images, and more

## 🚀 Quick Start

### Basic Usage

```typescript
import { TavilyClient } from './tavily-client';

const tavily = new TavilyClient();

// Simple search
const results = await tavily.search('quantum computing');
console.log(results.answer); // AI-generated summary
console.log(results.results); // Search results array
console.log(results.images); // Related images
```

### Advanced Usage

```typescript
// Advanced search with options
const results = await tavily.search('artificial intelligence trends 2024', {
  includeNews: true,
  searchDepth: 'advanced',
  maxResults: 15,
  timeframe: 30, // Last 30 days for news
  excludeDomains: ['spam-site.com']
});

console.log('Query Intent:', results.metadata.query_intent);
console.log('News Results:', results.news_results);
```

## 🎛️ Configuration

### Environment Variables

Add your Tavily API key to `.env.local`:

```env
VITE_TAVILY_API_KEY=your_tavily_api_key_here
```

### Manual Configuration

```typescript
// Option 1: Use environment variable (recommended)
const tavily = new TavilyClient();

// Option 2: Provide API key explicitly
const tavily = new TavilyClient('your-api-key-here');

// Option 3: Use factory function
import { createTavilyClient } from './tavily-client';
const tavily = createTavilyClient();
```

## 📝 API Reference

### TavilyClient Class

#### Methods

##### `search(query: string, options?: TavilySearchOptions): Promise<TavilySearchResponse>`

Perform intelligent search with comprehensive error handling.

**Parameters:**
- `query` (string): The search query
- `options` (TavilySearchOptions): Search configuration options

**Options:**
- `includeNews?: boolean` - Include news results
- `searchDepth?: 'basic' | 'advanced'` - Search depth level
- `maxResults?: number` - Maximum number of results (1-50)
- `timeframe?: number` - Days to look back for news
- `location?: string` - Location for local searches
- `includeDomains?: string[]` - Domains to include
- `excludeDomains?: string[]` - Domains to exclude

##### `isConfigured(): boolean`

Check if API key is configured.

##### `getMockResponse(query: string, options?: TavilySearchOptions): TavilySearchResponse`

Get mock response for testing and development.

### Response Types

#### TavilySearchResponse

```typescript
interface TavilySearchResponse {
  answer: string;                    // AI-generated summary
  query: string;                     // Original query
  response_time: number;             // Response time in seconds
  images: string[];                  // Related image URLs
  follow_up_questions: string[];     // Suggested follow-up questions
  results: TavilyResult[];           // Search results
  news_results?: TavilyNewsResult[]; // News results (if enabled)
  search_parameters: object;         // Search configuration used
  metadata: {
    total_results: number;
    query_intent: QueryIntent;       // Detected intent
    processing_time_ms: number;
    api_version: string;
  };
}
```

#### TavilyResult

```typescript
interface TavilyResult {
  title: string;           // Result title
  url: string;             // Source URL
  content: string;         // Content snippet
  raw_content?: string;    // Full content (if available)
  published_date?: string; // Publication date
  score?: number;          // Relevance score (0-1)
  snippet?: string;        // Short snippet
  favicon?: string;        // Domain favicon URL
  domain?: string;         // Source domain
}
```

### Error Handling

The client provides specific error types for different scenarios:

```typescript
import { TavilyError, TavilyAPIKeyError, TavilyRateLimitError } from './tavily-client';

try {
  const results = await tavily.search('test query');
} catch (error) {
  if (error instanceof TavilyAPIKeyError) {
    console.log('Invalid API key - using mock data');
    const mockResults = tavily.getMockResponse('test query');
  } else if (error instanceof TavilyRateLimitError) {
    console.log('Rate limited - retry after:', error.details?.retryAfter);
  } else if (error instanceof TavilyError) {
    console.log('Tavily error:', error.code, error.message);
  }
}
```

## 🧠 Smart Features

### Intent Detection

The client automatically detects query intent and optimizes search parameters:

- **📰 News**: Queries containing "latest", "breaking", "news"
- **📚 How-to**: Queries starting with "how to", "tutorial"
- **🏢 Local**: Queries with "near me", "local", location terms
- **🔬 Research**: Academic and scientific queries
- **❓ Factual**: Who/what/when/where/why questions

### Utility Functions

```typescript
import { shouldIncludeNews, recommendSearchDepth } from './tavily-client';

// Check if query would benefit from news search
const includeNews = shouldIncludeNews('latest AI developments');

// Get recommended search depth based on complexity
const depth = recommendSearchDepth('comprehensive analysis of quantum computing');
```

## 🎭 Development Mode

When no API key is configured, the client automatically provides realistic mock data:

```typescript
const tavily = new TavilyClient(); // No API key
const results = await tavily.search('test query'); // Returns mock data

// The mock data matches the exact structure of real Tavily responses
console.log(results.answer); // Generated mock answer with citations
console.log(results.results); // Array of mock search results
console.log(results.metadata.api_version); // "1.0.0-mock"
```

## 🔄 React Integration

Example React hook for search functionality:

```typescript
import { useState, useCallback } from 'react';
import { TavilyClient, TavilySearchResponse, TavilyError } from './tavily-client';

export function useSearch() {
  const [results, setResults] = useState<TavilySearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const tavily = new TavilyClient();
      const results = await tavily.search(query, {
        searchDepth: 'advanced',
        includeNews: true,
        maxResults: 10
      });

      setResults(results);
    } catch (err) {
      const errorMessage = err instanceof TavilyError
        ? err.message
        : 'Search failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { search, results, loading, error };
}
```

## 🔧 Advanced Configuration

### Custom Search Parameters

```typescript
// Research-focused search
const researchResults = await tavily.search('climate change studies', {
  searchDepth: 'advanced',
  maxResults: 20,
  includeDomains: ['nature.com', 'science.org', 'ncbi.nlm.nih.gov']
});

// News-focused search
const newsResults = await tavily.search('tech industry updates', {
  includeNews: true,
  timeframe: 7, // Last week
  searchDepth: 'basic'
});

// Local search
const localResults = await tavily.search('restaurants near me', {
  location: 'San Francisco, CA',
  maxResults: 8
});
```

### Performance Optimization

```typescript
// For basic queries, use basic search depth
const basicResults = await tavily.search('simple question', {
  searchDepth: 'basic',
  maxResults: 5
});

// For complex queries, use advanced search depth
const advancedResults = await tavily.search('comprehensive analysis topic', {
  searchDepth: 'advanced',
  maxResults: 15
});
```

## 🚨 Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `INVALID_API_KEY` | Invalid or missing API key | Check configuration |
| `RATE_LIMIT_EXCEEDED` | Rate limit reached | Implement backoff |
| `TIMEOUT` | Request timeout (30s) | Reduce parameters |
| `NETWORK_ERROR` | Network connectivity issue | Check connection |
| `INVALID_REQUEST` | Invalid request parameters | Validate inputs |
| `ACCESS_FORBIDDEN` | Subscription issue | Check account |
| `SERVER_ERROR` | Tavily server error | Retry later |

## 🧪 Testing

The client includes comprehensive mock data for testing:

```typescript
import { TavilyClient } from './tavily-client';

// Test with mock data
const tavily = new TavilyClient(); // No API key = mock mode
const testResults = await tavily.search('test query');

// Verify mock structure
expect(testResults.answer).toBeDefined();
expect(testResults.results).toHaveLength(8);
expect(testResults.metadata.api_version).toBe('1.0.0-mock');
```

## 📚 Examples

See [`example-usage.ts`](./example-usage.ts) for comprehensive usage examples including:

- Basic and advanced search patterns
- Error handling strategies
- React component integration
- Mock data usage
- Utility function examples
- Progressive search implementation

## 🤝 Contributing

When contributing to the Tavily client:

1. Maintain TypeScript type safety
2. Add comprehensive error handling
3. Include mock data for new features
4. Update documentation and examples
5. Test both real API and mock modes

## 📄 License

This Tavily client is part of the Intellicast AI project and follows the same license terms.