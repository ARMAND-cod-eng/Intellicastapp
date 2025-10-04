/**
 * Subscription Service
 * Manages user subscriptions to podcast shows and episode tracking
 */

import type { PodcastShow, PodcastEpisode } from '../types/podcast';

const STORAGE_KEYS = {
  SUBSCRIPTIONS: 'podcast_subscriptions',
  SAVED_EPISODES: 'saved_episodes',
  LISTENING_HISTORY: 'listening_history',
  CONTINUE_LISTENING: 'continue_listening'
};

// Subscription interface
export interface Subscription {
  showId: string;
  subscribedAt: Date;
  notificationsEnabled: boolean;
  lastChecked?: Date;
}

// Saved episode interface
export interface SavedEpisode {
  episodeId: string;
  showId: string;
  savedAt: Date;
  notes?: string;
}

// Listening history entry
export interface ListeningHistoryEntry {
  episodeId: string;
  showId: string;
  lastPlayedAt: Date;
  progress: number; // 0-100 percentage
  completed: boolean;
}

/**
 * Subscription Management Service
 */
export class SubscriptionService {
  /**
   * Get all subscriptions
   */
  static getSubscriptions(): Subscription[] {
    const stored = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
    if (!stored) return [];

    const subscriptions = JSON.parse(stored);
    return subscriptions.map((sub: any) => ({
      ...sub,
      subscribedAt: new Date(sub.subscribedAt),
      lastChecked: sub.lastChecked ? new Date(sub.lastChecked) : undefined
    }));
  }

  /**
   * Check if user is subscribed to a show
   */
  static isSubscribed(showId: string): boolean {
    const subscriptions = this.getSubscriptions();
    return subscriptions.some(sub => sub.showId === showId);
  }

  /**
   * Subscribe to a show
   */
  static subscribe(showId: string, notificationsEnabled: boolean = true): void {
    const subscriptions = this.getSubscriptions();

    // Check if already subscribed
    if (subscriptions.some(sub => sub.showId === showId)) {
      return;
    }

    const newSubscription: Subscription = {
      showId,
      subscribedAt: new Date(),
      notificationsEnabled,
      lastChecked: new Date()
    };

    subscriptions.push(newSubscription);
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions));
  }

  /**
   * Unsubscribe from a show
   */
  static unsubscribe(showId: string): void {
    const subscriptions = this.getSubscriptions();
    const filtered = subscriptions.filter(sub => sub.showId !== showId);
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(filtered));
  }

  /**
   * Toggle subscription
   */
  static toggleSubscription(showId: string): boolean {
    if (this.isSubscribed(showId)) {
      this.unsubscribe(showId);
      return false;
    } else {
      this.subscribe(showId);
      return true;
    }
  }

  /**
   * Update notification settings for a subscription
   */
  static updateNotifications(showId: string, enabled: boolean): void {
    const subscriptions = this.getSubscriptions();
    const index = subscriptions.findIndex(sub => sub.showId === showId);

    if (index !== -1) {
      subscriptions[index].notificationsEnabled = enabled;
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions));
    }
  }

  /**
   * Get subscription count
   */
  static getSubscriptionCount(): number {
    return this.getSubscriptions().length;
  }
}

/**
 * Saved Episodes Service
 */
export class SavedEpisodesService {
  /**
   * Get all saved episodes
   */
  static getSavedEpisodes(): SavedEpisode[] {
    const stored = localStorage.getItem(STORAGE_KEYS.SAVED_EPISODES);
    if (!stored) return [];

    const saved = JSON.parse(stored);
    return saved.map((ep: any) => ({
      ...ep,
      savedAt: new Date(ep.savedAt)
    }));
  }

  /**
   * Check if episode is saved
   */
  static isSaved(episodeId: string): boolean {
    const saved = this.getSavedEpisodes();
    return saved.some(ep => ep.episodeId === episodeId);
  }

  /**
   * Save an episode
   */
  static saveEpisode(episodeId: string, showId: string, notes?: string): void {
    const saved = this.getSavedEpisodes();

    // Check if already saved
    if (saved.some(ep => ep.episodeId === episodeId)) {
      return;
    }

    const newSaved: SavedEpisode = {
      episodeId,
      showId,
      savedAt: new Date(),
      notes
    };

    saved.push(newSaved);
    localStorage.setItem(STORAGE_KEYS.SAVED_EPISODES, JSON.stringify(saved));
  }

  /**
   * Remove saved episode
   */
  static removeSaved(episodeId: string): void {
    const saved = this.getSavedEpisodes();
    const filtered = saved.filter(ep => ep.episodeId !== episodeId);
    localStorage.setItem(STORAGE_KEYS.SAVED_EPISODES, JSON.stringify(filtered));
  }

  /**
   * Toggle saved status
   */
  static toggleSaved(episodeId: string, showId: string): boolean {
    if (this.isSaved(episodeId)) {
      this.removeSaved(episodeId);
      return false;
    } else {
      this.saveEpisode(episodeId, showId);
      return true;
    }
  }

  /**
   * Get saved episodes for a specific show
   */
  static getSavedByShow(showId: string): SavedEpisode[] {
    return this.getSavedEpisodes().filter(ep => ep.showId === showId);
  }
}

/**
 * Listening History Service
 */
export class ListeningHistoryService {
  /**
   * Get all listening history
   */
  static getHistory(): ListeningHistoryEntry[] {
    const stored = localStorage.getItem(STORAGE_KEYS.LISTENING_HISTORY);
    if (!stored) return [];

    const history = JSON.parse(stored);
    return history.map((entry: any) => ({
      ...entry,
      lastPlayedAt: new Date(entry.lastPlayedAt)
    })).sort((a, b) => b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime());
  }

  /**
   * Add or update listening history
   */
  static updateHistory(episodeId: string, showId: string, progress: number, completed: boolean): void {
    const history = this.getHistory();
    const existingIndex = history.findIndex(entry => entry.episodeId === episodeId);

    const entry: ListeningHistoryEntry = {
      episodeId,
      showId,
      lastPlayedAt: new Date(),
      progress,
      completed
    };

    if (existingIndex !== -1) {
      history[existingIndex] = entry;
    } else {
      history.unshift(entry);
    }

    // Keep only last 100 entries
    const trimmed = history.slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.LISTENING_HISTORY, JSON.stringify(trimmed));

    // Update continue listening if not completed
    if (!completed && progress > 5) {
      this.updateContinueListening(episodeId, showId, progress);
    }
  }

  /**
   * Get recent history (last N entries)
   */
  static getRecentHistory(limit: number = 10): ListeningHistoryEntry[] {
    return this.getHistory().slice(0, limit);
  }

  /**
   * Get continue listening episodes (in progress, not completed)
   */
  static getContinueListening(): ListeningHistoryEntry[] {
    const stored = localStorage.getItem(STORAGE_KEYS.CONTINUE_LISTENING);
    if (!stored) return [];

    const entries = JSON.parse(stored);
    return entries.map((entry: any) => ({
      ...entry,
      lastPlayedAt: new Date(entry.lastPlayedAt)
    })).sort((a, b) => b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime());
  }

  /**
   * Update continue listening list
   */
  private static updateContinueListening(episodeId: string, showId: string, progress: number): void {
    const continueList = this.getContinueListening();
    const existingIndex = continueList.findIndex(entry => entry.episodeId === episodeId);

    const entry: ListeningHistoryEntry = {
      episodeId,
      showId,
      lastPlayedAt: new Date(),
      progress,
      completed: false
    };

    if (existingIndex !== -1) {
      continueList[existingIndex] = entry;
    } else {
      continueList.unshift(entry);
    }

    // Keep only last 10 entries
    const trimmed = continueList.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.CONTINUE_LISTENING, JSON.stringify(trimmed));
  }

  /**
   * Remove from continue listening when completed
   */
  static removeContinueListening(episodeId: string): void {
    const continueList = this.getContinueListening();
    const filtered = continueList.filter(entry => entry.episodeId !== episodeId);
    localStorage.setItem(STORAGE_KEYS.CONTINUE_LISTENING, JSON.stringify(filtered));
  }

  /**
   * Clear all history
   */
  static clearHistory(): void {
    localStorage.removeItem(STORAGE_KEYS.LISTENING_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.CONTINUE_LISTENING);
  }
}

/**
 * Combined helper to get user's library data
 */
export function getUserLibrary() {
  return {
    subscriptions: SubscriptionService.getSubscriptions(),
    savedEpisodes: SavedEpisodesService.getSavedEpisodes(),
    continueListening: ListeningHistoryService.getContinueListening(),
    recentHistory: ListeningHistoryService.getRecentHistory(20)
  };
}
