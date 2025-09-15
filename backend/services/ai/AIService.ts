/**
 * AI Service - Main service class that orchestrates AI operations
 * Provides high-level methods for summarization, dialogue, sentiment, and classification
 */

import {
  IAIProvider,
  SummarizationOptions,
  SummarizationResult,
  DialogueOptions,
  DialogueResult,
  DialogueExchange,
  SentimentOptions,
  SentimentResult,
  SentimentScore,
  ClassificationOptions,
  ClassificationResult,
  CategoryMatch,
  AIServiceError,
  GenerationOptions
} from './types';
import { PromptTemplates } from './templates/PromptTemplates';

export class AIService {
  private provider: IAIProvider;
  private defaultOptions: GenerationOptions;

  constructor(provider: IAIProvider, defaultOptions: GenerationOptions = {}) {
    this.provider = provider;
    this.defaultOptions = {
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      ...defaultOptions
    };
  }

  /**
   * Summarization Methods
   */
  async summarizeContent(content: string, options: SummarizationOptions): Promise<SummarizationResult> {
    try {
      const templateId = this.getTemplateIdForSummaryType(options.type);
      const template = PromptTemplates.getTemplate(templateId);

      if (!template) {
        throw new AIServiceError(
          `Template not found for summary type: ${options.type}`,
          'TEMPLATE_NOT_FOUND',
          this.provider.name,
          false
        );
      }

      const variables = {
        content,
        maxLength: options.maxLength || 200,
        focusAreas: options.focusAreas || [],
        includeKeyPoints: options.includeKeyPoints || false
      };

      const missingVars = PromptTemplates.validateVariables(template, variables);
      if (missingVars.length > 0) {
        throw new AIServiceError(
          `Missing required variables: ${missingVars.join(', ')}`,
          'MISSING_VARIABLES',
          this.provider.name,
          false
        );
      }

      const prompt = PromptTemplates.compileTemplate(template, variables);
      const generationOptions = {
        ...this.defaultOptions,
        ...PromptTemplates.getOptimizedOptions('summarize'),
        ...options
      };

      const response = await this.provider.generateResponse(prompt, generationOptions);

      // Parse the response to extract summary and metadata
      const summary = response.content.trim();
      const originalLength = content.split(' ').length;
      const summaryLength = summary.split(' ').length;

      return {
        summary,
        keyPoints: options.includeKeyPoints ? this.extractKeyPoints(summary) : undefined,
        wordCount: summaryLength,
        originalLength,
        compressionRatio: originalLength / summaryLength,
        confidence: this.calculateConfidence(response),
        type: options.type,
        metadata: {
          topicCoverage: this.extractTopics(summary),
          readingTime: Math.ceil(summaryLength / 200) // ~200 WPM
        }
      };

    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Summarization failed: ${error instanceof Error ? error.message : String(error)}`,
        'SUMMARIZATION_FAILED',
        this.provider.name,
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Dialogue Generation Methods
   */
  async generateDialogue(content: string, options: DialogueOptions): Promise<DialogueResult> {
    try {
      const template = PromptTemplates.getTemplate('podcast_dialogue');

      if (!template) {
        throw new AIServiceError(
          'Podcast dialogue template not found',
          'TEMPLATE_NOT_FOUND',
          this.provider.name,
          false
        );
      }

      const variables = {
        content,
        speakers: options.speakers,
        style: options.style,
        duration: options.duration || 15,
        segments: options.segments || []
      };

      const missingVars = PromptTemplates.validateVariables(template, variables);
      if (missingVars.length > 0) {
        throw new AIServiceError(
          `Missing required variables: ${missingVars.join(', ')}`,
          'MISSING_VARIABLES',
          this.provider.name,
          false
        );
      }

      const prompt = PromptTemplates.compileTemplate(template, variables);
      const generationOptions = {
        ...this.defaultOptions,
        ...PromptTemplates.getOptimizedOptions('dialogue'),
        ...options
      };

      const response = await this.provider.generateResponse(prompt, generationOptions);

      // Parse the dialogue from the response
      const dialogue = this.parseDialogue(response.content);
      const script = this.formatScript(dialogue);

      return {
        dialogue,
        speakers: options.speakers,
        metadata: {
          totalDuration: options.duration || 15,
          wordCount: response.content.split(' ').length,
          speakerBalance: this.calculateSpeakerBalance(dialogue, options.speakers),
          topicCoverage: this.extractTopics(response.content),
          style: options.style
        },
        script
      };

    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Dialogue generation failed: ${error instanceof Error ? error.message : String(error)}`,
        'DIALOGUE_FAILED',
        this.provider.name,
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Sentiment Analysis Methods
   */
  async analyzeSentiment(content: string, options: SentimentOptions = {}): Promise<SentimentResult> {
    try {
      const template = PromptTemplates.getTemplate('sentiment_analysis');

      if (!template) {
        throw new AIServiceError(
          'Sentiment analysis template not found',
          'TEMPLATE_NOT_FOUND',
          this.provider.name,
          false
        );
      }

      const variables = {
        content,
        aspects: options.aspects || []
      };

      const prompt = PromptTemplates.compileTemplate(template, variables);
      const generationOptions = {
        ...this.defaultOptions,
        ...PromptTemplates.getOptimizedOptions('sentiment'),
        ...options
      };

      const response = await this.provider.generateResponse(prompt, generationOptions);

      // Parse sentiment analysis from response
      return this.parseSentimentResponse(response.content, options);

    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Sentiment analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        'SENTIMENT_FAILED',
        this.provider.name,
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Classification Methods
   */
  async classifyContent(content: string, options: ClassificationOptions): Promise<ClassificationResult> {
    try {
      const templateId = options.categories === 'auto' ? 'auto_classification' : 'category_classification';
      const template = PromptTemplates.getTemplate(templateId);

      if (!template) {
        throw new AIServiceError(
          `Classification template not found: ${templateId}`,
          'TEMPLATE_NOT_FOUND',
          this.provider.name,
          false
        );
      }

      const variables = {
        content,
        categories: Array.isArray(options.categories) ? options.categories : [],
        maxCategories: options.maxCategories || 5
      };

      const prompt = PromptTemplates.compileTemplate(template, variables);
      const generationOptions = {
        ...this.defaultOptions,
        ...PromptTemplates.getOptimizedOptions('classify'),
        ...options
      };

      const response = await this.provider.generateResponse(prompt, generationOptions);

      // Parse classification results
      return this.parseClassificationResponse(response.content, options);

    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Content classification failed: ${error instanceof Error ? error.message : String(error)}`,
        'CLASSIFICATION_FAILED',
        this.provider.name,
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Streaming Methods
   */
  async *streamSummarization(content: string, options: SummarizationOptions): AsyncGenerator<string, SummarizationResult, unknown> {
    const templateId = this.getTemplateIdForSummaryType(options.type);
    const template = PromptTemplates.getTemplate(templateId);

    if (!template) {
      throw new AIServiceError(
        `Template not found for summary type: ${options.type}`,
        'TEMPLATE_NOT_FOUND',
        this.provider.name,
        false
      );
    }

    const variables = {
      content,
      maxLength: options.maxLength || 200,
      focusAreas: options.focusAreas || []
    };

    const prompt = PromptTemplates.compileTemplate(template, variables);
    const generationOptions = {
      ...this.defaultOptions,
      ...PromptTemplates.getOptimizedOptions('summarize'),
      ...options
    };

    let fullContent = '';

    for await (const chunk of this.provider.generateStreamResponse(prompt, generationOptions)) {
      fullContent += chunk.content;
      yield chunk.content;

      if (chunk.finished) {
        const originalLength = content.split(' ').length;
        const summaryLength = fullContent.split(' ').length;

        return {
          summary: fullContent.trim(),
          wordCount: summaryLength,
          originalLength,
          compressionRatio: originalLength / summaryLength,
          confidence: 0.85, // Default confidence for streaming
          type: options.type,
          metadata: {
            topicCoverage: this.extractTopics(fullContent),
            readingTime: Math.ceil(summaryLength / 200)
          }
        };
      }
    }

    throw new AIServiceError(
      'Stream ended without completion',
      'STREAM_INCOMPLETE',
      this.provider.name,
      true
    );
  }

  /**
   * Provider Management
   */
  async getProviderInfo() {
    return {
      name: this.provider.name,
      available: await this.provider.isAvailable(),
      modelInfo: await this.provider.getModelInfo()
    };
  }

  // Private helper methods
  private getTemplateIdForSummaryType(type: 'brief' | 'detailed' | 'bullet-points'): string {
    switch (type) {
      case 'brief': return 'brief_summary';
      case 'detailed': return 'detailed_summary';
      case 'bullet-points': return 'bullet_summary';
      default: return 'brief_summary';
    }
  }

  private extractKeyPoints(content: string): string[] {
    // Simple extraction - look for bullet points or numbered lists
    const lines = content.split('\n');
    return lines
      .filter(line => line.trim().match(/^[•\-\*\d\.]/))
      .map(line => line.trim().replace(/^[•\-\*\d\.\s]+/, ''))
      .filter(point => point.length > 0);
  }

  private extractTopics(content: string): string[] {
    // Simple topic extraction - this could be enhanced with NLP
    const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordFreq = new Map<string, number>();

    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
  }

  private calculateConfidence(response: any): number {
    // Basic confidence calculation - could be enhanced
    const contentLength = response.content.length;
    const hasUsage = response.usage && response.usage.totalTokens > 0;
    const completionReason = response.finishReason === 'stop';

    let confidence = 0.7; // Base confidence

    if (contentLength > 100) confidence += 0.1;
    if (hasUsage) confidence += 0.1;
    if (completionReason) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private parseDialogue(content: string): DialogueExchange[] {
    const dialogue: DialogueExchange[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^(.+?):\s*(.+)$/);
      if (match) {
        const [, speaker, text] = match;
        dialogue.push({
          speaker: speaker.trim(),
          content: text.trim()
        });
      }
    }

    return dialogue;
  }

  private formatScript(dialogue: DialogueExchange[]): string {
    return dialogue
      .map(exchange => `${exchange.speaker}: ${exchange.content}`)
      .join('\n\n');
  }

  private calculateSpeakerBalance(dialogue: DialogueExchange[], speakers: any[]): Record<string, number> {
    const speakerCounts = new Map<string, number>();
    const total = dialogue.length;

    dialogue.forEach(exchange => {
      speakerCounts.set(exchange.speaker, (speakerCounts.get(exchange.speaker) || 0) + 1);
    });

    const balance: Record<string, number> = {};
    speakerCounts.forEach((count, speaker) => {
      balance[speaker] = count / total;
    });

    return balance;
  }

  private parseSentimentResponse(content: string, options: SentimentOptions): SentimentResult {
    // Parse the structured sentiment response
    const lines = content.split('\n');
    let overall: SentimentScore = { label: 'neutral', score: 0, intensity: 'medium' };
    let confidence = 0.8;
    let reasoning = '';

    for (const line of lines) {
      if (line.includes('Overall Sentiment:')) {
        const match = line.match(/Overall Sentiment:\s*(\w+)\s*\(score:\s*([\d\.\-]+)\)/);
        if (match) {
          overall.label = match[1] as 'positive' | 'negative' | 'neutral';
          overall.score = parseFloat(match[2]);
          overall.intensity = Math.abs(overall.score) > 0.7 ? 'high' : Math.abs(overall.score) > 0.3 ? 'medium' : 'low';
        }
      } else if (line.includes('Confidence:')) {
        const match = line.match(/Confidence:\s*(\d+)%/);
        if (match) {
          confidence = parseInt(match[1]) / 100;
        }
      } else if (line.includes('Reasoning:')) {
        reasoning = line.replace(/Reasoning:\s*/, '');
      }
    }

    return {
      overall,
      confidence,
      reasoning: reasoning || 'Sentiment analysis completed'
    };
  }

  private parseClassificationResponse(content: string, options: ClassificationOptions): ClassificationResult {
    const lines = content.split('\n');
    const categories: CategoryMatch[] = [];
    let primaryCategory = '';
    let confidence = 0.8;
    let reasoning = '';

    for (const line of lines) {
      if (line.includes('Primary Category:')) {
        const match = line.match(/Primary Category:\s*([^(]+)\s*\(confidence:\s*(\d+)%\)/);
        if (match) {
          primaryCategory = match[1].trim();
          confidence = parseInt(match[2]) / 100;
          categories.push({
            category: primaryCategory,
            confidence: confidence,
            relevance: 1.0
          });
        }
      } else if (line.includes('Reasoning:')) {
        reasoning = line.replace(/Reasoning:\s*/, '');
      }
    }

    return {
      categories,
      primaryCategory,
      confidence,
      reasoning: reasoning || 'Classification completed'
    };
  }
}