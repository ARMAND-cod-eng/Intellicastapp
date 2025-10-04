import React, { useState, useEffect } from 'react';
import { ArrowLeft, Flame, Play, Users, Plus, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import { PREBUILT_SHOWS, PREBUILT_EPISODES, getShowsByCategory } from '../../data/prebuiltPodcasts';
import { TopicService } from '../../services/discoveryService';
import { SubscriptionService } from '../../services/subscriptionService';
import type { Topic } from '../../services/discoveryService';
import type { PodcastShow } from '../../types/podcast';

interface TopicDetailViewProps {
  topicId: string;
  onBack: () => void;
  onShowClick: (showId: string) => void;
  onPlayEpisode?: (episode: any) => void;
}

const TopicDetailView: React.FC<TopicDetailViewProps> = ({
  topicId,
  onBack,
  onShowClick,
  onPlayEpisode
}) => {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [subscribedShows, setSubscribedShows] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Find the topic
    const topics = TopicService.getAllTopics();
    const foundTopic = topics.find(t => t.id === topicId);
    setTopic(foundTopic || null);

    if (foundTopic) {
      // Get shows for this topic's category
      const categoryShows = getShowsByCategory(foundTopic.name);
      setShows(categoryShows);
    }

    // Load subscriptions
    const subscriptions = SubscriptionService.getSubscriptions();
    setSubscribedShows(new Set(subscriptions.map(sub => sub.showId)));
  }, [topicId]);

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

  if (!topic) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Topic not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <div className="px-8 pt-6 pb-6" style={{
        background: 'linear-gradient(135deg, rgba(0, 212, 228, 0.1) 0%, rgba(0, 0, 0, 0) 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 mb-6 rounded-lg transition-all"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#FFFFFF'
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Browse
        </button>

        <div className="flex items-center gap-6">
          {/* Topic Icon */}
          <div
            className="w-32 h-32 rounded-3xl flex items-center justify-center text-7xl flex-shrink-0"
            style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}
          >
            {topic.icon}
          </div>

          {/* Topic Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-5xl font-bold" style={{ color: '#FFFFFF' }}>
                {topic.name}
              </h1>
              {topic.trending && (
                <div
                  className="px-3 py-1 rounded-full flex items-center gap-1"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                    color: '#FFFFFF'
                  }}
                >
                  <Flame className="w-4 h-4" />
                  <span className="font-bold text-sm">Trending</span>
                </div>
              )}
            </div>

            <p className="text-lg mb-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {topic.description}
            </p>

            <div className="flex items-center gap-6 text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              <span>{shows.length} shows</span>
              <span>{topic.episodeCount} episodes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shows List */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <h2 className="text-2xl font-bold mb-6" style={{ color: '#FFFFFF' }}>
          Shows in {topic.name}
        </h2>

        <div className="grid grid-cols-2 gap-6">
          {shows.map((show) => (
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
              onClick={() => onShowClick(show.id)}
            />
          ))}
        </div>

        {shows.length === 0 && (
          <div className="text-center py-12">
            <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              No shows found in this topic
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Show Card Component (similar to BrowsePodcasts)
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

export default TopicDetailView;
