import React, { useState, useEffect } from 'react';
import { Play, Users, TrendingUp, Star, Heart, Plus, Sparkles, Flame, ListMusic } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import { PREBUILT_SHOWS, PREBUILT_EPISODES, getFeaturedShows, getTrendingShows, getShowsByCategory } from '../../data/prebuiltPodcasts';
import { SubscriptionService } from '../../services/subscriptionService';
import { PlaylistService, TopicService } from '../../services/discoveryService';
import type { PodcastShow } from '../../types/podcast';

interface BrowsePodcastsProps {
  onPlayEpisode?: (episode: any) => void;
  onShowClick?: (showId: string) => void;
  onTopicClick?: (topicId: string) => void;
}

const BrowsePodcasts: React.FC<BrowsePodcastsProps> = ({ onPlayEpisode, onShowClick, onTopicClick }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [subscribedShows, setSubscribedShows] = useState<Set<string>>(new Set());
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);

  useEffect(() => {
    // Load subscriptions from service
    const subscriptions = SubscriptionService.getSubscriptions();
    setSubscribedShows(new Set(subscriptions.map(sub => sub.showId)));
  }, []);

  const categories = ['All', 'Technology', 'Business', 'Science', 'Health', 'News'];

  const featuredShows = getFeaturedShows();
  const trendingShows = getTrendingShows();
  const officialPlaylists = PlaylistService.getOfficialPlaylists();
  const topics = TopicService.getAllTopics();

  // Get shows based on selection (category or playlist)
  const getDisplayedShows = () => {
    if (selectedPlaylist) {
      const playlist = officialPlaylists.find(p => p.id === selectedPlaylist);
      if (playlist) {
        // Get unique show IDs from playlist episodes
        const playlistEpisodes = PREBUILT_EPISODES.filter(ep => playlist.episodeIds.includes(ep.id));
        const showIds = new Set(playlistEpisodes.map(ep => ep.showId));
        return PREBUILT_SHOWS.filter(show => showIds.has(show.id));
      }
    }
    if (selectedCategory && selectedCategory !== 'All') {
      return getShowsByCategory(selectedCategory);
    }
    return PREBUILT_SHOWS;
  };

  const displayedShows = getDisplayedShows();

  const handleSubscribe = (show: PodcastShow, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    const isCurrentlySubscribed = SubscriptionService.toggleSubscription(show.id);

    // Update UI state
    const newSubscribed = new Set(subscribedShows);
    if (isCurrentlySubscribed) {
      newSubscribed.add(show.id);
    } else {
      newSubscribed.delete(show.id);
    }
    setSubscribedShows(newSubscribed);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="space-y-8">
      {/* Topics Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5" style={{ color: '#00D4E4' }} />
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Explore Topics</h2>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {topics.slice(0, 8).map((topic) => (
            <motion.div key={topic.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <GlassCard
                className="p-4 cursor-pointer text-center"
                onClick={() => {
                  if (onTopicClick) {
                    // Open the topic detail view
                    onTopicClick(topic.id);
                  }
                }}
              >
                <div className="text-2xl mb-2">{topic.icon}</div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <h3 className="font-bold text-sm" style={{ color: '#FFFFFF' }}>
                    {topic.name}
                  </h3>
                  {topic.trending && (
                    <Flame className="w-3 h-3" style={{ color: '#F59E0B' }} />
                  )}
                </div>
                <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  {topic.episodeCount} episodes
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Playlists Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ListMusic className="w-5 h-5" style={{ color: '#00D4E4' }} />
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Curated Playlists</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {officialPlaylists.slice(0, 3).map((playlist) => (
            <motion.div key={playlist.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <GlassCard
                className="p-5 cursor-pointer"
                onClick={() => {
                  // Get shows from this playlist
                  const playlistEpisodes = PREBUILT_EPISODES.filter(ep =>
                    playlist.episodeIds.includes(ep.id)
                  );
                  const showIds = new Set(playlistEpisodes.map(ep => ep.showId));
                  const playlistShows = PREBUILT_SHOWS.filter(show => showIds.has(show.id));

                  if (playlistShows.length > 0 && onShowClick) {
                    // Open the first show in this playlist
                    onShowClick(playlistShows[0].id);
                  }
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-2xl">{playlist.coverArt}</div>
                  <div className="flex-1">
                    <h3 className="font-bold" style={{ color: '#FFFFFF' }}>
                      {playlist.title}
                    </h3>
                    <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      {playlist.episodeIds.length} episodes
                    </p>
                  </div>
                </div>
                <p className="text-sm line-clamp-2 mb-3" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {playlist.description}
                </p>
                <div className="flex items-center justify-between text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  <span>By {playlist.creator}</span>
                  <span>{formatNumber(playlist.followers)} followers</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5" style={{ color: '#F59E0B' }} />
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Featured Shows</h2>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {featuredShows.map((show) => (
            <FeaturedShowCard
              key={show.id}
              show={show}
              isSubscribed={subscribedShows.has(show.id)}
              onSubscribe={() => handleSubscribe(show)}
              onPlay={() => {
                const latestEpisode = PREBUILT_EPISODES.find(ep => ep.showId === show.id);
                if (latestEpisode && onPlayEpisode) {
                  onPlayEpisode({
                    id: latestEpisode.id,
                    title: latestEpisode.title,
                    showName: show.title,
                    showId: show.id,
                    artwork: show.artwork,
                    audioUrl: latestEpisode.audioUrl,
                    duration: latestEpisode.duration
                  });
                }
              }}
              onClick={() => onShowClick && onShowClick(show.id)}
            />
          ))}
        </div>
      </section>

      {/* Trending Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" style={{ color: '#00D4E4' }} />
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Trending Now</h2>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {trendingShows.map((show, index) => (
            <TrendingShowCard
              key={show.id}
              show={show}
              rank={index + 1}
              isSubscribed={subscribedShows.has(show.id)}
              onSubscribe={() => handleSubscribe(show)}
              onClick={() => onShowClick && onShowClick(show.id)}
            />
          ))}
        </div>
      </section>

      {/* Category Filter */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Browse by Category</h2>
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
                className="px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: (selectedCategory === cat || (selectedCategory === null && cat === 'All'))
                    ? 'rgba(0, 212, 228, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: (selectedCategory === cat || (selectedCategory === null && cat === 'All'))
                    ? '#00D4E4'
                    : 'rgba(255, 255, 255, 0.6)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: (selectedCategory === cat || (selectedCategory === null && cat === 'All'))
                    ? '#00D4E4'
                    : 'transparent'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {displayedShows.map((show) => (
            <ShowCard
              key={show.id}
              show={show}
              isSubscribed={subscribedShows.has(show.id)}
              onSubscribe={(e) => handleSubscribe(show, e)}
              onPlay={(e) => {
                if (e) e.stopPropagation();
                const latestEpisode = PREBUILT_EPISODES.find(ep => ep.showId === show.id);
                if (latestEpisode && onPlayEpisode) {
                  onPlayEpisode({
                    id: latestEpisode.id,
                    title: latestEpisode.title,
                    showName: show.title,
                    showId: show.id,
                    artwork: show.artwork,
                    audioUrl: latestEpisode.audioUrl,
                    duration: latestEpisode.duration
                  });
                }
              }}
              onClick={() => onShowClick && onShowClick(show.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

// Featured Show Card Component
const FeaturedShowCard: React.FC<{
  show: PodcastShow;
  isSubscribed: boolean;
  onSubscribe: () => void;
  onPlay: () => void;
  onClick?: () => void;
}> = ({ show, isSubscribed, onSubscribe, onPlay, onClick }) => {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <GlassCard className="p-6 h-full cursor-pointer" onClick={onClick}>
        {/* Artwork */}
        <div className="flex justify-center mb-4">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl"
            style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}
          >
            {show.artwork}
          </div>
        </div>

        {/* Info */}
        <h3 className="text-xl font-bold mb-2 text-center" style={{ color: '#FFFFFF' }}>
          {show.title}
        </h3>
        <p className="text-sm text-center mb-4 line-clamp-2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          {show.description}
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-4 mb-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {(show.subscribers / 1000).toFixed(1)}K
          </div>
          <div>{show.episodeCount} episodes</div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
              color: '#FFFFFF'
            }}
          >
            <Play className="w-4 h-4" />
            Play
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSubscribe();
            }}
            className="px-4 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: isSubscribed ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: isSubscribed ? '#00D4E4' : '#FFFFFF'
            }}
          >
            {isSubscribed ? <Heart className="w-4 h-4 fill-current" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// Trending Show Card Component
const TrendingShowCard: React.FC<{
  show: PodcastShow;
  rank: number;
  isSubscribed: boolean;
  onSubscribe: () => void;
  onClick?: () => void;
}> = ({ show, rank, isSubscribed, onSubscribe, onClick }) => {
  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <GlassCard className="p-4 text-center cursor-pointer" onClick={onClick}>
        {/* Rank Badge */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3 font-bold"
          style={{
            background: rank === 1
              ? 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
              : 'rgba(0, 212, 228, 0.2)',
            color: rank === 1 ? '#FFFFFF' : '#00D4E4'
          }}
        >
          {rank}
        </div>

        {/* Artwork */}
        <div className="text-4xl mb-2">{show.artwork}</div>

        {/* Info */}
        <h4 className="font-bold mb-1 text-sm line-clamp-1" style={{ color: '#FFFFFF' }}>
          {show.title}
        </h4>
        <p className="text-xs mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          {(show.subscribers / 1000).toFixed(1)}K subscribers
        </p>

        {/* Subscribe Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSubscribe();
          }}
          className="w-full py-2 rounded-lg text-xs font-medium transition-all"
          style={{
            backgroundColor: isSubscribed ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            color: isSubscribed ? '#00D4E4' : 'rgba(255, 255, 255, 0.7)'
          }}
        >
          {isSubscribed ? 'Subscribed' : 'Subscribe'}
        </button>
      </GlassCard>
    </motion.div>
  );
};

// Regular Show Card Component
const ShowCard: React.FC<{
  show: PodcastShow;
  isSubscribed: boolean;
  onSubscribe: (e?: React.MouseEvent) => void;
  onPlay: (e?: React.MouseEvent) => void;
  onClick?: () => void;
}> = ({ show, isSubscribed, onSubscribe, onPlay, onClick }) => {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <GlassCard className="p-6 cursor-pointer" onClick={onClick}>
        <div className="flex gap-4">
          {/* Artwork */}
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 text-4xl"
            style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}
          >
            {show.artwork}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold mb-1" style={{ color: '#FFFFFF' }}>
              {show.title}
            </h3>
            <p className="text-sm mb-2 line-clamp-2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {show.description}
            </p>

            {/* Personas */}
            <div className="flex items-center gap-2 mb-3">
              {show.personas?.slice(0, 2).map((persona) => (
                <div
                  key={persona.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <span>{persona.icon}</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{persona.name}</span>
                </div>
              ))}
            </div>

            {/* Stats & Actions */}
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {(show.subscribers / 1000).toFixed(1)}K
                </div>
                <div>{show.episodeCount} eps</div>
                <div>{show.episodeLength}</div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(e);
                  }}
                  className="px-4 py-2 rounded-lg font-medium flex items-center gap-1 transition-all text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
                    color: '#FFFFFF'
                  }}
                >
                  <Play className="w-3 h-3" />
                  Play
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubscribe(e);
                  }}
                  className="px-3 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: isSubscribed ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: isSubscribed ? '#00D4E4' : '#FFFFFF'
                  }}
                >
                  {isSubscribed ? <Heart className="w-4 h-4 fill-current" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default BrowsePodcasts;
