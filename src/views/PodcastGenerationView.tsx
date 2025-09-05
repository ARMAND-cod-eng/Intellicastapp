import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Music, Sparkles, Play, Pause } from 'lucide-react';
import { voices, narrationTypes, podcastStyles, backgroundMusic, contentSources } from '../data/mockPodcastData';
import type { Voice, NarrationType, PodcastStyle, BackgroundMusic, ContentSource, PodcastConfiguration } from '../types/podcast';

interface PodcastGenerationViewProps {
  uploadedContent?: any;
}

export const PodcastGenerationView: React.FC<PodcastGenerationViewProps> = ({ uploadedContent }) => {
  const [configuration, setConfiguration] = useState<PodcastConfiguration>({
    useBackgroundMusic: false,
    customSettings: {
      speed: 1.0,
      pitch: 1.0,
      volume: 0.8
    }
  });
  const [showStyleConfig, setShowStyleConfig] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const canGenerate = configuration.contentSource && configuration.style && configuration.voice && configuration.narrationType;

  const handleContentSourceSelect = (source: ContentSource) => {
    setConfiguration(prev => ({ ...prev, contentSource: { ...source, status: 'success' } }));
  };

  const handleStyleSelect = (style: PodcastStyle) => {
    setConfiguration(prev => ({ ...prev, style }));
    setShowStyleConfig(true);
  };

  const handleVoiceSelect = (voice: Voice) => {
    setConfiguration(prev => ({ ...prev, voice }));
    setShowVoiceDropdown(false);
  };

  const handleNarrationTypeSelect = (type: NarrationType) => {
    setConfiguration(prev => ({ ...prev, narrationType: type }));
  };

  const handleBackgroundMusicSelect = (music: BackgroundMusic) => {
    setConfiguration(prev => ({ ...prev, backgroundMusic: music }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate generation process
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Create Your Podcast</h1>
          <p className="text-gray-300 text-lg">Transform your content into an engaging audio experience</p>
        </div>

        {/* Step 1: Content Source Selection */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
            Select Content Source
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {contentSources.map((source) => (
              <motion.div
                key={source.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-6 rounded-2xl border border-white/20 backdrop-blur-xl cursor-pointer transition-all ${
                  configuration.contentSource?.id === source.id
                    ? 'bg-white/20 ring-2 ring-green-500'
                    : 'bg-white/10 hover:bg-white/15'
                }`}
                onClick={() => handleContentSourceSelect(source)}
              >
                {/* Show checkmark only for Upload Document when content is uploaded */}
                {source.id === 'document-upload' && uploadedContent && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${source.color} flex items-center justify-center text-2xl mb-4`}>
                  {source.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{source.name}</h3>
                <p className="text-gray-300 text-sm">{source.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Step 2: Style Selection */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
            Choose Podcast Style
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {podcastStyles.map((style) => (
              <motion.div
                key={style.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-6 rounded-2xl border border-white/20 backdrop-blur-xl cursor-pointer transition-all ${
                  configuration.style?.id === style.id
                    ? 'bg-white/20 ring-2 ring-blue-500'
                    : 'bg-white/10 hover:bg-white/15'
                } ${style.recommended ? 'ring-2 ring-yellow-400' : ''}`}
                onClick={() => handleStyleSelect(style)}
              >
                {style.recommended && (
                  <div className="absolute -top-2 -left-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-semibold">
                    Recommended
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${style.color} flex items-center justify-center text-2xl mb-4`}>
                  {style.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{style.name}</h3>
                <p className="text-gray-300 text-sm mb-3">{style.description}</p>
                <div className="space-y-1">
                  {style.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-gray-400">
                      <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Configuration Window */}
        <AnimatePresence>
          {showStyleConfig && configuration.style && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Configure Your Podcast</h3>
                <button
                  onClick={() => setShowStyleConfig(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Voice Selection */}
              <div className="space-y-3">
                <label className="text-white font-medium">Voice Selection</label>
                <div className="relative">
                  <button
                    onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-left text-white flex items-center justify-between hover:bg-white/15 transition-colors"
                  >
                    {configuration.voice ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                          {configuration.voice.name[0]}
                        </div>
                        <div>
                          <div className="font-medium">{configuration.voice.name}</div>
                          <div className="text-sm text-gray-300">{configuration.voice.accent} • {configuration.voice.style}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Select a voice</span>
                    )}
                    <ChevronDown size={20} />
                  </button>

                  <AnimatePresence>
                    {showVoiceDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden z-50 max-h-60 overflow-y-auto"
                      >
                        {voices.map((voice) => (
                          <button
                            key={voice.id}
                            onClick={() => handleVoiceSelect(voice)}
                            className="w-full p-4 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                                {voice.name[0]}
                              </div>
                              <div>
                                <div className="font-medium text-white">{voice.name}</div>
                                <div className="text-sm text-gray-300">{voice.accent} • {voice.style}</div>
                                <div className="text-xs text-gray-400">{voice.description}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Narration Type */}
              <div className="space-y-3">
                <label className="text-white font-medium">Narration Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {narrationTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleNarrationTypeSelect(type)}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        configuration.narrationType?.id === type.id
                          ? 'bg-blue-500/20 border-blue-500 text-white'
                          : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{type.icon}</span>
                        <div>
                          <div className="font-medium">{type.name}</div>
                          {type.duration && (
                            <div className="text-xs text-gray-400">{type.duration}</div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Music */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-white font-medium">Background Music</label>
                  <button
                    onClick={() => setConfiguration(prev => ({ ...prev, useBackgroundMusic: !prev.useBackgroundMusic }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      configuration.useBackgroundMusic ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      configuration.useBackgroundMusic ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                {configuration.useBackgroundMusic && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {backgroundMusic.map((music) => (
                      <button
                        key={music.id}
                        onClick={() => handleBackgroundMusicSelect(music)}
                        className={`p-3 rounded-xl border transition-all text-left ${
                          configuration.backgroundMusic?.id === music.id
                            ? 'bg-purple-500/20 border-purple-500 text-white'
                            : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Music size={16} />
                          <div className="font-medium text-sm">{music.name}</div>
                        </div>
                        <div className="text-xs text-gray-400">{music.genre} • {music.mood}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate Button */}
        <div className="flex justify-center">
          <motion.button
            whileHover={canGenerate ? { scale: 1.05 } : {}}
            whileTap={canGenerate ? { scale: 0.95 } : {}}
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className={`px-8 py-4 rounded-2xl font-semibold text-lg flex items-center gap-3 transition-all ${
              canGenerate && !isGenerating
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/25'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Sparkles size={20} />
            {isGenerating ? 'Generating Podcast...' : 'Generate Podcast'}
          </motion.button>
        </div>

        {/* Audio Visualizer */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex justify-center"
            >
              <div className="relative w-32 h-32">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-32 h-32 rounded-full border-4 border-blue-500/30 border-t-blue-500"
                />
                <div className="absolute inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Sparkles size={32} className="text-white" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};