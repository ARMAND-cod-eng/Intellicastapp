/**
 * Voice Search Components - Export Index
 * Beautiful, feature-rich components for AI-powered search
 */

// Main Components
export { default as AIAnswerTab } from './AIAnswerTab';
export { default as AIAnswerTabDemo } from './AIAnswerTabDemo';
export { default as WebResultsTab } from './WebResultsTab';

// Component Styles
import './AIAnswerTab.css';
import './WebResultsTab.css';

// Type Exports for convenience
export type { TavilySearchResponse, TavilyResult } from '../services/tavily-client';

// Re-export common types
export interface AIAnswerTabProps {
  searchData: TavilySearchResponse;
  isLoading?: boolean;
  onFollowUpSearch?: (query: string) => void;
  onSaveEpisode?: () => void;
}

// Utility exports
export const componentInfo = {
  name: 'Voice Search Components',
  version: '1.0.0',
  description: 'Beautiful AI Answer components with podcast-focused features',
  features: [
    'Perplexity-inspired design',
    'Interactive citations',
    'Podcast-style audio player',
    'Glassmorphism effects',
    'Smooth animations',
    'Mobile responsive',
    'TypeScript support',
    'Accessibility optimized'
  ]
} as const;