import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Play, Pause, Volume2, VolumeX, Music, ChevronDown, Upload, FileText, Settings, Download, Square, MessageCircle, RotateCcw, Mic2, Grid3X3, Minimize2 } from 'lucide-react';
import type { DocumentContent } from '../../types/document';
import { NarrationAPI } from '../../services/narrationApi';
import ChatterboxVoiceSelector from '../voice/ChatterboxVoiceSelector';
import ModernAudioPlayer from '../audio/ModernAudioPlayer';
import GlassCard from '../ui/GlassCard';
import { useTheme } from '../../contexts/ThemeContext';

// Voice settings interface
interface VoiceSettings {
  exaggeration: number;
  temperature: number;
  cfg_weight: number;
  min_p: number;
  top_p: number;
  repetition_penalty: number;
  seed: number;
  reference_audio?: File | null;
}

interface SingleVoiceNarrationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedContent?: DocumentContent[] | null;
  uploadedFiles?: File[] | null; // Add original files for backend processing
  onMinimize?: () => void;
  isMinimized?: boolean;
  onAudioGenerated?: (audioData: {
    id: string;
    audioUrl: string;
    trackData: any;
    title: string;
    shouldShowExternal?: boolean;
  }) => void;
}

const SingleVoiceNarrationPanel: React.FC<SingleVoiceNarrationPanelProps> = ({
  isOpen,
  onClose,
  uploadedContent,
  uploadedFiles,
  onMinimize,
  isMinimized = false,
  onAudioGenerated
}) => {
  const { theme } = useTheme();
  const [selectedVoice, setSelectedVoice] = useState('emma_en');
  const [narrationType, setNarrationType] = useState('summary');
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0.5); // Simulated audio level for animation
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showQuestionInput, setShowQuestionInput] = useState(false);
  const [question, setQuestion] = useState('');
  const [documentSummary, setDocumentSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [questionAnswer, setQuestionAnswer] = useState<string>('');
  const [backendProcessedContent, setBackendProcessedContent] = useState<string>('');
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [currentNarration, setCurrentNarration] = useState<{id: string, audioUrl: string, duration: number} | null>(null);
  const [internalUploadedFiles, setInternalUploadedFiles] = useState<File[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvancedVoiceSelector, setShowAdvancedVoiceSelector] = useState(true);
  const [contentCategory, setContentCategory] = useState<string>('');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    exaggeration: 0.5,
    temperature: 0.8,
    cfg_weight: 0.5,
    min_p: 0.05,
    top_p: 1.0,
    repetition_penalty: 1.2,
    seed: 0,
    reference_audio: null
  });
  const [showModernPlayer, setShowModernPlayer] = useState(false);
  const [currentTrackData, setCurrentTrackData] = useState<any>(null);
  const [playerMinimized, setPlayerMinimized] = useState(false);

  // Popular Chatterbox voices for simple selection mode
  const popularChatterboxVoices = [
    { id: 'emma_en', name: 'Emma', description: 'Professional English female', language: 'English' },
    { id: 'james_en', name: 'James', description: 'Authoritative English male', language: 'English' },
    { id: 'sophia_es', name: 'Sophia', description: 'Warm Spanish female', language: 'Spanish' },
    { id: 'am_adam', name: 'Adam', description: 'Confident American male', accent: 'American' },
    { id: 'bf_heart', name: 'Heart', description: 'Refined British female', accent: 'British' },
    { id: 'am_david', name: 'David', description: 'Friendly American male', accent: 'American' },
  ];

  const narrationTypes = [
    { id: 'summary', name: 'Summary', description: 'Condensed key points and main ideas' },
    { id: 'full', name: 'Full Article', description: 'Complete reading of the entire document' },
    { id: 'explanatory', name: 'Explanatory', description: 'Detailed explanations with context' },
    { id: 'briefing', name: 'Personalized Briefing', description: 'Tailored overview based on your interests' },
    { id: 'interactive', name: 'Interactive', description: 'Q&A style with key insights' },
  ];

  const musicOptions = [
    { id: 'none', name: 'No Music' },
    { id: 'ambient', name: 'Ambient Background' },
    { id: 'classical', name: 'Classical Light' },
    { id: 'nature', name: 'Nature Sounds' },
    { id: 'jazz', name: 'Soft Jazz' },
    { id: 'electronic', name: 'Electronic Minimal' },
  ];

  // Handle file drop for internal uploads
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setInternalUploadedFiles(acceptedFiles);
      setIsUploading(false);
      // Process the file immediately
      processDocumentThroughBackend(acceptedFiles);
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

  // Process document through backend API
  const processDocumentThroughBackend = async (filesToProcess?: File[]) => {
    const files = filesToProcess || uploadedFiles || internalUploadedFiles;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    setIsProcessingDocument(true);
    
    try {
      const response = await NarrationAPI.processDocument(file);
      
      if (response.success) {
        setBackendProcessedContent(response.document.text);
        console.log('Backend processed content:', response.document.text.substring(0, 200) + '...');
        return response.document.text;
      } else {
        console.error('Backend processing failed:', response);
        return null;
      }
    } catch (error) {
      console.error('Error processing document through backend:', error);
      return null;
    } finally {
      setIsProcessingDocument(false);
    }
  };

  // Generate AI summary from uploaded content
  const generateDocumentSummary = async () => {
    let content = '';

    // First try to get content from backend processing
    if (internalUploadedFiles && internalUploadedFiles.length > 0) {
      if (!backendProcessedContent) {
        content = await processDocumentThroughBackend(internalUploadedFiles) || '';
      } else {
        content = backendProcessedContent;
      }
    } else if (uploadedFiles && uploadedFiles.length > 0) {
      if (!backendProcessedContent) {
        content = await processDocumentThroughBackend() || '';
      } else {
        content = backendProcessedContent;
      }
    } 
    // Fallback to frontend processed content if backend fails
    else if (uploadedContent && uploadedContent.length > 0) {
      content = uploadedContent[0].content;
    }

    if (!content) {
      setDocumentSummary('No document content available for summary generation.');
      return;
    }
    
    setIsLoadingSummary(true);
    try {
      const response = await NarrationAPI.generateDocumentSummary(content);
      
      if (response.success) {
        setDocumentSummary(response.summary);
      } else {
        setDocumentSummary('Failed to generate summary. Please try again.');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      setDocumentSummary('Error generating summary. Please check your connection.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Get document summary for display
  const getDocumentSummary = () => {
    if ((!uploadedContent || uploadedContent.length === 0) && 
        (!uploadedFiles || uploadedFiles.length === 0) && 
        (!internalUploadedFiles || internalUploadedFiles.length === 0)) {
      return "No document uploaded. Please upload a document to see the summary.";
    }

    if (isProcessingDocument) {
      return "Processing document through backend...";
    }

    if (isLoadingSummary) {
      return "Generating AI summary...";
    }

    if (documentSummary) {
      return documentSummary;
    }

    return "Click 'Generate Summary' to see an AI-generated summary of your document.";
  };

  // Get document title for player
  const getDocumentTitle = () => {
    if (uploadedContent && uploadedContent.length > 0) {
      return uploadedContent[0].metadata?.fileName || uploadedContent[0].title || 'Document';
    }
    if (internalUploadedFiles && internalUploadedFiles.length > 0) {
      return internalUploadedFiles[0].name.replace(/\.[^/.]+$/, '') || 'Document';
    }
    if (uploadedFiles && uploadedFiles.length > 0) {
      return uploadedFiles[0].name.replace(/\.[^/.]+$/, '') || 'Document';
    }
    return 'AI Generated Podcast';
  };

  // Get voice name for display
  const getSelectedVoiceName = () => {
    const voice = popularChatterboxVoices.find(v => v.id === selectedVoice);
    return voice ? voice.name : 'AI Voice';
  };

  const handleGenerate = async () => {
    let content = '';

    // Try to use backend-processed content first
    if (backendProcessedContent) {
      content = backendProcessedContent;
    } else if (internalUploadedFiles && internalUploadedFiles.length > 0) {
      content = await processDocumentThroughBackend(internalUploadedFiles) || '';
    } else if (uploadedFiles && uploadedFiles.length > 0) {
      content = await processDocumentThroughBackend() || '';
    } else if (uploadedContent && uploadedContent.length > 0) {
      content = uploadedContent[0].content;
    }

    if (!content) {
      alert('No document content available. Please upload a document first.');
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await NarrationAPI.generateNarration(
        content,
        narrationType,
        selectedVoice,
        playbackSpeed,
        backgroundMusicEnabled,
        backgroundMusicEnabled ? selectedMusic : 'none',
        voiceSettings
      );
      
      if (response.success) {
        setGeneratedScript(response.script);
        
        // Handle audio if available
        if (response.audioUrl) {
          setCurrentNarration({
            id: response.audioId || 'narration',
            audioUrl: response.audioUrl,
            duration: response.duration || 0
          });
          setAudioUrl(response.audioUrl);
          
          // Create track data for the modern audio player
          const trackData = {
            title: getDocumentTitle(),
            artist: `${getSelectedVoiceName()} • IntelliCast AI`,
            duration: response.duration ? `${Math.floor(response.duration / 60)}:${Math.floor(response.duration % 60).toString().padStart(2, '0')}` : "Unknown",
            artwork: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=400&fit=crop&crop=center",
            description: documentSummary || `AI-generated ${narrationType} narration of your document using advanced voice synthesis.`
          };
          
          setCurrentTrackData(trackData);
          setShowModernPlayer(true);
          setIsPodcastPlaying(false); // Let the player control playback
          
          // Notify parent component about audio generation
          if (onAudioGenerated) {
            onAudioGenerated({
              id: response.audioId || 'narration',
              audioUrl: response.audioUrl,
              trackData: trackData,
              title: getDocumentTitle()
            });
          }
          
          // Create and configure audio element for fallback
          const audio = new Audio(`http://localhost:3004${response.audioUrl}`);
          audio.onloadeddata = () => {
            console.log('Audio loaded successfully');
            setAudioElement(audio);
          };
          audio.onended = () => {
            setIsPodcastPlaying(false);
            setAudioLevel(0.5);
          };
          audio.onerror = () => {
            console.error('Failed to load audio');
          };
        } else {
          // Start animation without audio for document summaries
          setIsPodcastPlaying(true);
        }
        
        console.log('Narration generated successfully:', response);
      } else {
        alert('Failed to generate narration. Please try again.');
      }
    } catch (error) {
      console.error('Error generating narration:', error);
      alert('Error generating narration. Please check your connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate summary when document is loaded
  useEffect(() => {
    const hasContent = (uploadedContent && uploadedContent.length > 0) || 
                      (uploadedFiles && uploadedFiles.length > 0) || 
                      (internalUploadedFiles && internalUploadedFiles.length > 0);
    if (hasContent && !documentSummary && !isLoadingSummary && !isProcessingDocument) {
      generateDocumentSummary();
    }
  }, [uploadedContent, uploadedFiles, internalUploadedFiles]);

  // Simulate voice intonation changes or use real audio data
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPodcastPlaying) {
      if (audioElement && currentNarration) {
        // Use real audio context for better visualization (simplified version)
        interval = setInterval(() => {
          if (!audioElement.paused) {
            // Simulate audio analysis - in a real implementation, you'd use Web Audio API
            const randomLevel = Math.random() * 0.8 + 0.2;
            setAudioLevel(randomLevel);
          }
        }, 100); // Faster updates for real audio
      } else {
        // Fallback to simulated animation
        interval = setInterval(() => {
          setAudioLevel(Math.random() * 0.8 + 0.2);
        }, 200);
      }
    }
    return () => clearInterval(interval);
  }, [isPodcastPlaying, audioElement, currentNarration]);

  const handleDownload = () => {
    if (currentNarration && audioUrl) {
      const link = document.createElement('a');
      link.href = `http://localhost:3004${audioUrl}`;
      link.download = `narration_${currentNarration.id}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.log('No audio available for download');
    }
  };

  const handleStop = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    setIsPodcastPlaying(false);
    setAudioLevel(0.5);
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      return;
    }

    let content = '';
    
    // Try to use backend-processed content first
    if (backendProcessedContent) {
      content = backendProcessedContent;
    } else if (internalUploadedFiles && internalUploadedFiles.length > 0) {
      content = await processDocumentThroughBackend(internalUploadedFiles) || '';
    } else if (uploadedFiles && uploadedFiles.length > 0) {
      content = await processDocumentThroughBackend() || '';
    } else if (uploadedContent && uploadedContent.length > 0) {
      content = uploadedContent[0].content;
    }

    if (!content) {
      alert('No document content available for questions.');
      return;
    }

    const currentQuestion = question;
    
    setQuestion('');
    setShowQuestionInput(false);
    
    try {
      const response = await NarrationAPI.askQuestion(content, currentQuestion);
      
      if (response.success) {
        setQuestionAnswer(response.answer);
        // Show the answer in an alert for now (could be improved with a modal)
        alert(`Q: ${currentQuestion}\n\nA: ${response.answer}`);
      } else {
        alert('Failed to get answer. Please try again.');
      }
    } catch (error) {
      console.error('Error asking question:', error);
      alert('Error asking question. Please check your connection.');
    }
  };

  // Voice animation component (for button)
  const VoiceAnimation = () => (
    <div className="flex items-center justify-center space-x-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-1 h-5 bg-white rounded-full animate-pulse"
          style={{
            animation: `wave 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );

  // Dynamic voice-responsive animation component
  const VoiceResponsiveAnimation = () => {
    const intensity = audioLevel;
    const scale = 1 + (intensity * 0.3); // Scale between 1 and 1.3 based on voice level
    
    return (
      <div className="space-y-6">
        {/* Voice Animation Circle */}
        <div className="relative flex items-center justify-center">
          {/* Dynamic gradient circle that responds to voice */}
          <div 
            className="w-40 h-40 rounded-full transition-transform duration-200 ease-out"
            style={{
              background: `conic-gradient(from 0deg,
                rgba(20, 184, 166, ${0.7 + intensity * 0.3}) 0deg,
                rgba(6, 182, 212, ${0.8 + intensity * 0.2}) 45deg,
                rgba(37, 99, 235, ${0.9 + intensity * 0.1}) 90deg,
                rgba(29, 78, 216, ${0.95 + intensity * 0.05}) 135deg,
                rgba(37, 99, 235, ${0.9 + intensity * 0.1}) 180deg,
                rgba(6, 182, 212, ${0.8 + intensity * 0.2}) 225deg,
                rgba(20, 184, 166, ${0.7 + intensity * 0.3}) 270deg,
                rgba(56, 189, 248, ${0.6 + intensity * 0.4}) 315deg,
                rgba(20, 184, 166, ${0.7 + intensity * 0.3}) 360deg)`,
              transform: `scale(${scale})`,
              filter: `blur(${1 - intensity * 0.8}px)`,
            }}
          />
          
          {/* Central play/pause button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button 
              onClick={() => {
                if (audioElement && currentNarration) {
                  if (isPodcastPlaying) {
                    audioElement.pause();
                    setIsPodcastPlaying(false);
                  } else {
                    audioElement.play().then(() => {
                      setIsPodcastPlaying(true);
                    }).catch(err => console.error('Play failed:', err));
                  }
                } else {
                  // Fallback for animation-only mode
                  setIsPodcastPlaying(!isPodcastPlaying);
                }
              }}
              className="w-16 h-16 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors shadow-lg border-2"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(156, 163, 175, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme === 'dark' ? '#FFFFFF' : '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.95)';
              }}
            >
              {isPodcastPlaying ? (
                <Pause className="w-6 h-6 text-gray-800" />
              ) : (
                <Play className="w-6 h-6 text-gray-800 ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="rounded-lg p-4 border shadow-sm space-y-4" style={{
          backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF',
          borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(156, 163, 175, 0.2)'
        }}>
          {/* Primary Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleStop}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(156, 163, 175, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Stop"
            >
              <Square className="w-5 h-5" style={{
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4B5563'
              }} />
            </button>
            
            <button
              onClick={() => {
                if (audioElement && currentNarration) {
                  if (isPodcastPlaying) {
                    audioElement.pause();
                    setIsPodcastPlaying(false);
                  } else {
                    audioElement.play().then(() => {
                      setIsPodcastPlaying(true);
                    }).catch(err => console.error('Play failed:', err));
                  }
                } else {
                  setIsPodcastPlaying(!isPodcastPlaying);
                }
              }}
              className="p-3 text-white rounded-lg transition-colors"
              style={{
                backgroundColor: '#3B82F6'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
              }}
            >
              {isPodcastPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(156, 163, 175, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Download"
            >
              <Download className="w-5 h-5" style={{
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4B5563'
              }} />
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{
              color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4B5563'
            }}>Speed</span>
            <div className="flex items-center space-x-2">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    setPlaybackSpeed(speed);
                    if (audioElement) {
                      audioElement.playbackRate = speed;
                    }
                  }}
                  className="px-2 py-1 text-xs rounded transition-colors"
                  style={{
                    backgroundColor: playbackSpeed === speed 
                      ? '#3B82F6' 
                      : (theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(156, 163, 175, 0.1)'),
                    color: playbackSpeed === speed 
                      ? '#FFFFFF' 
                      : (theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4B5563')
                  }}
                  onMouseEnter={(e) => {
                    if (playbackSpeed !== speed) {
                      e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(156, 163, 175, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (playbackSpeed !== speed) {
                      e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(156, 163, 175, 0.1)';
                    }
                  }}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Ask Question */}
          <div className="space-y-2">
            {!showQuestionInput ? (
              <button
                onClick={() => setShowQuestionInput(true)}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-colors text-sm"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(156, 163, 175, 0.1)',
                  color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#4B5563'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(156, 163, 175, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(156, 163, 175, 0.1)';
                }}
              >
                <MessageCircle className="w-4 h-4" />
                <span>Ask Question</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about the content..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF',
                    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(156, 163, 175, 0.3)',
                    color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={!question.trim()}
                  className="px-3 py-2 text-white rounded-lg transition-colors text-sm"
                  style={{
                    backgroundColor: question.trim() ? '#3B82F6' : (theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(156, 163, 175, 0.3)')
                  }}
                  onMouseEnter={(e) => {
                    if (question.trim()) {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (question.trim()) {
                      e.currentTarget.style.backgroundColor = '#3B82F6';
                    }
                  }}
                >
                  Ask
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  // Minimized panel view
  if (isMinimized) {
    return (
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
        <div className="w-16 h-48 bg-dark-900/95 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-xl overflow-hidden flex flex-col">
          {/* Minimized Header */}
          <div className="p-3 bg-white/5 backdrop-blur-md border-b border-white/10 flex flex-col items-center space-y-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <Mic2 className="w-3 h-3 text-white" />
            </div>
            <div className="flex flex-col items-center space-y-1">
              <button
                onClick={onMinimize}
                className="p-1 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
                title="Expand Panel"
              >
                <ChevronDown className="w-4 h-4 transform rotate-90" />
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
                title="Close Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Minimized Audio Controls */}
          {showModernPlayer && currentTrackData && (
            <div className="flex-1 flex flex-col items-center justify-center p-2 space-y-2">
              {/* Play/Pause Button */}
              <button
                onClick={() => {
                  if (audioElement && currentNarration) {
                    if (isPodcastPlaying) {
                      audioElement.pause();
                      setIsPodcastPlaying(false);
                    } else {
                      audioElement.play().then(() => {
                        setIsPodcastPlaying(true);
                      }).catch(err => console.error('Play failed:', err));
                    }
                  }
                }}
                className="w-8 h-8 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center transition-colors"
              >
                {isPodcastPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
              </button>
              
              {/* Progress indicator */}
              <div className="w-1 h-16 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="w-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ 
                    height: isPodcastPlaying ? `${audioLevel * 100}%` : '20%',
                    transform: 'translateY(100%)',
                    animation: isPodcastPlaying ? 'none' : 'pulse 2s infinite'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes wave {
            0%, 40%, 100% {
              transform: scaleY(0.4);
            }
            20% {
              transform: scaleY(1);
            }
          }
          
          @keyframes rotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop for the left side */}
        <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      {/* Main Panel Container - Half Screen */}
      <div className="w-1/2 backdrop-blur-3xl border-l shadow-2xl overflow-hidden flex flex-col relative" style={{
        backgroundColor: theme === 'dark' ? 'rgba(15, 15, 35, 0.95)' : '#FBF5F0',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(156, 163, 175, 0.2)'
      }}>
        {/* Animated Background */}
        {theme === 'dark' && (
          <>
            <div className="absolute inset-0 mesh-gradient opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 to-secondary-900/20" />
          </>
        )}
        
        {/* Top Control Bar */}
        <div className="absolute top-6 left-6 z-[100] flex items-center space-x-3">
          <button
            onClick={onMinimize || (() => console.log('Minimize clicked'))}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xl border-2 border-blue-500"
            title="Minimize Panel"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
          <button
            onClick={onClose}
            className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xl border-2 border-red-500"
            title="Close Panel"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 backdrop-blur-md border-b" style={{
          backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
          borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(156, 163, 175, 0.2)'
        }}>
          <h1 className="text-2xl font-bold flex items-center space-x-3" style={{
            color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
          }}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <Mic2 className="w-4 h-4 text-white" />
            </div>
            <span>Single Voice Narration</span>
          </h1>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Top Section - Side by Side Layout */}
          <div className="flex p-6 space-x-6">
            {/* Left Side - Document Summary Section */}
            <div className="flex-1">
              <GlassCard variant="medium" className="p-6 h-full" glow>
                {(uploadedContent && uploadedContent.length > 0) || 
                 (uploadedFiles && uploadedFiles.length > 0) || 
                 (internalUploadedFiles && internalUploadedFiles.length > 0) ? (
                  <>
                    <h2 className="text-xl font-bold mb-2" style={{
                      color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
                    }}>Document Summary</h2>
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <FileText className="w-5 h-5 text-primary-400" />
                        <span className="text-sm font-medium" style={{
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#1F2937'
                        }}>
                          {uploadedContent && uploadedContent.length > 0 
                            ? uploadedContent[0].metadata?.fileName || uploadedContent[0].title
                            : internalUploadedFiles && internalUploadedFiles.length > 0
                              ? internalUploadedFiles[0].name
                              : uploadedFiles && uploadedFiles.length > 0 
                                ? uploadedFiles[0].name 
                                : 'Document'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Document Summary Content */}
                    <div className="backdrop-blur-sm rounded-lg p-4 mb-4 border" style={{
                      backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF',
                      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                    }}>
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-sm leading-relaxed flex-1" style={{
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#4B5563'
                        }}>
                          {getDocumentSummary()}
                        </p>
                        {!documentSummary && !isLoadingSummary && (
                          <button
                            onClick={generateDocumentSummary}
                            className="ml-3 px-3 py-1 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-500 hover:to-secondary-500 transition-all duration-300 text-xs whitespace-nowrap shadow-lg hover:shadow-primary-500/25"
                          >
                            Generate Summary
                          </button>
                        )}
                      </div>
                      {isLoadingSummary && (
                        <div className="flex items-center space-x-2 mt-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-xs text-primary-400">AI is analyzing your document...</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Document Stats */}
                    {uploadedContent && uploadedContent.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="backdrop-blur-sm rounded-lg p-3 border" style={{
                          backgroundColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                          borderColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'
                        }}>
                          <div className="font-medium" style={{
                            color: theme === 'dark' ? '#C4B5FD' : '#3B82F6'
                          }}>Word Count</div>
                          <div style={{
                            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#1F2937'
                          }}>{uploadedContent[0].metadata?.wordCount || uploadedContent[0].content.split(' ').length} words</div>
                        </div>
                        <div className="backdrop-blur-sm rounded-lg p-3 border" style={{
                          backgroundColor: theme === 'dark' ? 'rgba(219, 39, 119, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                          borderColor: theme === 'dark' ? 'rgba(219, 39, 119, 0.3)' : 'rgba(16, 185, 129, 0.2)'
                        }}>
                          <div className="font-medium" style={{
                            color: theme === 'dark' ? '#F9A8D4' : '#10B981'
                          }}>Est. Reading Time</div>
                          <div style={{
                            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#1F2937'
                          }}>{Math.ceil((uploadedContent[0].metadata?.wordCount || uploadedContent[0].content.split(' ').length) / 250)} min</div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold mb-2" style={{
                      color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
                    }}>Upload Your Document</h2>
                    <p className="text-sm mb-6" style={{
                      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4B5563'
                    }}>We support PDF, EPUB, DOCX, and TXT formats. Maximum file size is 50MB.</p>
                    
                    {/* Upload Area */}
                    <div 
                      {...getRootProps()} 
                      className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors cursor-pointer backdrop-blur-sm ${
                        isDragActive 
                          ? (theme === 'dark' ? 'border-primary-400 bg-primary-500/20' : 'border-blue-400 bg-blue-50') 
                          : (theme === 'dark' ? 'border-white/30 bg-white/10 hover:border-primary-400/50' : 'border-gray-300 bg-white hover:border-blue-400')
                      }`}
                    >
                      <input {...getInputProps()} />
                      <FileText className="w-10 h-10 mx-auto mb-3" style={{
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#9CA3AF'
                      }} />
                      {isDragActive ? (
                        <p className="text-sm mb-3" style={{
                          color: theme === 'dark' ? '#C4B5FD' : '#3B82F6'
                        }}>Drop your file here</p>
                      ) : (
                        <>
                          <p className="text-sm mb-3" style={{
                            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4B5563'
                          }}>Drag and drop your file here or click to browse</p>
                          <div className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 inline-block shadow-lg" style={{
                            background: theme === 'dark' ? 'linear-gradient(to right, #7C3AED, #DB2777)' : '#3B82F6'
                          }}>Choose File</div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </GlassCard>
            </div>

            {/* Right Side - Customize Options */}
            <div className="flex-1">
              <GlassCard variant="medium" className="p-6 h-full" glow>
              <h2 className="text-xl font-bold mb-2" style={{
                color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
              }}>Customize Your Podcast</h2>
              <p className="text-sm mb-6" style={{
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4B5563'
              }}>Personalize your audio experience with our customization options.</p>

                {/* Voice Selection */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4" style={{
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#1F2937'
                      }} />
                      <h3 className="font-medium text-sm" style={{
                        color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
                      }}>Voice Selection</h3>
                      <span className="text-xs bg-secondary-500/30 text-secondary-200 px-2 py-1 rounded-full backdrop-blur-sm border border-secondary-400/30">Chatterbox Multilingual</span>
                    </div>
                    <button
                      onClick={() => setShowAdvancedVoiceSelector(!showAdvancedVoiceSelector)}
                      className="flex items-center space-x-1 text-xs text-primary-300 hover:text-primary-200 transition-colors"
                      title={showAdvancedVoiceSelector ? 'Switch to simple selection' : 'Browse all Chatterbox multilingual voices'}
                    >
                      {showAdvancedVoiceSelector ? (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          <span>Simple</span>
                        </>
                      ) : (
                        <>
                          <Grid3X3 className="w-3 h-3" />
                          <span>All Voices</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {showAdvancedVoiceSelector ? (
                    <div className="border rounded-lg p-4 backdrop-blur-sm" style={{
                      backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF',
                      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                    }}>
                      <ChatterboxVoiceSelector
                        selectedVoice={selectedVoice}
                        onVoiceChange={setSelectedVoice}
                        showAdvanced={true}
                        compact={true}
                        contentCategory={contentCategory || 'general'}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs block mb-1" style={{
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#4B5563'
                      }}>Primary Narrator</label>
                      <p className="text-xs mb-2" style={{
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6B7280'
                      }}>Popular Chatterbox multilingual voices (click "All Voices" for full selection)</p>
                      <div className="relative">
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full px-3 py-2 text-sm backdrop-blur-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                          style={{
                            backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF',
                            borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(156, 163, 175, 0.3)',
                            color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
                          }}
                        >
                          {popularChatterboxVoices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.name} ({voice.language}, {voice.description})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6B7280'
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Voice Customization */}
                <div className="mb-6">
                  <div className="p-3 backdrop-blur-sm rounded-lg border" style={{
                    backgroundColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                    borderColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'
                  }}>
                    <h4 className="text-sm font-medium mb-2" style={{
                      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#1F2937'
                    }}>Voice Customization (Advanced)</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs block mb-1" style={{
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#4B5563'
                        }}>Exaggeration</label>
                        <input
                          type="range"
                          min="0.25"
                          max="2"
                          step="0.05"
                          value={voiceSettings.exaggeration}
                          onChange={(e) => setVoiceSettings(prev => ({...prev, exaggeration: parseFloat(e.target.value)}))}
                          className="w-full accent-primary-500"
                        />
                        <span className="text-xs" style={{
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6B7280'
                        }}>{voiceSettings.exaggeration.toFixed(2)}</span>
                      </div>
                      
                      <div>
                        <label className="text-xs block mb-1" style={{
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#4B5563'
                        }}>Temperature</label>
                        <input
                          type="range"
                          min="0.05"
                          max="2"
                          step="0.05"
                          value={voiceSettings.temperature}
                          onChange={(e) => setVoiceSettings(prev => ({...prev, temperature: parseFloat(e.target.value)}))}
                          className="w-full accent-primary-500"
                        />
                        <span className="text-xs" style={{
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6B7280'
                        }}>{voiceSettings.temperature.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Format Options */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Settings className="w-4 h-4" style={{
                      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#1F2937'
                    }} />
                    <h3 className="font-medium text-sm" style={{
                      color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
                    }}>Format Options</h3>
                  </div>
                  
                  <div className="mb-4">
                    <label className="text-xs block mb-1" style={{
                      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#4B5563'
                    }}>Podcast Style</label>
                    <p className="text-xs mb-2" style={{
                      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6B7280'
                    }}>Choose your preferred style</p>
                    <div className="relative">
                      <select
                        value={narrationType}
                        onChange={(e) => setNarrationType(e.target.value)}
                        className="w-full px-3 py-2 text-sm backdrop-blur-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                        style={{
                          backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF',
                          borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(156, 163, 175, 0.3)',
                          color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
                        }}
                      >
                        <option value="conversational">Conversational Podcast</option>
                        {narrationTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6B7280'
                      }} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs block mb-1" style={{
                      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#4B5563'
                    }}>Background Music</label>
                    <p className="text-xs mb-2" style={{
                      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6B7280'
                    }}>Add ambient background music</p>
                    <div className="relative">
                      <select
                        value={backgroundMusicEnabled ? selectedMusic : 'none'}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'none') {
                            setBackgroundMusicEnabled(false);
                          } else {
                            setBackgroundMusicEnabled(true);
                            setSelectedMusic(value);
                          }
                        }}
                        className="w-full px-3 py-2 text-sm backdrop-blur-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                        style={{
                          backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF',
                          borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(156, 163, 175, 0.3)',
                          color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
                        }}
                      >
                        {musicOptions.map((music) => (
                          <option key={music.id} value={music.id}>
                            {music.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6B7280'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Convert Button or Modern Audio Player */}
                {showModernPlayer && currentTrackData ? (
                  <div className="py-6">
                    <GlassCard variant="dark" className="p-6" glow>
                      <div className="text-center mb-4">
                        <h3 className="font-semibold mb-2" style={{
                          color: theme === 'dark' ? '#FFFFFF' : '#1F2937'
                        }}>🎧 Your Podcast is Ready!</h3>
                        <p className="text-sm" style={{
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#4B5563'
                        }}>Enjoy your AI-generated audio experience</p>
                      </div>
                      <div className="bg-gradient-to-br from-primary-600/20 to-secondary-600/20 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                        <ModernAudioPlayer
                          audioUrl={currentNarration ? `http://localhost:3004${currentNarration.audioUrl}` : undefined}
                          trackData={currentTrackData}
                          isMinimized={false}
                          onToggleMinimize={() => {
                            // Notify parent to show external audio player
                            if (onAudioGenerated) {
                              onAudioGenerated({
                                id: currentNarration?.id || 'narration',
                                audioUrl: currentNarration?.audioUrl || '',
                                trackData: currentTrackData,
                                title: getDocumentTitle(),
                                shouldShowExternal: true
                              });
                            }
                            setShowModernPlayer(false);
                          }}
                          onClose={() => {
                            setShowModernPlayer(false);
                            setCurrentTrackData(null);
                            if (audioElement) {
                              audioElement.pause();
                              audioElement.currentTime = 0;
                            }
                            setIsPodcastPlaying(false);
                          }}
                        />
                      </div>
                    </GlassCard>
                  </div>
                ) : isPodcastPlaying ? (
                  <div className="py-6">
                    <VoiceResponsiveAnimation />
                  </div>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={((!uploadedContent || uploadedContent.length === 0) && 
                              (!uploadedFiles || uploadedFiles.length === 0) && 
                              (!internalUploadedFiles || internalUploadedFiles.length === 0)) || 
                              isGenerating}
                    className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl font-semibold text-sm hover:from-primary-500 hover:to-secondary-500 disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-primary-500/25"
                  >
                    {isGenerating ? (
                      <div className="flex items-center justify-center space-x-3">
                        <span>Generating...</span>
                        <VoiceAnimation />
                      </div>
                    ) : (
                      '🎙️ Convert to Podcast'
                    )}
                  </button>
                )}
              </GlassCard>
            </div>
          </div>
        </div>

      </div>
    </div>
    </>
  );
};

export default SingleVoiceNarrationPanel;