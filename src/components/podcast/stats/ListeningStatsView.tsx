import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  Award,
  Target,
  Flame,
  Calendar,
  BarChart3,
  Heart,
  Star,
  Headphones,
} from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '../../ui/GlassCard';
import {
  StatsService,
  InsightsService,
  PreferencesService,
  type ListeningStats,
  type ListeningInsight,
} from '../../../services/personalizationService';
import { PREBUILT_SHOWS } from '../../../data/prebuiltPodcasts';

interface ListeningStatsViewProps {
  onShowClick?: (showId: string) => void;
}

const ListeningStatsView: React.FC<ListeningStatsViewProps> = ({ onShowClick }) => {
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [insights, setInsights] = useState<ListeningInsight[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    const listeningStats = StatsService.getStats();
    const userInsights = InsightsService.getInsights();
    setStats(listeningStats);
    setInsights(userInsights);
  };

  if (!stats) {
    return (
      <div className="p-8">
        <GlassCard className="p-12 text-center">
          <Headphones className="w-16 h-16 mx-auto mb-4" style={{ color: '#00D4E4', opacity: 0.3 }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
            Loading your stats...
          </h3>
        </GlassCard>
      </div>
    );
  }

  const weeklyProgress = (stats.weeklyProgress / stats.weeklyGoal) * 100;
  const topShow = stats.topShows[0];
  const topShowData = topShow ? PREBUILT_SHOWS.find((s) => s.id === topShow.showId) : null;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
          Your Listening Stats
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          Track your podcast journey and discover insights
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {(['week', 'month', 'all'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className="px-4 py-2 rounded-lg font-medium transition-all capitalize"
            style={{
              backgroundColor:
                selectedPeriod === period ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: selectedPeriod === period ? '#00D4E4' : 'rgba(255, 255, 255, 0.6)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: selectedPeriod === period ? '#00D4E4' : 'transparent',
            }}
          >
            {period === 'all' ? 'All Time' : `This ${period}`}
          </button>
        ))}
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          iconColor="#00D4E4"
          title="Listening Time"
          value={`${Math.floor(stats.totalListeningTime / 60)}h ${stats.totalListeningTime % 60}m`}
          subtitle="Total time"
        />

        <StatCard
          icon={Award}
          iconColor="#F59E0B"
          title="Episodes Completed"
          value={stats.episodesCompleted.toString()}
          subtitle="Finished episodes"
        />

        <StatCard
          icon={Flame}
          iconColor="#EF4444"
          title="Listening Streak"
          value={`${stats.listeningStreak} days`}
          subtitle="Keep it going!"
        />

        <StatCard
          icon={Star}
          iconColor="#EC4899"
          title="Average Rating"
          value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
          subtitle="Your ratings"
        />
      </div>

      {/* Weekly Goal Progress */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6" style={{ color: '#00D4E4' }} />
            <div>
              <h3 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
                Weekly Goal
              </h3>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                {stats.weeklyProgress} / {stats.weeklyGoal} minutes
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: '#00D4E4' }}>
              {Math.min(100, Math.round(weeklyProgress))}%
            </div>
            <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {stats.weeklyGoal - stats.weeklyProgress > 0
                ? `${stats.weeklyGoal - stats.weeklyProgress} min to go`
                : 'Goal achieved! 🎉'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, weeklyProgress)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #00D4E4 0%, #00E8FA 100%)',
            }}
          />
        </div>
      </GlassCard>

      {/* Top Shows */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" style={{ color: '#00D4E4' }} />
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
            Your Top Shows
          </h2>
        </div>

        <div className="space-y-3">
          {stats.topShows.slice(0, 5).map((item, index) => {
            const show = PREBUILT_SHOWS.find((s) => s.id === item.showId);
            if (!show) return null;

            const hours = Math.floor(item.minutes / 60);
            const mins = item.minutes % 60;

            return (
              <motion.div
                key={item.showId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard
                  className="p-4 cursor-pointer transition-all hover:bg-white/5"
                  onClick={() => onShowClick && onShowClick(item.showId)}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                      style={{
                        background:
                          index === 0
                            ? 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
                            : 'rgba(0, 212, 228, 0.2)',
                        color: index === 0 ? '#FFFFFF' : '#00D4E4',
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Show Info */}
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}
                    >
                      {show.artwork}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold mb-1" style={{ color: '#FFFFFF' }}>
                        {show.title}
                      </h3>
                      <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {hours > 0 ? `${hours}h ` : ''}
                        {mins}m listened
                      </p>
                    </div>

                    {/* Time Badge */}
                    <div
                      className="px-4 py-2 rounded-lg"
                      style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}
                    >
                      <div className="text-lg font-bold" style={{ color: '#00D4E4' }}>
                        {item.minutes}
                      </div>
                      <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        minutes
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Insights & Achievements */}
      {insights.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
              Achievements & Insights
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-6 text-center">
                  <div className="text-5xl mb-3">{insight.icon}</div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: '#FFFFFF' }}>
                    {insight.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {insight.description}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Favorite Category */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 212, 228, 0.2)' }}
          >
            <Heart className="w-8 h-8" style={{ color: '#00D4E4' }} />
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
              Favorite Category
            </h3>
            <p className="text-lg" style={{ color: '#00D4E4' }}>
              {stats.favoriteCategory}
            </p>
            <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              You listen to this category the most
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ElementType;
  iconColor: string;
  title: string;
  value: string;
  subtitle: string;
}> = ({ icon: Icon, iconColor, title, value, subtitle }) => {
  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <Icon className="w-6 h-6" style={{ color: iconColor }} />
        </div>
      </div>

      <div className="text-3xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
        {value}
      </div>
      <div className="text-sm font-medium mb-1" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
        {title}
      </div>
      <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
        {subtitle}
      </div>
    </GlassCard>
  );
};

export default ListeningStatsView;
