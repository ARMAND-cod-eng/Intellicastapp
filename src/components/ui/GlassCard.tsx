import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'light' | 'medium' | 'strong' | 'dark';
  hover?: boolean;
  glow?: boolean;
  borderGradient?: boolean;
  onClick?: () => void;
  delay?: number;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'medium',
  hover = true,
  glow = false,
  borderGradient = false,
  onClick,
  delay = 0,
}) => {
  const baseClasses = {
    light: 'bg-white/5 backdrop-blur-sm border-white/10',
    medium: 'bg-white/10 backdrop-blur-md border-white/20',
    strong: 'bg-white/15 backdrop-blur-lg border-white/30',
    dark: 'bg-black/20 backdrop-blur-md border-white/10',
  };

  const hoverClasses = hover
    ? 'hover:bg-white/20 hover:border-white/40 hover:-translate-y-1 hover:shadow-glass-lg'
    : '';

  const glowClasses = glow
    ? 'hover:shadow-neon-purple hover:border-primary-500/50'
    : '';

  const borderClasses = borderGradient
    ? 'border-gradient'
    : 'border';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={cn(
        'relative rounded-2xl transition-all duration-300 cursor-pointer',
        baseClasses[variant],
        borderClasses,
        hoverClasses,
        glowClasses,
        onClick && 'interactive-press',
        className
      )}
      onClick={onClick}
    >
      {/* Inner glow */}
      {glow && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-600/20 via-transparent to-secondary-600/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Floating particles effect */}
      {glow && (
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="particle absolute top-2 left-4 w-1 h-1 animate-float" style={{ animationDelay: '0s' }} />
          <div className="particle absolute top-8 right-6 w-0.5 h-0.5 animate-float" style={{ animationDelay: '1s' }} />
          <div className="particle absolute bottom-4 left-8 w-0.5 h-0.5 animate-float" style={{ animationDelay: '2s' }} />
        </div>
      )}
    </motion.div>
  );
};

export default GlassCard;