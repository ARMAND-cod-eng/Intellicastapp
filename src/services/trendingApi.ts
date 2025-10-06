import { ENDPOINTS } from '../config/api';

export interface TrendingTopic {
  id: string;
  title: string;
  category: string;
  trendScore: number;
  sources: number;
  description: string;
  keywords: string[];
  estimatedDuration: string;
  content?: string;
}

export interface DiscoverTopicsResponse {
  success: boolean;
  topics: TrendingTopic[];
  total: number;
  category: string;
}

export interface GenerateContentResponse {
  success: boolean;
  content: string;
}

export class TrendingAPI {
  static async discoverTopics(
    category: string = 'all',
    limit: number = 10
  ): Promise<DiscoverTopicsResponse> {
    try {
      const response = await fetch(ENDPOINTS.TRENDING.DISCOVER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          limit
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to discover topics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Trending topics discovery error:', error);
      throw error;
    }
  }

  static async generateContent(topicDescription: string): Promise<GenerateContentResponse> {
    try {
      const response = await fetch(ENDPOINTS.TRENDING.GENERATE_CONTENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_text: topicDescription
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate content: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Content generation error:', error);
      throw error;
    }
  }
}
