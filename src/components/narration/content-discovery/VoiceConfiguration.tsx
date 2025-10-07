/**
 * Voice Configuration - Host/guest voice selection panel
 */

import React from 'react';
import { Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../ui/GlassCard';
import VoicePreview from '../../voice/VoicePreview';
import type { VoiceOption } from './types';

interface VoiceConfigurationProps {
  voices: VoiceOption[];
  selectedHostVoice: string;
  selectedGuestVoice: string;
  voiceSpeed: number;
  showConfig: boolean;
  onHostVoiceChange: (voiceId: string) => void;
  onGuestVoiceChange: (voiceId: string) => void;
  onVoiceSpeedChange: (speed: number) => void;
  onToggleConfig: () => void;
}

const VoiceConfiguration: React.FC<VoiceConfigurationProps> = ({
  voices,
  selectedHostVoice,
  selectedGuestVoice,
  voiceSpeed,
  showConfig,
  onHostVoiceChange,
  onGuestVoiceChange,
  onVoiceSpeedChange,
  onToggleConfig
}) => {
  const getVoiceInfo = (voiceId: string) => voices.find(v => v.id === voiceId);

  return (
    <GlassCard variant="medium" className="p-6" glow>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-white">
          <Mic size={20} />
          Voice Configuration
        </h2>
        <button
          onClick={onToggleConfig}
          className="text-sm text-[#00D4E4] hover:text-[#00E8FA] transition-colors"
        >
          {showConfig ? 'Hide' : 'Show'}
        </button>
      </div>

      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            {/* Host Voice */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Host Voice</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={selectedHostVoice}
                  onChange={(e) => onHostVoiceChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white focus:border-[#00D4E4] focus:outline-none transition-colors"
                >
                  {voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.desc}
                    </option>
                  ))}
                </select>
                <VoicePreview
                  voiceId={selectedHostVoice}
                  voiceName={getVoiceInfo(selectedHostVoice)?.name || 'Host'}
                  voiceDescription={getVoiceInfo(selectedHostVoice)?.desc || ''}
                  speed={voiceSpeed}
                />
              </div>
            </div>

            {/* Guest Voice */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Guest Voice</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={selectedGuestVoice}
                  onChange={(e) => onGuestVoiceChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600 text-white focus:border-[#00D4E4] focus:outline-none transition-colors"
                >
                  {voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.desc}
                    </option>
                  ))}
                </select>
                <VoicePreview
                  voiceId={selectedGuestVoice}
                  voiceName={getVoiceInfo(selectedGuestVoice)?.name || 'Guest'}
                  voiceDescription={getVoiceInfo(selectedGuestVoice)?.desc || ''}
                  speed={voiceSpeed}
                />
              </div>
            </div>

            {/* Voice Speed */}
            <div>
              <label className="text-sm font-medium block mb-2 text-white">
                Voice Speed: {voiceSpeed.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voiceSpeed}
                onChange={(e) => onVoiceSpeedChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#00D4E4]"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Slower (0.5x)</span>
                <span>Normal (1.0x)</span>
                <span>Faster (2.0x)</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};

export default VoiceConfiguration;
