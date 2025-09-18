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

interface AIAnswerTabProps {
  searchData: TavilySearchResponse;
  isLoading?: boolean;
  onFollowUpSearch?: (query: string) => void;
  onSaveEpisode?: () => void;
}

const AIAnswerTab: React.FC<AIAnswerTabProps> = ({
  searchData,
  isLoading = false,
  onFollowUpSearch,
  onSaveEpisode
}) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<number | null>(null);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  // Calculate estimated reading/listening time
  const wordCount = searchData?.answer?.split(' ').length || 0;
  const readTime = Math.ceil(wordCount / 200); // 200 words per minute reading
  const listenTime = Math.ceil(wordCount / 150); // 150 words per minute speaking
  const estimatedDuration = listenTime * 60; // Convert to seconds

  useEffect(() => {
    // Show follow-up questions after a delay
    const timer = setTimeout(() => setShowFollowUps(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(searchData.answer);
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
        text: searchData.answer,
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

    // Format headers (## Text)
    formatted = formatted.replace(/^## (.+)$/gm, '<h3 class="answer-header">$1</h3>');

    // Format paragraphs
    formatted = formatted.replace(/\n\n/g, '</p><p class="answer-paragraph">');

    // Wrap in paragraph tags if not already formatted
    if (!formatted.includes('<p class="answer-paragraph">')) {
      formatted = '<p class="answer-paragraph">' + formatted + '</p>';
    }

    // Format citations with interactive elements
    formatted = formatted.replace(/\[(\d+)\]/g, (match, num) => {
      const citationNum = parseInt(num);
      return `<sup class="citation-interactive" data-citation="${citationNum}" onclick="scrollToCitation(${citationNum - 1})">[${citationNum}]</sup>`;
    });

    // Clean up empty paragraphs
    formatted = formatted.replace(/<p class="answer-paragraph">\s*<\/p>/g, '');

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
          background: theme === 'professional-dark'
            ? 'linear-gradient(135deg, rgba(88, 28, 135, 0.1), rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.05))'
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.05))',
          borderColor: theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Gradient Overlay */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: theme === 'professional-dark'
              ? 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.1), transparent 70%)'
              : 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 70%)'
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
                    background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
                  }}
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: theme === 'professional-dark' ? '#F3F4F6' : '#1F2937' }}
                  >
                    AI Answer
                  </h2>
                  <div className="flex items-center space-x-4 text-sm" style={{ color: theme === 'professional-dark' ? '#9CA3AF' : '#6B7280' }}>
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
              <div
                ref={answerRef}
                className="answer-content"
                style={{
                  color: theme === 'professional-dark' ? '#E5E7EB' : '#374151',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
                dangerouslySetInnerHTML={{
                  __html: formatAnswerWithCitations(searchData.answer)
                }}
              />

              {/* Audio Player Section */}
              <PodcastPlayer
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                currentTime={currentTime}
                setCurrentTime={setCurrentTime}
                duration={estimatedDuration}
                theme={theme}
              />

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onSaveEpisode}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
                      color: 'white',
                    }}
                  >
                    <Bookmark className="w-5 h-5" />
                    <span>Save as Episode</span>
                  </button>

                  <button
                    className="flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105"
                    style={{
                      backgroundColor: theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      color: theme === 'professional-dark' ? '#E5E7EB' : '#374151',
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Sources</span>
                  </button>
                </div>

                <div className="text-sm" style={{ color: theme === 'professional-dark' ? '#9CA3AF' : '#6B7280' }}>
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
      {showFollowUps && searchData.follow_up_questions && searchData.follow_up_questions.length > 0 && (
        <FollowUpQuestions
          questions={searchData.follow_up_questions}
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
}> = ({ isPlaying, setIsPlaying, currentTime, setCurrentTime, duration, theme }) => (
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
        className="relative p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 group"
        style={{
          background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
        }}
        title="Audio coming soon"
      >
        {isPlaying ? (
          <Pause className="w-6 h-6 text-white" />
        ) : (
          <Play className="w-6 h-6 text-white ml-1" />
        )}

        {/* Pulse animation when playing */}
        {isPlaying && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 animate-ping opacity-20" />
        )}

        {/* Tooltip */}
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          Audio coming soon
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
        className="p-2 rounded-lg transition-all duration-300 hover:scale-110"
        style={{
          backgroundColor: theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          color: theme === 'professional-dark' ? '#E5E7EB' : '#374151',
        }}
        title="Download audio (coming soon)"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// Citation Cards Component
const CitationCards: React.FC<{
  results: TavilySearchResponse['results'];
  selectedCitation: number | null;
  theme: string;
}> = ({ results, selectedCitation, theme }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold flex items-center space-x-2" style={{ color: theme === 'professional-dark' ? '#F3F4F6' : '#1F2937' }}>
      <span>Sources</span>
      <span className="text-sm font-normal px-2 py-1 rounded-full" style={{
        backgroundColor: theme === 'professional-dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
        color: '#8B5CF6'
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
            backgroundColor: theme === 'professional-dark' ? 'rgba(55, 65, 81, 0.5)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: selectedCitation === index
              ? '#8B5CF6'
              : theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
          onClick={() => window.open(result.url, '_blank')}
        >
          {/* Citation Number */}
          <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-blue-500">
            {index + 1}
          </div>

          <div className="flex items-start space-x-3">
            {/* Favicon */}
            <div className="flex-shrink-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}
              >
                {new URL(result.url).hostname.charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2 group-hover:text-purple-600 transition-colors" style={{
                color: theme === 'professional-dark' ? '#F3F4F6' : '#1F2937'
              }}>
                {result.title}
              </h4>

              <p className="text-xs mt-1 opacity-75" style={{ color: theme === 'professional-dark' ? '#9CA3AF' : '#6B7280' }}>
                {new URL(result.url).hostname}
                {result.published_date && ` • ${new Date(result.published_date).toLocaleDateString()}`}
              </p>

              <p className="text-xs mt-2 line-clamp-2 opacity-60" style={{ color: theme === 'professional-dark' ? '#D1D5DB' : '#374151' }}>
                {result.content.substring(0, 120)}...
              </p>

              {result.score && (
                <div className="flex items-center space-x-1 mt-2">
                  <div className="text-xs opacity-75">Relevance:</div>
                  <div className="w-12 h-1 bg-gray-200 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${result.score * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#8B5CF6' }}>
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
    <h3 className="text-lg font-semibold flex items-center space-x-2" style={{ color: theme === 'professional-dark' ? '#F3F4F6' : '#1F2937' }}>
      <Search className="w-5 h-5" />
      <span>Continue exploring</span>
    </h3>

    <div className="flex flex-wrap gap-3">
      {questions.map((question, index) => (
        <button
          key={index}
          onClick={() => onQuestionClick?.(question)}
          className="group flex items-center space-x-2 px-4 py-3 rounded-2xl border transition-all duration-300 hover:scale-105 hover:shadow-lg"
          style={{
            backgroundColor: theme === 'professional-dark' ? 'rgba(55, 65, 81, 0.5)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: theme === 'professional-dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            color: theme === 'professional-dark' ? '#E5E7EB' : '#374151',
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