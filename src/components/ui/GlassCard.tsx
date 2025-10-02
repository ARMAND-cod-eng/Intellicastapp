import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme } = useTheme();

  const getBaseClasses = () => {
    if (theme === 'professional-dark') {
      return {
        light: 'backdrop-blur-sm',
        medium: 'backdrop-blur-md',
        strong: 'backdrop-blur-lg',
        dark: 'backdrop-blur-md',
      };
    } else if (theme === 'dark') {
      return {
        light: 'bg-white/5 backdrop-blur-sm border-white/10',
        medium: 'bg-white/10 backdrop-blur-md border-white/20',
        strong: 'bg-white/15 backdrop-blur-lg border-white/30',
        dark: 'bg-black/20 backdrop-blur-md border-white/10',
      };
    } else {
      return {
        light: 'backdrop-blur-sm border-gray-300/20',
        medium: 'backdrop-blur-md border-gray-300/30',
        strong: 'backdrop-blur-lg border-gray-300/40',
        dark: 'backdrop-blur-md border-gray-400/50',
      };
    }
  };

  const getHoverClasses = () => {
    if (!hover) return '';

    if (theme === 'professional-dark') {
      return 'hover:-translate-y-1 hover:shadow-xl';
    }

    return theme === 'dark'
      ? 'hover:bg-white/20 hover:border-white/40 hover:-translate-y-1 hover:shadow-glass-lg'
      : 'hover:border-gray-400/60 hover:-translate-y-1 hover:shadow-lg';
  };

  const baseClasses = getBaseClasses();
  const hoverClasses = getHoverClasses();

  const glowClasses = glow
    ? 'hover:shadow-neon-cyan'
    : '';

  const glowStyle = glow ? {
    borderColor: hover ? '#00D4E4' : undefined,
    boxShadow: hover ? '0 0 30px rgba(0, 212, 228, 0.3)' : undefined
  } : {};

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
      style={{
        backgroundColor: theme === 'professional-dark' ? '#252526' : theme === 'light' ? '#FBF5F0' : undefined,
        border: theme === 'professional-dark' ? '1px solid #3C4043' : undefined,
        ...glowStyle
      }}
      onClick={onClick}
      onMouseEnter={(e) => glow && hover && (e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 212, 228, 0.4)')}
      onMouseLeave={(e) => glow && hover && (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Inner glow */}
      {glow && (
        <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300"
             style={{background: 'linear-gradient(135deg, rgba(0, 212, 228, 0.2), transparent, rgba(0, 232, 250, 0.2))'}} />
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