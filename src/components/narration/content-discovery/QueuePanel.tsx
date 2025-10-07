/**
 * Queue Panel - Queue management sidebar panel
 */

import React, { useRef } from 'react';
import { X, List, Play, Loader2, Download, Upload, FileDown, ListChecks } from 'lucide-react';
import { motion } from 'framer-motion';
import QueueItem from './QueueItem';
import EmptyState from '../../ui/EmptyState';
import type { QueueItem as QueueItemType } from '../../../services/contentDiscoveryStorage';

interface QueuePanelProps {
  queue: QueueItemType[];
  isProcessing: boolean;
  onClose: () => void;
  onProcessQueue: () => void;
  onRemoveItem: (id: string) => void;
  onPlayItem?: (item: QueueItemType) => void;
  onClearCompleted: () => void;
  onExportQueue: (filter?: 'all' | 'pending' | 'completed') => void;
  onImportQueue: (file: File) => void;
}

const QueuePanel: React.FC<QueuePanelProps> = ({
  queue,
  isProcessing,
  onClose,
  onProcessQueue,
  onRemoveItem,
  onPlayItem,
  onClearCompleted,
  onExportQueue,
  onImportQueue
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCount = queue.filter(i => i.status === 'pending').length;
  const completedOrFailedCount = queue.filter(i => i.status === 'completed' || i.status === 'failed').length;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportQueue(file);
      event.target.value = ''; // Reset input
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-[60] flex flex-col"
    >
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <List size={20} className="text-[#00D4E4]" />
            Generation Queue
          </h3>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close Queue"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <button
          onClick={onProcessQueue}
          disabled={isProcessing || pendingCount === 0}
          className={`w-full px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all mb-3 ${
            isProcessing || pendingCount === 0
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-[#00D4E4] hover:bg-[#00E8FA] text-white'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Processing...
            </>
          ) : (
            <>
              <Play size={18} />
              Process Queue ({pendingCount})
            </>
          )}
        </button>

        {/* Export/Import Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onExportQueue('all')}
            disabled={queue.length === 0}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              queue.length === 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            aria-label="Export queue"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={handleImportClick}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all bg-gray-700 hover:bg-gray-600 text-white"
            aria-label="Import queue"
          >
            <Upload size={16} />
            Import
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Select queue file to import"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {queue.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Your queue is empty"
            description="Add topics to your queue to generate podcasts in batch. Select topics and click 'Add to Queue' to get started."
            iconColor="text-[#00D4E4]"
            actionButton={{
              label: "Browse Topics",
              onClick: onClose
            }}
          />
        ) : (
          queue.map((item) => (
            <QueueItem
              key={item.id}
              item={item}
              onRemove={onRemoveItem}
              onPlay={onPlayItem}
            />
          ))
        )}
      </div>

      {(completedOrFailedCount > 0 || queue.length > 0) && (
        <div className="p-4 border-t border-gray-800 space-y-2">
          {completedOrFailedCount > 0 && (
            <button
              onClick={onClearCompleted}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              Clear Completed
            </button>
          )}
          {queue.length > 0 && (
            <div className="text-xs text-gray-500 text-center">
              {queue.length} item{queue.length > 1 ? 's' : ''} in queue
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default QueuePanel;
