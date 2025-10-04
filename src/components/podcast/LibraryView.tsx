import React, { useState, useEffect } from 'react';
import { Play, Clock, Heart, Trash2, Bell, BellOff, Calendar, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import {
  SubscriptionService,
  SavedEpisodesService,
  ListeningHistoryService,
  getUserLibrary,
  type Subscription,
  type SavedEpisode,
  type ListeningHistoryEntry
} from '../../services/subscriptionService';
import { PREBUILT_SHOWS, PREBUILT_EPISODES } from '../../data/prebuiltPodcasts';
import type { PodcastShow, PodcastEpisode } from '../../types/podcast';

interface LibraryViewProps {
  onPlayEpisode?: (episode: any) => void;
  onShowClick?: (showId: string) => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ onPlayEpisode, onShowClick }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [savedEpisodes, setSavedEpisodes] = useState<SavedEpisode[]>([]);
  const [continueListening, setContinueListening] = useState<ListeningHistoryEntry[]>([]);
  const [recentHistory, setRecentHistory] = useState<ListeningHistoryEntry[]>([]);

  useEffect(() => {
    loadLibraryData();
  }, []);

  const loadLibraryData = () => {
    const library = getUserLibrary();
    setSubscriptions(library.subscriptions);
    setSavedEpisodes(library.savedEpisodes);
    setContinueListening(library.continueListening);
    setRecentHistory(library.recentHistory);
  };

  const handleUnsubscribe = (showId: string) => {
    SubscriptionService.unsubscribe(showId);
    loadLibraryData();
  };

  const handleToggleNotifications = (showId: string, currentEnabled: boolean) => {
    SubscriptionService.updateNotifications(showId, !currentEnabled);
    loadLibraryData();
  };

  const handleRemoveSaved = (episodeId: string) => {
    SavedEpisodesService.removeSaved(episodeId);
    loadLibraryData();
  };

  const handleClearHistory = () => {
    if (confirm('Clear all listening history?')) {
      ListeningHistoryService.clearHistory();
      loadLibraryData();
    }
  };

  const getShowById = (showId: string): PodcastShow | undefined => {
    return PREBUILT_SHOWS.find(show => show.id === showId);
  };

  const getEpisodeById = (episodeId: string): PodcastEpisode | undefined => {
    return PREBUILT_EPISODES.find(ep => ep.id === episodeId);
  };

  const playEpisode = (episodeId: string, showId: string) => {
    const episode = getEpisodeById(episodeId);
    const show = getShowById(showId);

    if (episode && show && onPlayEpisode) {
      onPlayEpisode({
        id: episode.id,
        title: episode.title,
        showName: show.title,
        artwork: show.artwork,
        audioUrl: episode.audioUrl,
        duration: episode.duration
      });
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
          Your Library
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          Your subscriptions, saved episodes, and listening history
        </p>
      </div>

      {/* Continue Listening */}
      {continueListening.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" style={{ color: '#00D4E4' }} />
            <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Continue Listening</h2>
          </div>

          <div className="space-y-3">
            {continueListening.map((entry) => {
              const episode = getEpisodeById(entry.episodeId);
              const show = getShowById(entry.showId);
              if (!episode || !show) return null;

              return (
                <motion.div
                  key={entry.episodeId}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <GlassCard
                    className="p-4 cursor-pointer"
                    onClick={() => playEpisode(entry.episodeId, entry.showId)}
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
                        <h3 className="font-bold mb-2 line-clamp-1" style={{ color: '#FFFFFF' }}>
                          {episode.title}
                        </h3>

                        {/* Progress Bar */}
                        <div className="w-full h-1 rounded-full mb-1" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${entry.progress}%`,
                              backgroundColor: '#00D4E4'
                            }}
                          />
                        </div>
                        <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {entry.progress}% complete
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playEpisode(entry.episodeId, entry.showId);
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
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Subscribed Shows */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5" style={{ color: '#EC4899' }} />
            <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
              Subscribed Shows ({subscriptions.length})
            </h2>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Heart className="w-16 h-16 mx-auto mb-4" style={{ color: '#EC4899', opacity: 0.3 }} />
            <h3 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
              No Subscriptions Yet
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Browse podcasts and subscribe to your favorites
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {subscriptions.map((sub) => {
              const show = getShowById(sub.showId);
              if (!show) return null;

              return (
                <motion.div
                  key={sub.showId}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <GlassCard className="p-6 cursor-pointer" onClick={() => onShowClick && onShowClick(sub.showId)}>
                    <div className="flex gap-4">
                      <div
                        className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 text-4xl"
                        style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}
                      >
                        {show.artwork}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold mb-1" style={{ color: '#FFFFFF' }}>
                          {show.title}
                        </h3>
                        <p className="text-sm mb-3 line-clamp-2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {show.description}
                        </p>

                        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          <Calendar className="w-3 h-3" />
                          <span>Subscribed {new Date(sub.subscribedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleNotifications(sub.showId, sub.notificationsEnabled);
                          }}
                          className="p-2 rounded-lg transition-all"
                          style={{
                            backgroundColor: sub.notificationsEnabled
                              ? 'rgba(0, 212, 228, 0.2)'
                              : 'rgba(255, 255, 255, 0.1)',
                            color: sub.notificationsEnabled ? '#00D4E4' : 'rgba(255, 255, 255, 0.5)'
                          }}
                          title={sub.notificationsEnabled ? 'Notifications on' : 'Notifications off'}
                        >
                          {sub.notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnsubscribe(sub.showId);
                          }}
                          className="p-2 rounded-lg transition-all"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#EF4444'
                          }}
                          title="Unsubscribe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Saved Episodes */}
      {savedEpisodes.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
              Saved Episodes ({savedEpisodes.length})
            </h2>
          </div>

          <div className="space-y-3">
            {savedEpisodes.map((saved) => {
              const episode = getEpisodeById(saved.episodeId);
              const show = getShowById(saved.showId);
              if (!episode || !show) return null;

              return (
                <motion.div
                  key={saved.episodeId}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <GlassCard className="p-4">
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
                        {saved.notes && (
                          <p className="text-xs mb-1 line-clamp-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            Note: {saved.notes}
                          </p>
                        )}
                        <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          Saved {new Date(saved.savedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => playEpisode(saved.episodeId, saved.showId)}
                          className="p-3 rounded-full transition-all"
                          style={{
                            backgroundColor: 'rgba(0, 212, 228, 0.2)',
                            color: '#00D4E4'
                          }}
                        >
                          <Play className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleRemoveSaved(saved.episodeId)}
                          className="p-3 rounded-full transition-all"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#EF4444'
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent History */}
      {recentHistory.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
              <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Recently Played</h2>
            </div>
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#EF4444'
              }}
            >
              Clear History
            </button>
          </div>

          <div className="space-y-2">
            {recentHistory.slice(0, 10).map((entry) => {
              const episode = getEpisodeById(entry.episodeId);
              const show = getShowById(entry.showId);
              if (!episode || !show) return null;

              return (
                <motion.div
                  key={entry.episodeId + entry.lastPlayedAt.getTime()}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <GlassCard
                    className="p-3 cursor-pointer"
                    onClick={() => playEpisode(entry.episodeId, entry.showId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{show.artwork}</div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {show.title}
                        </p>
                        <h4 className="font-medium text-sm line-clamp-1" style={{ color: '#FFFFFF' }}>
                          {episode.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {new Date(entry.lastPlayedAt).toLocaleDateString()}
                        </p>
                        {entry.completed && (
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}
                          >
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default LibraryView;
