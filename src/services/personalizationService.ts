// Personalization Engine - AI-powered recommendations and user insights

import { ListeningHistoryService } from './subscriptionService';
import { RatingService, LikeService } from './engagementService';
import { PREBUILT_SHOWS, PREBUILT_EPISODES } from '../data/prebuiltPodcasts';
import type { PodcastShow, PodcastEpisode } from '../types/podcast';

// ============= User Preferences =============

export interface UserPreferences {
  favoriteCategories: string[];
  favoriteTopics: string[];
  preferredLength: 'short' | 'medium' | 'long' | 'any';
  listeningTime: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
  autoPlay: boolean;
  enableRecommendations: boolean;
}

export interface ListeningStats {
  totalListeningTime: number; // in minutes
  episodesCompleted: number;
  favoriteCategory: string;
  averageRating: number;
  topShows: { showId: string; minutes: number }[];
  listeningStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

const STORAGE_KEYS = {
  PREFERENCES: 'podcast_user_preferences',
  STATS: 'podcast_listening_stats',
  RECOMMENDATIONS: 'podcast_recommendations',
};

const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteCategories: [],
  favoriteTopics: [],
  preferredLength: 'any',
  listeningTime: 'any',
  autoPlay: true,
  enableRecommendations: true,
};

// ============= Preferences Service =============

export class PreferencesService {
  static getPreferences(): UserPreferences {
    const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (!stored) return DEFAULT_PREFERENCES;
    return JSON.parse(stored);
  }

  static savePreferences(preferences: UserPreferences): void {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
  }

  static updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): void {
    const prefs = this.getPreferences();
    prefs[key] = value;
    this.savePreferences(prefs);
  }

  static learnFromBehavior(): void {
    const history = ListeningHistoryService.getHistory();
    const ratings = RatingService.getRatings();
    const prefs = this.getPreferences();

    // Learn favorite categories from listening history
    const categoryCount: Record<string, number> = {};
    history.forEach((entry) => {
      const episode = PREBUILT_EPISODES.find((ep) => ep.id === entry.episodeId);
      if (episode) {
        const show = PREBUILT_SHOWS.find((s) => s.id === episode.showId);
        if (show) {
          categoryCount[show.category] = (categoryCount[show.category] || 0) + 1;
        }
      }
    });

    // Update favorite categories (top 3)
    const sortedCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    if (sortedCategories.length > 0) {
      prefs.favoriteCategories = sortedCategories;
    }

    // Learn favorite topics from highly rated content
    const topicCount: Record<string, number> = {};
    ratings
      .filter((r) => r.rating >= 4)
      .forEach((rating) => {
        if (rating.showId) {
          const show = PREBUILT_SHOWS.find((s) => s.id === rating.showId);
          if (show && show.topics) {
            show.topics.forEach((topic) => {
              topicCount[topic] = (topicCount[topic] || 0) + 1;
            });
          }
        }
      });

    // Update favorite topics (top 5)
    const sortedTopics = Object.entries(topicCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    if (sortedTopics.length > 0) {
      prefs.favoriteTopics = sortedTopics;
    }

    this.savePreferences(prefs);
  }
}

// ============= Stats Service =============

export class StatsService {
  static getStats(): ListeningStats {
    const stored = localStorage.getItem(STORAGE_KEYS.STATS);
    if (stored) {
      return JSON.parse(stored);
    }

    // Calculate stats from listening history
    return this.calculateStats();
  }

  static calculateStats(): ListeningStats {
    const history = ListeningHistoryService.getHistory();
    const ratings = RatingService.getRatings();

    // Total listening time
    let totalListeningTime = 0;
    const showMinutes: Record<string, number> = {};

    history.forEach((entry) => {
      const episode = PREBUILT_EPISODES.find((ep) => ep.id === entry.episodeId);
      if (episode && episode.duration) {
        const minutes = Math.floor((episode.duration * entry.progress) / 60);
        totalListeningTime += minutes;

        showMinutes[entry.showId] = (showMinutes[entry.showId] || 0) + minutes;
      }
    });

    // Episodes completed
    const episodesCompleted = history.filter((entry) => entry.completed).length;

    // Favorite category
    const categoryCount: Record<string, number> = {};
    history.forEach((entry) => {
      const episode = PREBUILT_EPISODES.find((ep) => ep.id === entry.episodeId);
      if (episode) {
        const show = PREBUILT_SHOWS.find((s) => s.id === episode.showId);
        if (show) {
          categoryCount[show.category] = (categoryCount[show.category] || 0) + 1;
        }
      }
    });

    const favoriteCategory = Object.entries(categoryCount).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Technology';

    // Average rating
    const userRatings = ratings.filter((r) => r.userId === 'user_1');
    const averageRating =
      userRatings.length > 0
        ? userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length
        : 0;

    // Top shows
    const topShows = Object.entries(showMinutes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([showId, minutes]) => ({ showId, minutes }));

    // Listening streak (simplified - days with listening activity)
    const streak = this.calculateStreak(history);

    // Weekly goal and progress
    const weeklyGoal = 300; // 5 hours per week
    const weeklyProgress = this.calculateWeeklyProgress(history);

    const stats: ListeningStats = {
      totalListeningTime,
      episodesCompleted,
      favoriteCategory,
      averageRating,
      topShows,
      listeningStreak: streak,
      weeklyGoal,
      weeklyProgress,
    };

    this.saveStats(stats);
    return stats;
  }

  static saveStats(stats: ListeningStats): void {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }

  static calculateStreak(history: any[]): number {
    if (history.length === 0) return 0;

    const dates = history
      .map((entry) => new Date(entry.lastPlayedAt).toDateString())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    let currentDate = new Date();

    for (const dateString of dates) {
      const date = new Date(dateString);
      const diffDays = Math.floor(
        (currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  static calculateWeeklyProgress(history: any[]): number {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let weeklyMinutes = 0;
    history
      .filter((entry) => new Date(entry.lastPlayedAt) >= weekAgo)
      .forEach((entry) => {
        const episode = PREBUILT_EPISODES.find((ep) => ep.id === entry.episodeId);
        if (episode && episode.duration) {
          weeklyMinutes += Math.floor((episode.duration * entry.progress) / 60);
        }
      });

    return weeklyMinutes;
  }

  static updateStats(): void {
    this.calculateStats();
  }
}

// ============= Recommendation Engine =============

export interface Recommendation {
  show?: PodcastShow;
  episode?: PodcastEpisode;
  score: number;
  reason: string;
}

export class RecommendationEngine {
  static getRecommendations(limit: number = 10): Recommendation[] {
    const prefs = PreferencesService.getPreferences();

    if (!prefs.enableRecommendations) {
      return [];
    }

    // Learn from behavior first
    PreferencesService.learnFromBehavior();

    const recommendations: Recommendation[] = [];
    const history = ListeningHistoryService.getHistory();
    const ratings = RatingService.getRatings();
    const listenedShowIds = new Set(history.map((h) => h.showId));
    const listenedEpisodeIds = new Set(history.map((h) => h.episodeId));

    // 1. Category-based recommendations
    PREBUILT_SHOWS.forEach((show) => {
      if (listenedShowIds.has(show.id)) return;

      let score = 0;
      let reason = '';

      // Match favorite categories
      if (prefs.favoriteCategories.includes(show.category)) {
        score += 40;
        reason = `Popular in ${show.category}`;
      }

      // Match favorite topics
      const topicMatches = show.topics.filter((topic) =>
        prefs.favoriteTopics.includes(topic)
      ).length;
      if (topicMatches > 0) {
        score += topicMatches * 15;
        reason = `Covers topics you love: ${prefs.favoriteTopics.slice(0, 2).join(', ')}`;
      }

      // Popularity boost
      if (show.subscribers > 100000) {
        score += 10;
      }

      if (score > 20) {
        recommendations.push({ show, score, reason });
      }
    });

    // 2. Episode-based recommendations from shows you listen to
    PREBUILT_EPISODES.forEach((episode) => {
      if (listenedEpisodeIds.has(episode.id)) return;

      const show = PREBUILT_SHOWS.find((s) => s.id === episode.showId);
      if (!show) return;

      let score = 0;
      let reason = '';

      // From shows you've listened to
      if (listenedShowIds.has(episode.showId)) {
        score += 50;
        reason = `New episode from ${show.title}`;
      }

      // From shows you rated highly
      const showRating = ratings.find(
        (r) => r.showId === episode.showId && r.rating >= 4
      );
      if (showRating) {
        score += 30;
        reason = `From a show you rated ${showRating.rating} stars`;
      }

      // High play count
      if (episode.playCount > 50000) {
        score += 15;
      }

      if (score > 30) {
        recommendations.push({ episode, show, score, reason });
      }
    });

    // 3. Collaborative filtering (shows similar users like)
    const similarUserShows = this.getSimilarUserRecommendations();
    similarUserShows.forEach(({ show, score }) => {
      if (!listenedShowIds.has(show.id)) {
        recommendations.push({
          show,
          score: score + 25,
          reason: 'Listeners like you also enjoy this',
        });
      }
    });

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  static getSimilarUserRecommendations(): { show: PodcastShow; score: number }[] {
    // Simplified collaborative filtering based on category overlap
    const prefs = PreferencesService.getPreferences();
    const recommendations: { show: PodcastShow; score: number }[] = [];

    PREBUILT_SHOWS.forEach((show) => {
      let score = 0;

      if (prefs.favoriteCategories.includes(show.category)) {
        score += 20;
      }

      const topicMatches = show.topics.filter((topic) =>
        prefs.favoriteTopics.includes(topic)
      ).length;
      score += topicMatches * 10;

      if (score > 0) {
        recommendations.push({ show, score });
      }
    });

    return recommendations;
  }

  static getPersonalizedEpisodes(limit: number = 20): PodcastEpisode[] {
    const recommendations = this.getRecommendations(limit);

    return recommendations
      .filter((rec) => rec.episode)
      .map((rec) => rec.episode!)
      .slice(0, limit);
  }

  static getPersonalizedShows(limit: number = 10): PodcastShow[] {
    const recommendations = this.getRecommendations(limit * 2);

    return recommendations
      .filter((rec) => rec.show && !rec.episode)
      .map((rec) => rec.show!)
      .slice(0, limit);
  }

  static getRecommendationReason(showId: string): string {
    const recommendations = this.getRecommendations(50);
    const rec = recommendations.find((r) => r.show?.id === showId);
    return rec?.reason || 'Recommended for you';
  }
}

// ============= Listening Insights =============

export interface ListeningInsight {
  id: string;
  type: 'achievement' | 'streak' | 'milestone' | 'recommendation';
  title: string;
  description: string;
  icon: string;
  date: Date;
}

export class InsightsService {
  static getInsights(): ListeningInsight[] {
    const stats = StatsService.getStats();
    const insights: ListeningInsight[] = [];

    // Streak achievements
    if (stats.listeningStreak >= 7) {
      insights.push({
        id: 'streak_7',
        type: 'streak',
        title: '🔥 Week Streak!',
        description: `You've listened for ${stats.listeningStreak} days in a row!`,
        icon: '🔥',
        date: new Date(),
      });
    }

    // Listening time milestones
    if (stats.totalListeningTime >= 100) {
      insights.push({
        id: 'time_100',
        type: 'milestone',
        title: '🎧 100+ Minutes',
        description: `You've listened to ${Math.floor(stats.totalListeningTime)} minutes of podcasts!`,
        icon: '🎧',
        date: new Date(),
      });
    }

    // Episode completion achievements
    if (stats.episodesCompleted >= 10) {
      insights.push({
        id: 'episodes_10',
        type: 'achievement',
        title: '⭐ 10 Episodes Complete',
        description: `You've finished ${stats.episodesCompleted} episodes!`,
        icon: '⭐',
        date: new Date(),
      });
    }

    // Weekly goal progress
    const progress = (stats.weeklyProgress / stats.weeklyGoal) * 100;
    if (progress >= 100) {
      insights.push({
        id: 'weekly_goal',
        type: 'achievement',
        title: '🎯 Weekly Goal Achieved!',
        description: `You've exceeded your ${stats.weeklyGoal} minute weekly goal!`,
        icon: '🎯',
        date: new Date(),
      });
    }

    // Top listener badge
    if (stats.totalListeningTime >= 500) {
      insights.push({
        id: 'top_listener',
        type: 'achievement',
        title: '👑 Top Listener',
        description: 'You\'re among the top 10% of listeners!',
        icon: '👑',
        date: new Date(),
      });
    }

    return insights;
  }

  static getWeeklySummary(): {
    minutesListened: number;
    episodesCompleted: number;
    favoriteShow: string;
    topCategory: string;
  } {
    const stats = StatsService.getStats();
    const topShow = stats.topShows[0];
    const show = topShow ? PREBUILT_SHOWS.find((s) => s.id === topShow.showId) : null;

    return {
      minutesListened: stats.weeklyProgress,
      episodesCompleted: stats.episodesCompleted,
      favoriteShow: show?.title || 'N/A',
      topCategory: stats.favoriteCategory,
    };
  }
}

// ============= Export Combined Service =============

export const PersonalizationService = {
  preferences: PreferencesService,
  stats: StatsService,
  recommendations: RecommendationEngine,
  insights: InsightsService,
};
