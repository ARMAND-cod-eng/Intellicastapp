/**
 * Estimation Modal - Cost and time estimation display
 */

import React from 'react';
import { X, BarChart3, Play, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { EstimationData } from './types';

interface EstimationModalProps {
  estimationData: EstimationData;
  onClose: () => void;
  onProceed: () => void;
}

const EstimationModal: React.FC<EstimationModalProps> = ({
  estimationData,
  onClose,
  onProceed
}) => {
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
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-[#00D4E4]" />
            Cost & Time Estimation
          </h3>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close Estimation"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-4 rounded-lg border border-blue-500/30">
              <div className="text-sm text-gray-400 mb-1">Topics Selected</div>
              <div className="text-2xl font-bold text-white">{estimationData.topicCount}</div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-4 rounded-lg border border-green-500/30">
              <div className="text-sm text-gray-400 mb-1">Est. Duration</div>
              <div className="text-2xl font-bold text-white">{estimationData.estimated_duration || '8-10 min'}</div>
            </div>
          </div>

          <div className="bg-gray-800/50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">LLM Cost (Script Generation)</span>
              <span className="text-white font-semibold">${estimationData.llm_cost?.toFixed(4) || '0.0050'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">TTS Cost (Voice Synthesis)</span>
              <span className="text-white font-semibold">${estimationData.tts_cost?.toFixed(4) || '0.0120'}</span>
            </div>
            <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
              <span className="text-white font-bold">Total Estimated Cost</span>
              <span className="text-[#00D4E4] font-bold text-xl">${estimationData.total_cost?.toFixed(4) || '0.0170'}</span>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Zap size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-300">
                This is an estimate. Actual costs may vary based on content length and voice selection. Processing time: ~{estimationData.topicCount * 2}-{estimationData.topicCount * 3} minutes.
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={onProceed}
            className="flex-1 px-4 py-3 bg-[#00D4E4] hover:bg-[#00E8FA] text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Play size={18} />
            Proceed to Queue
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EstimationModal;
