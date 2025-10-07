/**
 * Script Preview Modal - Script preview and editing modal
 */

import React, { useState } from 'react';
import { X, Edit3, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ScriptPreviewData } from './types';

interface ScriptPreviewModalProps {
  scriptPreview: ScriptPreviewData;
  onClose: () => void;
  onGenerate: (editedScript: string) => void;
}

const ScriptPreviewModal: React.FC<ScriptPreviewModalProps> = ({
  scriptPreview,
  onClose,
  onGenerate
}) => {
  const [editedScript, setEditedScript] = useState(scriptPreview.script);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Edit3 size={20} className="text-[#00D4E4]" />
            Script Preview & Edit
          </h3>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close Script Preview"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Word Count</div>
            <div className="text-lg font-bold text-white">{scriptPreview.wordCount}</div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Duration</div>
            <div className="text-lg font-bold text-white">
              {Math.floor(scriptPreview.estimatedDuration / 60)}:{(scriptPreview.estimatedDuration % 60).toString().padStart(2, '0')}
            </div>
          </div>
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Status</div>
            <div className="text-lg font-bold text-green-400">Ready</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mb-4">
          <textarea
            value={editedScript}
            onChange={(e) => setEditedScript(e.target.value)}
            className="w-full h-full min-h-[300px] bg-gray-800/30 border border-gray-600 rounded-lg p-4 text-white text-sm resize-none focus:border-[#00D4E4] focus:outline-none"
            placeholder="Edit your script here..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onGenerate(editedScript)}
            className="flex-1 px-4 py-3 bg-[#00D4E4] hover:bg-[#00E8FA] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Play size={18} />
            Generate Podcast
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ScriptPreviewModal;
