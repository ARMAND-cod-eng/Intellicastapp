/**
 * Generation Progress Indicator - Inline progress with cancel button
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '../../ui/GlassCard';

interface GenerationProgressIndicatorProps {
  progress: number;
  onCancel: () => void;
}

const GenerationProgressIndicator: React.FC<GenerationProgressIndicatorProps> = ({
  progress,
  onCancel
}) => {
  const getStatusMessage = (progress: number): string => {
    if (progress < 20) return 'Initializing...';
    if (progress < 40) return 'Generating script...';
    if (progress < 70) return 'Synthesizing voices...';
    if (progress < 90) return 'Finalizing audio...';
    return 'Almost done...';
  };

  return (
    <GlassCard variant="medium" className="p-6" role="status" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#00D4E4] animate-spin" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-white">Generating Podcast...</h3>
            <p className="text-xs text-gray-400">
              {getStatusMessage(progress)}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black"
          aria-label="Cancel generation"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Progress</span>
          <span className="font-semibold text-[#00D4E4]">{progress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-purple-600 to-[#00D4E4] h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </GlassCard>
  );
};

export default GenerationProgressIndicator;
