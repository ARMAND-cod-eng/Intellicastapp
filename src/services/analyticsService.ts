/**
 * Analytics Service - Track and analyze usage metrics
 */

export interface AnalyticsMetric {
  timestamp: string;
  metricType: 'podcast_generated' | 'topic_discovered' | 'queue_processed' | 'favorite_added';
  metadata?: {
    category?: string;
    duration?: number;
    topicId?: string;
    queueSize?: number;
    [key: string]: any;
  };
}

export interface AnalyticsStats {
  totalPodcasts: number;
  totalDiscoveries: number;
  totalQueueProcessed: number;
  totalFavorites: number;
  categoriesUsed: { [category: string]: number };
  averageGenerationTime: number;
  podcastsPerDay: { [date: string]: number };
  mostUsedCategories: Array<{ category: string; count: number }>;
  recentActivity: AnalyticsMetric[];
}

class AnalyticsService {
  private static readonly STORAGE_KEY = 'intellicast_analytics_metrics';
  private static readonly MAX_METRICS = 1000; // Keep last 1000 metrics

  /**
   * Track a new analytics metric
   */
  static trackMetric(metricType: AnalyticsMetric['metricType'], metadata?: AnalyticsMetric['metadata']): void {
    try {
      const metrics = this.getAllMetrics();

      const newMetric: AnalyticsMetric = {
        timestamp: new Date().toISOString(),
        metricType,
        metadata
      };

      metrics.push(newMetric);

      // Keep only the last MAX_METRICS
      const trimmedMetrics = metrics.slice(-this.MAX_METRICS);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedMetrics));
    } catch (error) {
      console.error('Failed to track metric:', error);
    }
  }

  /**
   * Get all stored metrics
   */
  static getAllMetrics(): AnalyticsMetric[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      return [];
    }
  }

  /**
   * Get analytics statistics
   */
  static getStats(): AnalyticsStats {
    const metrics = this.getAllMetrics();

    const stats: AnalyticsStats = {
      totalPodcasts: 0,
      totalDiscoveries: 0,
      totalQueueProcessed: 0,
      totalFavorites: 0,
      categoriesUsed: {},
      averageGenerationTime: 0,
      podcastsPerDay: {},
      mostUsedCategories: [],
      recentActivity: []
    };

    let totalGenerationTime = 0;
    let generationCount = 0;

    metrics.forEach(metric => {
      switch (metric.metricType) {
        case 'podcast_generated':
          stats.totalPodcasts++;

          // Track by category
          if (metric.metadata?.category) {
            stats.categoriesUsed[metric.metadata.category] =
              (stats.categoriesUsed[metric.metadata.category] || 0) + 1;
          }

          // Track generation time
          if (metric.metadata?.duration) {
            totalGenerationTime += metric.metadata.duration;
            generationCount++;
          }

          // Track by day
          const date = new Date(metric.timestamp).toLocaleDateString();
          stats.podcastsPerDay[date] = (stats.podcastsPerDay[date] || 0) + 1;
          break;

        case 'topic_discovered':
          stats.totalDiscoveries++;
          break;

        case 'queue_processed':
          stats.totalQueueProcessed++;
          break;

        case 'favorite_added':
          stats.totalFavorites++;
          break;
      }
    });

    // Calculate average generation time
    stats.averageGenerationTime = generationCount > 0
      ? Math.round(totalGenerationTime / generationCount)
      : 0;

    // Get most used categories
    stats.mostUsedCategories = Object.entries(stats.categoriesUsed)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get recent activity (last 10)
    stats.recentActivity = metrics.slice(-10).reverse();

    return stats;
  }

  /**
   * Get metrics for a specific time range
   */
  static getMetricsInRange(startDate: Date, endDate: Date): AnalyticsMetric[] {
    const metrics = this.getAllMetrics();
    return metrics.filter(metric => {
      const metricDate = new Date(metric.timestamp);
      return metricDate >= startDate && metricDate <= endDate;
    });
  }

  /**
   * Get metrics by type
   */
  static getMetricsByType(metricType: AnalyticsMetric['metricType']): AnalyticsMetric[] {
    const metrics = this.getAllMetrics();
    return metrics.filter(metric => metric.metricType === metricType);
  }

  /**
   * Clear all analytics data
   */
  static clearAllMetrics(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear metrics:', error);
    }
  }

  /**
   * Export analytics data as JSON
   */
  static exportData(): string {
    const stats = this.getStats();
    const metrics = this.getAllMetrics();

    return JSON.stringify({
      stats,
      metrics,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

export default AnalyticsService;
