import React, { useState } from 'react';
import { Search, Mic, Upload, Sparkles, ArrowRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { DocumentContent } from '../../types/document';

interface HomeViewProps {
  currentView: string;
  onOpenUpload: () => void;
  uploadedContent?: DocumentContent[] | null;
}

const HomeView: React.FC<HomeViewProps> = ({ currentView, onOpenUpload, uploadedContent }) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  if (currentView !== 'home') return null;

  const suggestions = [
    "Create a podcast about artificial intelligence trends",
    "Generate a discussion on climate change solutions",
    "Transform my research paper into an engaging dialogue",
    "Make a podcast episode from my business report"
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      {/* Main Brand */}
      <div className="mb-12">
        <h1 className="text-6xl font-bold mb-4"
            style={{ color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937' }}>
          intellicast
        </h1>
        <p className="text-xl max-w-2xl mx-auto leading-relaxed"
           style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }}>
          Where knowledge meets conversation. Create AI-powered podcasts from your documents.
        </p>
      </div>

      {/* Search Interface */}
      <div className="w-full max-w-2xl mb-8">
        <div className="relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <Search className="w-5 h-5"
                   style={{ color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280' }} />
          </div>

          <input
            type="text"
            placeholder="Ask anything or @mention a Space"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-12 pr-20 py-4 text-lg rounded-xl transition-all duration-200 focus:outline-none"
            style={{
              backgroundColor: theme === 'professional-dark' ? '#2A2A2A' : '#F9FAFB',
              border: theme === 'professional-dark' ? '1px solid #3C4043' : '1px solid #E5E7EB',
              color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937',
              borderColor: isSearchFocused ? (theme === 'professional-dark' ? '#20B2AA' : '#3B82F6') : undefined
            }}
          />

          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <button
              onClick={onOpenUpload}
              className="p-2 rounded-lg transition-all duration-200"
              style={{
                backgroundColor: theme === 'professional-dark' ? '#3C4043' : '#F3F4F6',
                color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280'
              }}
              title="Upload Document"
            >
              <Upload className="w-4 h-4" />
            </button>

            <button className="p-2 rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: theme === 'professional-dark' ? '#3C4043' : '#F3F4F6',
                      color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280'
                    }}
                    title="Voice Input">
              <Mic className="w-4 h-4" />
            </button>

            <button className="p-2 rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: theme === 'professional-dark' ? '#20B2AA' : '#3B82F6',
                      color: 'white'
                    }}>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Suggestions */}
        {!searchQuery && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setSearchQuery(suggestion)}
                className="px-4 py-2 rounded-full text-sm transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: theme === 'professional-dark' ? '#2A2A2A' : '#F3F4F6',
                  color: theme === 'professional-dark' ? '#9AA0A6' : '#6B7280',
                  border: theme === 'professional-dark' ? '1px solid #3C4043' : '1px solid #E5E7EB'
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-center space-x-6 mb-12">
        <button
          onClick={onOpenUpload}
          className="flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: theme === 'professional-dark' ? '#20B2AA' : '#3B82F6',
            color: 'white'
          }}
        >
          <Upload className="w-5 h-5" />
          <span>Upload Document</span>
        </button>

        <button className="flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: theme === 'professional-dark' ? '#2A2A2A' : '#F3F4F6',
                  color: theme === 'professional-dark' ? '#E8EAED' : '#1F2937',
                  border: theme === 'professional-dark' ? '1px solid #3C4043' : '1px solid #E5E7EB'
                }}>
          <Sparkles className="w-5 h-5" />
          <span>Try Examples</span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="text-center max-w-md">
        <p className="text-sm leading-relaxed"
           style={{ color: theme === 'professional-dark' ? '#80868B' : '#9CA3AF' }}>
          Powered by advanced AI to transform your documents into engaging podcast conversations with natural voices and intelligent insights.
        </p>
      </div>
    </div>
  );
};

export default HomeView;