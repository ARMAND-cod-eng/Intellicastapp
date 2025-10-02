import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Music, Sparkles, Play, Pause, Maximize2, Minimize2 } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);

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
    <div className="min-h-screen p-6" style={{background: 'linear-gradient(to bottom, #000000, #14191a)'}}>
      <div className={`mx-auto space-y-8 transition-all duration-500 ${isExpanded ? 'max-w-[95vw]' : 'max-w-6xl'}`}>

        {/* Header */}
        <div className="text-center space-y-4 relative">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute right-0 top-0 p-3 rounded-xl transition-all duration-300"
            style={{
              backgroundColor: 'rgba(0, 212, 228, 0.1)',
              border: '1px solid rgba(0, 212, 228, 0.3)',
              color: '#00D4E4'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.2)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 228, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title={isExpanded ? 'Collapse View' : 'Expand View'}
          >
            {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <h1 className="text-4xl font-bold text-white">Create Your Podcast</h1>
          <p className="text-gray-300 text-lg">Transform your content into an engaging audio experience</p>
        </div>

        {/* Step 1: Content Source Selection */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
            Select Content Source
          </h2>
          <div className={`grid gap-4 transition-all duration-500 ${isExpanded ? 'md:grid-cols-4 lg:grid-cols-5' : 'md:grid-cols-3'}`}>
            {contentSources.map((source) => (
              <motion.div
                key={source.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative p-6 rounded-2xl border backdrop-blur-xl cursor-pointer transition-all"
                style={{
                  backgroundColor: configuration.contentSource?.id === source.id ? 'rgba(0, 212, 228, 0.15)' : '#14191a',
                  borderColor: configuration.contentSource?.id === source.id ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: configuration.contentSource?.id === source.id ? '0 0 20px rgba(0, 212, 228, 0.2)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (configuration.contentSource?.id !== source.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 228, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (configuration.contentSource?.id !== source.id) {
                    e.currentTarget.style.backgroundColor = '#14191a';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
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
          <div className={`grid gap-4 transition-all duration-500 ${isExpanded ? 'md:grid-cols-4 lg:grid-cols-5' : 'md:grid-cols-3'}`}>
            {podcastStyles.map((style) => (
              <motion.div
                key={style.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative p-6 rounded-2xl border backdrop-blur-xl cursor-pointer transition-all"
                style={{
                  backgroundColor: configuration.style?.id === style.id ? 'rgba(0, 212, 228, 0.15)' : '#14191a',
                  borderColor: configuration.style?.id === style.id ? '#00D4E4' : style.recommended ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: configuration.style?.id === style.id ? '0 0 20px rgba(0, 212, 228, 0.2)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (configuration.style?.id !== style.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 228, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (configuration.style?.id !== style.id) {
                    e.currentTarget.style.backgroundColor = '#14191a';
                    e.currentTarget.style.borderColor = style.recommended ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)';
                  }
                }}
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
              className="backdrop-blur-xl rounded-2xl border p-6 space-y-6"
              style={{
                backgroundColor: '#14191a',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
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
                    className="w-full p-4 border rounded-xl text-left text-white flex items-center justify-between transition-colors"
                    style={{
                      backgroundColor: '#14191a',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(0, 212, 228, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#14191a';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    {configuration.voice ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{backgroundColor: '#00D4E4'}}>
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
                        className="absolute top-full left-0 right-0 mt-2 backdrop-blur-xl border rounded-xl overflow-hidden z-50 max-h-60 overflow-y-auto"
                        style={{
                          backgroundColor: '#14191a',
                          borderColor: 'rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        {voices.map((voice) => (
                          <button
                            key={voice.id}
                            onClick={() => handleVoiceSelect(voice)}
                            className="w-full p-4 text-left transition-colors border-b last:border-b-0"
                            style={{
                              borderColor: 'rgba(255, 255, 255, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{backgroundColor: '#00D4E4'}}>
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
                      className="p-4 rounded-xl border transition-all text-left"
                      style={{
                        backgroundColor: configuration.narrationType?.id === type.id ? 'rgba(0, 212, 228, 0.15)' : '#14191a',
                        borderColor: configuration.narrationType?.id === type.id ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
                        color: configuration.narrationType?.id === type.id ? '#00D4E4' : 'rgba(255, 255, 255, 0.7)',
                        boxShadow: configuration.narrationType?.id === type.id ? '0 0 15px rgba(0, 212, 228, 0.2)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (configuration.narrationType?.id !== type.id) {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(0, 212, 228, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (configuration.narrationType?.id !== type.id) {
                          e.currentTarget.style.backgroundColor = '#14191a';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
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
                    className="relative w-12 h-6 rounded-full transition-colors"
                    style={{
                      backgroundColor: configuration.useBackgroundMusic ? '#00D4E4' : 'rgba(255, 255, 255, 0.2)'
                    }}
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
                        className="p-3 rounded-xl border transition-all text-left"
                        style={{
                          backgroundColor: configuration.backgroundMusic?.id === music.id ? 'rgba(0, 212, 228, 0.15)' : '#14191a',
                          borderColor: configuration.backgroundMusic?.id === music.id ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
                          color: configuration.backgroundMusic?.id === music.id ? '#00D4E4' : 'rgba(255, 255, 255, 0.7)',
                          boxShadow: configuration.backgroundMusic?.id === music.id ? '0 0 15px rgba(0, 212, 228, 0.2)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (configuration.backgroundMusic?.id !== music.id) {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(0, 212, 228, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (configuration.backgroundMusic?.id !== music.id) {
                            e.currentTarget.style.backgroundColor = '#14191a';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
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
            className="px-8 py-4 rounded-2xl font-semibold text-lg flex items-center gap-3 transition-all"
            style={{
              backgroundColor: canGenerate && !isGenerating ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
              color: canGenerate && !isGenerating ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
              cursor: canGenerate && !isGenerating ? 'pointer' : 'not-allowed',
              boxShadow: canGenerate && !isGenerating ? '0 0 30px rgba(0, 212, 228, 0.4)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (canGenerate && !isGenerating) {
                e.currentTarget.style.backgroundColor = '#00E8FA';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 212, 228, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              if (canGenerate && !isGenerating) {
                e.currentTarget.style.backgroundColor = '#00D4E4';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 212, 228, 0.4)';
              }
            }}
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
                  className="w-32 h-32 rounded-full border-4"
                  style={{
                    borderColor: 'rgba(0, 212, 228, 0.3)',
                    borderTopColor: '#00D4E4'
                  }}
                />
                <div className="absolute inset-4 rounded-full flex items-center justify-center"
                     style={{backgroundColor: '#00D4E4'}}>
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