/**
 * Prompt Templates Optimized for Llama 3.1
 * High-quality prompt templates for various AI operations
 */

import { PromptTemplate } from '../types';

export class PromptTemplates {
  // Summarization Templates
  static readonly BRIEF_SUMMARY: PromptTemplate = {
    id: 'brief_summary',
    name: 'Brief Summary',
    description: 'Creates concise summaries in 1-3 sentences',
    template: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an expert content summarizer. Create brief, accurate summaries that capture the essential information. Focus on the main points and key insights. Be concise but comprehensive.

Guidelines:
- Keep summaries between 1-3 sentences
- Focus on the most important information
- Use clear, accessible language
- Maintain factual accuracy
- Avoid unnecessary details<|eot_id|><|start_header_id|>user<|end_header_id|>

Please provide a brief summary of the following content:

{{content}}

Length target: {{maxLength}} words<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`,
    variables: ['content', 'maxLength'],
    modelOptimized: ['llama3.1:8b'],
    examples: [{
      input: { content: 'Long article about AI developments...', maxLength: 50 },
      expectedOutput: 'Recent AI developments show significant progress in language models...',
      description: 'Brief summary example'
    }]
  };

  static readonly DETAILED_SUMMARY: PromptTemplate = {
    id: 'detailed_summary',
    name: 'Detailed Summary',
    description: 'Creates comprehensive summaries with multiple paragraphs',
    template: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an expert content analyst. Create detailed, structured summaries that capture all important aspects of the content. Include context, main arguments, supporting evidence, and conclusions.

Guidelines:
- Organize information logically with clear structure
- Include background context where relevant
- Cover all major points and themes
- Explain relationships between ideas
- Use section headers when appropriate
- Maintain objectivity and accuracy<|eot_id|><|start_header_id|>user<|end_header_id|>

Please provide a detailed summary of the following content:

{{content}}

{{#focusAreas}}
Please pay special attention to these areas:
{{#each focusAreas}}
- {{this}}
{{/each}}
{{/focusAreas}}

Target length: {{maxLength}} words<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`,
    variables: ['content', 'maxLength', 'focusAreas'],
    modelOptimized: ['llama3.1:8b']
  };

  static readonly BULLET_POINT_SUMMARY: PromptTemplate = {
    id: 'bullet_summary',
    name: 'Bullet Point Summary',
    description: 'Creates structured bullet point summaries',
    template: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an expert at creating structured summaries. Convert the content into clear, organized bullet points that capture all essential information.

Guidelines:
- Use clear, hierarchical bullet points
- Group related information together
- Start with the most important points
- Use concise, actionable language
- Include specific details and numbers when relevant
- Organize with main points and sub-points as needed<|eot_id|><|start_header_id|>user<|end_header_id|>

Please create a bullet point summary of the following content:

{{content}}

{{#includeKeyPoints}}
Please ensure you capture these key aspects:
{{#each focusAreas}}
• {{this}}
{{/each}}
{{/includeKeyPoints}}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`,
    variables: ['content', 'includeKeyPoints', 'focusAreas'],
    modelOptimized: ['llama3.1:8b']
  };

  // Dialogue Generation Templates
  static readonly PODCAST_DIALOGUE: PromptTemplate = {
    id: 'podcast_dialogue',
    name: 'Podcast Dialogue Generation',
    description: 'Generates natural podcast conversations between speakers',
    template: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an expert podcast scriptwriter. Create engaging, natural dialogue between speakers that educates and entertains listeners. The conversation should feel authentic and flow naturally.

Guidelines:
- Write natural, conversational dialogue
- Include interruptions, agreements, and natural speech patterns
- Balance speaking time between participants
- Include smooth transitions between topics
- Add emotional cues and speaking directions when appropriate
- Make complex topics accessible through dialogue
- Keep the target audience engaged

Speaker Profiles:
{{#each speakers}}
**{{name}}** ({{role}}):
- Personality: {{personality}}
- Expertise: {{expertise}}
- Speaking Style: {{speakingStyle}}
{{/each}}

Dialogue Style: {{style}}
Target Duration: {{duration}} minutes<|eot_id|><|start_header_id|>user<|end_header_id|>

Create a podcast dialogue covering this content:

{{content}}

{{#segments}}
Structure the dialogue with these segments:
{{#each segments}}
{{@index}}. {{type}}: {{topic}} ({{duration}} min)
   Key points: {{keyPoints}}
{{/each}}
{{/segments}}

Format: Use speaker names followed by their dialogue. Include [emotion/tone] notes where appropriate.<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`,
    variables: ['content', 'speakers', 'style', 'duration', 'segments'],
    modelOptimized: ['llama3.1:8b']
  };

  // Sentiment Analysis Templates
  static readonly SENTIMENT_ANALYSIS: PromptTemplate = {
    id: 'sentiment_analysis',
    name: 'Sentiment Analysis',
    description: 'Analyzes emotional tone and sentiment of content',
    template: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an expert sentiment analyst. Analyze the emotional tone, sentiment, and underlying feelings in the provided content. Be precise and provide detailed reasoning.

Guidelines:
- Analyze overall sentiment: positive, negative, or neutral
- Provide sentiment scores from -1 (very negative) to +1 (very positive)
- Identify specific emotions present
- Consider context and nuance
- Explain your reasoning clearly
- Rate confidence in your analysis

{{#aspects}}
Pay special attention to sentiment regarding:
{{#each aspects}}
- {{this}}
{{/each}}
{{/aspects}}

Provide analysis in this format:
- Overall Sentiment: [label] (score: X.X)
- Confidence: X%
- Primary Emotions: [list]
- Reasoning: [explanation]
{{#aspects}}- Aspect Analysis: [for each aspect]{{/aspects}}<|eot_id|><|start_header_id|>user<|end_header_id|>

Analyze the sentiment of this content:

{{content}}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`,
    variables: ['content', 'aspects'],
    modelOptimized: ['llama3.1:8b']
  };

  // Classification Templates
  static readonly CATEGORY_CLASSIFICATION: PromptTemplate = {
    id: 'category_classification',
    name: 'Content Classification',
    description: 'Classifies content into predefined or auto-detected categories',
    template: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an expert content classifier. Analyze the provided content and assign it to the most appropriate categories. Be accurate and provide reasoning for your classifications.

Guidelines:
- Consider the main topics and themes
- Look for key indicators and domain-specific language
- Assign confidence scores for each category
- Provide reasoning for classifications
- Consider hierarchical relationships between categories
- Be precise but not overly restrictive

{{#categories}}
Available Categories:
{{#each categories}}
- {{this}}
{{/each}}
{{/categories}}

{{#maxCategories}}
Maximum categories to assign: {{maxCategories}}
{{/maxCategories}}

Provide classification in this format:
- Primary Category: [category] (confidence: X%)
- Secondary Categories: [list with confidence scores]
- Keywords: [relevant keywords found]
- Reasoning: [explanation of classification logic]<|eot_id|><|start_header_id|>user<|end_header_id|>

Classify this content:

{{content}}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`,
    variables: ['content', 'categories', 'maxCategories'],
    modelOptimized: ['llama3.1:8b']
  };

  static readonly AUTO_CLASSIFICATION: PromptTemplate = {
    id: 'auto_classification',
    name: 'Automatic Classification',
    description: 'Automatically detects and assigns categories based on content analysis',
    template: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an expert content analyst. Analyze the content and automatically identify the most appropriate categories and topics. Create meaningful categories that accurately represent the content's themes and subject matter.

Guidelines:
- Identify 3-5 main categories that best describe the content
- Use clear, descriptive category names
- Consider industry standards and common classifications
- Provide hierarchical categories where appropriate (e.g., Technology > AI > Machine Learning)
- Include confidence scores for each category
- Extract key topics and themes
- Explain the rationale behind category assignments

Format your response as:
- Main Categories: [list with confidence scores]
- Sub-categories: [hierarchical breakdown if applicable]
- Key Topics: [main themes and subjects]
- Content Type: [article, news, research, opinion, etc.]
- Domain: [field or industry]
- Reasoning: [explanation of classification logic]<|eot_id|><|start_header_id|>user<|end_header_id|>

Analyze and classify this content:

{{content}}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`,
    variables: ['content'],
    modelOptimized: ['llama3.1:8b']
  };

  // Utility Methods
  static getTemplate(id: string): PromptTemplate | null {
    const templates = [
      this.BRIEF_SUMMARY,
      this.DETAILED_SUMMARY,
      this.BULLET_POINT_SUMMARY,
      this.PODCAST_DIALOGUE,
      this.SENTIMENT_ANALYSIS,
      this.CATEGORY_CLASSIFICATION,
      this.AUTO_CLASSIFICATION
    ];

    return templates.find(template => template.id === id) || null;
  }

  static getAllTemplates(): PromptTemplate[] {
    return [
      this.BRIEF_SUMMARY,
      this.DETAILED_SUMMARY,
      this.BULLET_POINT_SUMMARY,
      this.PODCAST_DIALOGUE,
      this.SENTIMENT_ANALYSIS,
      this.CATEGORY_CLASSIFICATION,
      this.AUTO_CLASSIFICATION
    ];
  }

  static getTemplatesByOperation(operation: string): PromptTemplate[] {
    const operationMap: Record<string, string[]> = {
      summarize: ['brief_summary', 'detailed_summary', 'bullet_summary'],
      dialogue: ['podcast_dialogue'],
      sentiment: ['sentiment_analysis'],
      classify: ['category_classification', 'auto_classification']
    };

    const templateIds = operationMap[operation] || [];
    return templateIds.map(id => this.getTemplate(id)).filter(Boolean) as PromptTemplate[];
  }

  /**
   * Compiles a template with provided variables using simple string replacement
   */
  static compileTemplate(template: PromptTemplate, variables: Record<string, any>): string {
    let compiled = template.template;

    // Replace simple variables {{variable}}
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string' || typeof value === 'number') {
        const regex = new RegExp(`{{${key}}}`, 'g');
        compiled = compiled.replace(regex, String(value));
      }
    }

    // Handle conditional blocks {{#variable}} ... {{/variable}}
    compiled = compiled.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (match, varName, content) => {
      const value = variables[varName];
      if (Array.isArray(value) && value.length > 0) {
        return content.replace(/{{#each \w+}}([\s\S]*?){{\/each}}/g, (innerMatch, itemTemplate) => {
          return value.map((item, index) => {
            let itemContent = itemTemplate;
            if (typeof item === 'object') {
              for (const [prop, val] of Object.entries(item)) {
                itemContent = itemContent.replace(new RegExp(`{{${prop}}}`, 'g'), String(val));
              }
            } else {
              itemContent = itemContent.replace(/{{this}}/g, String(item));
            }
            itemContent = itemContent.replace(/{{@index}}/g, String(index + 1));
            return itemContent;
          }).join('');
        });
      } else if (value) {
        return content;
      }
      return '';
    });

    // Clean up any remaining template syntax
    compiled = compiled.replace(/{{[^}]*}}/g, '');

    return compiled.trim();
  }

  /**
   * Validates that all required variables are provided
   */
  static validateVariables(template: PromptTemplate, variables: Record<string, any>): string[] {
    const missing: string[] = [];

    for (const required of template.variables) {
      if (!(required in variables) || variables[required] === undefined || variables[required] === null) {
        missing.push(required);
      }
    }

    return missing;
  }

  /**
   * Gets optimized generation options for Llama 3.1
   */
  static getOptimizedOptions(operation: string): Record<string, any> {
    const baseOptions = {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      maxTokens: 2048
    };

    const operationSpecific: Record<string, Partial<typeof baseOptions>> = {
      summarize: {
        temperature: 0.3,
        maxTokens: 1024
      },
      dialogue: {
        temperature: 0.8,
        maxTokens: 4096
      },
      sentiment: {
        temperature: 0.2,
        maxTokens: 512
      },
      classify: {
        temperature: 0.1,
        maxTokens: 512
      }
    };

    return {
      ...baseOptions,
      ...operationSpecific[operation]
    };
  }
}