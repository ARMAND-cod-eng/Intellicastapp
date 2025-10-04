import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Filter, TrendingUp, Clock, Play, Heart, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import { PREBUILT_SHOWS, PREBUILT_EPISODES } from '../../data/prebuiltPodcasts';
import { SubscriptionService } from '../../services/subscriptionService';
import type { PodcastShow, PodcastEpisode } from '../../types/podcast';

interface SearchViewProps {
  onPlayEpisode?: (episode: any) => void;
  onShowClick?: (showId: string) => void;
}

type SearchFilter = {
  category: string | null;
  duration: 'all' | 'short' | 'medium' | 'long'; // short: <10min, medium: 10-30min, long: >30min
  sortBy: 'relevance' | 'popular' | 'recent';
};

const TRENDING_TOPICS = [
  { id: 1, text: 'AI Revolution', icon: '🤖', count: 1234 },
  { id: 2, text: 'Tech Innovation', icon: '💡', count: 987 },
  { id: 3, text: 'Quantum Computing', icon: '⚛️', count: 756 },
  { id: 4, text: 'Machine Learning', icon: '🧠', count: 654 },
  { id: 5, text: 'Future of Work', icon: '💼', count: 543 },
];

const CATEGORIES = ['All', 'Technology', 'Business', 'Science', 'Health', 'News'];

const SearchView: React.FC<SearchViewProps> = ({ onPlayEpisode, onShowClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilter>({
    category: null,
    duration: 'all',
    sortBy: 'relevance'
  });
  const [subscribedShows, setSubscribedShows] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load search history from localStorage
    const history = localStorage.getItem('podcast_search_history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }

    // Load subscriptions
    const subscriptions = SubscriptionService.getSubscriptions();
    setSubscribedShows(new Set(subscriptions.map(sub => sub.showId)));
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (query.trim() && !searchHistory.includes(query.trim())) {
      const newHistory = [query.trim(), ...searchHistory].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('podcast_search_history', JSON.stringify(newHistory));
    }
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('podcast_search_history');
  };

  const handleSubscribe = (showId: string) => {
    SubscriptionService.toggleSubscription(showId);
    const subscriptions = SubscriptionService.getSubscriptions();
    setSubscribedShows(new Set(subscriptions.map(sub => sub.showId)));
  };

  // Search and filter logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { shows: [], episodes: [] };

    const query = searchQuery.toLowerCase();

    // Search shows
    let shows = PREBUILT_SHOWS.filter(show =>
      show.title.toLowerCase().includes(query) ||
      show.description.toLowerCase().includes(query) ||
      show.topics.some(topic => topic.toLowerCase().includes(query)) ||
      show.personas?.some(p => p.name.toLowerCase().includes(query))
    );

    // Search episodes
    let episodes = PREBUILT_EPISODES.filter(ep =>
      ep.title.toLowerCase().includes(query) ||
      ep.description?.toLowerCase().includes(query) ||
      ep.topics.some(topic => topic.toLowerCase().includes(query))
    );

    // Apply category filter
    if (filters.category && filters.category !== 'All') {
      shows = shows.filter(show => show.category === filters.category);
      episodes = episodes.filter(ep => {
        const show = PREBUILT_SHOWS.find(s => s.id === ep.showId);
        return show?.category === filters.category;
      });
    }

    // Apply duration filter
    if (filters.duration !== 'all') {
      episodes = episodes.filter(ep => {
        const duration = ep.duration || 0;
        if (filters.duration === 'short') return duration < 600; // <10 min
        if (filters.duration === 'medium') return duration >= 600 && duration <= 1800; // 10-30 min
        if (filters.duration === 'long') return duration > 1800; // >30 min
        return true;
      });
    }

    // Apply sorting
    if (filters.sortBy === 'popular') {
      shows = [...shows].sort((a, b) => b.subscribers - a.subscribers);
      episodes = [...episodes].sort((a, b) => b.playCount - a.playCount);
    } else if (filters.sortBy === 'recent') {
      episodes = [...episodes].sort((a, b) =>
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
    }

    return { shows, episodes };
  }, [searchQuery, filters]);

  const handlePlayEpisode = (episode: PodcastEpisode) => {
    const show = PREBUILT_SHOWS.find(s => s.id === episode.showId);
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const formatPlayCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="p-8 space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
          Search & Discover
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          Find your next favorite podcast
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search shows, episodes, topics..."
              className="w-full pl-12 pr-12 py-4 rounded-xl text-lg font-medium transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#00D4E4';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255, 255, 255, 0.4)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-4 rounded-xl font-medium flex items-center gap-2 transition-all"
            style={{
              backgroundColor: showFilters ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid',
              borderColor: showFilters ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
              color: showFilters ? '#00D4E4' : '#FFFFFF'
            }}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <GlassCard className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setFilters({ ...filters, category: cat === 'All' ? null : cat })}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={{
                            backgroundColor: (filters.category === cat || (filters.category === null && cat === 'All'))
                              ? 'rgba(0, 212, 228, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                            color: (filters.category === cat || (filters.category === null && cat === 'All'))
                              ? '#00D4E4'
                              : 'rgba(255, 255, 255, 0.7)',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: (filters.category === cat || (filters.category === null && cat === 'All'))
                              ? '#00D4E4'
                              : 'transparent'
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Duration
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'short', label: '<10 min' },
                        { value: 'medium', label: '10-30 min' },
                        { value: 'long', label: '>30 min' }
                      ].map(dur => (
                        <button
                          key={dur.value}
                          onClick={() => setFilters({ ...filters, duration: dur.value as any })}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={{
                            backgroundColor: filters.duration === dur.value
                              ? 'rgba(0, 212, 228, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                            color: filters.duration === dur.value
                              ? '#00D4E4'
                              : 'rgba(255, 255, 255, 0.7)',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: filters.duration === dur.value ? '#00D4E4' : 'transparent'
                          }}
                        >
                          {dur.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Sort By
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'relevance', label: 'Relevance' },
                        { value: 'popular', label: 'Popular' },
                        { value: 'recent', label: 'Recent' }
                      ].map(sort => (
                        <button
                          key={sort.value}
                          onClick={() => setFilters({ ...filters, sortBy: sort.value as any })}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={{
                            backgroundColor: filters.sortBy === sort.value
                              ? 'rgba(0, 212, 228, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                            color: filters.sortBy === sort.value
                              ? '#00D4E4'
                              : 'rgba(255, 255, 255, 0.7)',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: filters.sortBy === sort.value ? '#00D4E4' : 'transparent'
                          }}
                        >
                          {sort.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Results or Default View */}
      {searchQuery.trim() ? (
        <div className="space-y-8">
          {/* Shows Results */}
          {searchResults.shows.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                Shows ({searchResults.shows.length})
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {searchResults.shows.map(show => (
                  <motion.div
                    key={show.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <GlassCard className="p-4 cursor-pointer transition-all hover:bg-white/5" onClick={() => onShowClick && onShowClick(show.id)}>
                      <div className="flex gap-4">
                        <div
                          className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 text-3xl"
                          style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}
                        >
                          {show.artwork}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold mb-1 line-clamp-1" style={{ color: '#FFFFFF' }}>
                            {show.title}
                          </h3>
                          <p className="text-sm mb-2 line-clamp-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            {show.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            <span>{(show.subscribers / 1000).toFixed(1)}K subscribers</span>
                            <span>•</span>
                            <span>{show.episodeCount} episodes</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubscribe(show.id);
                          }}
                          className="self-center px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{
                            backgroundColor: subscribedShows.has(show.id) ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            color: subscribedShows.has(show.id) ? '#00D4E4' : '#FFFFFF'
                          }}
                        >
                          {subscribedShows.has(show.id) ? <Heart className="w-4 h-4 fill-current" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Episodes Results */}
          {searchResults.episodes.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                Episodes ({searchResults.episodes.length})
              </h2>
              <div className="space-y-3">
                {searchResults.episodes.map((episode) => {
                  const show = PREBUILT_SHOWS.find(s => s.id === episode.showId);
                  if (!show) return null;

                  return (
                    <motion.div
                      key={episode.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <GlassCard className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">{show.artwork}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                              {show.title}
                            </p>
                            <h3 className="font-bold mb-1 line-clamp-1" style={{ color: '#FFFFFF' }}>
                              {episode.title}
                            </h3>
                            <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                              <span>{formatDuration(episode.duration || 0)}</span>
                              <span>•</span>
                              <span>{formatPlayCount(episode.playCount)} plays</span>
                            </div>
                          </div>
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
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* No Results */}
          {searchResults.shows.length === 0 && searchResults.episodes.length === 0 && (
            <GlassCard className="p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4" style={{ color: '#00D4E4', opacity: 0.3 }} />
              <h3 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                No results found
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Try adjusting your search or filters
              </p>
            </GlassCard>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Trending Topics */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" style={{ color: '#00D4E4' }} />
              <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Trending Topics</h2>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {TRENDING_TOPICS.map(topic => (
                <motion.button
                  key={topic.id}
                  onClick={() => handleSearch(topic.text)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <GlassCard className="p-4 text-center cursor-pointer transition-all hover:bg-white/5">
                    <div className="text-3xl mb-2">{topic.icon}</div>
                    <h3 className="font-bold text-sm mb-1" style={{ color: '#FFFFFF' }}>
                      {topic.text}
                    </h3>
                    <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      {formatPlayCount(topic.count)} searches
                    </p>
                  </GlassCard>
                </motion.button>
              ))}
            </div>
          </section>

          {/* Recent Searches */}
          {searchHistory.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />
                  <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Recent Searches</h2>
                </div>
                <button
                  onClick={clearHistory}
                  className="text-sm font-medium transition-colors hover:text-white"
                  style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(query)}
                    className="px-4 py-2 rounded-lg font-medium transition-all hover:bg-white/10"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {query}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchView;
