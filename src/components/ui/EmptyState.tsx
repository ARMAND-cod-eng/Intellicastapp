/**
 * EmptyState - Reusable empty state component with animations
 */

import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  iconColor?: string;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionButton,
  iconColor = 'text-gray-600',
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`text-center py-16 ${className}`}
    >
      {/* Animated Icon Container */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{
          duration: 0.5,
          ease: 'easeOut',
          delay: 0.1
        }}
        className="relative mb-6 inline-block"
      >
        {/* Background Glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800/50 to-gray-900/50 blur-2xl" />

        {/* Icon with Float Animation */}
        <motion.div
          animate={{
            y: [-8, 0, -8],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-full bg-gray-800/30 flex items-center justify-center backdrop-blur-sm border border-gray-700/50">
            <Icon className={`w-12 h-12 ${iconColor}`} strokeWidth={1.5} />
          </div>
        </motion.div>
      </motion.div>

      {/* Title with Gradient */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-xl font-bold mb-2 bg-gradient-to-br from-white to-gray-300 bg-clip-text text-transparent"
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-sm text-gray-400 mb-6 max-w-sm mx-auto leading-relaxed"
        >
          {description}
        </motion.p>
      )}

      {/* Action Button */}
      {actionButton && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={actionButton.onClick}
          className="px-6 py-3 rounded-lg bg-[#00D4E4] hover:bg-[#00E8FA] text-black font-semibold transition-all shadow-lg shadow-[#00D4E4]/20 hover:shadow-[#00D4E4]/40"
        >
          {actionButton.label}
        </motion.button>
      )}
    </motion.div>
  );
};

export default EmptyState;
