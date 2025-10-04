import React, { useState, useEffect } from 'react';
import { Play, Clock, TrendingUp, Sparkles, Heart, BarChart3, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import { PREBUILT_SHOWS, PREBUILT_EPISODES, getFeaturedShows } from '../../data/prebuiltPodcasts';
import { RecommendationEngine, InsightsService, type Recommendation } from '../../services/personalizationService';

interface ForYouFeedProps {
  onPlayEpisode?: (episode: any) => void;
  onShowClick?: (showId: string) => void;
}

const ForYouFeed: React.FC<ForYouFeedProps> = ({ onPlayEpisode, onShowClick }) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    // Load personalized recommendations
    const recs = RecommendationEngine.getRecommendations(15);
    setRecommendations(recs);

    // Load insights
    const userInsights = InsightsService.getInsights();
    setInsights(userInsights.slice(0, 3));
  }, []);

  // Filter recommendations
  const recommendedShows = recommendations.filter(r => r.show && !r.episode).slice(0, 4);
  const recommendedEpisodes = recommendations.filter(r => r.episode).slice(0, 6);
  const quickListens = PREBUILT_EPISODES.filter(ep => ep.duration && ep.duration <= 600).slice(0, 4);

  const handlePlayEpisode = (episode: any, showTitle: string, artwork: string, showId: string) => {
    if (onPlayEpisode) {
      onPlayEpisode({
        id: episode.id,
        title: episode.title,
        showName: showTitle,
        showId: showId,
        artwork: artwork,
        audioUrl: episode.audioUrl,
        duration: episode.duration
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
          Good {getTimeOfDay()}, Welcome Back! 👋
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          Here's what we think you'll love today
        </p>
      </div>

      {/* Insights Banner */}
      {insights.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {insights.map((insight) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{insight.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm mb-1" style={{ color: '#FFFFFF' }}>
                      {insight.title}
                    </h4>
                    <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      {insight.description}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Listens - Under 10min */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Quick Listens</h2>
          <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Under 10 minutes</span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {quickListens.map((episode) => {
            const show = PREBUILT_SHOWS.find(s => s.id === episode.showId);
            if (!show) return null;

            return (
              <motion.div
                key={episode.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <GlassCard className="p-4 cursor-pointer" onClick={() => handlePlayEpisode(episode, show.title, show.artwork || '', show.id)}>
                  <div className="text-4xl mb-3 text-center">{show.artwork}</div>
                  <h3 className="font-bold text-sm mb-1 line-clamp-2" style={{ color: '#FFFFFF' }}>
                    {episode.title}
                  </h3>
                  <p className="text-xs mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {show.title}
                  </p>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    <span>{Math.floor((episode.duration || 0) / 60)} min</span>
                    <Play className="w-4 h-4" style={{ color: '#00D4E4' }} />
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Recommended For You */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5" style={{ color: '#00D4E4' }} />
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Recommended For You</h2>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {recommendedShows.map((rec) => {
            const show = rec.show!;
            const latestEpisode = PREBUILT_EPISODES.find(ep => ep.showId === show.id);

            return (
              <motion.div
                key={show.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <GlassCard className="p-6 cursor-pointer" onClick={() => onShowClick && onShowClick(show.id)}>
                  <div className="flex gap-4">
                    <div
                      className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0 text-5xl"
                      style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}
                    >
                      {show.artwork}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="mb-2 px-2 py-1 rounded-full text-xs inline-block" style={{ backgroundColor: 'rgba(0, 212, 228, 0.2)', color: '#00D4E4' }}>
                        {show.category}
                      </div>
                      <h3 className="text-lg font-bold mb-1" style={{ color: '#FFFFFF' }}>
                        {show.title}
                      </h3>
                      <p className="text-sm mb-2 line-clamp-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {show.description}
                      </p>
                      <div className="flex items-center gap-1 mb-3">
                        <Lightbulb className="w-3 h-3" style={{ color: '#F59E0B' }} />
                        <p className="text-xs" style={{ color: '#F59E0B' }}>
                          {rec.reason}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {show.personas?.slice(0, 2).map((persona) => (
                          <div
                            key={persona.id}
                            className="flex items-center gap-1 text-xs"
                            style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                          >
                            <span>{persona.icon}</span>
                            <span>{persona.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        latestEpisode && handlePlayEpisode(latestEpisode, show.title, show.artwork || '', show.id);
                      }}
                      className="self-center p-4 rounded-full transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
                        color: '#FFFFFF'
                      }}
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Personalized Episodes */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Personalized Episodes</h2>
        </div>

        <div className="space-y-3">
          {recommendedEpisodes.map((rec) => {
            const episode = rec.episode!;
            const show = PREBUILT_SHOWS.find(s => s.id === episode.showId);
            if (!show) return null;

            return (
              <motion.div
                key={episode.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <GlassCard
                  className="p-4 cursor-pointer"
                  onClick={() => handlePlayEpisode(episode, show.title, show.artwork || '', show.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 text-3xl"
                      style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}
                    >
                      {show.artwork}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {show.title}
                      </p>
                      <h3 className="font-bold mb-1 line-clamp-1" style={{ color: '#FFFFFF' }}>
                        {episode.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        <span>{Math.floor((episode.duration || 0) / 60)} min</span>
                        <span>•</span>
                        <span>{formatPlayCount(episode.playCount)} plays</span>
                        {episode.likeCount > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              <span>{episode.likeCount}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayEpisode(episode, show.title, show.artwork || '', show.id);
                        }}
                        className="p-3 rounded-full transition-all"
                        style={{
                          backgroundColor: 'rgba(0, 212, 228, 0.2)',
                          color: '#00D4E4'
                        }}
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

// Helper functions
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
}

function formatPlayCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export default ForYouFeed;
