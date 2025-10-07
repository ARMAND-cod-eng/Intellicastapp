/**
 * Search Bar - Search topics with debounce
 */

import React, { forwardRef } from 'react';
import { Search } from 'lucide-react';
import GlassCard from '../../ui/GlassCard';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount?: number;
  showResults?: boolean;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ searchQuery, onSearchChange, resultCount = 0, showResults = false }, ref) => {
    return (
      <GlassCard variant="medium" className="p-6" glow>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Search size={20} />
            Search Topics
          </h2>
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-sm text-[#00D4E4] hover:text-[#00E8FA] transition-colors"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={ref}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, keywords, or description... (Ctrl+F)"
            className="w-full pl-11 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00D4E4] focus:border-transparent transition-all"
            aria-label="Search topics"
          />
        </div>
        {showResults && searchQuery && (
          <div className="mt-3 text-sm text-gray-400">
            {resultCount} {resultCount === 1 ? 'topic' : 'topics'} found
          </div>
        )}
      </GlassCard>
    );
  }
);

SearchBar.displayName = 'SearchBar';

export default SearchBar;
