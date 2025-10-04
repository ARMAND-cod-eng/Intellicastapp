import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Heart, Bell, BellOff, Users, Calendar, Clock, Share2, TrendingUp, Plus, MessageCircle, ListPlus, Download, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import { SubscriptionService, SavedEpisodesService } from '../../services/subscriptionService';
import { RatingService, getEngagementStats } from '../../services/engagementService';
import { QueueService, PlayLaterService, DownloadService } from '../../services/playbackService';
import { PREBUILT_SHOWS, PREBUILT_EPISODES } from '../../data/prebuiltPodcasts';
import StarRating from './engagement/StarRating';
import ShareButton from './engagement/ShareButton';
import CommentsSection from './engagement/CommentsSection';
import type { PodcastShow, PodcastEpisode } from '../../types/podcast';

interface ShowDetailViewProps {
  showId: string;
  onBack: () => void;
  onPlayEpisode?: (episode: any) => void;
}

const ShowDetailView: React.FC<ShowDetailViewProps> = ({ showId, onBack, onPlayEpisode }) => {
  const [show, setShow] = useState<PodcastShow | null>(null);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [savedEpisodeIds, setSavedEpisodeIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [showRating, setShowRating] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [selectedEpisodeForComments, setSelectedEpisodeForComments] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadShowData();
  }, [showId]);

  const loadShowData = () => {
    setIsLoading(true);

    // Simulate loading delay for smooth transition
    setTimeout(() => {
      // Load show
      const foundShow = PREBUILT_SHOWS.find(s => s.id === showId);
      setShow(foundShow || null);

      // Load episodes
      const showEpisodes = PREBUILT_EPISODES.filter(ep => ep.showId === showId);
      setEpisodes(showEpisodes);

      // Load subscription status
      const subscribed = SubscriptionService.isSubscribed(showId);
      setIsSubscribed(subscribed);

      if (subscribed) {
        const subscriptions = SubscriptionService.getSubscriptions();
        const subscription = subscriptions.find(sub => sub.showId === showId);
        setNotificationsEnabled(subscription?.notificationsEnabled || false);
      }

      // Load saved episodes
      const saved = SavedEpisodesService.getSavedEpisodes();
      setSavedEpisodeIds(new Set(saved.map(ep => ep.episodeId)));

      // Load ratings
      const ratingData = RatingService.getAverageRating(undefined, showId);
      setShowRating(ratingData.average);
      setUserRating(RatingService.getUserRating(undefined, showId));

      setIsLoading(false);
    }, 300);
  };

  const handleSubscribe = () => {
    const nowSubscribed = SubscriptionService.toggleSubscription(showId);
    setIsSubscribed(nowSubscribed);
    if (nowSubscribed) {
      setNotificationsEnabled(true);
    }
  };

  const handleToggleNotifications = () => {
    const newValue = !notificationsEnabled;
    SubscriptionService.updateNotifications(showId, newValue);
    setNotificationsEnabled(newValue);
  };

  const handleToggleSaved = (episodeId: string) => {
    const nowSaved = SavedEpisodesService.toggleSaved(episodeId, showId);
    const newSaved = new Set(savedEpisodeIds);
    if (nowSaved) {
      newSaved.add(episodeId);
    } else {
      newSaved.delete(episodeId);
    }
    setSavedEpisodeIds(newSaved);
  };

  const handlePlayEpisode = (episode: PodcastEpisode) => {
    if (onPlayEpisode && show) {
      onPlayEpisode({
        id: episode.id,
        title: episode.title,
        showName: show.title,
        showId: show.id,
        artwork: show.artwork,
        audioUrl: episode.audioUrl,
        duration: episode.duration
      });
    }
  };

  const handleRateShow = (rating: number) => {
    RatingService.rateShow(showId, rating);
    setUserRating(rating);
    loadShowData();
  };

  const handleAddToQueue = (episode: PodcastEpisode) => {
    if (show) {
      QueueService.addToQueue({
        episodeId: episode.id,
        showId: show.id,
        title: episode.title,
        showName: show.title,
        artwork: show.artwork,
        audioUrl: episode.audioUrl || '',
        duration: episode.duration || 0,
      });
    }
  };

  const handlePlayLater = (episode: PodcastEpisode) => {
    if (show) {
      PlayLaterService.addToPlayLater({
        episodeId: episode.id,
        showId: show.id,
        title: episode.title,
        showName: show.title,
        artwork: show.artwork,
        audioUrl: episode.audioUrl || '',
        duration: episode.duration || 0,
      });
    }
  };

  const handleDownload = (episode: PodcastEpisode) => {
    if (show) {
      DownloadService.startDownload({
        episodeId: episode.id,
        showId: show.id,
        title: episode.title,
        showName: show.title,
      });
    }
  };

  const getSortedEpisodes = () => {
    const sorted = [...episodes];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => b.episodeNumber - a.episodeNumber);
      case 'oldest':
        return sorted.sort((a, b) => a.episodeNumber - b.episodeNumber);
      case 'popular':
        return sorted.sort((a, b) => b.playCount - a.playCount);
      default:
        return sorted;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPlayCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#000000' }}
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-full mx-auto mb-4"
            style={{
              border: '3px solid rgba(0, 212, 228, 0.2)',
              borderTopColor: '#00D4E4'
            }}
          />
          <p className="text-lg" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Loading show...</p>
        </div>
      </motion.div>
    );
  }

  if (!show) {
    return (
      <div className="p-8">
        <GlassCard className="p-12 text-center">
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Show not found</p>
          <button
            onClick={onBack}
            className="mt-4 px-6 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: 'rgba(0, 212, 228, 0.2)',
              color: '#00D4E4'
            }}
          >
            Go Back
          </button>
        </GlassCard>
      </div>
    );
  }

  const sortedEpisodes = getSortedEpisodes();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl border-b" style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }}>
        <div className="px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.2)';
              e.currentTarget.style.color = '#00D4E4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-8 mb-8">
            {/* Artwork */}
            <div
              className="w-64 h-64 rounded-3xl flex items-center justify-center flex-shrink-0 text-9xl"
              style={{
                backgroundColor: 'rgba(0, 212, 228, 0.1)',
                boxShadow: '0 20px 60px rgba(0, 212, 228, 0.2)'
              }}
            >
              {show.artwork}
            </div>

            {/* Show Info */}
            <div className="flex-1">
              <div className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-4"
                   style={{ backgroundColor: 'rgba(0, 212, 228, 0.2)', color: '#00D4E4' }}>
                {show.category}
              </div>

              <h1 className="text-5xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                {show.title}
              </h1>

              <p className="text-lg mb-6" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {show.description}
              </p>

              {/* Hosts/Personas */}
              {show.personas && show.personas.length > 0 && (
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Hosted by:</span>
                  <div className="flex gap-3">
                    {show.personas.map((persona) => (
                      <div
                        key={persona.id}
                        className="flex items-center gap-2 px-3 py-1 rounded-full"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <span className="text-xl">{persona.icon}</span>
                        <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                          {persona.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats & Rating */}
              <div className="flex items-center gap-6 mb-6 text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{formatPlayCount(show.subscribers)} subscribers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{show.episodeCount} episodes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{show.episodeLength} avg</span>
                </div>
                {show.lastEpisodeDate && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Last episode: {formatDate(show.lastEpisodeDate)}</span>
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="mb-8">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      {userRating ? 'Your Rating' : 'Rate this show'}
                    </p>
                    <StarRating
                      rating={userRating || 0}
                      size="lg"
                      interactive={true}
                      onRate={handleRateShow}
                      showCount={false}
                    />
                  </div>
                  {showRating > 0 && (
                    <div className="pl-4 border-l" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                      <p className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Average Rating
                      </p>
                      <StarRating
                        rating={showRating}
                        count={RatingService.getAverageRating(undefined, showId).count}
                        size="md"
                        interactive={false}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSubscribe}
                  className="px-8 py-3 rounded-xl font-semibold transition-all flex items-center gap-2"
                  style={{
                    background: isSubscribed
                      ? 'rgba(0, 212, 228, 0.2)'
                      : 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
                    color: isSubscribed ? '#00D4E4' : '#FFFFFF',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: isSubscribed ? '#00D4E4' : 'transparent'
                  }}
                >
                  {isSubscribed ? (
                    <>
                      <Heart className="w-5 h-5 fill-current" />
                      Subscribed
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Subscribe
                    </>
                  )}
                </button>

                {isSubscribed && (
                  <button
                    onClick={handleToggleNotifications}
                    className="px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
                    style={{
                      backgroundColor: notificationsEnabled
                        ? 'rgba(0, 212, 228, 0.2)'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: notificationsEnabled ? '#00D4E4' : 'rgba(255, 255, 255, 0.7)'
                    }}
                  >
                    {notificationsEnabled ? (
                      <>
                        <Bell className="w-5 h-5" />
                        Notifications On
                      </>
                    ) : (
                      <>
                        <BellOff className="w-5 h-5" />
                        Notifications Off
                      </>
                    )}
                  </button>
                )}

                <button
                  className="px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    // Could add a toast notification here
                  }}
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              </div>
            </div>
          </div>

          {/* Topics */}
          {show.topics && show.topics.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                TOPICS COVERED
              </h3>
              <div className="flex flex-wrap gap-2">
                {show.topics.map((topic) => (
                  <span
                    key={topic}
                    className="px-3 py-1 rounded-full text-sm"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Episodes Section */}
      <div className="px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Episodes Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
              Episodes ({episodes.length})
            </h2>

            {/* Sort Options */}
            <div className="flex gap-2">
              {(['newest', 'oldest', 'popular'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize"
                  style={{
                    backgroundColor: sortBy === option
                      ? 'rgba(0, 212, 228, 0.2)'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: sortBy === option
                      ? '#00D4E4'
                      : 'rgba(255, 255, 255, 0.6)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: sortBy === option ? '#00D4E4' : 'transparent'
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Episodes List */}
          <div className="space-y-3">
            {sortedEpisodes.map((episode, index) => {
              const isSaved = savedEpisodeIds.has(episode.id);
              const engagement = getEngagementStats(episode.id);

              return (
                <motion.div
                  key={episode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard className="p-4 transition-all hover:bg-white/5">
                    <div className="flex items-center gap-4">
                      {/* Episode Number */}
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center font-bold flex-shrink-0"
                        style={{
                          backgroundColor: 'rgba(0, 212, 228, 0.1)',
                          color: '#00D4E4'
                        }}
                      >
                        {episode.episodeNumber}
                      </div>

                      {/* Episode Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold mb-1 line-clamp-1" style={{ color: '#FFFFFF' }}>
                          {episode.title}
                        </h3>
                        {episode.description && (
                          <p className="text-sm mb-2 line-clamp-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            {episode.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          <span>{formatDate(episode.publishDate)}</span>
                          <span>•</span>
                          <span>{formatDuration(episode.duration || 0)}</span>
                          <span>•</span>
                          <span>{formatPlayCount(episode.playCount)} plays</span>
                          {engagement.rating > 0 && (
                            <>
                              <span>•</span>
                              <StarRating rating={engagement.rating} size="sm" interactive={false} showCount={false} />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {engagement.comments > 0 && (
                          <button
                            onClick={() => setSelectedEpisodeForComments(episode.id)}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              color: 'rgba(255, 255, 255, 0.7)'
                            }}
                          >
                            <MessageCircle className="w-3 h-3" />
                            {engagement.comments}
                          </button>
                        )}

                        <button
                          onClick={() => handleAddToQueue(episode)}
                          className="p-2 rounded-lg transition-all"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: 'rgba(255, 255, 255, 0.7)'
                          }}
                          title="Add to queue"
                        >
                          <ListPlus className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDownload(episode)}
                          className="p-2 rounded-lg transition-all"
                          style={{
                            backgroundColor: DownloadService.isDownloaded(episode.id)
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                            color: DownloadService.isDownloaded(episode.id)
                              ? '#10B981'
                              : 'rgba(255, 255, 255, 0.7)'
                          }}
                          title={DownloadService.isDownloaded(episode.id) ? 'Downloaded' : 'Download'}
                        >
                          {DownloadService.isDownloaded(episode.id) ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>

                        <ShareButton
                          episodeId={episode.id}
                          episodeTitle={episode.title}
                          showName={show.title}
                          size="sm"
                          variant="icon"
                        />

                        <button
                          onClick={() => handleToggleSaved(episode.id)}
                          className="p-3 rounded-full transition-all"
                          style={{
                            backgroundColor: isSaved
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'rgba(255, 255, 255, 0.1)',
                            color: isSaved ? '#EF4444' : 'rgba(255, 255, 255, 0.5)'
                          }}
                        >
                          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          onClick={() => handlePlayEpisode(episode)}
                          className="p-3 rounded-full transition-all"
                          style={{
                            backgroundColor: 'rgba(0, 212, 228, 0.2)',
                            color: '#00D4E4'
                          }}
                        >
                          <Play className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Comments Section (Expanded) */}
                    {selectedEpisodeForComments === episode.id && (
                      <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                        <CommentsSection episodeId={episode.id} />
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => setSelectedEpisodeForComments(null)}
                            className="px-4 py-2 rounded-lg text-sm transition-all"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              color: 'rgba(255, 255, 255, 0.7)'
                            }}
                          >
                            Hide Comments
                          </button>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowDetailView;
