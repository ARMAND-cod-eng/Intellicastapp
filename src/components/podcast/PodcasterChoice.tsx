import React, { useState } from 'react';
import { Bot, Mic, Sparkles, Radio, ArrowRight, Zap, Users, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import CreateAIShow from './CreateAIShow';
import AIShowManager from './AIShowManager';
import { PodcastShowService } from '../../services/podcastService';
import type { CreateShowRequest } from '../../types/podcast';

type PodcasterType = 'ai' | 'human' | null;

interface PodcasterChoiceProps {
  onPlayEpisode?: (episode: any) => void;
}

const PodcasterChoice: React.FC<PodcasterChoiceProps> = ({ onPlayEpisode }) => {
  const [selectedType, setSelectedType] = useState<PodcasterType>(null);
  const [showAIFlow, setShowAIFlow] = useState(false);
  const [showHumanFlow, setShowHumanFlow] = useState(false);

  const handleChoiceClick = (type: PodcasterType) => {
    setSelectedType(type);
    if (type === 'ai') {
      setShowAIFlow(true);
      setShowHumanFlow(false);
    } else if (type === 'human') {
      setShowHumanFlow(true);
      setShowAIFlow(false);
    }
  };

  if (showAIFlow) {
    return <AIGenerationFlow onBack={() => setShowAIFlow(false)} />;
  }

  if (showHumanFlow) {
    return <HumanPodcastBrowse onBack={() => setShowHumanFlow(false)} />;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-4"
          style={{ color: '#FFFFFF' }}
        >
          Choose Your Podcaster
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg"
          style={{ color: 'rgba(255, 255, 255, 0.6)' }}
        >
          Create AI-powered conversations or browse real human podcasts
        </motion.p>
      </div>

      {/* Choice Cards */}
      <div className="grid grid-cols-2 gap-8 mb-12">
        {/* AI Virtual Podcasters */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard
            className="p-8 cursor-pointer h-full transition-all duration-300 group"
            glow={selectedType === 'ai'}
            onClick={() => handleChoiceClick('ai')}
            style={{
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: selectedType === 'ai' ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
              transform: selectedType === 'ai' ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
                  boxShadow: selectedType === 'ai' ? '0 0 40px rgba(0, 212, 228, 0.6)' : '0 0 20px rgba(0, 212, 228, 0.3)'
                }}
              >
                <Bot className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center mb-3" style={{ color: '#FFFFFF' }}>
              AI Virtual Podcasters
            </h2>

            {/* Subtitle */}
            <p className="text-center mb-6" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Generate AI-powered podcasts from your content
            </p>

            {/* Features */}
            <div className="space-y-3 mb-8">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <FeatureItem icon={<FileText className="w-4 h-4" />} text="Upload any document" />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <FeatureItem icon={<Users className="w-4 h-4" />} text="2-3 AI speakers" />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                <FeatureItem icon={<Sparkles className="w-4 h-4" />} text="Custom personalities" />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                <FeatureItem icon={<Zap className="w-4 h-4" />} text="Multiple conversation styles" />
              </motion.div>
            </div>

            {/* Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
                boxShadow: '0 4px 20px rgba(0, 212, 228, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 30px rgba(0, 212, 228, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 212, 228, 0.4)';
              }}
            >
              Create AI Podcast
              <Sparkles className="w-5 h-5" />
            </motion.button>
          </GlassCard>
        </motion.div>

        {/* Real Human Podcasters */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard
            className="p-8 cursor-pointer h-full transition-all duration-300 group"
            glow={selectedType === 'human'}
            onClick={() => handleChoiceClick('human')}
            style={{
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: selectedType === 'human' ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
              transform: selectedType === 'human' ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                  boxShadow: selectedType === 'human' ? '0 0 40px rgba(245, 158, 11, 0.6)' : '0 0 20px rgba(245, 158, 11, 0.3)'
                }}
              >
                <Mic className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center mb-3" style={{ color: '#FFFFFF' }}>
              Real Human Podcasters
            </h2>

            {/* Subtitle */}
            <p className="text-center mb-6" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Browse and subscribe to real podcasts
            </p>

            {/* Features */}
            <div className="space-y-3 mb-8">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <FeatureItem icon={<Radio className="w-4 h-4" />} text="1000s of podcast shows" color="#F59E0B" />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                <FeatureItem icon={<Users className="w-4 h-4" />} text="Real experts & hosts" color="#F59E0B" />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                <FeatureItem icon={<Zap className="w-4 h-4" />} text="RSS feed support" color="#F59E0B" />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
                <FeatureItem icon={<ArrowRight className="w-4 h-4" />} text="Auto-update episodes" color="#F59E0B" />
              </motion.div>
            </div>

            {/* Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 30px rgba(245, 158, 11, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(245, 158, 11, 0.4)';
              }}
            >
              Browse Podcasts
              <Radio className="w-5 h-5" />
            </motion.button>
          </GlassCard>
        </motion.div>
      </div>

      {/* Quick Start Templates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-xl font-semibold mb-4" style={{ color: '#FFFFFF' }}>
          Quick Start Templates
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <TemplateCard title="Tech News" description="AI Generated" icon={<Zap />} />
          <TemplateCard title="Business" description="AI Generated" icon={<Users />} />
          <TemplateCard title="Learning" description="AI Generated" icon={<FileText />} />
          <TemplateCard title="Interview" description="AI Generated" icon={<Mic />} />
        </div>
      </motion.div>
    </div>
  );
};

// Helper Components

const FeatureItem: React.FC<{ icon: React.ReactNode; text: string; color?: string }> = ({
  icon,
  text,
  color = '#00D4E4'
}) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0" style={{ color }}>
        {icon}
      </div>
      <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{text}</span>
    </div>
  );
};

const TemplateCard: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({
  title,
  description,
  icon
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <GlassCard className="p-4 cursor-pointer text-center transition-all duration-300 hover:border-cyan-500">
        <div className="w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center"
             style={{ backgroundColor: 'rgba(0, 212, 228, 0.2)' }}>
          <div style={{ color: '#00D4E4' }}>{icon}</div>
        </div>
        <h4 className="font-semibold mb-1" style={{ color: '#FFFFFF' }}>{title}</h4>
        <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{description}</p>
      </GlassCard>
    </motion.div>
  );
};

// AI Generation Flow - Show Creation or Show Selection
const AIGenerationFlow: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [view, setView] = useState<'choice' | 'create' | 'manage'>('choice');

  if (view === 'create') {
    return <CreateAIShow onBack={() => setView('choice')} onCreate={(showRequest: CreateShowRequest) => {
      // Save show using service
      const createdShow = PodcastShowService.createShow(showRequest);
      console.log('Created show:', createdShow);
      setView('manage');
    }} />;
  }

  if (view === 'manage') {
    return <AIShowManager onBack={() => setView('choice')} onPlayEpisode={onPlayEpisode} />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: '#FFFFFF'
        }}
      >
        <ArrowRight className="w-4 h-4 rotate-180" />
        Back to Choice
      </button>

      <div className="grid grid-cols-2 gap-6">
        <GlassCard className="p-8 text-center cursor-pointer hover:scale-105 transition-transform" onClick={() => setView('create')}>
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)' }}>
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>Create New Show</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Set up a new AI podcast with custom episodes and topics
          </p>
        </GlassCard>

        <GlassCard className="p-8 text-center cursor-pointer hover:scale-105 transition-transform" onClick={() => setView('manage')}>
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' }}>
            <Radio className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>Manage Shows</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            View and manage your existing AI podcast shows
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

const HumanPodcastBrowse: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 rounded-lg transition-colors"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: '#FFFFFF'
        }}
      >
        ← Back to Choice
      </button>
      <GlassCard className="p-12 text-center">
        <Radio className="w-16 h-16 mx-auto mb-4" style={{ color: '#F59E0B', opacity: 0.5 }} />
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>Browse Human Podcasts</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          Podcast discovery and subscription features coming soon
        </p>
      </GlassCard>
    </div>
  );
};

export default PodcasterChoice;
