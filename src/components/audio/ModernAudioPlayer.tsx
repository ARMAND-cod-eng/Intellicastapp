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

  // Simulate time progression when playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 1;
          return next >= duration ? 0 : next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
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
        <GlassCard 
          variant="dark"
          className="p-4 w-80"
          glow
          onClick={onToggleMinimize}
        >
          <div className="flex items-center space-x-3">
            <img 
              src={currentTrack.artwork} 
              alt="Artwork" 
              className="w-12 h-12 rounded-xl object-cover shadow-lg"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white truncate">
                {currentTrack.title}
              </h4>
              <p className="text-xs text-white/70 truncate">
                {currentTrack.artist}
              </p>
            </div>
            <Button
              variant="glass"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause();
              }}
              className="w-10 h-10 p-0 rounded-full"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </Button>
          </div>
          
          {/* Mini progress bar */}
          <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
              layout
            />
          </div>
        </GlassCard>
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
        <GlassCard variant="dark" className="rounded-t-3xl rounded-b-none border-b-0 backdrop-blur-3xl">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900/95 via-dark-800/90 to-dark-700/85 rounded-t-3xl" />
          
          {/* Animated background */}
          <div className="absolute inset-0 mesh-gradient opacity-20 rounded-t-3xl" />
          
          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <motion.div 
                className="flex items-center space-x-2"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                <span className="text-white/70 text-sm font-medium">Now Playing</span>
              </motion.div>
              
              <div className="flex items-center space-x-2">
                {onToggleMinimize && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleMinimize}
                    className="w-8 h-8 p-0 rounded-full"
                  >
                    <Minimize2 size={14} />
                  </Button>
                )}
                {onClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="w-8 h-8 p-0 rounded-full"
                  >
                    <X size={14} />
                  </Button>
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
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500/30 to-secondary-500/30"
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
                <h3 className="text-xl font-bold text-white mb-1 truncate">
                  {currentTrack.title}
                </h3>
                <p className="text-white/70 text-sm mb-2 truncate">
                  {currentTrack.artist}
                </p>
                <p className="text-white/50 text-xs line-clamp-2">
                  {currentTrack.description}
                </p>
                
                {/* Action buttons */}
                <div className="flex items-center space-x-3 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsLiked(!isLiked)}
                    className={`w-8 h-8 p-0 rounded-full ${
                      isLiked ? 'text-red-500 hover:text-red-400' : ''
                    }`}
                  >
                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 rounded-full"
                  >
                    <Share2 size={16} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 rounded-full"
                  >
                    <Download size={16} />
                  </Button>
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
                <span className="text-white/70 text-sm">Waveform</span>
                <div className="flex space-x-1">
                  {(['bars', 'wave', 'spectrum'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={visualizerType === type ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setVisualizerType(type)}
                      className="px-3 py-1 text-xs capitalize"
                    >
                      {type}
                    </Button>
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
                color="#6366f1"
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
              <div className="flex items-center justify-between text-sm text-white/70 mb-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              
              <div 
                ref={progressRef}
                className="relative h-2 bg-white/20 rounded-full cursor-pointer group overflow-hidden"
                onClick={handleProgressClick}
              >
                <motion.div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                  layout
                />
                
                {/* Glow effect */}
                <motion.div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary-400 to-secondary-400 rounded-full opacity-0 group-hover:opacity-50 blur-sm transition-opacity duration-200"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                  layout
                />
                
                {/* Progress handle */}
                <motion.div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ left: `${(currentTime / duration) * 100}%`, marginLeft: '-8px' }}
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`w-10 h-10 p-0 rounded-full ${
                    isShuffle ? 'text-primary-400' : ''
                  }`}
                >
                  <Shuffle size={18} />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-10 h-10 p-0 rounded-full"
                >
                  <SkipBack size={20} />
                </Button>
              </div>

              {/* Center play button */}
              <Button
                variant="gradient"
                size="lg"
                onClick={handlePlayPause}
                className="w-16 h-16 p-0 rounded-full shadow-2xl"
                glow
                pulse={isPlaying}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              </Button>

              {/* Right controls */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-10 h-10 p-0 rounded-full"
                >
                  <SkipForward size={20} />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`w-10 h-10 p-0 rounded-full ${
                    isRepeat ? 'text-primary-400' : ''
                  }`}
                >
                  <Repeat size={18} />
                </Button>
              </div>
            </motion.div>

            {/* Volume Control */}
            <motion.div 
              className="flex items-center justify-center space-x-3 mt-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="w-8 h-8 p-0 rounded-full"
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </Button>
              
              <div className="relative w-32">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer slider"
                />
              </div>
              
              <span className="text-xs text-white/50 w-8 text-center">
                {Math.round((isMuted ? 0 : volume) * 100)}
              </span>
            </motion.div>
          </div>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModernAudioPlayer;