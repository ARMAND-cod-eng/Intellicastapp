import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  X,
  Download,
  Heart,
  Share2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';
import GlassCard from '../ui/GlassCard';
import Button from '../ui/Button';

interface ModernAudioPlayerProps {
  onClose?: () => void;
  audioUrl?: string;
  trackData?: {
    title: string;
    artist: string;
    duration: string;
    artwork?: string;
    description?: string;
  };
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

const ModernAudioPlayer: React.FC<ModernAudioPlayerProps> = ({
  onClose,
  audioUrl,
  trackData,
  isMinimized = false,
  onToggleMinimize
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(247); // Mock duration
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [visualizerType, setVisualizerType] = useState<'bars' | 'wave' | 'spectrum'>('bars');
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Mock data - replace with actual data from props/store
  const currentTrack = trackData || {
    title: "AI-Generated Business Strategy Podcast",
    artist: "IntelliCast AI",
    duration: "4:07",
    artwork: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=400&fit=crop&crop=center",
    description: "An in-depth analysis of modern business strategies powered by artificial intelligence."
  };

  // Initialize audio element when audioUrl changes
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      const audio = audioRef.current;
      audio.src = audioUrl;
      audio.volume = volume;
      audio.muted = isMuted;

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        if (isRepeat) {
          audio.currentTime = 0;
          audio.play();
          setIsPlaying(true);
        } else {
          setCurrentTime(0);
        }
      };

      const handleError = (e: Event) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [audioUrl, volume, isMuted, isRepeat]);

  // Update audio playback state
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Failed to play audio:', error);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!audioUrl) return;
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width;
    const time = progress * duration;
    handleSeek(Math.max(0, Math.min(duration, time)));
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div
          className="p-4 w-80 rounded-xl backdrop-blur-xl border cursor-pointer"
          style={{
            backgroundColor: '#14191a',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 0 20px rgba(0, 212, 228, 0.2)'
          }}
          onClick={onToggleMinimize}
        >
          <div className="flex items-center space-x-3">
            <img
              src={currentTrack.artwork}
              alt="Artwork"
              className="w-12 h-12 rounded-xl object-cover shadow-lg"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate" style={{color: '#FFFFFF'}}>
                {currentTrack.title}
              </h4>
              <p className="text-xs truncate" style={{color: 'rgba(255, 255, 255, 0.7)'}}>
                {currentTrack.artist}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause();
              }}
              className="w-10 h-10 p-0 rounded-full flex items-center justify-center transition-all"
              style={{
                backgroundColor: '#00D4E4',
                color: '#000000'
              }}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </div>

          {/* Mini progress bar */}
          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{backgroundColor: 'rgba(255, 255, 255, 0.1)'}}>
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${(currentTime / duration) * 100}%`,
                backgroundColor: '#00D4E4'
              }}
              layout
            />
          </div>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          preload="metadata"
          style={{ display: 'none' }}
        />
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        <div className="rounded-t-3xl rounded-b-none border-b-0 backdrop-blur-3xl relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 rounded-t-3xl" style={{
            background: 'linear-gradient(to top, #000000, #14191a)'
          }} />

          {/* Animated background */}
          <div className="absolute inset-0 rounded-t-3xl opacity-10" style={{
            background: 'radial-gradient(circle at center, rgba(0, 212, 228, 0.1) 0%, transparent 70%)'
          }} />
          
          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <motion.div
                className="flex items-center space-x-2"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor: '#00D4E4'}} />
                <span className="text-sm font-medium" style={{color: 'rgba(255, 255, 255, 0.7)'}}>Now Playing</span>
              </motion.div>

              <div className="flex items-center space-x-2">
                {onToggleMinimize && (
                  <button
                    onClick={onToggleMinimize}
                    className="w-8 h-8 p-0 rounded-full flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#FFFFFF'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                  >
                    <Minimize2 size={14} />
                  </button>
                )}
                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 p-0 rounded-full flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#FFFFFF'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Track Info & Artwork */}
            <div className="flex items-start space-x-6 mb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <img 
                  src={currentTrack.artwork} 
                  alt="Artwork" 
                  className="w-24 h-24 rounded-2xl object-cover shadow-2xl"
                />
                {isPlaying && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{backgroundColor: 'rgba(0, 212, 228, 0.2)'}}
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </motion.div>

              <motion.div
                className="flex-1 min-w-0"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-xl font-bold mb-1 truncate" style={{color: '#FFFFFF'}}>
                  {currentTrack.title}
                </h3>
                <p className="text-sm mb-2 truncate" style={{color: 'rgba(255, 255, 255, 0.7)'}}>
                  {currentTrack.artist}
                </p>
                <p className="text-xs line-clamp-2" style={{color: 'rgba(255, 255, 255, 0.5)'}}>
                  {currentTrack.description}
                </p>
                
                {/* Action buttons */}
                <div className="flex items-center space-x-3 mt-4">
                  <button
                    onClick={() => setIsLiked(!isLiked)}
                    className="w-8 h-8 p-0 rounded-full flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: isLiked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: isLiked ? '#EF4444' : '#FFFFFF'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLiked) e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isLiked) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    className="w-8 h-8 p-0 rounded-full flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#FFFFFF'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                  >
                    <Share2 size={16} />
                  </button>

                  <button
                    className="w-8 h-8 p-0 rounded-full flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#FFFFFF'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                  >
                    <Download size={16} />
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Waveform Visualizer */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm" style={{color: 'rgba(255, 255, 255, 0.7)'}}>Waveform</span>
                <div className="flex space-x-1">
                  {(['bars', 'wave', 'spectrum'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setVisualizerType(type)}
                      className="px-3 py-1 text-xs capitalize rounded-lg transition-all"
                      style={{
                        backgroundColor: visualizerType === type ? '#00D4E4' : 'rgba(255, 255, 255, 0.05)',
                        color: visualizerType === type ? '#000000' : '#FFFFFF'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <WaveformVisualizer
                audioUrl={audioUrl}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                variant={visualizerType}
                color="#00D4E4"
                height={80}
                className="rounded-xl overflow-hidden"
              />
            </motion.div>

            {/* Progress */}
            <motion.div
              className="mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between text-sm mb-2" style={{color: 'rgba(255, 255, 255, 0.7)'}}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div
                ref={progressRef}
                className="relative h-2 rounded-full cursor-pointer group overflow-hidden"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }}
                onClick={handleProgressClick}
              >
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    width: `${(currentTime / duration) * 100}%`,
                    backgroundColor: '#00D4E4'
                  }}
                  layout
                />

                {/* Glow effect */}
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full opacity-0 group-hover:opacity-50 blur-sm transition-opacity duration-200"
                  style={{
                    width: `${(currentTime / duration) * 100}%`,
                    backgroundColor: '#00D4E4'
                  }}
                  layout
                />

                {/* Progress handle */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    left: `${(currentTime / duration) * 100}%`,
                    marginLeft: '-8px',
                    backgroundColor: '#FFFFFF'
                  }}
                  layout
                />
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div
              className="flex items-center justify-between"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {/* Left controls */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className="w-10 h-10 p-0 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: isShuffle ? 'rgba(0, 212, 228, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: isShuffle ? '#00D4E4' : '#FFFFFF'
                  }}
                  onMouseEnter={(e) => {
                    if (!isShuffle) e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isShuffle) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  <Shuffle size={18} />
                </button>

                <button
                  className="w-10 h-10 p-0 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#FFFFFF'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                >
                  <SkipBack size={20} />
                </button>
              </div>

              {/* Center play button */}
              <button
                onClick={handlePlayPause}
                className="w-16 h-16 p-0 rounded-full shadow-2xl flex items-center justify-center transition-all"
                style={{
                  backgroundColor: '#00D4E4',
                  color: '#000000',
                  boxShadow: isPlaying ? '0 0 30px rgba(0, 212, 228, 0.5)' : '0 10px 30px rgba(0, 0, 0, 0.3)'
                }}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              </button>

              {/* Right controls */}
              <div className="flex items-center space-x-3">
                <button
                  className="w-10 h-10 p-0 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#FFFFFF'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                >
                  <SkipForward size={20} />
                </button>

                <button
                  onClick={() => setIsRepeat(!isRepeat)}
                  className="w-10 h-10 p-0 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: isRepeat ? 'rgba(0, 212, 228, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: isRepeat ? '#00D4E4' : '#FFFFFF'
                  }}
                  onMouseEnter={(e) => {
                    if (!isRepeat) e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isRepeat) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  <Repeat size={18} />
                </button>
              </div>
            </motion.div>

            {/* Volume Control */}
            <motion.div
              className="flex items-center justify-center space-x-3 mt-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <button
                onClick={toggleMute}
                className="w-8 h-8 p-0 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#FFFFFF'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 212, 228, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <div className="relative w-32">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer slider"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    accentColor: '#00D4E4'
                  }}
                />
              </div>

              <span className="text-xs w-8 text-center" style={{color: 'rgba(255, 255, 255, 0.5)'}}>
                {Math.round((isMuted ? 0 : volume) * 100)}
              </span>
            </motion.div>
          </div>
        </div>
        
        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          preload="metadata"
          style={{ display: 'none' }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default ModernAudioPlayer;