/**
 * Queue Item - Individual queue item component
 */

import React from 'react';
import { Trash2, Play } from 'lucide-react';
import type { QueueItem as QueueItemType } from '../../../services/contentDiscoveryStorage';

interface QueueItemProps {
  item: QueueItemType;
  onRemove: (id: string) => void;
  onPlay?: (item: QueueItemType) => void;
}

const QueueItem = React.memo<QueueItemProps>(({ item, onRemove, onPlay }) => {
  const getStatusColor = (status: QueueItemType['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 border-green-500/30';
      case 'failed':
        return 'bg-red-500/10 border-red-500/30';
      case 'processing':
        return 'bg-blue-500/10 border-blue-500/30';
      default:
        return 'bg-gray-800/50 border-gray-700';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor(item.status)}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white mb-1">{item.topicTitle}</h4>
          <div className="text-xs text-gray-400 capitalize">{item.status}</div>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="p-2.5 hover:bg-gray-700 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Remove from queue"
        >
          <Trash2 size={16} className="text-gray-400" />
        </button>
      </div>

      {item.status === 'processing' && (
        <div className="mt-2">
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-[#00D4E4] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">{item.progress}%</div>
        </div>
      )}

      {item.status === 'failed' && item.error && (
        <div className="mt-2 text-xs text-red-400">{item.error}</div>
      )}

      {item.status === 'completed' && item.result && onPlay && (
        <button
          onClick={() => onPlay(item)}
          className="mt-2 w-full px-3 py-2 bg-[#00D4E4]/20 border border-[#00D4E4]/30 text-[#00D4E4] rounded-lg text-xs font-medium hover:bg-[#00D4E4]/30 transition-all flex items-center justify-center gap-2"
        >
          <Play size={14} />
          Play Podcast
        </button>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.status === nextProps.item.status &&
    prevProps.item.progress === nextProps.item.progress &&
    prevProps.item.error === nextProps.item.error &&
    prevProps.onRemove === nextProps.onRemove &&
    prevProps.onPlay === nextProps.onPlay
  );
});

QueueItem.displayName = 'QueueItem';

export default QueueItem;
