/**
 * AI-Powered Task Suggester
 * Uses Together.ai LLMs to suggest smart tasks based on user activity
 */

import { Together } from "together-ai";
import type { TodoTask, TaskSuggestion } from './types';

export class AITaskSuggester {
  private client: Together;
  private readonly model: string;

  constructor(apiKey?: string, model: string = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo") {
    const key = apiKey || import.meta.env.VITE_TOGETHER_API_KEY || '';

    if (!key) {
      console.warn('Together AI API key not configured. AI task suggestions disabled.');
    }

    this.client = new Together({ apiKey: key });
    this.model = model;
  }

  /**
   * Generate smart task suggestions based on existing tasks and user patterns
   */
  async generateTaskSuggestions(
    existingTasks: TodoTask[],
    context?: {
      userActivity?: string;
      recentTopics?: string[];
      upcomingEvents?: string[];
    }
  ): Promise<TaskSuggestion[]> {
    try {
      const prompt = this.buildSuggestionPrompt(existingTasks, context);

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
        temperature: 0.8,
        max_tokens: 1000,
        stream: false
      });

      const suggestionsText = response.choices[0]?.message?.content || '';
      return this.parseSuggestions(suggestionsText);

    } catch (error) {
      console.error('Error generating AI task suggestions:', error);
      return this.getFallbackSuggestions(existingTasks);
    }
  }

  /**
   * Analyze task patterns and provide productivity insights
   */
  async analyzeTaskPatterns(tasks: TodoTask[]): Promise<{
    insights: string[];
    recommendations: string[];
    productivityScore: number;
  }> {
    try {
      const completedTasks = tasks.filter(t => t.completed);
      const pendingTasks = tasks.filter(t => !t.completed);
      const urgentTasks = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high');

      const prompt = `Analyze these task completion patterns:

Total Tasks: ${tasks.length}
Completed: ${completedTasks.length}
Pending: ${pendingTasks.length}
High Priority: ${urgentTasks.length}

Task Categories: ${this.getCategoryDistribution(tasks)}

Recent Tasks:
${tasks.slice(0, 10).map(t => `- ${t.title} (${t.category}, ${t.priority}${t.completed ? ', completed' : ''})`).join('\n')}

Provide:
1. 3 key insights about task patterns
2. 3 actionable recommendations
3. A productivity score (0-100)

Format as JSON:
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["rec 1", "rec 2", "rec 3"],
  "productivityScore": 85
}`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a productivity analytics AI that provides actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        stream: false
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return this.getFallbackInsights(tasks);

    } catch (error) {
      console.error('Error analyzing task patterns:', error);
      return this.getFallbackInsights(tasks);
    }
  }

  /**
   * Suggest optimal task scheduling based on priorities and deadlines
   */
  async suggestTaskSchedule(tasks: TodoTask[], date: Date): Promise<{
    morning: TodoTask[];
    afternoon: TodoTask[];
    evening: TodoTask[];
    reasoning: string;
  }> {
    const pendingTasks = tasks.filter(t => !t.completed);

    if (pendingTasks.length === 0) {
      return {
        morning: [],
        afternoon: [],
        evening: [],
        reasoning: "No pending tasks to schedule"
      };
    }

    try {
      const prompt = `Schedule these tasks optimally for ${date.toDateString()}:

${pendingTasks.map((t, i) => `${i + 1}. ${t.title} (${t.priority} priority, ${t.category}, ${t.estimatedDuration || '30'} min)`).join('\n')}

Provide optimal schedule distribution across:
- Morning (best for high-priority, complex tasks)
- Afternoon (good for meetings, collaborative work)
- Evening (suitable for low-priority, routine tasks)

Return as JSON:
{
  "morning": [1, 3],
  "afternoon": [2, 5],
  "evening": [4],
  "reasoning": "Brief explanation of scheduling logic"
}`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a task scheduling AI that optimizes productivity."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 400,
        stream: false
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const schedule = JSON.parse(jsonMatch[0]);
        return {
          morning: schedule.morning.map((i: number) => pendingTasks[i - 1]).filter(Boolean),
          afternoon: schedule.afternoon.map((i: number) => pendingTasks[i - 1]).filter(Boolean),
          evening: schedule.evening.map((i: number) => pendingTasks[i - 1]).filter(Boolean),
          reasoning: schedule.reasoning
        };
      }

      return this.getFallbackSchedule(pendingTasks);

    } catch (error) {
      console.error('Error generating task schedule:', error);
      return this.getFallbackSchedule(pendingTasks);
    }
  }

  /**
   * Build prompt for task suggestions
   */
  private buildSuggestionPrompt(
    tasks: TodoTask[],
    context?: {
      userActivity?: string;
      recentTopics?: string[];
      upcomingEvents?: string[];
    }
  ): string {
    const categories = this.getCategoryDistribution(tasks);
    const recentTasks = tasks.slice(0, 5).map(t => t.title).join(', ');

    return `Based on this user's task history, suggest 5 smart, actionable tasks:

Recent Tasks: ${recentTasks || 'None'}
Task Categories: ${categories}
${context?.userActivity ? `Recent Activity: ${context.userActivity}` : ''}
${context?.recentTopics ? `Interests: ${context.recentTopics.join(', ')}` : ''}

For each suggestion, provide:
1. Title (clear, actionable)
2. Description (1 sentence)
3. Category (podcast|research|content|meeting|personal|general)
4. Priority (low|medium|high|urgent)
5. Estimated Duration (in minutes)
6. Reasoning (why this task is suggested)

Format each suggestion as:
TASK: [title]
DESC: [description]
CAT: [category]
PRI: [priority]
DUR: [duration]
WHY: [reasoning]
---`;
  }

  /**
   * Get system prompt for AI task suggester
   */
  private getSystemPrompt(): string {
    return `You are an intelligent task management AI assistant for IntelliCast AI, a podcast and content creation platform.

Your role is to suggest relevant, actionable tasks that help users:
- Stay productive with podcast creation
- Manage research and content planning
- Balance work and personal commitments
- Follow up on important topics

Suggestions should be:
- Specific and actionable
- Contextually relevant
- Properly prioritized
- Time-estimated realistically
- Aligned with content creation workflows`;
  }

  /**
   * Parse AI-generated suggestions
   */
  private parseSuggestions(text: string): TaskSuggestion[] {
    const suggestions: TaskSuggestion[] = [];
    const taskBlocks = text.split('---').filter(block => block.trim());

    for (const block of taskBlocks.slice(0, 5)) {
      const titleMatch = block.match(/TASK:\s*(.+)/);
      const descMatch = block.match(/DESC:\s*(.+)/);
      const catMatch = block.match(/CAT:\s*(\w+)/);
      const priMatch = block.match(/PRI:\s*(\w+)/);
      const durMatch = block.match(/DUR:\s*(\d+)/);
      const whyMatch = block.match(/WHY:\s*(.+)/);

      if (titleMatch && catMatch && priMatch) {
        suggestions.push({
          title: titleMatch[1].trim(),
          description: descMatch?.[1]?.trim() || '',
          category: catMatch[1] as TodoTask['category'],
          priority: priMatch[1] as TodoTask['priority'],
          estimatedDuration: parseInt(durMatch?.[1] || '30'),
          reasoning: whyMatch?.[1]?.trim() || 'AI suggested'
        });
      }
    }

    return suggestions.length > 0 ? suggestions : this.getFallbackSuggestions(tasks);
  }

  /**
   * Get category distribution
   */
  private getCategoryDistribution(tasks: TodoTask[]): string {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(', ') || 'None';
  }

  /**
   * Fallback suggestions when AI is unavailable
   */
  private getFallbackSuggestions(tasks: TodoTask[]): TaskSuggestion[] {
    const hasResearch = tasks.some(t => t.category === 'research');
    const hasPodcast = tasks.some(t => t.category === 'podcast');

    const suggestions: TaskSuggestion[] = [
      {
        title: 'Review pending podcast episodes',
        description: 'Check status of in-progress podcast content',
        category: 'podcast',
        priority: 'medium',
        estimatedDuration: 30,
        reasoning: 'Regular review helps maintain production schedule'
      },
      {
        title: 'Research trending topics',
        description: 'Explore current trends for future content ideas',
        category: 'research',
        priority: 'low',
        estimatedDuration: 45,
        reasoning: 'Stay current with industry developments'
      },
      {
        title: 'Plan content calendar',
        description: 'Organize upcoming content schedule for the week',
        category: 'content',
        priority: 'high',
        estimatedDuration: 60,
        reasoning: 'Planning ahead improves consistency'
      }
    ];

    if (!hasPodcast) {
      suggestions.push({
        title: 'Create podcast outline',
        description: 'Draft structure for next podcast episode',
        category: 'podcast',
        priority: 'high',
        estimatedDuration: 45,
        reasoning: 'Start new podcast production'
      });
    }

    if (!hasResearch) {
      suggestions.push({
        title: 'Gather research materials',
        description: 'Collect sources and references for upcoming topics',
        category: 'research',
        priority: 'medium',
        estimatedDuration: 40,
        reasoning: 'Build knowledge base for content'
      });
    }

    return suggestions;
  }

  /**
   * Fallback insights
   */
  private getFallbackInsights(tasks: TodoTask[]) {
    const completionRate = tasks.length > 0
      ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
      : 0;

    return {
      insights: [
        `You have ${tasks.length} total tasks with ${completionRate}% completion rate`,
        `Most tasks are in the ${this.getMostCommonCategory(tasks)} category`,
        `${tasks.filter(t => !t.completed && (t.priority === 'high' || t.priority === 'urgent')).length} high-priority tasks need attention`
      ],
      recommendations: [
        'Focus on completing high-priority tasks first',
        'Break down large tasks into smaller, manageable steps',
        'Set specific time blocks for focused work'
      ],
      productivityScore: Math.min(completionRate + 10, 95)
    };
  }

  /**
   * Fallback schedule
   */
  private getFallbackSchedule(tasks: TodoTask[]) {
    const high = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
    const medium = tasks.filter(t => t.priority === 'medium');
    const low = tasks.filter(t => t.priority === 'low');

    return {
      morning: high.slice(0, 2),
      afternoon: [...high.slice(2), ...medium.slice(0, 2)],
      evening: [...medium.slice(2), ...low],
      reasoning: 'High-priority tasks scheduled for morning when energy is highest, medium tasks for afternoon, and low-priority tasks for evening'
    };
  }

  /**
   * Get most common category
   */
  private getMostCommonCategory(tasks: TodoTask[]): string {
    if (tasks.length === 0) return 'general';

    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }
}

/**
 * Create a configured AI task suggester instance
 */
export function createAITaskSuggester(apiKey?: string, model?: string): AITaskSuggester {
  return new AITaskSuggester(apiKey, model);
}

// Export default instance
let defaultSuggester: AITaskSuggester | null = null;

try {
  defaultSuggester = new AITaskSuggester();
} catch (error) {
  console.warn('AI Task Suggester not configured. Use createAITaskSuggester() with API key.');
}

export default defaultSuggester;
