/**
 * Analytics Dashboard - Usage statistics and insights
 */

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, BarChart3, Clock, Star, Download, Trash2, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnalyticsService from '../../../services/analyticsService';
import type { AnalyticsStats } from '../../../services/analyticsService';
import EmptyState from '../../ui/EmptyState';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    setIsLoading(true);
    setTimeout(() => {
      const analyticsStats = AnalyticsService.getStats();
      setStats(analyticsStats);
      setIsLoading(false);
    }, 300);
  };

  const handleExportData = () => {
    const data = AnalyticsService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intellicast-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
      AnalyticsService.clearAllMetrics();
      loadStats();
    }
  };

  const hasData = stats && (stats.totalPodcasts > 0 || stats.totalDiscoveries > 0 || stats.totalQueueProcessed > 0);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed right-0 top-0 bottom-0 w-[480px] bg-gray-900 border-l border-gray-800 shadow-2xl z-[60] flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-[#00D4E4]" />
            Usage Analytics
          </h3>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close Analytics"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {hasData && (
          <div className="flex gap-2">
            <button
              onClick={handleExportData}
              className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Export Data
            </button>
            <button
              onClick={handleClearData}
              className="flex-1 px-3 py-2 bg-red-900/50 hover:bg-red-900 text-red-400 hover:text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4E4]"></div>
          </div>
        ) : !hasData ? (
          <EmptyState
            icon={BarChart3}
            title="No analytics data yet"
            description="Start using the app to see your usage statistics and insights. Generate podcasts, discover topics, and track your activity!"
            iconColor="text-[#00D4E4]"
          />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={TrendingUp}
                label="Total Podcasts"
                value={stats!.totalPodcasts}
                color="text-[#00D4E4]"
                bgColor="bg-[#00D4E4]/10"
              />
              <StatCard
                icon={Activity}
                label="Topics Discovered"
                value={stats!.totalDiscoveries}
                color="text-blue-400"
                bgColor="bg-blue-400/10"
              />
              <StatCard
                icon={Clock}
                label="Avg. Gen. Time"
                value={`${stats!.averageGenerationTime}s`}
                color="text-purple-400"
                bgColor="bg-purple-400/10"
              />
              <StatCard
                icon={Star}
                label="Favorites"
                value={stats!.totalFavorites}
                color="text-yellow-400"
                bgColor="bg-yellow-400/10"
              />
            </div>

            {/* Most Used Categories */}
            {stats!.mostUsedCategories.length > 0 && (
              <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/30">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#00D4E4]" />
                  Most Used Categories
                </h4>
                <div className="space-y-2">
                  {stats!.mostUsedCategories.map((item, index) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 w-4">#{index + 1}</span>
                        <span className="text-sm text-gray-300 capitalize">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-gray-700 rounded-full w-20 overflow-hidden">
                          <motion.div
                            className="h-full bg-[#00D4E4]"
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.count / stats!.totalPodcasts) * 100}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[#00D4E4] w-6 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Podcasts per Day Chart */}
            {Object.keys(stats!.podcastsPerDay).length > 0 && (
              <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/30">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#00D4E4]" />
                  Activity Over Time
                </h4>
                <div className="space-y-2">
                  {Object.entries(stats!.podcastsPerDay)
                    .slice(-7)
                    .map(([date, count], index) => {
                      const maxCount = Math.max(...Object.values(stats!.podcastsPerDay));
                      return (
                        <div key={date} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-20 truncate">{date}</span>
                          <div className="flex-1 h-6 bg-gray-700/30 rounded overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-[#00D4E4] to-[#00E8FA] flex items-center justify-end pr-2"
                              initial={{ width: 0 }}
                              animate={{ width: `${(count / maxCount) * 100}%` }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                              <span className="text-xs font-bold text-white">{count}</span>
                            </motion.div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {stats!.recentActivity.length > 0 && (
              <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/30">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Activity size={16} className="text-[#00D4E4]" />
                  Recent Activity
                </h4>
                <div className="space-y-2">
                  {stats!.recentActivity.map((activity, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-3 text-xs"
                    >
                      <div className={`mt-0.5 w-2 h-2 rounded-full ${getActivityColor(activity.metricType)}`} />
                      <div className="flex-1">
                        <p className="text-gray-300">{getActivityLabel(activity.metricType)}</p>
                        {activity.metadata?.category && (
                          <p className="text-gray-500 capitalize">{activity.metadata.category}</p>
                        )}
                      </div>
                      <span className="text-gray-500">
                        {new Date(activity.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color, bgColor }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`p-4 rounded-lg border border-gray-700 ${bgColor}`}
  >
    <div className="flex items-center justify-between mb-2">
      <Icon size={18} className={color} />
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-xs text-gray-400">{label}</div>
  </motion.div>
);

function getActivityColor(metricType: string): string {
  switch (metricType) {
    case 'podcast_generated':
      return 'bg-[#00D4E4]';
    case 'topic_discovered':
      return 'bg-blue-400';
    case 'queue_processed':
      return 'bg-purple-400';
    case 'favorite_added':
      return 'bg-yellow-400';
    default:
      return 'bg-gray-400';
  }
}

function getActivityLabel(metricType: string): string {
  switch (metricType) {
    case 'podcast_generated':
      return 'Podcast generated';
    case 'topic_discovered':
      return 'Topics discovered';
    case 'queue_processed':
      return 'Queue processed';
    case 'favorite_added':
      return 'Added to favorites';
    default:
      return 'Activity';
  }
}

export default AnalyticsDashboard;
