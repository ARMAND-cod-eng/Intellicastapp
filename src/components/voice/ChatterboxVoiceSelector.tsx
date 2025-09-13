import React, { useState, useEffect } from 'react';
import { ChevronDown, Play, Pause, Volume2, Globe, Users, Sparkles } from 'lucide-react';
import type { ChatterboxVoice, VoicesByLanguage } from '../../types/chatterbox';
import { SUPPORTED_LANGUAGES } from '../../types/chatterbox';

interface ChatterboxVoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
  onPreviewPlay?: (voiceId: string) => void;
  currentlyPlaying?: string | null;
  contentCategory?: string;
  showAdvanced?: boolean;
  compact?: boolean;
}

interface VoicesResponse {
  voices_by_language: VoicesByLanguage;
  total_voices: number;
  supported_languages: string[];
  features: string[];
}

const ChatterboxVoiceSelector: React.FC<ChatterboxVoiceSelectorProps> = ({
  selectedVoice,
  onVoiceChange,
  onPreviewPlay,
  currentlyPlaying,
  contentCategory = 'general',
  showAdvanced = true,
  compact = false
}) => {
  const [voices, setVoices] = useState<VoicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<string | null>(null);

  // Use the comprehensive language mapping from types
  const languageNames = Object.fromEntries(
    Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => [code, config.nativeName])
  );

  const languageFlags = Object.fromEntries(
    Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => [code, config.flag])
  );

  useEffect(() => {
    fetchVoices();
  }, []);

  useEffect(() => {
    // Auto-select language based on current voice
    if (selectedVoice && selectedVoice.includes('_')) {
      const lang = selectedVoice.split('_')[1];
      if (lang && lang in languageNames) {
        setSelectedLanguage(lang);
      }
    }
  }, [selectedVoice]);

  const fetchVoices = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3007/api/voices');
      const data = await response.json();
      
      if (data.success && data.voices_by_language) {
        setVoices(data);
      } else {
        console.error('Failed to fetch voices:', data);
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPlay = async (voiceId: string) => {
    if (isPreviewLoading) return;
    
    setIsPreviewLoading(voiceId);
    
    try {
      if (onPreviewPlay) {
        await onPreviewPlay(voiceId);
      }
    } catch (error) {
      console.error('Error playing preview:', error);
    } finally {
      setIsPreviewLoading(null);
    }
  };

  const getVoiceRecommendations = (voicesInLang: ChatterboxVoice[]) => {
    return voicesInLang.filter(voice => 
      voice.best_for?.includes(contentCategory) || 
      voice.characteristics?.some(char => 
        contentCategory === 'business' && char === 'professional' ||
        contentCategory === 'educational' && (char === 'clear' || char === 'professional') ||
        contentCategory === 'storytelling' && (char === 'expressive' || char === 'warm')
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-slate-50 rounded-lg">
        <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
        <span className="text-slate-600">Loading multilingual voices...</span>
      </div>
    );
  }

  if (!voices) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Failed to load Chatterbox voices. Please try again.
      </div>
    );
  }

  const availableLanguages = Object.keys(voices.voices_by_language);
  const currentLanguageVoices = voices.voices_by_language[selectedLanguage] || [];
  const selectedVoiceData = currentLanguageVoices.find(v => v.id === selectedVoice);
  const recommendedVoices = getVoiceRecommendations(currentLanguageVoices);

  return (
    <div className={`space-y-4 ${compact ? 'compact' : ''}`}>
      {/* Header with features */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Chatterbox Multilingual TTS
          </h3>
        </div>
        <div className="text-sm text-gray-500">
          {voices.total_voices} voices • {availableLanguages.length} languages
        </div>
      </div>

      {/* Language Selector */}
      <div className="space-y-2">
        <label className="flex items-center text-sm font-medium text-gray-700">
          <Globe className="w-4 h-4 mr-1" />
          Language
        </label>
        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
          {availableLanguages.sort().map(lang => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`flex items-center justify-start px-2 py-2 rounded-md text-sm transition-colors ${
                selectedLanguage === lang
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
              title={`${languageNames[lang]} (${voices.voices_by_language[lang]?.length || 0} voices)`}
            >
              <span className="mr-2 text-base">{languageFlags[lang]}</span>
              <div className="flex-1 text-left truncate">
                <div className="font-medium">{SUPPORTED_LANGUAGES[lang]?.name}</div>
                <div className="text-xs opacity-75">{voices.voices_by_language[lang]?.length || 0} voices</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Selector Dropdown */}
      <div className="space-y-2">
        <label className="flex items-center text-sm font-medium text-gray-700">
          <Users className="w-4 h-4 mr-1" />
          Voice Selection
        </label>
        
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center space-x-3">
              {selectedVoiceData ? (
                <>
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {selectedVoiceData.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{selectedVoiceData.name}</div>
                    <div className="text-sm text-gray-500">{selectedVoiceData.description}</div>
                  </div>
                </>
              ) : (
                <div className="text-gray-500">Select a voice...</div>
              )}
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {/* Recommended voices */}
              {recommendedVoices.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                    <div className="text-sm font-medium text-blue-900">
                      Recommended for {contentCategory}
                    </div>
                  </div>
                  {recommendedVoices.map(voice => (
                    <VoiceOption
                      key={`rec-${voice.id}`}
                      voice={voice}
                      isSelected={selectedVoice === voice.id}
                      isPlaying={currentlyPlaying === voice.id}
                      isLoading={isPreviewLoading === voice.id}
                      onSelect={() => {
                        onVoiceChange(voice.id);
                        setShowDropdown(false);
                      }}
                      onPreview={() => handlePreviewPlay(voice.id)}
                      recommended
                    />
                  ))}
                </>
              )}

              {/* All voices */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-700">
                  All {languageNames[selectedLanguage as keyof typeof languageNames]} voices
                </div>
              </div>
              {currentLanguageVoices.map(voice => (
                <VoiceOption
                  key={voice.id}
                  voice={voice}
                  isSelected={selectedVoice === voice.id}
                  isPlaying={currentlyPlaying === voice.id}
                  isLoading={isPreviewLoading === voice.id}
                  onSelect={() => {
                    onVoiceChange(voice.id);
                    setShowDropdown(false);
                  }}
                  onPreview={() => handlePreviewPlay(voice.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Voice Details */}
      {selectedVoiceData && showAdvanced && (
        <div className="p-4 bg-slate-50 rounded-lg space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Voice Characteristics</h4>
          
          <div className="flex flex-wrap gap-2">
            {selectedVoiceData.characteristics?.map(char => (
              <span
                key={char}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                {char}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Language:</span>
              <span className="ml-2 text-gray-600">
                {languageFlags[selectedVoiceData.language as keyof typeof languageFlags]} {languageNames[selectedVoiceData.language as keyof typeof languageNames]}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Exaggeration Level:</span>
              <span className="ml-2 text-gray-600">{selectedVoiceData.exaggeration || selectedVoiceData.emotion}/1.0</span>
            </div>
          </div>

          {selectedVoiceData.best_for && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Best for:</span>
              <span className="ml-2 text-gray-600">
                {selectedVoiceData.best_for.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Features showcase */}
      {!compact && (
        <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
          <div className="text-sm font-medium text-purple-900 mb-2">New Chatterbox Features:</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-purple-700">
            {voices.features.map(feature => (
              <div key={feature} className="flex items-center">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2"></div>
                {feature}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Voice option component for dropdown
const VoiceOption: React.FC<{
  voice: ChatterboxVoice;
  isSelected: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onSelect: () => void;
  onPreview: () => void;
  recommended?: boolean;
}> = ({ voice, isSelected, isPlaying, isLoading, onSelect, onPreview, recommended = false }) => (
  <div
    className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
      isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
    } ${recommended ? 'bg-blue-25' : ''}`}
  >
    <div className="flex items-center space-x-3 flex-1" onClick={onSelect}>
      <div className={`w-8 h-8 bg-gradient-to-r ${
        recommended ? 'from-yellow-400 to-orange-500' : 'from-purple-400 to-blue-500'
      } rounded-full flex items-center justify-center text-white text-sm font-medium`}>
        {voice.name.charAt(0).toUpperCase()}
        {recommended && <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"></span>}
      </div>
      <div className="flex-1">
        <div className="flex items-center">
          <span className="font-medium text-gray-900">{voice.name}</span>
          {recommended && (
            <span className="ml-2 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
              Recommended
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">{voice.description}</div>
        <div className="flex space-x-1 mt-1">
          {voice.characteristics?.slice(0, 2).map(char => (
            <span
              key={char}
              className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
            >
              {char}
            </span>
          ))}
        </div>
      </div>
    </div>
    
    <button
      onClick={(e) => {
        e.stopPropagation();
        onPreview();
      }}
      disabled={isLoading}
      className="ml-3 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
      title="Preview voice"
    >
      {isLoading ? (
        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      ) : isPlaying ? (
        <Pause className="w-4 h-4" />
      ) : (
        <Play className="w-4 h-4" />
      )}
    </button>
  </div>
);

export default ChatterboxVoiceSelector;