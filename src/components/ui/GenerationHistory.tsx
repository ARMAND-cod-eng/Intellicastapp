import React from 'react';
import { Play, Download, Trash2, Clock, FileAudio, History } from 'lucide-react';
import type { HistoryItem } from '../../types/narration';
import EmptyState from './EmptyState';

interface GenerationHistoryProps {
  history: HistoryItem[];
  onPlay: (item: HistoryItem) => void;
  onDownload: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}

const GenerationHistory: React.FC<GenerationHistoryProps> = ({
  history,
  onPlay,
  onDownload,
  onDelete
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (history.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <EmptyState
          icon={History}
          title="No podcast history yet"
          description="Your generated podcasts will appear here. Start creating to build your podcast library!"
          iconColor="text-[#00D4E4]"
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="space-y-3 p-4">
        {history.map((item) => (
          <div
            key={item.id}
            className="group relative p-4 rounded-xl border bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-[#00D4E4]/50 transition-all duration-300"
          >
            {/* Content */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-3">
                <h4 className="text-sm font-semibold text-white truncate mb-1">
                  {item.title}
                </h4>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span className="px-2 py-0.5 rounded bg-[#00D4E4]/20 text-[#00D4E4] border border-[#00D4E4]/30">
                    {item.presetName}
                  </span>
                  <span>•</span>
                  <span>{item.voiceName}</span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{item.duration}</span>
                </div>
                <span>•</span>
                <span>{formatDate(item.createdAt)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPlay(item)}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg bg-[#00D4E4] hover:bg-[#00E8FA] text-white transition-colors text-xs font-medium"
              >
                <Play className="w-3 h-3" />
                <span>Play</span>
              </button>
              <button
                onClick={() => onDownload(item)}
                className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                title="Download"
              >
                <Download className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="px-3 py-2 rounded-lg bg-red-900/50 hover:bg-red-900 text-red-400 hover:text-white transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                 style={{
                   boxShadow: 'inset 0 0 20px rgba(0, 212, 228, 0.1)'
                 }}
            />
          </div>
        ))}
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 212, 228, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 212, 228, 0.7);
        }
      `}</style>
    </div>
  );
};

export default GenerationHistory;
