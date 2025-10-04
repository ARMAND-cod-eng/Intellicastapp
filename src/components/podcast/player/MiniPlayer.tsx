import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2, X, Gauge, Timer, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListeningHistoryService } from '../../../services/subscriptionService';

interface MiniPlayerProps {
  episode: {
    id: string;
    title: string;
    showName: string;
    showId?: string;
    artwork?: string;
    audioUrl: string;
    duration?: number;
  };
  onClose: () => void;
}

type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;
type SleepTimerDuration = 5 | 10 | 15 | 30 | 60 | null;

const MiniPlayer: React.FC<MiniPlayerProps> = ({ episode, onClose }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(episode.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<SleepTimerDuration>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [showSleepTimerMenu, setShowSleepTimerMenu] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);

      // Update listening history every 10 seconds
      if (episode.showId && Math.floor(audio.currentTime) % 10 === 0) {
        const progress = duration > 0 ? (audio.currentTime / duration) * 100 : 0;
        const completed = progress >= 98;
        ListeningHistoryService.updateHistory(episode.id, episode.showId, Math.floor(progress), completed);

        if (completed) {
          ListeningHistoryService.removeContinueListening(episode.id);
        }
      }
    };

    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [episode.id, episode.showId, duration]);

  // Playback speed effect
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Sleep timer effect
  useEffect(() => {
    if (sleepTimer && sleepTimerRemaining === null) {
      setSleepTimerRemaining(sleepTimer * 60); // Convert to seconds
    }

    if (sleepTimerRemaining !== null && sleepTimerRemaining > 0) {
      const interval = setInterval(() => {
        setSleepTimerRemaining(prev => {
          if (prev === null || prev <= 1) {
            // Timer finished
            const audio = audioRef.current;
            if (audio) {
              audio.pause();
              setIsPlaying(false);
            }
            setSleepTimer(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [sleepTimer, sleepTimerRemaining]);

  // Cleanup sleep timer on unmount
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const handleSleepTimerSet = (minutes: SleepTimerDuration) => {
    if (minutes === null) {
      // Cancel timer
      setSleepTimer(null);
      setSleepTimerRemaining(null);
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    } else {
      setSleepTimer(minutes);
      setSleepTimerRemaining(minutes * 60);
    }
    setShowSleepTimerMenu(false);
  };

  const formatSleepTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const bounds = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - bounds.left) / bounds.width;
    audio.currentTime = percent * duration;
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio ref={audioRef} src={episode.audioUrl} />

      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}
          >
            {/* Progress Bar */}
            <div
              className="h-1 w-full cursor-pointer group"
              onClick={handleSeek}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <motion.div
                className="h-full relative"
                style={{
                  width: `${progress}%`,
                  backgroundColor: '#00D4E4'
                }}
              >
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: '#00D4E4' }}
                />
              </motion.div>
            </div>

            {/* Player Controls */}
            <div className="px-4 py-3 flex items-center gap-4">
              {/* Episode Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Artwork */}
                <div
                  className="w-14 h-14 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex-shrink-0 cursor-pointer"
                  onClick={() => setIsExpanded(true)}
                  style={{
                    backgroundImage: episode.artwork ? `url(${episode.artwork})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {!episode.artwork && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>

                {/* Title & Show */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(true)}>
                  <h4 className="font-semibold truncate" style={{ color: '#FFFFFF' }}>
                    {episode.title}
                  </h4>
                  <p className="text-sm truncate" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {episode.showName}
                  </p>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                {/* Skip Back */}
                <button
                  onClick={() => skip(-15)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: '#FFFFFF' }}
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#00D4E4',
                    color: '#FFFFFF',
                    boxShadow: '0 0 20px rgba(0, 212, 228, 0.4)'
                  }}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>

                {/* Skip Forward */}
                <button
                  onClick={() => skip(30)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: '#FFFFFF' }}
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Time & Controls */}
              <div className="flex items-center gap-4">
                {/* Time */}
                <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                {/* Playback Speed */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all text-sm font-medium"
                    style={{
                      backgroundColor: playbackSpeed !== 1 ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: playbackSpeed !== 1 ? '#00D4E4' : 'rgba(255, 255, 255, 0.7)'
                    }}
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    {playbackSpeed}x
                  </button>

                  {/* Speed Menu */}
                  <AnimatePresence>
                    {showSpeedMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 right-0 rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: 'rgba(20, 20, 20, 0.95)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed as PlaybackSpeed)}
                            className="w-full px-4 py-2 text-sm text-left transition-colors hover:bg-white/10"
                            style={{
                              color: playbackSpeed === speed ? '#00D4E4' : 'rgba(255, 255, 255, 0.8)'
                            }}
                          >
                            {speed}x {speed === 1 && '(Normal)'}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sleep Timer */}
                <div className="relative">
                  <button
                    onClick={() => setShowSleepTimerMenu(!showSleepTimerMenu)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all text-sm font-medium"
                    style={{
                      backgroundColor: sleepTimer ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: sleepTimer ? '#00D4E4' : 'rgba(255, 255, 255, 0.7)'
                    }}
                  >
                    <Timer className="w-3.5 h-3.5" />
                    {sleepTimerRemaining ? formatSleepTimer(sleepTimerRemaining) : 'Sleep'}
                  </button>

                  {/* Sleep Timer Menu */}
                  <AnimatePresence>
                    {showSleepTimerMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 right-0 rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: 'rgba(20, 20, 20, 0.95)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {sleepTimer && (
                          <button
                            onClick={() => handleSleepTimerSet(null)}
                            className="w-full px-4 py-2 text-sm text-left transition-colors hover:bg-white/10"
                            style={{ color: '#EF4444' }}
                          >
                            Cancel Timer
                          </button>
                        )}
                        {[5, 10, 15, 30, 60].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => handleSleepTimerSet(mins as SleepTimerDuration)}
                            className="w-full px-4 py-2 text-sm text-left transition-colors hover:bg-white/10"
                            style={{
                              color: sleepTimer === mins ? '#00D4E4' : 'rgba(255, 255, 255, 0.8)'
                            }}
                          >
                            {mins} minutes
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setVolume(newVolume);
                      if (audioRef.current) audioRef.current.volume = newVolume;
                    }}
                    className="w-20"
                  />
                </div>

                {/* Expand */}
                <button
                  onClick={() => setIsExpanded(true)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: '#FFFFFF' }}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Close */}
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Player */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.98)' }}
            onClick={() => setIsExpanded(false)}
          >
            <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="mb-8 px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF'
                }}
              >
                ↓ Minimize
              </button>

              {/* Artwork */}
              <div
                className="w-full aspect-square rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 mb-8 flex items-center justify-center"
                style={{
                  backgroundImage: episode.artwork ? `url(${episode.artwork})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  boxShadow: '0 20px 60px rgba(0, 212, 228, 0.3)'
                }}
              >
                {!episode.artwork && (
                  <Play className="w-24 h-24 text-white opacity-50" />
                )}
              </div>

              {/* Title & Show */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                  {episode.title}
                </h2>
                <p className="text-lg" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {episode.showName}
                </p>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <div
                  className="h-2 w-full rounded-full cursor-pointer mb-2"
                  onClick={handleSeek}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: '#00D4E4'
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6 mb-8">
                <button
                  onClick={() => skip(-15)}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ color: '#FFFFFF' }}
                >
                  <SkipBack className="w-6 h-6" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#00D4E4',
                    color: '#FFFFFF',
                    boxShadow: '0 0 40px rgba(0, 212, 228, 0.6)'
                  }}
                >
                  {isPlaying ? (
                    <Pause className="w-10 h-10" />
                  ) : (
                    <Play className="w-10 h-10 ml-1" />
                  )}
                </button>

                <button
                  onClick={() => skip(30)}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ color: '#FFFFFF' }}
                >
                  <SkipForward className="w-6 h-6" />
                </button>
              </div>

              {/* Additional Controls */}
              <div className="flex items-center justify-center gap-4">
                {/* Playback Speed */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                    style={{
                      backgroundColor: playbackSpeed !== 1 ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: playbackSpeed !== 1 ? '#00D4E4' : 'rgba(255, 255, 255, 0.7)'
                    }}
                  >
                    <Gauge className="w-4 h-4" />
                    {playbackSpeed}x Speed
                  </button>

                  <AnimatePresence>
                    {showSpeedMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: 'rgba(20, 20, 20, 0.95)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed as PlaybackSpeed)}
                            className="w-full px-4 py-2 text-sm text-left transition-colors hover:bg-white/10"
                            style={{
                              color: playbackSpeed === speed ? '#00D4E4' : 'rgba(255, 255, 255, 0.8)'
                            }}
                          >
                            {speed}x {speed === 1 && '(Normal)'}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sleep Timer */}
                <div className="relative">
                  <button
                    onClick={() => setShowSleepTimerMenu(!showSleepTimerMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                    style={{
                      backgroundColor: sleepTimer ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: sleepTimer ? '#00D4E4' : 'rgba(255, 255, 255, 0.7)'
                    }}
                  >
                    <Timer className="w-4 h-4" />
                    {sleepTimerRemaining ? `Sleep: ${formatSleepTimer(sleepTimerRemaining)}` : 'Sleep Timer'}
                  </button>

                  <AnimatePresence>
                    {showSleepTimerMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: 'rgba(20, 20, 20, 0.95)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {sleepTimer && (
                          <button
                            onClick={() => handleSleepTimerSet(null)}
                            className="w-full px-4 py-2 text-sm text-left transition-colors hover:bg-white/10"
                            style={{ color: '#EF4444' }}
                          >
                            Cancel Timer
                          </button>
                        )}
                        {[5, 10, 15, 30, 60].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => handleSleepTimerSet(mins as SleepTimerDuration)}
                            className="w-full px-4 py-2 text-sm text-left transition-colors hover:bg-white/10"
                            style={{
                              color: sleepTimer === mins ? '#00D4E4' : 'rgba(255, 255, 255, 0.8)'
                            }}
                          >
                            {mins} minutes
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MiniPlayer;
