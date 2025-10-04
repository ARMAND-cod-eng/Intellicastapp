import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRate?: (rating: number) => void;
  showCount?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  count = 0,
  size = 'md',
  interactive = false,
  onRate,
  showCount = true,
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(displayRating);
          const partial = !filled && star <= displayRating && displayRating % 1 !== 0;

          return (
            <motion.button
              key={star}
              disabled={!interactive}
              onClick={() => onRate && onRate(star)}
              onMouseEnter={() => interactive && setHoverRating(star)}
              onMouseLeave={() => interactive && setHoverRating(0)}
              className={`transition-all ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
              whileHover={interactive ? { scale: 1.2 } : {}}
              whileTap={interactive ? { scale: 0.9 } : {}}
            >
              <Star
                className={sizes[size]}
                style={{
                  color: filled || partial ? '#F59E0B' : 'rgba(255, 255, 255, 0.3)',
                  fill: filled ? '#F59E0B' : 'transparent',
                }}
              />
            </motion.button>
          );
        })}
      </div>

      {showCount && count > 0 && (
        <span className={textSizes[size]} style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          ({count.toLocaleString()})
        </span>
      )}

      {interactive && hoverRating > 0 && (
        <span className={textSizes[size]} style={{ color: '#F59E0B' }}>
          {hoverRating} star{hoverRating !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};

export default StarRating;
