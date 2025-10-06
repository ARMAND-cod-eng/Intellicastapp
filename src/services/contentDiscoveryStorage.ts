/**
 * AI Content Discovery History Storage Service
 * Manages generation history using localStorage
 */

export interface ContentDiscoveryHistoryItem {
  id: string;
  title: string;
  category: string;
  voiceName: string;
  hostVoice: string;
  guestVoice: string;
  duration: string;
  createdAt: string;
  audioUrl: string;
  topicId: string;
  scriptPreview?: string;
}

export interface QueueItem {
  id: string;
  topicId: string;
  topicTitle: string;
  documentContent: string;
  hostVoice: string;
  guestVoice: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  jobId?: string;
  result?: any;
  error?: string;
  timestamp: number;
}

const HISTORY_KEY = 'intellicast_content_discovery_history';
const QUEUE_KEY = 'intellicast_content_discovery_queue';

export class ContentDiscoveryStorage {
  /**
   * Get all history items
   */
  static getHistory(): ContentDiscoveryHistoryItem[] {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  /**
   * Add item to history
   */
  static addToHistory(item: Omit<ContentDiscoveryHistoryItem, 'createdAt'>): ContentDiscoveryHistoryItem {
    const newItem: ContentDiscoveryHistoryItem = {
      ...item,
      createdAt: new Date().toISOString()
    };

    const history = this.getHistory();
    history.unshift(newItem); // Add to beginning

    // Keep only last 50 items
    const trimmedHistory = history.slice(0, 50);

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Failed to save history:', error);
    }

    return newItem;
  }

  /**
   * Delete history item
   */
  static deleteHistoryItem(id: string): void {
    const history = this.getHistory();
    const filtered = history.filter(item => item.id !== id);

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete history item:', error);
    }
  }

  /**
   * Clear all history
   */
  static clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }

  /**
   * Get queue items
   */
  static getQueue(): QueueItem[] {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load queue:', error);
      return [];
    }
  }

  /**
   * Add item to queue
   */
  static addToQueue(item: Omit<QueueItem, 'timestamp'>): QueueItem {
    const newItem: QueueItem = {
      ...item,
      timestamp: Date.now()
    };

    const queue = this.getQueue();
    queue.push(newItem);

    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save queue:', error);
    }

    return newItem;
  }

  /**
   * Update queue item
   */
  static updateQueueItem(id: string, updates: Partial<QueueItem>): void {
    const queue = this.getQueue();
    const index = queue.findIndex(item => item.id === id);

    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };

      try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      } catch (error) {
        console.error('Failed to update queue item:', error);
      }
    }
  }

  /**
   * Remove from queue
   */
  static removeFromQueue(id: string): void {
    const queue = this.getQueue();
    const filtered = queue.filter(item => item.id !== id);

    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove from queue:', error);
    }
  }

  /**
   * Clear completed queue items
   */
  static clearCompletedQueue(): void {
    const queue = this.getQueue();
    const filtered = queue.filter(item => item.status !== 'completed' && item.status !== 'failed');

    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to clear completed queue:', error);
    }
  }

  /**
   * Clear all queue
   */
  static clearQueue(): void {
    try {
      localStorage.removeItem(QUEUE_KEY);
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }
}
