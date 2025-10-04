import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Play, Calendar, Clock, Users, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import CreateEpisode from './CreateEpisode';
import GenerationProgress from './GenerationProgress';
import { PodcastShowService, PodcastEpisodeService, PodcastGenerationService } from '../../services/podcastService';
import type { PodcastShow, PodcastEpisode, CreateEpisodeRequest } from '../../types/podcast';

interface AIShowManagerProps {
  onBack: () => void;
  onPlayEpisode?: (episode: any) => void;
}

const AIShowManager: React.FC<AIShowManagerProps> = ({ onBack, onPlayEpisode }) => {
  const [selectedShow, setSelectedShow] = useState<PodcastShow | null>(null);
  const [view, setView] = useState<'shows' | 'episodes' | 'new-episode'>('shows');
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [generatingJobId, setGeneratingJobId] = useState<string | null>(null);

  // Load shows on mount
  useEffect(() => {
    loadShows();
  }, []);

  // Load episodes when show is selected
  useEffect(() => {
    if (selectedShow) {
      loadEpisodes(selectedShow.id);
    }
  }, [selectedShow]);

  const loadShows = () => {
    const loadedShows = PodcastShowService.getShows();
    setShows(loadedShows);
  };

  const loadEpisodes = (showId: string) => {
    const loadedEpisodes = PodcastEpisodeService.getEpisodesByShow(showId);
    setEpisodes(loadedEpisodes);
  };

  if (view === 'episodes' && selectedShow) {
    return (
      <ShowEpisodesView
        show={selectedShow}
        episodes={episodes}
        onBack={() => {
          setView('shows');
          setSelectedShow(null);
        }}
        onNewEpisode={() => setView('new-episode')}
        onRefresh={() => loadEpisodes(selectedShow.id)}
        onPlayEpisode={onPlayEpisode}
      />
    );
  }

  if (view === 'new-episode' && selectedShow) {
    return (
      <CreateEpisode
        show={selectedShow}
        onBack={() => setView('episodes')}
        onCreate={async (episodeRequest: CreateEpisodeRequest) => {
          try {
            // Create episode
            const newEpisode = PodcastEpisodeService.createEpisode(episodeRequest);
            console.log('Created episode:', newEpisode);

            // If generate now is requested, start generation
            if (episodeRequest.generateNow && episodeRequest.sourceDocument) {
              // Read document text
              const text = await episodeRequest.sourceDocument.text();

              // Start generation
              const job = await PodcastGenerationService.generateEpisode(
                newEpisode,
                text,
                episodeRequest.customPrompt
              );

              // Show progress modal
              setGeneratingJobId(job.id);
            } else {
              // Just go back to episodes
              setView('episodes');
            }

            // Refresh data
            loadEpisodes(selectedShow.id);
            loadShows();
          } catch (error) {
            console.error('Failed to create episode:', error);
            alert(`Failed to create episode: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF'
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
              Your AI Podcast Shows
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Manage your shows and plan episodes
            </p>
          </div>
        </div>
      </div>

      {/* Shows Grid */}
      <div className="grid grid-cols-2 gap-6">
        {shows.map(show => (
          <motion.div
            key={show.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <GlassCard
              className="p-6 cursor-pointer"
              onClick={() => {
                setSelectedShow(show);
                setView('episodes');
              }}
            >
              {/* Show Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                    {show.title}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {show.description}
                  </p>
                </div>
                <button
                  className="p-2 rounded-lg transition-colors"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Show menu
                  }}
                >
                  <MoreVertical className="w-4 h-4" style={{ color: '#FFFFFF' }} />
                </button>
              </div>

              {/* Show Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}>
                  <div className="text-2xl font-bold" style={{ color: '#00D4E4' }}>
                    {show.episodeCount}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Episodes
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}>
                  <div className="text-2xl font-bold" style={{ color: '#00D4E4' }}>
                    {show.subscribers}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Subscribers
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}>
                  <div className="text-2xl font-bold" style={{ color: '#00D4E4' }}>
                    {show.episodeLength}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Length
                  </div>
                </div>
              </div>

              {/* Topics */}
              <div className="flex flex-wrap gap-2 mb-4">
                {show.topics.map(topic => (
                  <span
                    key={topic}
                    className="px-2 py-1 rounded-full text-xs"
                    style={{
                      backgroundColor: 'rgba(0, 212, 228, 0.2)',
                      color: '#00D4E4'
                    }}
                  >
                    {topic}
                  </span>
                ))}
              </div>

              {/* Last Update */}
              <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                Last episode: {show.lastEpisodeDate?.toLocaleDateString()}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {shows.length === 0 && (
        <GlassCard className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
               style={{ backgroundColor: 'rgba(0, 212, 228, 0.2)' }}>
            <Plus className="w-10 h-10" style={{ color: '#00D4E4' }} />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
            No Shows Yet
          </h3>
          <p className="mb-6" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Create your first AI podcast show to get started
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl font-medium"
            style={{
              background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
              color: '#FFFFFF'
            }}
          >
            Create Show
          </button>
        </GlassCard>
      )}

      {/* Generation Progress Modal */}
      {generatingJobId && (
        <GenerationProgress
          jobId={generatingJobId}
          onComplete={(success) => {
            if (success && selectedShow) {
              loadEpisodes(selectedShow.id);
              loadShows();
            }
            setView('episodes');
          }}
          onClose={() => {
            setGeneratingJobId(null);
            setView('episodes');
          }}
        />
      )}
    </div>
  );
};

// Show Episodes View Component
const ShowEpisodesView: React.FC<{
  show: PodcastShow;
  episodes: PodcastEpisode[];
  onBack: () => void;
  onNewEpisode: () => void;
  onRefresh: () => void;
  onPlayEpisode?: (episode: any) => void;
}> = ({ show, episodes, onBack, onNewEpisode, onRefresh, onPlayEpisode }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return '#10B981';
      case 'scheduled': return '#F59E0B';
      case 'draft': return '#6B7280';
      case 'generating': return '#00D4E4';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <Play className="w-4 h-4" />;
      case 'scheduled': return <Calendar className="w-4 h-4" />;
      case 'draft': return <Edit className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF'
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shows
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
              {show.title}
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {show.description}
            </p>
          </div>
          <button
            onClick={onNewEpisode}
            className="px-6 py-3 rounded-xl font-medium flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
              color: '#FFFFFF'
            }}
          >
            <Plus className="w-5 h-5" />
            New Episode
          </button>
        </div>
      </div>

      {/* Episodes List */}
      <div className="space-y-4">
        {episodes.map(episode => (
          <GlassCard key={episode.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Episode Number & Status */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Episode {episode.episodeNumber}
                  </span>
                  <div
                    className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: `${getStatusColor(episode.status)}20`,
                      color: getStatusColor(episode.status)
                    }}
                  >
                    {getStatusIcon(episode.status)}
                    {episode.status.toUpperCase()}
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                  {episode.title}
                </h3>
                <p className="text-sm mb-3" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {episode.description}
                </p>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {episode.publishDate.toLocaleDateString()}
                  </div>
                  {episode.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {Math.floor(episode.duration / 60)} min
                    </div>
                  )}
                  {episode.speakers && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {episode.speakers} speakers
                    </div>
                  )}
                  {episode.status === 'published' && (
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {episode.playCount} plays
                    </div>
                  )}
                </div>

                {/* Topics */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {episode.topics.map(topic => (
                    <span
                      key={topic}
                      className="px-2 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: 'rgba(0, 212, 228, 0.2)',
                        color: '#00D4E4'
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {episode.status === 'published' && episode.audioUrl && (
                  <button
                    onClick={() => {
                      if (onPlayEpisode) {
                        onPlayEpisode({
                          id: episode.id,
                          title: episode.title,
                          showName: show.title,
                          artwork: episode.artwork || show.artwork,
                          audioUrl: episode.audioUrl,
                          duration: episode.duration
                        });
                      }
                    }}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'rgba(0, 212, 228, 0.2)', color: '#00D4E4' }}
                  >
                    <Play className="w-5 h-5" />
                  </button>
                )}
                <button
                  className="p-2 rounded-lg transition-colors"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF' }}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Empty State */}
      {episodes.length === 0 && (
        <GlassCard className="p-12 text-center">
          <h3 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
            No Episodes Yet
          </h3>
          <p className="mb-6" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Create your first episode for this show
          </p>
          <button
            onClick={onNewEpisode}
            className="px-6 py-3 rounded-xl font-medium"
            style={{
              background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
              color: '#FFFFFF'
            }}
          >
            Create Episode
          </button>
        </GlassCard>
      )}
    </div>
  );
};

export default AIShowManager;
