import React from 'react';
import { Clock, DollarSign, FileAudio, Zap } from 'lucide-react';

interface EstimationPanelProps {
  wordCount: number;
  estimatedDuration: string;
  estimatedCost: string;
  voiceName: string;
  quality: 'standard' | 'premium' | 'ultra';
  onGenerate: () => void;
  isGenerating: boolean;
}

const EstimationPanel: React.FC<EstimationPanelProps> = ({
  wordCount,
  estimatedDuration,
  estimatedCost,
  voiceName,
  quality,
  onGenerate,
  isGenerating
}) => {
  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'ultra':
        return {
          label: 'Ultra HD',
          color: '#00D4E4',
          bg: 'rgba(0, 212, 228, 0.2)',
          border: 'rgba(0, 212, 228, 0.5)'
        };
      case 'premium':
        return {
          label: 'Premium',
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.2)',
          border: 'rgba(16, 185, 129, 0.5)'
        };
      default:
        return {
          label: 'Standard',
          color: '#6B7280',
          bg: 'rgba(107, 114, 128, 0.2)',
          border: 'rgba(107, 114, 128, 0.5)'
        };
    }
  };

  const qualityBadge = getQualityBadge(quality);

  return (
    <div className="relative rounded-2xl border border-[#00D4E4]/30 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl overflow-hidden">
      {/* Glowing Top Border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00D4E4] to-transparent opacity-60" />

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Generation Preview</h3>
            <p className="text-sm text-gray-400">Review estimated details before generating</p>
          </div>
          <div
            className="px-3 py-1 rounded-full text-xs font-semibold border"
            style={{
              color: qualityBadge.color,
              backgroundColor: qualityBadge.bg,
              borderColor: qualityBadge.border
            }}
          >
            {qualityBadge.label}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Duration */}
          <div className="p-4 rounded-xl bg-black/30 border border-gray-700/50 hover:border-[#00D4E4]/30 transition-all duration-300">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#00D4E4]/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#00D4E4]" />
              </div>
              <span className="text-xs text-gray-400 font-medium">Duration</span>
            </div>
            <p className="text-2xl font-bold text-white">{estimatedDuration}</p>
            <p className="text-xs text-gray-500 mt-1">{wordCount} words</p>
          </div>

          {/* Cost */}
          <div className="p-4 rounded-xl bg-black/30 border border-gray-700/50 hover:border-[#00D4E4]/30 transition-all duration-300">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-400" />
              </div>
              <span className="text-xs text-gray-400 font-medium">Est. Cost</span>
            </div>
            <p className="text-2xl font-bold text-white">{estimatedCost}</p>
            <p className="text-xs text-gray-500 mt-1">Cartesia API</p>
          </div>
        </div>

        {/* Voice Info */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#00D4E4]/10 to-transparent border border-[#00D4E4]/20 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#00D4E4]/30 flex items-center justify-center border border-[#00D4E4]/50">
              <FileAudio className="w-5 h-5 text-[#00D4E4]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{voiceName}</p>
              <p className="text-xs text-gray-400">Neural TTS Voice</p>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full py-4 rounded-xl font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
          style={{
            backgroundColor: isGenerating ? 'rgba(0, 212, 228, 0.3)' : '#00D4E4',
            color: '#FFFFFF',
            boxShadow: isGenerating ? 'none' : '0 4px 20px rgba(0, 212, 228, 0.4)'
          }}
        >
          {/* Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

          <div className="relative flex items-center justify-center space-x-2">
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Podcast...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Generate Podcast</span>
              </>
            )}
          </div>
        </button>

        {/* Fine Print */}
        <p className="text-xs text-center text-gray-500 mt-4">
          Generation typically takes 30-60 seconds
        </p>
      </div>

      {/* Bottom Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#00D4E4]/10 to-transparent pointer-events-none" />
    </div>
  );
};

export default EstimationPanel;
