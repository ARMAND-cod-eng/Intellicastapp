import React, { useState } from 'react';
import { ArrowLeft, Upload, Calendar, Sparkles, FileText, Plus, X, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import GlassCard from '../ui/GlassCard';
import type { PodcastShow, CreateEpisodeRequest } from '../../types/podcast';

interface CreateEpisodeProps {
  show: PodcastShow;
  onBack: () => void;
  onCreate: (episode: CreateEpisodeRequest) => void;
}

const CreateEpisode: React.FC<CreateEpisodeProps> = ({ show, onBack, onCreate }) => {
  const [episodeData, setEpisodeData] = useState<Partial<CreateEpisodeRequest>>({
    showId: show.id,
    title: '',
    description: '',
    keyPoints: [],
    generateNow: false,
    scheduledDate: undefined
  });

  const [keyPointInput, setKeyPointInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // File upload handling
  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
      setEpisodeData(prev => ({
        ...prev,
        sourceDocument: acceptedFiles[0]
      }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  // Add key point
  const addKeyPoint = () => {
    if (keyPointInput.trim() && !episodeData.keyPoints?.includes(keyPointInput.trim())) {
      setEpisodeData({
        ...episodeData,
        keyPoints: [...(episodeData.keyPoints || []), keyPointInput.trim()]
      });
      setKeyPointInput('');
    }
  };

  // Remove key point
  const removeKeyPoint = (point: string) => {
    setEpisodeData({
      ...episodeData,
      keyPoints: episodeData.keyPoints?.filter(p => p !== point) || []
    });
  };

  // Handle create
  const handleCreate = () => {
    if (!episodeData.title || !episodeData.description) {
      alert('Please fill in title and description');
      return;
    }

    onCreate(episodeData as CreateEpisodeRequest);
  };

  // Auto-generate title from content
  const suggestTitle = () => {
    if (episodeData.keyPoints && episodeData.keyPoints.length > 0) {
      const suggested = episodeData.keyPoints[0];
      setEpisodeData({ ...episodeData, title: suggested });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
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
          Back to Episodes
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center"
               style={{
                 background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
                 boxShadow: '0 0 30px rgba(0, 212, 228, 0.4)'
               }}>
            <Plus className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>
              Create New Episode
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              for {show.title}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Episode Information */}
        <GlassCard className="p-6" glow>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
            <FileText className="w-5 h-5" style={{ color: '#00D4E4' }} />
            Episode Information
          </h2>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium" style={{ color: '#FFFFFF' }}>
                  Episode Title *
                </label>
                {episodeData.keyPoints && episodeData.keyPoints.length > 0 && (
                  <button
                    onClick={suggestTitle}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{
                      backgroundColor: 'rgba(0, 212, 228, 0.2)',
                      color: '#00D4E4'
                    }}
                  >
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    Suggest from key points
                  </button>
                )}
              </div>
              <input
                type="text"
                value={episodeData.title || ''}
                onChange={(e) => setEpisodeData({ ...episodeData, title: e.target.value })}
                placeholder="e.g., The Future of Quantum Computing"
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
                Episode Description *
              </label>
              <textarea
                value={episodeData.description || ''}
                onChange={(e) => setEpisodeData({ ...episodeData, description: e.target.value })}
                placeholder="Describe what this episode will cover..."
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
          </div>
        </GlassCard>

        {/* Key Discussion Points */}
        <GlassCard className="p-6" glow>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
            <Zap className="w-5 h-5" style={{ color: '#00D4E4' }} />
            Key Discussion Points
          </h2>

          <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Add main topics the AI should discuss in this episode
          </p>

          {/* Add Key Point */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={keyPointInput}
              onChange={(e) => setKeyPointInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addKeyPoint()}
              placeholder="e.g., Quantum entanglement basics"
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
              onClick={addKeyPoint}
              className="px-4 py-2 rounded-lg font-medium"
              style={{
                backgroundColor: '#00D4E4',
                color: '#FFFFFF'
              }}
            >
              Add
            </button>
          </div>

          {/* Key Points List */}
          {episodeData.keyPoints && episodeData.keyPoints.length > 0 && (
            <div className="space-y-2">
              {episodeData.keyPoints.map((point, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(0, 212, 228, 0.1)',
                    borderLeft: '3px solid #00D4E4'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                         style={{ backgroundColor: '#00D4E4', color: '#FFFFFF' }}>
                      {index + 1}
                    </div>
                    <span style={{ color: '#FFFFFF' }}>{point}</span>
                  </div>
                  <button
                    onClick={() => removeKeyPoint(point)}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Source Document (Optional) */}
        <GlassCard className="p-6" glow>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
            <Upload className="w-5 h-5" style={{ color: '#00D4E4' }} />
            Source Document (Optional)
          </h2>

          <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Upload a document for the AI to use as reference material
          </p>

          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragActive ? 'bg-cyan-500/20' : 'bg-white/5 hover:bg-white/10'
              }`}
              style={{
                borderColor: isDragActive ? '#00D4E4' : 'rgba(255, 255, 255, 0.2)'
              }}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-3" style={{
                color: 'rgba(255, 255, 255, 0.5)'
              }} />
              {isDragActive ? (
                <p style={{ color: '#00D4E4' }}>Drop your file here</p>
              ) : (
                <>
                  <p className="mb-2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Drag and drop your file here or click to browse
                  </p>
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Supports PDF, DOCX, TXT, MD (Max 50MB)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-lg"
                 style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                     style={{ backgroundColor: '#00D4E4' }}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium" style={{ color: '#FFFFFF' }}>{uploadedFile.name}</p>
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setUploadedFile(null);
                  setEpisodeData(prev => ({ ...prev, sourceDocument: undefined }));
                }}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </GlassCard>

        {/* Schedule & Generation */}
        <GlassCard className="p-6" glow>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#FFFFFF' }}>
            <Calendar className="w-5 h-5" style={{ color: '#00D4E4' }} />
            Schedule & Generation
          </h2>

          <div className="space-y-4">
            {/* Scheduled Date */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#FFFFFF' }}>
                Publish Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={episodeData.scheduledDate ? new Date(episodeData.scheduledDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEpisodeData({
                  ...episodeData,
                  scheduledDate: e.target.value ? new Date(e.target.value) : undefined
                })}
                className="w-full px-4 py-3 rounded-lg border-0 outline-none"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#FFFFFF',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  colorScheme: 'dark'
                }}
              />
            </div>

            {/* Generate Now */}
            <div className="flex items-center justify-between p-4 rounded-lg"
                 style={{ backgroundColor: 'rgba(0, 212, 228, 0.1)' }}>
              <div>
                <p className="font-medium mb-1" style={{ color: '#FFFFFF' }}>
                  Generate Audio Now
                </p>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Start AI generation immediately after creating episode
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={episodeData.generateNow || false}
                  onChange={(e) => setEpisodeData({ ...episodeData, generateNow: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                     style={{
                       backgroundColor: episodeData.generateNow ? '#00D4E4' : 'rgba(255, 255, 255, 0.2)'
                     }}>
                </div>
              </label>
            </div>
          </div>
        </GlassCard>

        {/* Show Configuration Preview */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
            Episode Configuration
          </h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Show: </span>
              <span style={{ color: '#FFFFFF' }}>{show.title}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Style: </span>
              <span style={{ color: '#FFFFFF' }}>{show.style}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Length: </span>
              <span style={{ color: '#FFFFFF' }}>{show.episodeLength}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Speakers: </span>
              <span style={{ color: '#FFFFFF' }}>{show.personas?.length || 0}</span>
            </div>
          </div>

          {/* Personas */}
          {show.personas && show.personas.length > 0 && (
            <div className="mt-4">
              <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>AI Personas:</span>
              <div className="flex gap-2 mt-2">
                {show.personas.map(persona => (
                  <div
                    key={persona.id}
                    className="px-3 py-1 rounded-full text-sm flex items-center gap-1"
                    style={{ backgroundColor: `${persona.color}20`, color: persona.color }}
                  >
                    <span>{persona.icon}</span>
                    <span>{persona.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 px-6 py-4 rounded-xl font-medium transition-all"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 px-6 py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 20px rgba(0, 212, 228, 0.4)'
            }}
          >
            {episodeData.generateNow ? (
              <>
                <Sparkles className="w-5 h-5" />
                Create & Generate
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Create Episode
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEpisode;
