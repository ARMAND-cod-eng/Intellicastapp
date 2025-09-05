import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, X, Maximize2 } from 'lucide-react';

interface AudioPlayerProps {
  onClose: () => void;
  episode?: {
    title: string;
    description: string;
    duration: number;
    audioUrl?: string;
  };
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  onClose, 
  episode = {
    title: "Sample Podcast Episode",
    description: "This is a generated podcast from your document",
    duration: 180
  }
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const progress = episode.duration > 0 ? (currentTime / episode.duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 shadow-2xl">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Episode Info */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-primary-600 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-white/20 rounded"></div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {episode.title}
              </h3>
              <p className="text-xs text-gray-600 truncate">
                {episode.description}
              </p>
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex items-center space-x-6 flex-1 justify-center">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <SkipBack className="w-5 h-5 text-gray-700" />
            </button>
            
            <button
              onClick={togglePlayPause}
              className="p-3 bg-gradient-to-r from-accent-500 to-primary-600 rounded-full hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-0.5" />
              )}
            </button>
            
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <SkipForward className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Volume & Actions */}
          <div className="flex items-center space-x-4 flex-1 justify-end">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-gray-600" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 accent-accent-500"
              />
            </div>
            
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Maximize2 className="w-4 h-4 text-gray-600" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 flex items-center space-x-3">
          <span className="text-xs text-gray-500 w-12">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative">
            <div className="h-1 bg-gray-200 rounded-full">
              <div
                className="h-1 bg-gradient-to-r from-accent-500 to-primary-600 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <input
              type="range"
              min="0"
              max={episode.duration}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-xs text-gray-500 w-12">
            {formatTime(episode.duration)}
          </span>
        </div>
      </div>

      {/* Hidden audio element for future implementation */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        style={{ display: 'none' }}
      >
        {episode.audioUrl && <source src={episode.audioUrl} type="audio/mpeg" />}
      </audio>
    </div>
  );
};

export default AudioPlayer;