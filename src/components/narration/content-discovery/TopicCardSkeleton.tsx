/**
 * Topic Card Skeleton - Loading placeholder with shimmer effect
 */

import React from 'react';

const TopicCardSkeleton = React.memo(() => (
  <div className="p-4 rounded-lg border-2 border-gray-600/50 bg-gray-800/30 min-h-[120px] relative overflow-hidden">
    {/* Shimmer effect overlay */}
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-gray-600/20 to-transparent" />

    <div className="flex items-start justify-between mb-2">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
        <div className="h-3 bg-gray-700/30 rounded w-full"></div>
        <div className="h-3 bg-gray-700/30 rounded w-5/6"></div>
      </div>
      <div className="ml-4 flex flex-col items-end gap-2">
        <div className="h-5 w-12 bg-gray-700/50 rounded"></div>
        <div className="h-5 w-16 bg-gray-700/30 rounded-full"></div>
      </div>
    </div>
    <div className="flex items-center gap-2 mb-2">
      <div className="h-5 w-16 bg-gray-700/30 rounded-full"></div>
      <div className="h-5 w-20 bg-gray-700/30 rounded-full"></div>
      <div className="h-5 w-14 bg-gray-700/30 rounded-full"></div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 w-20 bg-gray-700/30 rounded"></div>
      <div className="h-3 w-24 bg-gray-700/30 rounded"></div>
    </div>

    <style>{`
      @keyframes shimmer {
        100% {
          transform: translateX(100%);
        }
      }
      .animate-shimmer {
        animation: shimmer 2s infinite;
      }
    `}</style>
  </div>
));

TopicCardSkeleton.displayName = 'TopicCardSkeleton';

export default TopicCardSkeleton;
