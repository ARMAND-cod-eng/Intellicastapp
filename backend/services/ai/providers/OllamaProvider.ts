/**
 * Ollama AI Provider Implementation
 * Connects to local Ollama instance for LLM operations with streaming support
 */

import {
  IAIProvider,
  GenerationOptions,
  AIResponse,
  StreamChunk,
  ModelInfo,
  TokenUsage,
  AIServiceError
} from '../types';

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  context?: number[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    num_predict?: number;
    stop?: string[];
    seed?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

export class OllamaProvider implements IAIProvider {
  public readonly name = 'ollama';
  private baseUrl: string;
  private defaultModel: string;
  private timeout: number;
  private maxRetries: number;

  constructor(
    baseUrl = 'http://localhost:11434',
    defaultModel = 'llama3.1:8b',
    timeout = 120000,
    maxRetries = 3
  ) {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.warn('Ollama availability check failed:', error);
      return false;
    }
  }

  async generateResponse(prompt: string, options: GenerationOptions = {}): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const request: OllamaGenerateRequest = {
        model: options.model || this.defaultModel,
        prompt,
        system: options.systemPrompt,
        stream: false,
        options: {
          temperature: options.temperature,
          top_p: options.topP,
          top_k: options.topK,
          repeat_penalty: options.repeatPenalty,
          num_predict: options.maxTokens,
          stop: options.stopSequences,
          seed: options.seed
        }
      };

      const response = await this.makeRequest('/api/generate', request);

      if (!response.ok) {
        throw new AIServiceError(
          `Ollama API error: ${response.status} ${response.statusText}`,
          'OLLAMA_API_ERROR',
          this.name,
          true
        );
      }

      const data: OllamaGenerateResponse = await response.json();
      const responseTime = Date.now() - startTime;

      const usage: TokenUsage = {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      };

      return {
        content: data.response,
        model: data.model,
        usage,
        finishReason: data.done ? 'stop' : 'length',
        metadata: {
          total_duration: data.total_duration,
          load_duration: data.load_duration,
          prompt_eval_duration: data.prompt_eval_duration,
          eval_duration: data.eval_duration,
          context: data.context
        },
        responseTime,
        timestamp: new Date()
      };

    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError(
        `Failed to generate response: ${error instanceof Error ? error.message : String(error)}`,
        'GENERATION_FAILED',
        this.name,
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  async *generateStreamResponse(
    prompt: string,
    options: GenerationOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const request: OllamaGenerateRequest = {
        model: options.model || this.defaultModel,
        prompt,
        system: options.systemPrompt,
        stream: true,
        options: {
          temperature: options.temperature,
          top_p: options.topP,
          top_k: options.topK,
          repeat_penalty: options.repeatPenalty,
          num_predict: options.maxTokens,
          stop: options.stopSequences,
          seed: options.seed
        }
      };

      const response = await this.makeRequest('/api/generate', request);

      if (!response.ok) {
        throw new AIServiceError(
          `Ollama API error: ${response.status} ${response.statusText}`,
          'OLLAMA_API_ERROR',
          this.name,
          true
        );
      }

      if (!response.body) {
        throw new AIServiceError(
          'No response body received from Ollama',
          'NO_RESPONSE_BODY',
          this.name,
          false
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data: OllamaGenerateResponse = JSON.parse(line);

                const chunk: StreamChunk = {
                  content: data.response,
                  finished: data.done,
                  model: data.model,
                  usage: data.done ? {
                    promptTokens: data.prompt_eval_count || 0,
                    completionTokens: data.eval_count || 0,
                    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
                  } : undefined,
                  metadata: data.done ? {
                    total_duration: data.total_duration,
                    load_duration: data.load_duration,
                    prompt_eval_duration: data.prompt_eval_duration,
                    eval_duration: data.eval_duration,
                    context: data.context
                  } : undefined
                };

                yield chunk;

                if (data.done) {
                  return;
                }
              } catch (parseError) {
                console.warn('Failed to parse streaming response:', parseError, line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError(
        `Failed to generate streaming response: ${error instanceof Error ? error.message : String(error)}`,
        'STREAMING_FAILED',
        this.name,
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getModelInfo(): Promise<ModelInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new AIServiceError(
          `Failed to fetch model info: ${response.status} ${response.statusText}`,
          'MODEL_INFO_FAILED',
          this.name,
          true
        );
      }

      const data: { models: OllamaModelInfo[] } = await response.json();
      const model = data.models.find(m => m.name === this.defaultModel);

      if (!model) {
        throw new AIServiceError(
          `Model ${this.defaultModel} not found`,
          'MODEL_NOT_FOUND',
          this.name,
          false
        );
      }

      // Estimate context length based on model family
      let contextLength = 4096; // default
      if (model.details.family?.includes('llama')) {
        contextLength = 8192; // Llama 3.1 has larger context window
      }

      return {
        name: model.name,
        size: this.formatBytes(model.size),
        description: `${model.details.family} ${model.details.parameter_size} (${model.details.quantization_level})`,
        capabilities: [
          'text-generation',
          'chat',
          'streaming',
          'instruction-following'
        ],
        contextLength,
        available: true
      };

    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError(
        `Failed to get model info: ${error instanceof Error ? error.message : String(error)}`,
        'MODEL_INFO_FAILED',
        this.name,
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  private async makeRequest(endpoint: string, data: any): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // Health check method
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return { status: 'unhealthy', details: 'Ollama service not available' };
      }

      const modelInfo = await this.getModelInfo();
      return {
        status: 'healthy',
        details: {
          model: modelInfo.name,
          available: modelInfo.available
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
}