import React, { useState } from 'react';
import { Search, Mic, Upload, Sparkles, ArrowRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import VoiceSearchPro from '../search/VoiceSearchPro';
import type { DocumentContent } from '../../types/document';

interface SearchViewProps {
  currentView: string;
  onOpenUpload: () => void;
  uploadedContent?: DocumentContent[] | null;
}

const SearchView: React.FC<SearchViewProps> = ({ currentView, onOpenUpload, uploadedContent }) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSearch, setActiveSearch] = useState<string | null>(null);

  if (currentView !== 'search') return null;

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setActiveSearch(query.trim());
    }
  };

  const handleBackToSearch = () => {
    setActiveSearch(null);
  };

  if (activeSearch) {
    return <VoiceSearchPro query={activeSearch} onBack={handleBackToSearch} />;
  }

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
            style={{ color: '#FFFFFF' }}>
          intellicast
        </h1>
        <p className="text-xl max-w-2xl mx-auto leading-relaxed"
           style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Where knowledge meets conversation. Create AI-powered podcasts from your documents.
        </p>
      </div>

      {/* Search Interface */}
      <div className="w-full max-w-2xl mb-8">
        <div className="relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <Search className="w-5 h-5"
                   style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
          </div>

          <input
            type="text"
            placeholder="Ask anything or @mention a Space"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch(searchQuery);
              }
            }}
            className="w-full pl-12 pr-20 py-4 text-lg rounded-xl transition-all duration-200 focus:outline-none"
            style={{
              backgroundColor: '#14191a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              borderColor: isSearchFocused ? '#00D4E4' : undefined
            }}
          />

          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <button
              onClick={onOpenUpload}
              className="p-2 rounded-lg transition-all duration-200"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF'
              }}
              title="Upload Document"
            >
              <Upload className="w-4 h-4" />
            </button>

            <button className="p-2 rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF'
                    }}
                    title="Voice Input">
              <Mic className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSearch(searchQuery)}
              className="p-2 rounded-lg transition-all duration-200"
              style={{
                backgroundColor: '#00D4E4',
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
                onClick={() => handleSearch(suggestion)}
                className="px-4 py-2 rounded-full text-sm transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: '#14191a',
                  color: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
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
            backgroundColor: '#00D4E4',
            color: 'white'
          }}
        >
          <Upload className="w-5 h-5" />
          <span>Upload Document</span>
        </button>

        <button className="flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: '#14191a',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
          <Sparkles className="w-5 h-5" />
          <span>Try Examples</span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="text-center max-w-md">
        <p className="text-sm leading-relaxed"
           style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          Powered by advanced AI to transform your documents into engaging podcast conversations with natural voices and intelligent insights.
        </p>
      </div>
    </div>
  );
};

export default SearchView;
