import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Loader2 } from 'lucide-react';

interface VoicePreviewProps {
  voiceId: string;
  voiceName: string;
  voiceDescription: string;
  previewText?: string;
  podcastStyle?: string;
  speed?: number;
  onPreviewStart?: () => void;
  onPreviewEnd?: () => void;
}

const VoicePreview: React.FC<VoicePreviewProps> = ({
  voiceId,
  voiceName,
  voiceDescription,
  previewText = "This is how your voice will sound. Clear, natural, and engaging audio for your podcast.",
  podcastStyle = 'conversational',
  speed = 1.0,
  onPreviewStart,
  onPreviewEnd
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate preview audio
  const generatePreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use dedicated voice preview endpoint (short, voice-only)
      const response = await fetch('http://localhost:3004/api/narration/voice-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: previewText, // Will be limited to 30 words in backend
          voice: voiceId,
          podcastStyle: podcastStyle || 'conversational'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate voice preview');
      }

      const result = await response.json();

      if (result.success && result.audioUrl) {
        setAudioUrl(`http://localhost:3004${result.audioUrl}`);
      } else {
        throw new Error('No audio URL returned');
      }
    } catch (err) {
      console.error('Voice preview error:', err);
      setError('Unable to generate preview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle play/pause
  const togglePlay = async () => {
    if (!audioUrl) {
      await generatePreview();
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        onPreviewEnd?.();
      } else {
        audioRef.current.play();
        setIsPlaying(true);
        onPreviewStart?.();
      }
    }
  };

  // Setup audio element
  useEffect(() => {
    if (audioUrl && !audioRef.current) {
      const audio = new Audio(audioUrl);

      audio.addEventListener('loadeddata', () => {
        audio.play();
        setIsPlaying(true);
        onPreviewStart?.();
      });

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
        onPreviewEnd?.();
      });

      audio.addEventListener('error', () => {
        setError('Failed to load audio');
        setIsLoading(false);
        setIsPlaying(false);
      });

      audioRef.current = audio;
    }
  }, [audioUrl]);

  // Cleanup and reset when voice or speed changes
  useEffect(() => {
    // Clear existing audio when voice or speed changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioUrl(null);
    setIsPlaying(false);
    setProgress(0);
    setError(null);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [voiceId, speed]); // Reset when voice or speed changes

  return (
    <div className="relative p-4 rounded-xl border bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-[#00D4E4]/50 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#00D4E4]/20 flex items-center justify-center border border-[#00D4E4]/30">
            <Volume2 className="w-5 h-5 text-[#00D4E4]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">{voiceName}</h4>
            <p className="text-xs text-gray-400">{voiceDescription}</p>
          </div>
        </div>

        {/* Play Button */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isPlaying ? '#00D4E4' : 'rgba(0, 212, 228, 0.2)',
            boxShadow: isPlaying ? '0 0 20px rgba(0, 212, 228, 0.5)' : 'none'
          }}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-[#00D4E4] ml-0.5" />
          )}
        </button>
      </div>

      {/* Progress Bar */}
      {isPlaying && (
        <div className="relative h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00D4E4] to-[#00E8FA] transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Preview Text */}
      <div className="mt-3 p-3 rounded-lg bg-black/30 border border-gray-700/50">
        <p className="text-xs text-gray-400 italic line-clamp-2">
          "{previewText.slice(0, 100)}..."
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-xs text-red-400 flex items-center space-x-1">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading State Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-[#00D4E4] animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-300">Generating preview...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoicePreview;
