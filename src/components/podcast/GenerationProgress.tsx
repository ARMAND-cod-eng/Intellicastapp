import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { PodcastGenerationService } from '../../services/podcastService';
import type { GenerationJob } from '../../types/podcast';

interface GenerationProgressProps {
  jobId: string;
  onComplete: (success: boolean) => void;
  onClose: () => void;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({ jobId, onComplete, onClose }) => {
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    // Initial load
    loadJob();

    // Poll for updates every 2 seconds
    const interval = setInterval(() => {
      if (polling) {
        loadJob();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, polling]);

  const loadJob = () => {
    const loadedJob = PodcastGenerationService.getJob(jobId);
    if (loadedJob) {
      setJob(loadedJob);

      // Stop polling if completed or failed
      if (loadedJob.status === 'completed' || loadedJob.status === 'failed') {
        setPolling(false);
        setTimeout(() => {
          onComplete(loadedJob.status === 'completed');
        }, 2000);
      }
    }
  };

  if (!job) {
    return (
      <GlassCard className="p-8 text-center">
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: '#00D4E4' }} />
        <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Loading generation status...</p>
      </GlassCard>
    );
  }

  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle className="w-16 h-16" style={{ color: '#10B981' }} />;
      case 'failed':
        return <XCircle className="w-16 h-16" style={{ color: '#EF4444' }} />;
      case 'processing':
        return <Loader2 className="w-16 h-16 animate-spin" style={{ color: '#00D4E4' }} />;
      default:
        return <Sparkles className="w-16 h-16" style={{ color: '#F59E0B' }} />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'completed':
        return '#10B981';
      case 'failed':
        return '#EF4444';
      case 'processing':
        return '#00D4E4';
      default:
        return '#F59E0B';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="max-w-lg w-full mx-4"
      >
        <GlassCard className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <motion.div
              animate={job.status === 'processing' ? { rotate: 360 } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              {getStatusIcon()}
            </motion.div>
          </div>

          {/* Status */}
          <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#FFFFFF' }}>
            {job.status === 'completed' && 'Podcast Generated!'}
            {job.status === 'failed' && 'Generation Failed'}
            {job.status === 'processing' && 'Generating Podcast...'}
            {job.status === 'queued' && 'Queued for Generation'}
          </h2>

          {/* Message */}
          <p className="text-center mb-6" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            {job.message}
          </p>

          {/* Progress Bar */}
          {job.status !== 'failed' && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                <span>Progress</span>
                <span>{job.progress}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${job.progress}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${getStatusColor()} 0%, ${getStatusColor()}DD 100%)`
                  }}
                />
              </div>
            </div>
          )}

          {/* Config Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Style</div>
              <div className="font-medium capitalize" style={{ color: '#FFFFFF' }}>
                {job.config.style}
              </div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Speakers</div>
              <div className="font-medium" style={{ color: '#FFFFFF' }}>
                {job.config.personas.length}
              </div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Length</div>
              <div className="font-medium" style={{ color: '#FFFFFF' }}>
                {job.config.length}
              </div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Tone</div>
              <div className="font-medium capitalize" style={{ color: '#FFFFFF' }}>
                {job.config.tone}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {job.error && (
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              <div className="text-sm font-medium mb-1" style={{ color: '#EF4444' }}>Error Details</div>
              <div className="text-sm" style={{ color: 'rgba(239, 68, 68, 0.8)' }}>
                {job.error}
              </div>
            </div>
          )}

          {/* Action Button */}
          {(job.status === 'completed' || job.status === 'failed') && (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-medium transition-all"
              style={{
                background: job.status === 'completed'
                  ? 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF'
              }}
            >
              {job.status === 'completed' ? 'View Episode' : 'Close'}
            </button>
          )}

          {/* Cancel Button (only while processing) */}
          {job.status === 'processing' && (
            <button
              onClick={onClose}
              className="w-full mt-3 py-3 rounded-xl font-medium transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.6)'
              }}
            >
              Continue in Background
            </button>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default GenerationProgress;
