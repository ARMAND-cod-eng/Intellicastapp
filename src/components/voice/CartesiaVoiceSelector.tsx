import React, { useState } from 'react';
import { Play, Volume2 } from 'lucide-react';

interface CartesiaVoiceSelectorProps {
  selectedVoice: string;
  selectedPodcastStyle: string;
  onVoiceChange: (voiceId: string) => void;
  onPodcastStyleChange: (styleId: string) => void;
  previewText?: string;
}

const CartesiaVoiceSelector: React.FC<CartesiaVoiceSelectorProps> = ({
  selectedVoice,
  selectedPodcastStyle,
  onVoiceChange,
  onPodcastStyleChange,
  previewText = "This is a preview of how your podcast will sound with this voice and style combination."
}) => {
  // Hardcoded data for testing - no API calls
  const podcastStyles = [
    { id: 'conversational', name: 'Conversational', description: 'Friendly and engaging, like talking to a friend' },
    { id: 'professional', name: 'Professional', description: 'Clear and authoritative for business content' },
    { id: 'educational', name: 'Educational', description: 'Clear explanations with thoughtful pacing' },
    { id: 'storytelling', name: 'Storytelling', description: 'Dramatic and engaging for narratives' },
    { id: 'news', name: 'News', description: 'Authoritative and clear for news content' }
  ];

  const voices = [
    { id: 'bf991597-6c13-4d2c-8d3d-2f4f2a4c9e4e', name: 'Newslady', gender: 'female', language: 'en', provider: 'Cartesia' },
    { id: 'a0e99841-438c-4a64-b679-ae501e7d6091', name: 'Barbershop Man', gender: 'male', language: 'en', provider: 'Cartesia' },
    { id: '2ee87190-8f84-4925-97da-e52547f9462c', name: 'Calm Lady', gender: 'female', language: 'en', provider: 'Cartesia' }
  ];

  const getVoiceIcon = (gender: string) => {
    return gender === 'female' ? '👩' : '👨';
  };

  return (
    <div className="space-y-6">
      {/* Podcast Style Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Podcast Style
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {podcastStyles.map((style) => (
            <button
              key={style.id}
              onClick={() => onPodcastStyleChange(style.id)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedPodcastStyle === style.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">{style.name}</div>
              <div className="text-xs text-gray-600 mt-1">{style.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Voice Selection
        </label>
        <div className="grid grid-cols-1 gap-3">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedVoice === voice.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onVoiceChange(voice.id)}
                    className="flex items-center space-x-3"
                  >
                    <span className="text-lg">{getVoiceIcon(voice.gender)}</span>
                    <div>
                      <div className="font-medium text-sm">{voice.name}</div>
                      <div className="text-xs text-gray-600">
                        {voice.gender} • {voice.language.toUpperCase()} • {voice.provider}
                      </div>
                    </div>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => console.log('Preview clicked for', voice.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    <span className="text-xs">Preview</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Combination Preview */}
      {selectedVoice && selectedPodcastStyle && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Volume2 className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Current Selection</span>
          </div>
          <div className="text-sm text-gray-600">
            Voice: {voices.find(v => v.id === selectedVoice)?.name || 'Unknown'} •
            Style: {podcastStyles.find(s => s.id === selectedPodcastStyle)?.name || 'Unknown'}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartesiaVoiceSelector;