/**
 * Together.ai LLM Service for Perplexity-Style Detailed Answers
 * Generates comprehensive 400-800 word answers with in-text citations
 */

import { Together } from "together-ai";
import type { TavilyResult } from './tavily-client';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface DetailedAnswerRequest {
  query: string;
  searchResults: TavilyResult[];
  queryIntent?: 'news' | 'howto' | 'factual' | 'local' | 'research' | 'general';
}

export interface DetailedAnswerResponse {
  answer: string;
  wordCount: number;
  citationCount: number;
  followUpQuestions: string[];
  generationTime: number;
}

export interface StreamChunk {
  type: 'content' | 'citation' | 'complete';
  text: string;
  citationNumber?: number;
}

// ============================================================================
// Together.ai Detailed Answer Generator
// ============================================================================

export class TogetherDetailedAnswerGenerator {
  private client: Together;
  private readonly model: string;

  constructor(apiKey?: string, model: string = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo") {
    const key = apiKey || import.meta.env.VITE_TOGETHER_API_KEY || '';

    if (!key) {
      throw new Error('Together AI API key not configured. Add VITE_TOGETHER_API_KEY to .env');
    }

    this.client = new Together({ apiKey: key });
    this.model = model;
  }

  /**
   * Generate Perplexity-style detailed answer with in-text citations
   */
  async generateDetailedAnswer(request: DetailedAnswerRequest): Promise<DetailedAnswerResponse> {
    const startTime = Date.now();

    try {
      // Build citation context from search results
      const citationContext = this.buildCitationContext(request.searchResults);

      // Create comprehensive prompt for Perplexity-style answer
      const prompt = this.createPerplexityStylePrompt(
        request.query,
        citationContext,
        request.queryIntent || 'general'
      );

      console.log('🤖 Generating detailed answer with Together AI...');

      // Generate answer using Together AI
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.9,
        stream: false
      });

      const answer = response.choices[0]?.message?.content || '';

      // Generate intelligent follow-up questions
      const followUpQuestions = await this.generateFollowUpQuestions(
        request.query,
        answer,
        request.queryIntent || 'general'
      );

      const generationTime = Date.now() - startTime;

      return {
        answer,
        wordCount: this.countWords(answer),
        citationCount: this.countCitations(answer),
        followUpQuestions,
        generationTime
      };

    } catch (error) {
      console.error('Error generating detailed answer:', error);
      throw error;
    }
  }

  /**
   * Generate streaming detailed answer for real-time display
   */
  async *generateStreamingAnswer(request: DetailedAnswerRequest): AsyncGenerator<StreamChunk> {
    try {
      const citationContext = this.buildCitationContext(request.searchResults);
      const prompt = this.createPerplexityStylePrompt(
        request.query,
        citationContext,
        request.queryIntent || 'general'
      );

      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';

        if (content) {
          // Detect citations in the content
          const citationMatch = content.match(/\[(\d+)\]/);

          if (citationMatch) {
            yield {
              type: 'citation',
              text: content,
              citationNumber: parseInt(citationMatch[1])
            };
          } else {
            yield {
              type: 'content',
              text: content
            };
          }
        }
      }

      yield {
        type: 'complete',
        text: ''
      };

    } catch (error) {
      console.error('Error in streaming answer:', error);
      throw error;
    }
  }

  /**
   * Build citation context from search results
   */
  private buildCitationContext(results: TavilyResult[]): string {
    let context = "Source Information:\n\n";

    results.slice(0, 10).forEach((result, index) => {
      const citationNumber = index + 1;
      const content = result.content || result.snippet || '';

      context += `[${citationNumber}] ${result.title}\n`;
      context += `URL: ${result.url}\n`;
      context += `Content: ${content.substring(0, 500)}...\n`;
      context += `Domain: ${result.domain || 'unknown'}\n\n`;
    });

    return context;
  }

  /**
   * Create Perplexity-style prompt for comprehensive answers
   */
  private createPerplexityStylePrompt(
    query: string,
    citationContext: string,
    intent: string
  ): string {
    return `You are an expert AI assistant tasked with creating a comprehensive, detailed answer in the exact style of Perplexity AI.

USER QUERY: "${query}"

${citationContext}

CRITICAL REQUIREMENTS:
1. Write a detailed answer of 400-800 words
2. Embed citations [1], [2], [3] WITHIN sentences, not as footnotes
3. Citations should flow naturally: "The system was launched in 2024 [1] and has gained significant traction [2]."
4. Use natural, flowing paragraphs without explicit section headers
5. Start with a strong opening paragraph that directly answers the query
6. Include specific facts, dates, numbers, and details from sources
7. Compare and contrast when relevant
8. Maintain professional, informative tone
9. End with practical implications or future outlook

STYLE GUIDELINES:
- Write as if you're Perplexity AI - authoritative yet accessible
- Integrate citations seamlessly into narrative flow
- Use transition phrases to connect ideas smoothly
- Include specific details and concrete examples
- Avoid generic statements - be specific and factual
- No explicit "Introduction", "Conclusion" headers
- Natural paragraph transitions

${this.getIntentSpecificGuidance(intent)}

Generate the answer now:`;
  }

  /**
   * Get system prompt for the LLM
   */
  private getSystemPrompt(): string {
    return `You are Perplexity AI, an advanced AI assistant that provides comprehensive, well-researched answers with in-text citations. Your responses are:

1. Detailed and comprehensive (400-800 words)
2. Filled with specific facts, dates, and concrete details
3. Citations embedded naturally within sentences [1], [2], [3]
4. Written in flowing paragraphs without explicit headers
5. Professional, authoritative, yet accessible
6. Focused on answering the user's query directly and thoroughly

You excel at synthesizing information from multiple sources into coherent, informative narratives that help users deeply understand topics.`;
  }

  /**
   * Get intent-specific guidance for answer generation
   */
  private getIntentSpecificGuidance(intent: string): string {
    const guidance: Record<string, string> = {
      news: `FOCUS: Latest developments, recent announcements, current events
- Start with most recent information
- Include dates and timeline of events
- Mention key stakeholders and their actions
- Discuss implications and future outlook`,

      howto: `FOCUS: Step-by-step guidance, best practices, practical implementation
- Begin with overview of the process
- Include specific steps and methods
- Mention tools, resources, and requirements
- Provide tips for success and common pitfalls`,

      factual: `FOCUS: Core concepts, definitions, characteristics
- Start with clear definition or overview
- Explain key characteristics and properties
- Include historical context if relevant
- Compare with related concepts when applicable`,

      research: `FOCUS: Scientific findings, academic insights, evidence-based analysis
- Emphasize research findings and data
- Include study methodologies and sample sizes
- Discuss statistical significance and implications
- Note limitations and areas for further research`,

      local: `FOCUS: Location-specific information, geographical context
- Provide location-specific details
- Include accessibility and availability info
- Mention regional variations and options
- Discuss local regulations or considerations`,

      general: `FOCUS: Comprehensive overview, multiple perspectives
- Start with broad context and significance
- Cover multiple dimensions of the topic
- Include practical applications and examples
- Discuss current state and future directions`
    };

    return guidance[intent] || guidance.general;
  }

  /**
   * Generate contextual follow-up questions using LLM
   */
  private async generateFollowUpQuestions(
    originalQuery: string,
    generatedAnswer: string,
    intent: string
  ): Promise<string[]> {
    try {
      const prompt = `Based on this query: "${originalQuery}"

And this comprehensive answer:
${generatedAnswer.substring(0, 1000)}...

Generate 5 intelligent, contextual follow-up questions that:
1. Explore deeper aspects of the topic
2. Connect to related areas the user might want to learn about
3. Are specific and actionable (not generic)
4. Build upon the information provided
5. Are phrased naturally and conversationally

Return ONLY the 5 questions, one per line, without numbering or bullet points.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are an expert at generating insightful follow-up questions that help users explore topics more deeply."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 300,
        stream: false
      });

      const questions = response.choices[0]?.message?.content || '';
      return questions
        .split('\n')
        .filter(q => q.trim().length > 0)
        .map(q => q.replace(/^[-•*\d.)\]]+\s*/, '').trim())
        .filter(q => q.endsWith('?'))
        .slice(0, 5);

    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return this.getFallbackFollowUpQuestions(originalQuery, intent);
    }
  }

  /**
   * Get fallback follow-up questions
   */
  private getFallbackFollowUpQuestions(query: string, intent: string): string[] {
    const mainTopic = query.replace(/^(what|how|when|where|why|who|which)\s+/i, '').trim();

    const templates: Record<string, string[]> = {
      news: [
        `What are the latest developments in ${mainTopic}?`,
        `How will ${mainTopic} impact the industry?`,
        `Who are the key players involved in ${mainTopic}?`,
        `What are the long-term implications of ${mainTopic}?`,
        `What challenges does ${mainTopic} face?`
      ],
      howto: [
        `What tools are needed for ${mainTopic}?`,
        `What are common mistakes when ${mainTopic}?`,
        `How long does it take to ${mainTopic}?`,
        `What are advanced techniques for ${mainTopic}?`,
        `What are the prerequisites for ${mainTopic}?`
      ],
      factual: [
        `What are the key characteristics of ${mainTopic}?`,
        `How does ${mainTopic} compare to alternatives?`,
        `What are the applications of ${mainTopic}?`,
        `What is the history of ${mainTopic}?`,
        `What are the benefits of ${mainTopic}?`
      ],
      research: [
        `What does recent research say about ${mainTopic}?`,
        `What are the limitations of current ${mainTopic} studies?`,
        `How is ${mainTopic} being studied?`,
        `What are future research directions for ${mainTopic}?`,
        `What are the key findings in ${mainTopic} research?`
      ],
      general: [
        `What are the benefits of ${mainTopic}?`,
        `How can I learn more about ${mainTopic}?`,
        `What are real-world examples of ${mainTopic}?`,
        `What should beginners know about ${mainTopic}?`,
        `What are the latest trends in ${mainTopic}?`
      ]
    };

    return templates[intent] || templates.general;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Count citations in text
   */
  private countCitations(text: string): number {
    const citations = text.match(/\[\d+\]/g) || [];
    return new Set(citations).size; // Count unique citations
  }

  /**
   * Validate generated answer quality
   */
  validateAnswerQuality(answer: string): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    const wordCount = this.countWords(answer);
    const citationCount = this.countCitations(answer);

    // Check word count
    if (wordCount < 300) {
      issues.push('Answer is too short (< 300 words)');
      suggestions.push('Expand with more detailed information and examples');
    } else if (wordCount > 1000) {
      issues.push('Answer is too long (> 1000 words)');
      suggestions.push('Condense to focus on most important points');
    }

    // Check citations
    if (citationCount < 3) {
      issues.push('Insufficient citations (< 3)');
      suggestions.push('Add more source references to support claims');
    }

    // Check for in-text citations (not footnotes)
    const hasCitationsInText = /\w+\s+\[\d+\]/.test(answer);
    if (!hasCitationsInText && citationCount > 0) {
      issues.push('Citations appear to be footnotes, not in-text');
      suggestions.push('Integrate citations within sentences');
    }

    // Check for headers (should not have explicit headers)
    const hasHeaders = /^#+\s+/m.test(answer) || /^(Introduction|Conclusion|Overview):/im.test(answer);
    if (hasHeaders) {
      issues.push('Contains explicit headers (should use flowing paragraphs)');
      suggestions.push('Remove headers and use natural paragraph transitions');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a configured Together AI answer generator
 */
export function createDetailedAnswerGenerator(apiKey?: string, model?: string): TogetherDetailedAnswerGenerator {
  return new TogetherDetailedAnswerGenerator(apiKey, model);
}

/**
 * Format answer with proper citation styling
 */
export function formatAnswerWithCitations(answer: string, sources: TavilyResult[]): string {
  let formattedAnswer = answer;

  // Ensure citations are properly spaced
  formattedAnswer = formattedAnswer.replace(/(\w)\[(\d+)\]/g, '$1 [$2]');
  formattedAnswer = formattedAnswer.replace(/\s+\[/g, ' [');

  return formattedAnswer;
}

/**
 * Extract citation numbers from answer
 */
export function extractCitations(answer: string): number[] {
  const citations = answer.match(/\[(\d+)\]/g) || [];
  return citations
    .map(c => parseInt(c.replace(/[\[\]]/g, '')))
    .filter((n, i, arr) => arr.indexOf(n) === i) // Unique citations
    .sort((a, b) => a - b);
}

/**
 * Build citation list from sources
 */
export function buildCitationList(sources: TavilyResult[], citedNumbers: number[]): Array<{
  number: number;
  title: string;
  url: string;
  domain: string;
}> {
  return citedNumbers
    .filter(num => sources[num - 1]) // Ensure source exists
    .map(num => {
      const source = sources[num - 1];
      return {
        number: num,
        title: source.title,
        url: source.url,
        domain: source.domain || new URL(source.url).hostname
      };
    });
}

// Export default instance (if API key is available)
let defaultGenerator: TogetherDetailedAnswerGenerator | null = null;

try {
  defaultGenerator = new TogetherDetailedAnswerGenerator();
} catch (error) {
  console.warn('Together AI not configured. Use createDetailedAnswerGenerator() with API key.');
}

export default defaultGenerator;
