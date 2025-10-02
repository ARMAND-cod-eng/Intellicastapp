import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Share2,
  Bookmark,
  Copy,
  Printer,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Volume2,
  VolumeX,
  Download,
  Sparkles,
  CheckCircle,
  Search,
  ArrowRight
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import type { TavilySearchResponse } from '../services/tavily-client';
import { createDetailedAnswerGenerator, extractCitations, buildCitationList } from '../services/together-detailed-answer';
import { ENDPOINTS, getAudioUrl } from '../../../config/api';

interface AIAnswerTabProps {
  searchData: TavilySearchResponse;
  isLoading?: boolean;
  onFollowUpSearch?: (query: string) => void;
  onSaveEpisode?: () => void;
  mode?: 'simple' | 'detailed';
}

const AIAnswerTab: React.FC<AIAnswerTabProps> = ({
  searchData,
  isLoading = false,
  onFollowUpSearch,
  onSaveEpisode,
  mode = 'simple'
}) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<number | null>(null);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  // State for detailed answer generation
  const [detailedAnswer, setDetailedAnswer] = useState<string | null>(null);
  const [detailedFollowUps, setDetailedFollowUps] = useState<string[]>([]);
  const [isGeneratingDetailed, setIsGeneratingDetailed] = useState(false);
  const [detailedWordCount, setDetailedWordCount] = useState(0);

  // Calculate estimated reading/listening time
  const currentAnswer = mode === 'detailed' && detailedAnswer ? detailedAnswer : searchData?.answer || '';
  const wordCount = currentAnswer.split(' ').length || 0;
  const readTime = Math.ceil(wordCount / 200); // 200 words per minute reading
  const listenTime = Math.ceil(wordCount / 150); // 150 words per minute speaking
  const estimatedDuration = listenTime * 60; // Convert to seconds

  // Generate detailed answer using Together.ai when in detailed mode
  useEffect(() => {
    const generateDetailedAnswer = async () => {
      if (mode === 'detailed' && !detailedAnswer && searchData?.results?.length > 0) {
        setIsGeneratingDetailed(true);
        try {
          const generator = createDetailedAnswerGenerator();
          const result = await generator.generateDetailedAnswer({
            query: searchData.query,
            searchResults: searchData.results,
            queryIntent: searchData.metadata?.query_intent as any
          });

          setDetailedAnswer(result.answer);
          setDetailedFollowUps(result.followUpQuestions);
          setDetailedWordCount(result.wordCount);
          console.log('✅ Generated detailed answer:', {
            wordCount: result.wordCount,
            citations: result.citationCount,
            time: result.generationTime + 'ms'
          });
        } catch (error) {
          console.error('Failed to generate detailed answer:', error);
          // Fallback to Tavily answer
          setDetailedAnswer(searchData.answer);
        } finally {
          setIsGeneratingDetailed(false);
        }
      }
    };

    generateDetailedAnswer();
  }, [mode, searchData, detailedAnswer]);

  useEffect(() => {
    // Show follow-up questions after a delay
    const timer = setTimeout(() => setShowFollowUps(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(currentAnswer);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `AI Answer for "${searchData.query}"`,
        text: currentAnswer,
        url: window.location.href
      });
    } catch (error) {
      // Fallback to clipboard
      handleCopyText();
    }
  };

  const formatAnswerWithCitations = (answer: string) => {
    if (!answer) return '';

    let formatted = answer;

    if (mode === 'detailed') {
      // Detailed mode: Perplexity-style with enhanced formatting

      // Format headers (## Text) with more prominent styling
      formatted = formatted.replace(/^## (.+)$/gm, '<h3 class="answer-header-detailed">$1</h3>');

      // Format subheaders (### Text)
      formatted = formatted.replace(/^### (.+)$/gm, '<h4 class="answer-subheader">$1</h4>');

      // Format bold text (**text**)
      formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="answer-bold">$1</strong>');

      // Format italic text (*text*)
      formatted = formatted.replace(/\*(.+?)\*/g, '<em class="answer-italic">$1</em>');

      // Format bullet points
      formatted = formatted.replace(/^[•\-*]\s+(.+)$/gm, '<li class="answer-list-item">$1</li>');
      formatted = formatted.replace(/(<li class="answer-list-item">.*?<\/li>\s*)+/g, '<ul class="answer-list">$&</ul>');

      // Format paragraphs with better spacing
      formatted = formatted.replace(/\n\n/g, '</p><p class="answer-paragraph-detailed">');

      // Format citations with Perplexity-style inline references
      formatted = formatted.replace(/\[(\d+)\]/g, (match, num) => {
        const citationNum = parseInt(num);
        const source = searchData.results?.[citationNum - 1];
        const domain = source ? new URL(source.url).hostname.replace('www.', '') : '';
        return `<sup class="citation-perplexity" data-citation="${citationNum}" onclick="scrollToCitation(${citationNum - 1})"><span class="citation-number">${citationNum}</span><span class="citation-domain">${domain}</span></sup>`;
      });

    } else {
      // Simple mode: Keep it clean like Tavily (no modifications)
      // Format headers (## Text)
      formatted = formatted.replace(/^## (.+)$/gm, '<h3 class="answer-header">$1</h3>');

      // Format paragraphs
      formatted = formatted.replace(/\n\n/g, '</p><p class="answer-paragraph">');

      // Format citations with simple styling
      formatted = formatted.replace(/\[(\d+)\]/g, (match, num) => {
        const citationNum = parseInt(num);
        return `<sup class="citation-interactive" data-citation="${citationNum}" onclick="scrollToCitation(${citationNum - 1})">[${citationNum}]</sup>`;
      });
    }

    // Wrap in paragraph tags if not already formatted
    if (!formatted.includes('<p class="answer-paragraph')) {
      const paragraphClass = mode === 'detailed' ? 'answer-paragraph-detailed' : 'answer-paragraph';
      formatted = `<p class="${paragraphClass}">` + formatted + '</p>';
    }

    // Clean up empty paragraphs
    formatted = formatted.replace(/<p class="[^"]*">\s*<\/p>/g, '');

    return formatted;
  };

  const scrollToCitation = (index: number) => {
    setSelectedCitation(index);
    const element = document.getElementById(`citation-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.style.transform = 'scale(1.02)';
      element.style.boxShadow = '0 0 20px rgba(96, 165, 250, 0.4)';
      setTimeout(() => {
        element.style.transform = '';
        element.style.boxShadow = '';
        setSelectedCitation(null);
      }, 2000);
    }
  };

  // Make scrollToCitation available globally
  useEffect(() => {
    (window as any).scrollToCitation = scrollToCitation;
    return () => {
      delete (window as any).scrollToCitation;
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceScore = () => {
    // Calculate confidence based on number of sources and query intent
    const sourceCount = searchData.results?.length || 0;
    const baseScore = Math.min(sourceCount * 15, 85);
    const intentBonus = searchData.metadata?.query_intent === 'factual' ? 10 : 5;
    return Math.min(baseScore + intentBonus, 95);
  };

  if (isLoading) {
    return <LoadingSkeleton theme={theme} />;
  }

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Main Answer Card */}
      <div
        className="relative overflow-hidden rounded-3xl backdrop-blur-xl border transition-all duration-700 hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 212, 228, 0.1), rgba(0, 232, 250, 0.08), rgba(20, 25, 26, 0.9))',
          borderColor: 'rgba(0, 212, 228, 0.3)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 30px rgba(0, 212, 228, 0.15)'
        }}
      >
        {/* Gradient Overlay */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: 'radial-gradient(circle at top right, rgba(0, 212, 228, 0.15), transparent 70%)'
          }}
        />

        {/* Content */}
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div
                  className="p-3 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
                    boxShadow: '0 0 20px rgba(0, 212, 228, 0.3)'
                  }}
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: '#FFFFFF' }}
                  >
                    AI Answer
                  </h2>
                  <div className="flex items-center space-x-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{readTime} min read • {listenTime} min listen</span>
                    </span>
                    <ConfidenceIndicator score={getConfidenceScore()} theme={theme} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <ActionButton icon={Copy} onClick={handleCopyText} success={copySuccess} theme={theme} tooltip="Copy answer" />
              <ActionButton icon={Share2} onClick={handleShare} theme={theme} tooltip="Share" />
              <ActionButton icon={Printer} onClick={() => window.print()} theme={theme} tooltip="Print" />
              <ActionButton
                icon={isExpanded ? ChevronUp : ChevronDown}
                onClick={() => setIsExpanded(!isExpanded)}
                theme={theme}
                tooltip={isExpanded ? "Collapse" : "Expand"}
              />
            </div>
          </div>

          {/* Answer Content */}
          {isExpanded && (
            <div className="space-y-6">
              {/* Loading state for detailed answer */}
              {isGeneratingDetailed && mode === 'detailed' && (
                <div className="flex items-center space-x-3 p-4 rounded-xl mb-4" style={{
                  backgroundColor: theme === 'professional-dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium" style={{ color: theme === 'professional-dark' ? '#E5E7EB' : '#374151' }}>
                    Generating comprehensive answer with Together AI...
                  </span>
                </div>
              )}

              <div
                ref={answerRef}
                className="answer-content"
                style={{
                  color: theme === 'professional-dark' ? '#E5E7EB' : '#374151',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
                dangerouslySetInnerHTML={{
                  __html: formatAnswerWithCitations(currentAnswer)
                }}
              />

              {/* Word count indicator for detailed mode */}
              {mode === 'detailed' && detailedWordCount > 0 && (
                <div className="mt-4 text-xs flex items-center space-x-4" style={{ color: theme === 'professional-dark' ? '#9CA3AF' : '#6B7280' }}>
                  <span>📝 {detailedWordCount} words</span>
                  <span>•</span>
                  <span>🤖 Generated with Together AI LLaMA-3.1-70B</span>
                </div>
              )}

              {/* Audio Player Section */}
              <PodcastPlayer
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                currentTime={currentTime}
                setCurrentTime={setCurrentTime}
                duration={estimatedDuration}
                theme={theme}
                searchData={searchData}
                mode={mode}
              />

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onSaveEpisode}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
                      color: 'white',
                      boxShadow: '0 0 20px rgba(0, 212, 228, 0.3)'
                    }}
                  >
                    <Bookmark className="w-5 h-5" />
                    <span>Save as Episode</span>
                  </button>

                  <button
                    className="flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105"
                    style={{
                      backgroundColor: '#14191a',
                      color: 'rgba(255, 255, 255, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#00D4E4';
                      e.currentTarget.style.color = '#00D4E4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Sources</span>
                  </button>
                </div>

                <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Generated from {searchData.results?.length || 0} sources
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Citation Cards */}
      {searchData.results && searchData.results.length > 0 && (
        <CitationCards
          results={searchData.results}
          selectedCitation={selectedCitation}
          theme={theme}
        />
      )}

      {/* Follow-up Questions */}
      {showFollowUps && (
        <FollowUpQuestions
          questions={mode === 'detailed' && detailedFollowUps.length > 0
            ? detailedFollowUps
            : searchData.follow_up_questions || []}
          onQuestionClick={onFollowUpSearch}
          theme={theme}
        />
      )}
    </div>
  );
};

// Loading Skeleton Component
const LoadingSkeleton: React.FC<{ theme: string }> = ({ theme }) => (
  <div className="space-y-6">
    <div
      className="rounded-3xl p-8 animate-pulse"
      style={{
        backgroundColor: theme === 'professional-dark' ? 'rgba(55, 65, 81, 0.3)' : 'rgba(249, 250, 251, 0.8)',
      }}
    >
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-2xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 bg-gray-300 rounded w-32 animate-pulse" />
          <div className="h-4 bg-gray-300 rounded w-48 animate-pulse" />
        </div>
      </div>

      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 rounded animate-pulse" style={{ width: `${85 + Math.random() * 15}%` }} />
        ))}
      </div>

      <div className="mt-6 h-16 bg-gray-300 rounded-xl animate-pulse" />
    </div>
  </div>
);

// Confidence Indicator Component
const ConfidenceIndicator: React.FC<{ score: number; theme: string }> = ({ score, theme }) => (
  <div className="flex items-center space-x-2">
    <span className="text-xs font-medium">Confidence:</span>
    <div className="flex items-center space-x-1">
      <div
        className="w-16 h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${score}%`,
            background: score > 80 ? 'linear-gradient(90deg, #10B981, #06B6D4)' :
                       score > 60 ? 'linear-gradient(90deg, #F59E0B, #10B981)' :
                       'linear-gradient(90deg, #EF4444, #F59E0B)'
          }}
        />
      </div>
      <span className="text-xs font-bold" style={{ color: score > 80 ? '#10B981' : score > 60 ? '#F59E0B' : '#EF4444' }}>
        {score}%
      </span>
    </div>
  </div>
);

// Action Button Component
const ActionButton: React.FC<{
  icon: React.ElementType;
  onClick: () => void;
  success?: boolean;
  theme: string;
  tooltip: string;
}> = ({ icon: Icon, onClick, success, theme, tooltip }) => (
  <button
    onClick={onClick}
    className="relative p-2 rounded-lg transition-all duration-300 hover:scale-110 group"
    style={{
      backgroundColor: success
        ? '#10B981'
        : theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      color: success ? 'white' : theme === 'professional-dark' ? '#E5E7EB' : '#374151',
    }}
    title={tooltip}
  >
    {success ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}

    {/* Tooltip */}
    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {success ? 'Copied!' : tooltip}
    </div>
  </button>
);

// Podcast Player Component
const PodcastPlayer: React.FC<{
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  theme: string;
  searchData?: TavilySearchResponse;
  mode?: string;
}> = ({ isPlaying, setIsPlaying, currentTime, setCurrentTime, duration, theme, searchData, mode }) => {
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [audioElement, setAudioElement] = React.useState<HTMLAudioElement | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const generateAudio = async () => {
    if (!searchData?.answer) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(ENDPOINTS.SEARCH.GENERATE_AUDIO, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: searchData.answer,
          query: searchData.query,
          voice: '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', // Linda - Conversational Guide
          podcastStyle: mode === 'detailed' ? 'educational' : 'professional',
          speed: 1.0,
          mode: mode || 'simple'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await response.json();

      if (data.success && data.audioUrl) {
        const fullAudioUrl = getAudioUrl(data.audioUrl, 'node');
        setAudioUrl(fullAudioUrl);

        // Create audio element
        const audio = new Audio(fullAudioUrl);
        audio.onloadeddata = () => {
          setAudioElement(audio);
          audio.play();
          setIsPlaying(true);
        };
        audio.ontimeupdate = () => {
          setCurrentTime(Math.floor(audio.currentTime));
        };
        audio.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };
        audio.onerror = () => {
          setError('Failed to load audio');
          setIsPlaying(false);
        };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
      console.error('Audio generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioUrl) {
      // Generate audio on first play
      generateAudio();
    } else if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div
      className="rounded-2xl p-6 border"
      style={{
        background: theme === 'professional-dark'
          ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.5), rgba(75, 85, 99, 0.3))'
          : 'linear-gradient(135deg, rgba(249, 250, 251, 0.8), rgba(243, 244, 246, 0.6))',
        borderColor: theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex items-center space-x-4">
        {/* Play Button */}
        <button
          onClick={handlePlayPause}
          disabled={isGenerating}
          className="relative p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 group disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isGenerating ? 'linear-gradient(135deg, #6B7280, #4B5563)' : 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
          }}
          title={isGenerating ? 'Generating audio...' : audioUrl ? (isPlaying ? 'Pause' : 'Play') : 'Generate audio'}
        >
          {isGenerating ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-1" />
          )}

          {/* Pulse animation when playing */}
          {isPlaying && !isGenerating && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 animate-ping opacity-20" />
          )}

          {/* Tooltip */}
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            {isGenerating ? 'Generating with Cartesia AI...' : audioUrl ? (isPlaying ? 'Pause' : 'Play') : 'Generate Audio with Cartesia AI'}
          </div>
        </button>

      {/* Waveform Visualization */}
      <div className="flex-1 flex items-center space-x-1">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="transition-all duration-200"
            style={{
              width: '3px',
              height: `${Math.random() * 20 + 8}px`,
              backgroundColor: i < (currentTime / duration) * 40
                ? '#8B5CF6'
                : theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '2px',
            }}
          />
        ))}
      </div>

      {/* Time Display */}
      <div className="text-sm font-mono" style={{ color: theme === 'professional-dark' ? '#9CA3AF' : '#6B7280' }}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Speed Control */}
      <div className="flex items-center space-x-1">
        <button
          className="px-2 py-1 text-xs rounded transition-colors"
          style={{
            backgroundColor: theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            color: theme === 'professional-dark' ? '#E5E7EB' : '#374151',
          }}
        >
          1x
        </button>
      </div>

      {/* Download Button */}
      <button
        onClick={() => {
          if (audioUrl && audioElement) {
            const link = document.createElement('a');
            link.href = audioUrl;
            link.download = `search-audio-${Date.now()}.wav`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }}
        disabled={!audioUrl}
        className="p-2 rounded-lg transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          color: theme === 'professional-dark' ? '#E5E7EB' : '#374151',
        }}
        title={audioUrl ? 'Download audio' : 'Generate audio first'}
      >
        <Download className="w-4 h-4" />
      </button>
    </div>

    {/* Error Message */}
    {error && (
      <div className="mt-4 p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">
        <p className="font-medium">Audio Error:</p>
        <p>{error}</p>
      </div>
    )}

    {/* Audio Info */}
    {audioUrl && !error && (
      <div className="mt-4 p-3 rounded-lg" style={{
        backgroundColor: theme === 'professional-dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
        borderLeft: '3px solid #60A5FA'
      }}>
        <p className="text-xs font-medium" style={{ color: theme === 'professional-dark' ? '#E5E7EB' : '#374151' }}>
          🎙️ Audio generated with Cartesia AI • High-quality voice synthesis
        </p>
      </div>
    )}
  </div>
);};

// Citation Cards Component
const CitationCards: React.FC<{
  results: TavilySearchResponse['results'];
  selectedCitation: number | null;
  theme: string;
}> = ({ results, selectedCitation, theme }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold flex items-center space-x-2" style={{ color: '#FFFFFF' }}>
      <span>Sources</span>
      <span className="text-sm font-normal px-2 py-1 rounded-full" style={{
        backgroundColor: 'rgba(0, 212, 228, 0.2)',
        color: '#00D4E4',
        border: '1px solid rgba(0, 212, 228, 0.3)'
      }}>
        {results.length}
      </span>
    </h3>

    <div className="grid gap-4 md:grid-cols-2">
      {results.map((result, index) => (
        <div
          key={index}
          id={`citation-${index}`}
          className={`
            relative p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] cursor-pointer group
            ${selectedCitation === index ? 'scale-[1.02]' : ''}
          `}
          style={{
            backgroundColor: '#14191a',
            borderColor: selectedCitation === index ? '#00D4E4' : 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            boxShadow: selectedCitation === index ? '0 0 20px rgba(0, 212, 228, 0.3)' : ''
          }}
          onClick={() => window.open(result.url, '_blank')}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00D4E4';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 228, 0.2)';
          }}
          onMouseLeave={(e) => {
            if (selectedCitation !== index) {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.boxShadow = '';
            }
          }}
        >
          {/* Citation Number */}
          <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-cyan-400" style={{
            background: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
            boxShadow: '0 0 10px rgba(0, 212, 228, 0.3)'
          }}>
            {index + 1}
          </div>

          <div className="flex items-start space-x-3">
            {/* Favicon */}
            <div className="flex-shrink-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
                  boxShadow: '0 0 10px rgba(0, 212, 228, 0.2)'
                }}
              >
                {new URL(result.url).hostname.charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2 transition-colors" style={{
                color: '#FFFFFF'
              }}>
                {result.title}
              </h4>

              <p className="text-xs mt-1 opacity-75" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                {new URL(result.url).hostname}
                {result.published_date && ` • ${new Date(result.published_date).toLocaleDateString()}`}
              </p>

              <p className="text-xs mt-2 line-clamp-2 opacity-60" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                {result.content.substring(0, 120)}...
              </p>

              {result.score && (
                <div className="flex items-center space-x-1 mt-2">
                  <div className="text-xs opacity-75" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Relevance:</div>
                  <div className="w-12 h-1 bg-gray-700 rounded overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${result.score * 100}%`,
                        background: 'linear-gradient(90deg, #00D4E4, #00E8FA)'
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#00D4E4' }}>
                    {Math.round(result.score * 100)}%
                  </span>
                </div>
              )}
            </div>

            <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Follow-up Questions Component
const FollowUpQuestions: React.FC<{
  questions: string[];
  onQuestionClick?: (query: string) => void;
  theme: string;
}> = ({ questions, onQuestionClick, theme }) => (
  <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
    <h3 className="text-lg font-semibold flex items-center space-x-2" style={{ color: '#FFFFFF' }}>
      <Search className="w-5 h-5" style={{ color: '#00D4E4' }} />
      <span>Continue exploring</span>
    </h3>

    <div className="flex flex-wrap gap-3">
      {questions.map((question, index) => (
        <button
          key={index}
          onClick={() => onQuestionClick?.(question)}
          className="group flex items-center space-x-2 px-4 py-3 rounded-2xl border transition-all duration-300 hover:scale-105 hover:shadow-lg"
          style={{
            backgroundColor: '#14191a',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.7)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00D4E4';
            e.currentTarget.style.color = '#00D4E4';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 228, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          <span className="text-sm font-medium">{question}</span>
          <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
        </button>
      ))}
    </div>
  </div>
);

// Helper function for formatting time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default AIAnswerTab;