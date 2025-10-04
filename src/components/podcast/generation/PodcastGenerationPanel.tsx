// Podcast Generation Panel with Backend Integration
import React, { useState, useEffect } from 'react';
import { Sparkles, Upload, Wand2, DollarSign, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../ui/GlassCard';
import { usePodcastGeneration } from '../../../hooks/usePodcastGeneration';
import type { GenerationOptions } from '../../../hooks/usePodcastGeneration';

interface PodcastGenerationPanelProps {
  onEpisodeGenerated?: (episode: any) => void;
}

const PodcastGenerationPanel: React.FC<PodcastGenerationPanelProps> = ({ onEpisodeGenerated }) => {
  const {
    state,
    generatePodcast,
    estimateCost,
    recommendStyle,
    uploadFile,
    getDownloadUrl,
    reset,
  } = usePodcastGeneration();

  const [documentText, setDocumentText] = useState('');
  const [options, setOptions] = useState<Partial<GenerationOptions>>({
    length: '10min',
    numSpeakers: 2,
    style: 'conversational',
    tone: 'friendly',
  });
  const [costEstimate, setCostEstimate] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);

  // Auto-estimate cost when document changes
  useEffect(() => {
    if (documentText && documentText.length > 100) {
      const debounce = setTimeout(async () => {
        try {
          const estimate = await estimateCost(documentText, options.length || '10min');
          setCostEstimate(estimate);
        } catch (error) {
          console.error('Cost estimation failed:', error);
        }
      }, 1000);

      return () => clearTimeout(debounce);
    }
  }, [documentText, options.length, estimateCost]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setDocumentText(text);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('File upload failed:', error);
    }
  };

  const handleGetRecommendation = async () => {
    if (!documentText) return;

    try {
      const rec = await recommendStyle(documentText);
      setRecommendation(rec);

      // Auto-apply recommendation
      setOptions(prev => ({
        ...prev,
        style: rec.recommended_style,
        tone: rec.recommended_tone,
        numSpeakers: rec.num_speakers,
      }));
    } catch (error) {
      console.error('Recommendation failed:', error);
    }
  };

  const handleGenerate = async () => {
    if (!documentText) return;

    try {
      const generationOptions: GenerationOptions = {
        documentText,
        length: options.length || '10min',
        numSpeakers: options.numSpeakers || 2,
        style: options.style || 'conversational',
        tone: options.tone || 'friendly',
      };

      const result = await generatePodcast(generationOptions);

      if (result && onEpisodeGenerated) {
        const episode = {
          id: `generated_${Date.now()}`,
          title: 'AI Generated Podcast',
          audioUrl: result.audio_file ? getDownloadUrl(result.audio_file) : '',
          duration: result.duration_seconds || 0,
          metadata: result.metadata,
        };
        onEpisodeGenerated(episode);
      }
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="w-5 h-5" style={{ color: '#00D4E4' }} />
          <h3 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
            Document Input
          </h3>
        </div>

        {/* File Upload */}
        <div className="mb-4">
          <label
            className="block w-full px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all text-center"
            style={{
              borderColor: 'rgba(0, 212, 228, 0.3)',
              backgroundColor: 'rgba(0, 212, 228, 0.05)',
            }}
          >
            <input
              type="file"
              accept=".txt,.md,.pdf,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-2" style={{ color: '#00D4E4' }}>
              <Upload className="w-5 h-5" />
              <span>Upload Document</span>
            </div>
          </label>
        </div>

        {/* Text Area */}
        <textarea
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
          placeholder="Or paste your content here..."
          className="w-full px-4 py-3 rounded-lg resize-none font-mono text-sm"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            minHeight: '200px',
          }}
        />

        <div className="mt-2 text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          {documentText.length} characters
        </div>
      </GlassCard>

      {/* AI Recommendation */}
      {documentText.length > 100 && (
        <GlassCard className="p-6">
          <button
            onClick={handleGetRecommendation}
            disabled={state.status === 'analyzing'}
            className="w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
              color: '#FFFFFF',
              opacity: state.status === 'analyzing' ? 0.6 : 1,
            }}
          >
            <Wand2 className="w-5 h-5" />
            {state.status === 'analyzing' ? 'Analyzing...' : 'Get AI Recommendation'}
          </button>

          {recommendation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-lg"
              style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}
            >
              <div className="flex items-start gap-2 mb-2">
                <Sparkles className="w-5 h-5 mt-0.5" style={{ color: '#00D4E4' }} />
                <div>
                  <p className="font-medium" style={{ color: '#FFFFFF' }}>Recommended Style</p>
                  <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {recommendation.reasoning}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-sm" style={{
                      backgroundColor: 'rgba(0, 212, 228, 0.2)',
                      color: '#00D4E4'
                    }}>
                      {recommendation.recommended_style}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm" style={{
                      backgroundColor: 'rgba(0, 212, 228, 0.2)',
                      color: '#00D4E4'
                    }}>
                      {recommendation.num_speakers} speakers
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm" style={{
                      backgroundColor: 'rgba(0, 212, 228, 0.2)',
                      color: '#00D4E4'
                    }}>
                      {recommendation.recommended_tone}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </GlassCard>
      )}

      {/* Options */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold mb-4" style={{ color: '#FFFFFF' }}>
          Podcast Options
        </h3>

        <div className="space-y-4">
          {/* Length */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Length
            </label>
            <select
              value={options.length}
              onChange={(e) => setOptions({ ...options, length: e.target.value as any })}
              className="w-full px-4 py-2 rounded-lg"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
              }}
            >
              <option value="5min">5 minutes</option>
              <option value="10min">10 minutes</option>
              <option value="15min">15 minutes</option>
              <option value="20min">20 minutes</option>
              <option value="30min">30 minutes</option>
            </select>
          </div>

          {/* Speakers */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Number of Speakers
            </label>
            <select
              value={options.numSpeakers}
              onChange={(e) => setOptions({ ...options, numSpeakers: parseInt(e.target.value) as 2 | 3 })}
              className="w-full px-4 py-2 rounded-lg"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
              }}
            >
              <option value={2}>2 Speakers</option>
              <option value={3}>3 Speakers</option>
            </select>
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Conversation Style
            </label>
            <select
              value={options.style}
              onChange={(e) => setOptions({ ...options, style: e.target.value as any })}
              className="w-full px-4 py-2 rounded-lg"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
              }}
            >
              <option value="conversational">Conversational</option>
              <option value="expert-panel">Expert Panel</option>
              <option value="debate">Debate</option>
              <option value="interview">Interview</option>
              <option value="storytelling">Storytelling</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Cost Estimate */}
      {costEstimate && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5" style={{ color: '#00D4E4' }} />
            <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
              Estimated Cost
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>LLM</p>
              <p className="text-lg font-bold" style={{ color: '#00D4E4' }}>
                ${costEstimate.llm_cost.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>TTS</p>
              <p className="text-lg font-bold" style={{ color: '#00D4E4' }}>
                ${costEstimate.tts_cost.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Total</p>
              <p className="text-lg font-bold" style={{ color: '#00D4E4' }}>
                ${costEstimate.total_cost.toFixed(4)}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Generation Status */}
      {state.isGenerating && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Loader className="w-5 h-5 animate-spin" style={{ color: '#00D4E4' }} />
            <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
              Generating Podcast
            </h3>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <motion.div
                className="h-full"
                style={{ background: 'linear-gradient(90deg, #00D4E4 0%, #00E8FA 100%)' }}
                initial={{ width: 0 }}
                animate={{ width: `${state.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {state.message}
          </p>
        </GlassCard>
      )}

      {/* Error State */}
      {state.status === 'error' && (
        <GlassCard className="p-6" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)' }}>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" style={{ color: '#DC2626' }} />
            <div>
              <p className="font-medium" style={{ color: '#FFFFFF' }}>Generation Failed</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {state.error}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Success State */}
      {state.status === 'completed' && state.result && (
        <GlassCard className="p-6" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5" style={{ color: '#22C55E' }} />
            <div>
              <p className="font-medium" style={{ color: '#FFFFFF' }}>Podcast Generated Successfully!</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Duration: {state.result.duration_seconds}s | Cost: ${state.result.total_cost.toFixed(4)}
              </p>
            </div>
          </div>

          <button
            onClick={() => window.open(getDownloadUrl(state.result.audio_file), '_blank')}
            className="w-full px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
              color: '#FFFFFF',
            }}
          >
            Download Podcast
          </button>
        </GlassCard>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!documentText || state.isGenerating}
        className="w-full px-6 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
        style={{
          background: documentText && !state.isGenerating
            ? 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)'
            : 'rgba(255, 255, 255, 0.1)',
          color: documentText && !state.isGenerating ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
          cursor: documentText && !state.isGenerating ? 'pointer' : 'not-allowed',
        }}
      >
        <Sparkles className="w-5 h-5" />
        {state.isGenerating ? 'Generating...' : 'Generate Podcast'}
      </button>
    </div>
  );
};

export default PodcastGenerationPanel;
