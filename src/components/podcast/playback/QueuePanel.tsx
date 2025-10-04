import React, { useState, useEffect } from 'react';
import { ListMusic, Play, X, GripVertical, Clock, Download, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../ui/GlassCard';
import {
  QueueService,
  PlayLaterService,
  DownloadService,
  type QueueItem,
} from '../../../services/playbackService';

interface QueuePanelProps {
  onPlayEpisode?: (episode: any) => void;
  onClose: () => void;
}

const QueuePanel: React.FC<QueuePanelProps> = ({ onPlayEpisode, onClose }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [playLater, setPlayLater] = useState<QueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'playLater'>('queue');

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = () => {
    setQueue(QueueService.getQueue());
    setPlayLater(PlayLaterService.getPlayLater());
  };

  const handlePlayNext = (item: QueueItem) => {
    if (onPlayEpisode) {
      onPlayEpisode({
        id: item.episodeId,
        title: item.title,
        showName: item.showName,
        showId: item.showId,
        artwork: item.artwork,
        audioUrl: item.audioUrl,
        duration: item.duration,
      });
    }
    QueueService.removeFromQueue(item.id);
    loadQueue();
  };

  const handleRemoveFromQueue = (itemId: string) => {
    QueueService.removeFromQueue(itemId);
    loadQueue();
  };

  const handleMoveToTop = (itemId: string) => {
    QueueService.moveToTop(itemId);
    loadQueue();
  };

  const handleClearQueue = () => {
    if (confirm('Clear entire queue?')) {
      QueueService.clearQueue();
      loadQueue();
    }
  };

  const handleRemoveFromPlayLater = (itemId: string) => {
    PlayLaterService.removeFromPlayLater(itemId);
    loadQueue();
  };

  const handleMoveToQueue = (itemId: string) => {
    PlayLaterService.moveToQueue(itemId);
    loadQueue();
  };

  const handleDownload = (item: QueueItem) => {
    DownloadService.startDownload({
      episodeId: item.episodeId,
      showId: item.showId,
      title: item.title,
      showName: item.showName,
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        <GlassCard className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ListMusic className="w-6 h-6" style={{ color: '#00D4E4' }} />
                <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                  Queue Manager
                </h2>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-all hover:bg-white/10"
                style={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('queue')}
                className="px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: activeTab === 'queue' ? 'rgba(0, 212, 228, 0.2)' : 'transparent',
                  color: activeTab === 'queue' ? '#00D4E4' : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                Up Next ({queue.length})
              </button>
              <button
                onClick={() => setActiveTab('playLater')}
                className="px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: activeTab === 'playLater' ? 'rgba(0, 212, 228, 0.2)' : 'transparent',
                  color: activeTab === 'playLater' ? '#00D4E4' : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                Play Later ({playLater.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'queue' ? (
                <motion.div
                  key="queue"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {queue.length === 0 ? (
                    <div className="text-center py-12">
                      <ListMusic className="w-16 h-16 mx-auto mb-4" style={{ color: '#00D4E4', opacity: 0.3 }} />
                      <h3 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                        Queue is empty
                      </h3>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Add episodes to your queue to play them in order
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={handleClearQueue}
                          className="px-3 py-1 rounded-lg text-sm transition-all"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#EF4444',
                          }}
                        >
                          Clear All
                        </button>
                      </div>

                      {queue.map((item, index) => (
                        <QueueItemCard
                          key={item.id}
                          item={item}
                          index={index}
                          onPlay={() => handlePlayNext(item)}
                          onRemove={() => handleRemoveFromQueue(item.id)}
                          onMoveToTop={() => handleMoveToTop(item.id)}
                          onDownload={() => handleDownload(item)}
                          formatDuration={formatDuration}
                        />
                      ))}
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="playLater"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {playLater.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-16 h-16 mx-auto mb-4" style={{ color: '#00D4E4', opacity: 0.3 }} />
                      <h3 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                        No episodes saved
                      </h3>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Save episodes to listen later
                      </p>
                    </div>
                  ) : (
                    playLater.map((item) => (
                      <PlayLaterItemCard
                        key={item.id}
                        item={item}
                        onMoveToQueue={() => handleMoveToQueue(item.id)}
                        onRemove={() => handleRemoveFromPlayLater(item.id)}
                        onDownload={() => handleDownload(item)}
                        formatDuration={formatDuration}
                      />
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

// Queue Item Card
const QueueItemCard: React.FC<{
  item: QueueItem;
  index: number;
  onPlay: () => void;
  onRemove: () => void;
  onMoveToTop: () => void;
  onDownload: () => void;
  formatDuration: (seconds: number) => string;
}> = ({ item, index, onPlay, onRemove, onMoveToTop, onDownload, formatDuration }) => {
  const isDownloaded = DownloadService.isDownloaded(item.episodeId);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
    >
      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: 'rgba(0, 212, 228, 0.2)', color: '#00D4E4' }}
            >
              {index + 1}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm mb-1 line-clamp-1" style={{ color: '#FFFFFF' }}>
              {item.title}
            </h4>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              <span>{item.showName}</span>
              <span>•</span>
              <span>{formatDuration(item.duration)}</span>
              {isDownloaded && (
                <>
                  <span>•</span>
                  <Download className="w-3 h-3" style={{ color: '#10B981' }} />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                onClick={onMoveToTop}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: 'rgba(0, 212, 228, 0.1)',
                  color: '#00D4E4',
                }}
                title="Move to top"
              >
                ↑ Top
              </button>
            )}

            {!isDownloaded && (
              <button
                onClick={onDownload}
                className="p-2 rounded-lg transition-all"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                title="Download"
              >
                <Download className="w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
              </button>
            )}

            <button
              onClick={onPlay}
              className="p-2 rounded-lg transition-all"
              style={{ backgroundColor: 'rgba(0, 212, 228, 0.2)', color: '#00D4E4' }}
              title="Play now"
            >
              <Play className="w-4 h-4" />
            </button>

            <button
              onClick={onRemove}
              className="p-2 rounded-lg transition-all"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// Play Later Item Card
const PlayLaterItemCard: React.FC<{
  item: QueueItem;
  onMoveToQueue: () => void;
  onRemove: () => void;
  onDownload: () => void;
  formatDuration: (seconds: number) => string;
}> = ({ item, onMoveToQueue, onRemove, onDownload, formatDuration }) => {
  const isDownloaded = DownloadService.isDownloaded(item.episodeId);

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm mb-1 line-clamp-1" style={{ color: '#FFFFFF' }}>
            {item.title}
          </h4>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            <span>{item.showName}</span>
            <span>•</span>
            <span>{formatDuration(item.duration)}</span>
            {isDownloaded && (
              <>
                <span>•</span>
                <Download className="w-3 h-3" style={{ color: '#10B981' }} />
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onMoveToQueue}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
              color: '#FFFFFF',
            }}
          >
            Add to Queue
          </button>

          {!isDownloaded && (
            <button
              onClick={onDownload}
              className="p-2 rounded-lg transition-all"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              title="Download"
            >
              <Download className="w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            </button>
          )}

          <button
            onClick={onRemove}
            className="p-2 rounded-lg transition-all"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

export default QueuePanel;
