import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2, User, Globe, Mic, Star, Filter, Search } from 'lucide-react';

interface KokoroVoice {
  id: string;
  name: string;
  display_name: string;
  gender: 'male' | 'female';
  accent: 'american' | 'british';
  age_group: 'young_adult' | 'middle_adult' | 'senior';
  tone: string;
  characteristics: string[];
  best_for: string[];
  description: string;
  speed_multiplier: number;
  intonation: string;
  pause_style: string;
}

interface VoiceGroups {
  [key: string]: string[];
}

interface KokoroVoiceSelectorProps {
  selectedVoice: string;
  onVoiceSelect: (voiceId: string) => void;
  showPreview?: boolean;
  compactMode?: boolean;
  contentCategory?: string;
  allowMultiSelect?: boolean;
  selectedVoices?: string[];
  onMultiVoiceSelect?: (voiceIds: string[]) => void;
}

const KokoroVoiceSelector: React.FC<KokoroVoiceSelectorProps> = ({
  selectedVoice,
  onVoiceSelect,
  showPreview = true,
  compactMode = false,
  contentCategory,
  allowMultiSelect = false,
  selectedVoices = [],
  onMultiVoiceSelect
}) => {
  const [voices, setVoices] = useState<{ [key: string]: KokoroVoice }>({});
  const [voiceGroups, setVoiceGroups] = useState<VoiceGroups>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all');
  const [filterAccent, setFilterAccent] = useState<'all' | 'american' | 'british'>('all');
  const [showRecommended, setShowRecommended] = useState(false);
  const [recommendations, setRecommendations] = useState<KokoroVoice[]>([]);

  // Load voices on component mount
  useEffect(() => {
    loadVoices();
    if (contentCategory) {
      loadRecommendations();
    }
  }, [contentCategory]);

  const loadVoices = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3003/api/voices');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setVoices(data.voices);
        setVoiceGroups(data.groups);
      } else {
        throw new Error('Failed to load voices');
      }
    } catch (err) {
      console.error('Error loading voices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load voices');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    if (!contentCategory) return;
    
    try {
      const response = await fetch(`http://localhost:3003/api/voices/recommendations?category=${encodeURIComponent(contentCategory)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRecommendations(data.recommendations);
        }
      }
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
  };

  const playVoicePreview = async (voiceId: string) => {
    console.log('🎵 Starting voice preview for:', voiceId);
    try {
      if (playingVoice === voiceId) {
        // Stop current playback
        const audio = audioElements[voiceId];
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        setPlayingVoice(null);
        return;
      }

      // Stop any currently playing audio
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });

      setPlayingVoice(voiceId);

      // Check if we already have audio for this voice
      let audio = audioElements[voiceId];
      
      if (!audio) {
        // Generate new preview
        const response = await fetch(`http://localhost:3003/api/voices/${voiceId}/preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        });

        if (!response.ok) {
          console.error('Preview API failed:', response.status, response.statusText);
          throw new Error('Failed to generate preview');
        }

        const data = await response.json();
        
        if (data.success) {
          audio = new Audio(`http://localhost:3003${data.preview.audioUrl}`);
          
          audio.onended = () => {
            setPlayingVoice(null);
          };

          audio.onloadeddata = () => {
            console.log('Audio data loaded successfully');
          };

          audio.oncanplay = () => {
            console.log('Audio can start playing');
          };

          audio.oncanplaythrough = () => {
            console.log('Audio can play through without stopping');
          };

          audio.onerror = (err) => {
            setPlayingVoice(null);
            console.error('Audio playback error:', err);
            console.error('Audio source:', audio.src);
            console.error('Audio readyState:', audio.readyState);
            console.error('Audio networkState:', audio.networkState);
            console.error('Audio error code:', audio.error?.code);
            console.error('Audio error message:', audio.error?.message);
          };

          setAudioElements(prev => ({
            ...prev,
            [voiceId]: audio
          }));
        } else {
          throw new Error(data.error || 'Preview generation failed');
        }
      }

      console.log('Attempting to play audio:', audio.src);
      console.log('Audio readyState before play:', audio.readyState);
      
      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('Audio started playing successfully');
        }
      } catch (playError) {
        console.error('Audio play() failed:', playError);
        throw playError;
      }
    } catch (err) {
      console.error('Preview playback error:', err);
      setPlayingVoice(null);
    }
  };

  const getFilteredVoices = () => {
    let filtered = Object.values(voices);

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(voice => 
        voice.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.characteristics.some(char => char.toLowerCase().includes(searchTerm.toLowerCase())) ||
        voice.best_for.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply gender filter
    if (filterGender !== 'all') {
      filtered = filtered.filter(voice => voice.gender === filterGender);
    }

    // Apply accent filter
    if (filterAccent !== 'all') {
      filtered = filtered.filter(voice => voice.accent === filterAccent);
    }

    return filtered;
  };

  const handleVoiceSelection = (voiceId: string) => {
    if (allowMultiSelect && onMultiVoiceSelect) {
      const newSelection = selectedVoices.includes(voiceId)
        ? selectedVoices.filter(id => id !== voiceId)
        : [...selectedVoices, voiceId];
      onMultiVoiceSelect(newSelection);
    } else {
      onVoiceSelect(voiceId);
    }
  };

  const isVoiceSelected = (voiceId: string) => {
    if (allowMultiSelect) {
      return selectedVoices.includes(voiceId);
    }
    return selectedVoice === voiceId;
  };

  const renderVoiceCard = (voice: KokoroVoice, isRecommended = false) => {
    const isSelected = isVoiceSelected(voice.id);
    const isPlaying = playingVoice === voice.id;

    return (
      <div 
        key={voice.id}
        className={`
          relative border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md
          ${isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300 bg-white'
          }
          ${compactMode ? 'p-3' : 'p-4'}
          ${isRecommended ? 'ring-2 ring-yellow-200' : ''}
        `}
        onClick={() => handleVoiceSelection(voice.id)}
      >
        {isRecommended && (
          <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full flex items-center">
            <Star className="w-3 h-3 mr-1" />
            Recommended
          </div>
        )}

        {/* Voice Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium
              ${voice.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'}
            `}>
              {voice.name[0]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{voice.name}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-3 h-3" />
                <span className="capitalize">{voice.gender}</span>
                <Globe className="w-3 h-3" />
                <span className="capitalize">{voice.accent}</span>
              </div>
            </div>
          </div>

          {showPreview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                playVoicePreview(voice.id);
              }}
              className={`
                p-2 rounded-full transition-colors
                ${isPlaying 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
              title={isPlaying ? 'Stop preview' : 'Play preview'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Voice Description */}
        <p className="text-sm text-gray-600 mb-2">{voice.description}</p>

        {/* Voice Characteristics */}
        {!compactMode && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {voice.characteristics.slice(0, 3).map(characteristic => (
                <span 
                  key={characteristic}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {characteristic}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-gray-500 mr-1">Best for:</span>
              {voice.best_for.slice(0, 2).map(category => (
                <span 
                  key={category}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading voices...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">⚠️ Failed to load voices</div>
        <div className="text-sm text-gray-600 mb-4">{error}</div>
        <button 
          onClick={loadVoices}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredVoices = getFilteredVoices();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            Choose Kokoro-82M Voice {allowMultiSelect ? '(Multi-Select)' : ''}
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">EXCLUSIVE</span>
          </h2>
          <p className="text-sm text-gray-600">
            {filteredVoices.length} of {Object.keys(voices).length} Kokoro voices • No fallback models
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-500">Click preview to hear each voice</span>
        </div>
      </div>

      {/* Filters and Search */}
      {!compactMode && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search voices, characteristics, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Genders</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={filterAccent}
                onChange={(e) => setFilterAccent(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Accents</option>
                <option value="american">American</option>
                <option value="british">British</option>
              </select>
            </div>

            {contentCategory && recommendations.length > 0 && (
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showRecommended}
                  onChange={(e) => setShowRecommended(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show recommended only</span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Recommended Voices (if available) */}
      {!compactMode && contentCategory && recommendations.length > 0 && !showRecommended && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            Recommended for {contentCategory}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map(voice => renderVoiceCard(voice, true))}
          </div>
        </div>
      )}

      {/* Voice Grid */}
      <div>
        {showRecommended && recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map(voice => renderVoiceCard(voice, true))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVoices.map(voice => renderVoiceCard(voice))}
          </div>
        )}
      </div>

      {/* Selection Summary (for multi-select) */}
      {allowMultiSelect && selectedVoices.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">
            Selected Voices ({selectedVoices.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedVoices.map(voiceId => {
              const voice = voices[voiceId];
              if (!voice) return null;
              
              return (
                <span 
                  key={voiceId}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center"
                >
                  {voice.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVoiceSelection(voiceId);
                    }}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default KokoroVoiceSelector;