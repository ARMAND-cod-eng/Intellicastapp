import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles, Users, Calendar, Settings, FileText, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import { PERSONA_PRESETS } from '../../services/podcastService';
import type { AIPersona, PodcastStyleType, CreateShowRequest } from '../../types/podcast';

interface CreateAIShowProps {
  onBack: () => void;
  onCreate: (show: CreateShowRequest) => void;
}

type Step = 'basic' | 'style' | 'personas' | 'schedule' | 'review';

const CreateAIShow: React.FC<CreateAIShowProps> = ({ onBack, onCreate }) => {
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [showData, setShowData] = useState<Partial<CreateShowRequest>>({
    title: '',
    description: '',
    category: '',
    topics: [],
    episodeLength: '15min',
    tone: 'friendly'
  });

  // Use persona presets from service
  const availablePersonas: AIPersona[] = PERSONA_PRESETS;

  const podcastStyles: Array<{ id: PodcastStyleType; name: string; description: string; icon: string; recommended?: boolean }> = [
    { id: 'conversational', name: 'Conversational', description: 'Friendly chat between hosts', icon: '💬' },
    { id: 'expert-panel', name: 'Expert Panel', description: 'Professional analysis with experts', icon: '🎓', recommended: true },
    { id: 'debate', name: 'Debate', description: 'Opposing viewpoints and discussion', icon: '⚖️' },
    { id: 'interview', name: 'Interview', description: 'Host interviews an expert', icon: '🎙️' },
    { id: 'storytelling', name: 'Storytelling', description: 'Narrative-driven content', icon: '📖' }
  ];

  const categories = [
    'Technology', 'Business', 'Science', 'Health', 'Education',
    'News', 'Entertainment', 'Sports', 'Arts', 'Politics'
  ];

  const steps: Array<{ id: Step; title: string; icon: React.ReactNode }> = [
    { id: 'basic', title: 'Basic Info', icon: <FileText className="w-4 h-4" /> },
    { id: 'style', title: 'Style', icon: <Settings className="w-4 h-4" /> },
    { id: 'personas', title: 'Personas', icon: <Users className="w-4 h-4" /> },
    { id: 'schedule', title: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
    { id: 'review', title: 'Review', icon: <Check className="w-4 h-4" /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const nextStep = () => {
    const nextIndex = Math.min(currentStepIndex + 1, steps.length - 1);
    setCurrentStep(steps[nextIndex].id);
  };

  const prevStep = () => {
    const prevIndex = Math.max(currentStepIndex - 1, 0);
    setCurrentStep(steps[prevIndex].id);
  };

  const handleCreate = () => {
    onCreate(showData as CreateShowRequest);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF'
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center"
               style={{
                 background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
                 boxShadow: '0 0 30px rgba(0, 212, 228, 0.4)'
               }}>
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>
              Create AI Podcast Show
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Set up your AI-powered podcast with custom episodes and topics
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: index <= currentStepIndex ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    boxShadow: index === currentStepIndex ? '0 0 20px rgba(0, 212, 228, 0.5)' : 'none'
                  }}
                >
                  {index < currentStepIndex ? <Check className="w-5 h-5" /> : step.icon}
                </div>
                <span
                  className="text-sm font-medium hidden md:block"
                  style={{ color: index <= currentStepIndex ? '#00D4E4' : 'rgba(255, 255, 255, 0.4)' }}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-2"
                  style={{
                    backgroundColor: index < currentStepIndex ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)'
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 'basic' && <BasicInfoStep showData={showData} setShowData={setShowData} categories={categories} />}
          {currentStep === 'style' && <StyleStep showData={showData} setShowData={setShowData} styles={podcastStyles} />}
          {currentStep === 'personas' && <PersonasStep showData={showData} setShowData={setShowData} personas={availablePersonas} />}
          {currentStep === 'schedule' && <ScheduleStep showData={showData} setShowData={setShowData} />}
          {currentStep === 'review' && <ReviewStep showData={showData} />}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className="px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
          style={{
            backgroundColor: currentStepIndex === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
            color: currentStepIndex === 0 ? 'rgba(255, 255, 255, 0.3)' : '#FFFFFF',
            cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>

        {currentStepIndex < steps.length - 1 ? (
          <button
            onClick={nextStep}
            className="px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 20px rgba(0, 212, 228, 0.4)'
            }}
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            className="px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
            }}
          >
            <Check className="w-5 h-5" />
            Create Show
          </button>
        )}
      </div>
    </div>
  );
};

// Step Components

const BasicInfoStep: React.FC<{ showData: Partial<CreateShowRequest>; setShowData: Function; categories: string[] }> = ({ showData, setShowData, categories }) => {
  const [topicInput, setTopicInput] = useState('');

  const addTopic = () => {
    if (topicInput.trim() && !showData.topics?.includes(topicInput.trim())) {
      setShowData({
        ...showData,
        topics: [...(showData.topics || []), topicInput.trim()]
      });
      setTopicInput('');
    }
  };

  const removeTopic = (topic: string) => {
    setShowData({
      ...showData,
      topics: showData.topics?.filter(t => t !== topic) || []
    });
  };

  return (
    <GlassCard className="p-8" glow>
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#FFFFFF' }}>
        Basic Information
      </h2>

      <div className="space-y-6">
        {/* Show Title */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#FFFFFF' }}>
            Show Title *
          </label>
          <input
            type="text"
            value={showData.title || ''}
            onChange={(e) => setShowData({ ...showData, title: e.target.value })}
            placeholder="e.g., Tech Insights Weekly"
            className="w-full px-4 py-3 rounded-lg border-0 outline-none transition-all"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#FFFFFF',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#FFFFFF' }}>
            Description *
          </label>
          <textarea
            value={showData.description || ''}
            onChange={(e) => setShowData({ ...showData, description: e.target.value })}
            placeholder="Describe what your podcast is about..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg border-0 outline-none transition-all resize-none"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#FFFFFF',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#FFFFFF' }}>
            Category *
          </label>
          <select
            value={showData.category || ''}
            onChange={(e) => setShowData({ ...showData, category: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border-0 outline-none transition-all"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#FFFFFF',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <option value="">Select a category...</option>
            {categories.map(cat => (
              <option key={cat} value={cat} style={{ backgroundColor: '#1a1a1a' }}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Topics */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#FFFFFF' }}>
            Topics (Add keywords for your show)
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTopic()}
              placeholder="e.g., AI, Machine Learning"
              className="flex-1 px-4 py-2 rounded-lg border-0 outline-none"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#FFFFFF',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
            />
            <button
              onClick={addTopic}
              className="px-4 py-2 rounded-lg font-medium"
              style={{
                backgroundColor: '#00D4E4',
                color: '#FFFFFF'
              }}
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {showData.topics?.map(topic => (
              <span
                key={topic}
                className="px-3 py-1 rounded-full text-sm flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(0, 212, 228, 0.2)',
                  color: '#00D4E4'
                }}
              >
                {topic}
                <button
                  onClick={() => removeTopic(topic)}
                  className="hover:opacity-70"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

const StyleStep: React.FC<{ showData: Partial<CreateShowRequest>; setShowData: Function; styles: any[] }> = ({ showData, setShowData, styles }) => {
  return (
    <GlassCard className="p-8" glow>
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#FFFFFF' }}>
        Choose Podcast Style
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {styles.map(style => (
          <button
            key={style.id}
            onClick={() => setShowData({ ...showData, style: style.id })}
            className="p-6 rounded-xl transition-all text-left relative"
            style={{
              backgroundColor: showData.style === style.id ? 'rgba(0, 212, 228, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: showData.style === style.id ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
              boxShadow: showData.style === style.id ? '0 0 20px rgba(0, 212, 228, 0.3)' : 'none'
            }}
          >
            {style.recommended && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium"
                   style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}>
                Recommended
              </div>
            )}
            <div className="text-3xl mb-3">{style.icon}</div>
            <h3 className="font-semibold mb-2" style={{ color: '#FFFFFF' }}>{style.name}</h3>
            <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{style.description}</p>
          </button>
        ))}
      </div>

      {/* Episode Length */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: '#FFFFFF' }}>
          Default Episode Length
        </label>
        <div className="grid grid-cols-3 gap-3">
          {['10min', '15min', '20min'].map(length => (
            <button
              key={length}
              onClick={() => setShowData({ ...showData, episodeLength: length })}
              className="px-4 py-3 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: showData.episodeLength === length ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: showData.episodeLength === length ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
                color: showData.episodeLength === length ? '#00D4E4' : 'rgba(255, 255, 255, 0.6)'
              }}
            >
              {length}
            </button>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};

const PersonasStep: React.FC<{ showData: Partial<CreateShowRequest>; setShowData: Function; personas: AIPersona[] }> = ({ showData, setShowData, personas }) => {
  const togglePersona = (persona: AIPersona) => {
    const current = showData.personas || [];
    const exists = current.find(p => p.id === persona.id);

    if (exists) {
      setShowData({
        ...showData,
        personas: current.filter(p => p.id !== persona.id)
      });
    } else if (current.length < 3) {
      setShowData({
        ...showData,
        personas: [...current, persona]
      });
    }
  };

  const isSelected = (personaId: string) => {
    return showData.personas?.some(p => p.id === personaId) || false;
  };

  return (
    <GlassCard className="p-8" glow>
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
        Select AI Personas
      </h2>
      <p className="mb-6" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
        Choose 2-3 AI personalities for your show ({showData.personas?.length || 0}/3 selected)
      </p>

      <div className="grid grid-cols-2 gap-4">
        {personas.map(persona => (
          <button
            key={persona.id}
            onClick={() => togglePersona(persona)}
            disabled={!isSelected(persona.id) && (showData.personas?.length || 0) >= 3}
            className="p-6 rounded-xl transition-all text-left relative"
            style={{
              backgroundColor: isSelected(persona.id) ? `${persona.color}20` : 'rgba(255, 255, 255, 0.05)',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: isSelected(persona.id) ? persona.color : 'rgba(255, 255, 255, 0.1)',
              boxShadow: isSelected(persona.id) ? `0 0 20px ${persona.color}40` : 'none',
              opacity: !isSelected(persona.id) && (showData.personas?.length || 0) >= 3 ? 0.5 : 1,
              cursor: !isSelected(persona.id) && (showData.personas?.length || 0) >= 3 ? 'not-allowed' : 'pointer'
            }}
          >
            {isSelected(persona.id) && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                   style={{ backgroundColor: persona.color }}>
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="text-3xl mb-3">{persona.icon}</div>
            <h3 className="font-semibold mb-2" style={{ color: '#FFFFFF' }}>{persona.name}</h3>
            <p className="text-sm mb-3" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{persona.description}</p>
            <div className="flex flex-wrap gap-1">
              {persona.traits.map(trait => (
                <span
                  key={trait}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: `${persona.color}30`,
                    color: persona.color
                  }}
                >
                  {trait}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </GlassCard>
  );
};

const ScheduleStep: React.FC<{ showData: Partial<CreateShowRequest>; setShowData: Function }> = ({ showData, setShowData }) => {
  return (
    <GlassCard className="p-8" glow>
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#FFFFFF' }}>
        Publishing Schedule
      </h2>

      <div className="space-y-6">
        {/* Tone */}
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: '#FFFFFF' }}>
            Conversation Tone
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'friendly', name: 'Friendly & Casual', description: 'Warm and approachable' },
              { id: 'professional', name: 'Professional', description: 'Business-focused' },
              { id: 'humorous', name: 'Humorous', description: 'Light-hearted with jokes' },
              { id: 'analytical', name: 'Analytical', description: 'Deep dive and thorough' }
            ].map(tone => (
              <button
                key={tone.id}
                onClick={() => setShowData({ ...showData, tone: tone.id })}
                className="p-4 rounded-lg text-left transition-all"
                style={{
                  backgroundColor: showData.tone === tone.id ? 'rgba(0, 212, 228, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: showData.tone === tone.id ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="font-medium mb-1" style={{ color: '#FFFFFF' }}>{tone.name}</div>
                <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{tone.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)', borderLeft: '3px solid #00D4E4' }}>
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            💡 <strong>Tip:</strong> After creating your show, you can plan individual episodes with specific topics, scheduled dates, and custom content for each episode.
          </p>
        </div>
      </div>
    </GlassCard>
  );
};

const ReviewStep: React.FC<{ showData: Partial<CreateShowRequest> }> = ({ showData }) => {
  return (
    <GlassCard className="p-8" glow>
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#FFFFFF' }}>
        Review & Create
      </h2>

      <div className="space-y-6">
        {/* Show Info */}
        <div>
          <h3 className="text-lg font-semibold mb-3" style={{ color: '#00D4E4' }}>Show Information</h3>
          <div className="space-y-2">
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Title: </span>
              <span style={{ color: '#FFFFFF' }}>{showData.title}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Category: </span>
              <span style={{ color: '#FFFFFF' }}>{showData.category}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Description: </span>
              <span style={{ color: '#FFFFFF' }}>{showData.description}</span>
            </div>
          </div>
        </div>

        {/* Style */}
        <div>
          <h3 className="text-lg font-semibold mb-3" style={{ color: '#00D4E4' }}>Style & Format</h3>
          <div className="space-y-2">
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Style: </span>
              <span style={{ color: '#FFFFFF' }}>{showData.style}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Episode Length: </span>
              <span style={{ color: '#FFFFFF' }}>{showData.episodeLength}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Tone: </span>
              <span style={{ color: '#FFFFFF' }}>{showData.tone}</span>
            </div>
          </div>
        </div>

        {/* Personas */}
        <div>
          <h3 className="text-lg font-semibold mb-3" style={{ color: '#00D4E4' }}>AI Personas</h3>
          <div className="flex gap-3">
            {showData.personas?.map(persona => (
              <div
                key={persona.id}
                className="px-4 py-2 rounded-lg flex items-center gap-2"
                style={{ backgroundColor: `${persona.color}20`, color: persona.color }}
              >
                <span>{persona.icon}</span>
                <span className="font-medium">{persona.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Topics */}
        {showData.topics && showData.topics.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#00D4E4' }}>Topics</h3>
            <div className="flex flex-wrap gap-2">
              {showData.topics.map(topic => (
                <span
                  key={topic}
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ backgroundColor: 'rgba(0, 212, 228, 0.2)', color: '#00D4E4' }}
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default CreateAIShow;
