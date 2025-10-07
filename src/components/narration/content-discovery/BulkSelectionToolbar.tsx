/**
 * Bulk Selection Toolbar - Select all/clear buttons
 */

import React from 'react';
import { motion } from 'framer-motion';

interface BulkSelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

const BulkSelectionToolbar: React.FC<BulkSelectionToolbarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection
}) => {
  if (totalCount === 0) return null;

  return (
    <div className="mb-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            onClick={onSelectAll}
            className="px-3 py-1.5 bg-[#00D4E4]/20 hover:bg-[#00D4E4]/30 text-[#00D4E4] rounded-md text-sm font-medium border border-[#00D4E4]/30 focus:outline-none focus:ring-2 focus:ring-[#00D4E4] focus:ring-offset-2 focus:ring-offset-black"
            aria-label="Select all visible topics"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            Select All Visible
          </motion.button>
          <motion.button
            onClick={onClearSelection}
            disabled={selectedCount === 0}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black ${
              selectedCount === 0
                ? 'bg-gray-700/50 text-gray-500 border-gray-600 cursor-not-allowed'
                : 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-600/30 focus:ring-red-500'
            }`}
            aria-label="Clear all selections"
            whileHover={selectedCount > 0 ? { scale: 1.05 } : {}}
            whileTap={selectedCount > 0 ? { scale: 0.95 } : {}}
            transition={{ duration: 0.15 }}
          >
            Clear Selection
          </motion.button>
        </div>
        <div className="text-sm font-medium text-gray-400">
          <span className="text-[#00D4E4]">{selectedCount}</span> of {totalCount} selected
        </div>
      </div>
    </div>
  );
};

export default BulkSelectionToolbar;
