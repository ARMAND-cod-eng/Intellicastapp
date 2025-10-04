import React, { useState, createContext, useContext } from 'react';
import { Mic2, Sparkles, Radio, Heart, Search, BarChart3, ListMusic, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import PodcasterChoice from './PodcasterChoice';
import BrowsePodcasts from './BrowsePodcasts';
import ForYouFeed from './ForYouFeed';
import LibraryView from './LibraryView';
import ShowDetailView from './ShowDetailView';
import TopicDetailView from './TopicDetailView';
import SearchView from './SearchView';
import ListeningStatsView from './stats/ListeningStatsView';
import QueuePanel from './playback/QueuePanel';
import MiniPlayer from './player/MiniPlayer';
import CreatorDashboard from './creator/CreatorDashboard';

interface PodcastViewProps {
  // Future props for integration
}

type Tab = 'for-you' | 'ai-studio' | 'browse' | 'library' | 'search';

// Context for passing episode player to child components
interface PodcastViewContextType {
  setCurrentEpisode: (episode: any) => void;
  setSelectedShow: (showId: string | null) => void;
  setSelectedTopic: (topicId: string | null) => void;
}

const PodcastViewContext = createContext<PodcastViewContextType | undefined>(undefined);

const PodcastView: React.FC<PodcastViewProps> = () => {
  const [activeTab, setActiveTab] = useState<Tab>('ai-studio');
  const [currentEpisode, setCurrentEpisode] = useState<any>(null);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showCreatorDashboard, setShowCreatorDashboard] = useState(false);

  const tabs = [
    { id: 'for-you' as Tab, label: 'For You', icon: Heart },
    { id: 'ai-studio' as Tab, label: 'AI Studio', icon: Sparkles },
    { id: 'browse' as Tab, label: 'Browse', icon: Radio },
    { id: 'search' as Tab, label: 'Search', icon: Search },
    { id: 'library' as Tab, label: 'Library', icon: Mic2 },
  ];

  return (
    <PodcastViewContext.Provider value={{ setCurrentEpisode, setSelectedShow: setSelectedShowId, setSelectedTopic: setSelectedTopicId }}>
      {/* Creator Dashboard View */}
      {showCreatorDashboard ? (
        <div className="h-full flex flex-col" style={{ backgroundColor: '#000000' }}>
          <div className="px-8 pt-6 pb-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <button
              onClick={() => setShowCreatorDashboard(false)}
              className="px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#FFFFFF'
              }}
            >
              ← Back to Podcasts
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <CreatorDashboard showId="my_show" />
          </div>
        </div>
      ) : showStats ? (
        <div className="h-full flex flex-col" style={{ backgroundColor: '#000000' }}>
          <div className="px-8 pt-6 pb-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <button
              onClick={() => setShowStats(false)}
              className="px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#FFFFFF'
              }}
            >
              ← Back to Podcasts
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ListeningStatsView onShowClick={(showId) => {
              setSelectedShowId(showId);
              setShowStats(false);
            }} />
          </div>
        </div>
      ) : selectedTopicId ? (
        <TopicDetailView
          topicId={selectedTopicId}
          onBack={() => setSelectedTopicId(null)}
          onShowClick={(showId) => {
            setSelectedShowId(showId);
            setSelectedTopicId(null);
          }}
          onPlayEpisode={setCurrentEpisode}
        />
      ) : selectedShowId ? (
        <ShowDetailView
          showId={selectedShowId}
          onBack={() => setSelectedShowId(null)}
          onPlayEpisode={setCurrentEpisode}
        />
      ) : (
      <div className="h-full flex flex-col" style={{ backgroundColor: '#000000' }}>
        {/* Header */}
        <div className="px-8 pt-6 pb-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#FFFFFF' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                   style={{ backgroundColor: '#00D4E4', boxShadow: '0 0 20px rgba(0, 212, 228, 0.4)' }}>
                <Mic2 className="w-5 h-5 text-white" />
              </div>
              Podcasts
            </h1>

            <div className="flex gap-2">
              <button
                onClick={() => setShowQueue(true)}
                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all"
                style={{
                  backgroundColor: 'rgba(0, 212, 228, 0.15)',
                  color: '#00D4E4',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#00D4E4'
                }}
              >
                <ListMusic className="w-4 h-4" />
                Queue
              </button>

              <button
                onClick={() => setShowStats(true)}
                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all"
                style={{
                  backgroundColor: 'rgba(0, 212, 228, 0.15)',
                  color: '#00D4E4',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#00D4E4'
                }}
              >
                <BarChart3 className="w-4 h-4" />
                Your Stats
              </button>

              <button
                onClick={() => setShowCreatorDashboard(true)}
                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all"
                style={{
                  backgroundColor: 'rgba(0, 212, 228, 0.15)',
                  color: '#00D4E4',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#00D4E4'
                }}
              >
                <Briefcase className="w-4 h-4" />
                Creator Studio
              </button>
            </div>
          </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2"
                style={{
                  backgroundColor: isActive ? 'rgba(0, 212, 228, 0.15)' : 'transparent',
                  color: isActive ? '#00D4E4' : 'rgba(255, 255, 255, 0.6)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: isActive ? '#00D4E4' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  }
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}

                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: '#00D4E4' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {activeTab === 'for-you' && <ForYouTab />}
            {activeTab === 'ai-studio' && <AIStudioTab />}
            {activeTab === 'browse' && <BrowseTab />}
            {activeTab === 'search' && <SearchTab />}
            {activeTab === 'library' && <LibraryTab />}
          </motion.div>
        </AnimatePresence>
      </div>

        {/* Mini Player (Bottom Sticky) */}
        {currentEpisode && (
          <MiniPlayer
            episode={currentEpisode}
            onClose={() => setCurrentEpisode(null)}
          />
        )}
      </div>
      )}

      {/* Mini Player (always available, even in detail view) */}
      {selectedShowId && currentEpisode && (
        <MiniPlayer
          episode={currentEpisode}
          onClose={() => setCurrentEpisode(null)}
        />
      )}

      {/* Queue Panel */}
      {showQueue && (
        <QueuePanel
          onPlayEpisode={setCurrentEpisode}
          onClose={() => setShowQueue(false)}
        />
      )}
    </PodcastViewContext.Provider>
  );
};

// Placeholder Tab Components (to be implemented)

const ForYouTab: React.FC = () => {
  const podcastView = useContext(PodcastViewContext);

  return (
    <div className="p-8">
      <ForYouFeed
        onPlayEpisode={podcastView?.setCurrentEpisode}
        onShowClick={(showId) => podcastView?.setSelectedShow(showId)}
      />
    </div>
  );
};

const AIStudioTab: React.FC = () => {
  // Get the current episode setter from parent
  const podcastView = useContext(PodcastViewContext);

  return (
    <div className="p-8">
      <PodcasterChoice onPlayEpisode={podcastView?.setCurrentEpisode} />
    </div>
  );
};

const BrowseTab: React.FC = () => {
  const podcastView = useContext(PodcastViewContext);

  return (
    <div className="p-8">
      <BrowsePodcasts
        onPlayEpisode={podcastView?.setCurrentEpisode}
        onShowClick={(showId) => podcastView?.setSelectedShow(showId)}
        onTopicClick={(topicId) => podcastView?.setSelectedTopic(topicId)}
      />
    </div>
  );
};

const LibraryTab: React.FC = () => {
  const podcastView = useContext(PodcastViewContext);

  return (
    <LibraryView
      onPlayEpisode={podcastView?.setCurrentEpisode}
      onShowClick={(showId) => podcastView?.setSelectedShow(showId)}
    />
  );
};

const SearchTab: React.FC = () => {
  const podcastView = useContext(PodcastViewContext);

  return (
    <SearchView
      onPlayEpisode={podcastView?.setCurrentEpisode}
      onShowClick={(showId) => podcastView?.setSelectedShow(showId)}
    />
  );
};

export default PodcastView;
