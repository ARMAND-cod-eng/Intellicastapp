/**
 * Topic Card - Individual trending topic card with selection
 */

import React from 'react';
import { BarChart3, Clock, Globe, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TrendingTopic } from './types';

interface TopicCardProps {
  topic: TrendingTopic;
  isSelected: boolean;
  isFavorite?: boolean;
  onToggleSelection: (topicId: string) => void;
  onToggleFavorite?: (topicId: string) => void;
}

const TopicCard = React.memo<TopicCardProps>(({ topic, isSelected, isFavorite = false, onToggleSelection, onToggleFavorite }) => {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(topic.id);
    }
  };

  return (
    <motion.div
      onClick={() => onToggleSelection(topic.id)}
      className={`p-4 rounded-lg border-2 cursor-pointer min-h-[120px] ${
        isSelected
          ? 'border-[#00D4E4] bg-[#00D4E4]/10 shadow-[0_0_20px_rgba(0,212,228,0.2)]'
          : 'border-gray-600 bg-transparent'
      }`}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Select topic: ${topic.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleSelection(topic.id);
        }
      }}
      whileHover={{
        scale: 1.02,
        borderColor: isSelected ? 'rgba(0, 212, 228, 1)' : 'rgba(0, 212, 228, 0.4)',
        backgroundColor: isSelected ? 'rgba(0, 212, 228, 0.15)' : 'rgba(0, 212, 228, 0.08)'
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-sm text-white">
              {topic.title}
            </h3>
            {onToggleFavorite && (
              <motion.button
                onClick={handleFavoriteClick}
                className={`p-1 rounded-full min-w-[32px] min-h-[32px] flex items-center justify-center ${
                  isFavorite ? 'text-yellow-400' : 'text-gray-500'
                }`}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                whileHover={{ scale: 1.15, backgroundColor: 'rgba(75, 85, 99, 0.5)' }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <motion.div
                  animate={{ rotate: isFavorite ? [0, -10, 10, -10, 0] : 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                </motion.div>
              </motion.button>
            )}
          </div>
          <p className="text-xs mb-2 text-gray-400">
            {topic.description}
          </p>
        </div>
        <div className="ml-4 flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <BarChart3 size={14} className="text-[#00D4E4]" />
            <span className="text-xs font-bold text-[#00D4E4]">{topic.trendScore}</span>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
            {topic.sources} sources
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        {topic.keywords.map((keyword, idx) => (
          <span
            key={idx}
            className="text-xs px-2 py-1 rounded-full bg-[#00D4E4]/15 text-[#00D4E4]"
          >
            {keyword}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>{topic.estimatedDuration}</span>
        </div>
        <div className="flex items-center gap-1">
          <Globe size={12} />
          <span className="capitalize">{topic.category}</span>
        </div>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.topic.id === nextProps.topic.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.onToggleSelection === nextProps.onToggleSelection &&
    prevProps.onToggleFavorite === nextProps.onToggleFavorite
  );
});

TopicCard.displayName = 'TopicCard';

export default TopicCard;
