import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
  pulse?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  ripple?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  glow = false,
  pulse = false,
  loading = false,
  icon,
  iconPosition = 'left',
  ripple = true,
  children,
  className,
  disabled,
  onClick,
  ...props
}) => {
  const { theme } = useTheme();
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const getVariantClasses = () => {
    const baseVariants = theme === 'professional-dark' ? {
      primary: 'text-white border-transparent hover:shadow-lg',
      secondary: 'text-white border-transparent hover:shadow-lg',
      gradient: 'bg-gradient-to-r from-blue-500 to-orange-500 text-white border-blue-400/20 hover:shadow-lg animated-gradient',
    } : theme === 'dark' ? {
      primary: 'bg-gradient-to-r from-primary-600 to-primary-700 text-white border-primary-500/20 hover:from-primary-500 hover:to-primary-600 shadow-lg hover:shadow-primary-500/25',
      secondary: 'bg-gradient-to-r from-secondary-600 to-secondary-700 text-white border-secondary-500/20 hover:from-secondary-500 hover:to-secondary-600 shadow-lg hover:shadow-secondary-500/25',
      gradient: 'bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 bg-size-200 text-white border-primary-500/20 hover:bg-pos-100 animated-gradient',
    } : {
      primary: 'text-white border-blue-500/20 hover:shadow-blue-500/25 shadow-lg',
      secondary: 'border-gray-400 hover:border-gray-500 hover:shadow-gray-500/25',
      gradient: 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-size-200 text-white border-blue-500/20 hover:bg-pos-100 animated-gradient',
    };

    const themeVariants = theme === 'professional-dark' ? {
      ghost: 'text-white border-transparent hover:shadow-lg',
      glass: 'backdrop-blur-md text-white border-transparent hover:shadow-lg',
    } : theme === 'dark' ? {
      ghost: 'bg-white/5 text-white border-white/20 hover:bg-white/10 hover:border-white/30',
      glass: 'bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20 hover:border-white/40',
    } : {
      ghost: 'bg-black/5 border-gray-300/50 hover:bg-black/10 hover:border-gray-400/60',
      glass: 'backdrop-blur-md border-gray-300/30 hover:border-gray-400/50',
    };

    // Add text colors for light mode variants
    if (theme === 'light') {
      themeVariants.ghost += ' text-gray-700 hover:text-gray-900';
      themeVariants.glass += ' text-gray-700 hover:text-gray-900';
    }

    return { ...baseVariants, ...themeVariants };
  };

  const variants = getVariantClasses();

  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-6 py-3 text-base rounded-xl',
    lg: 'px-8 py-4 text-lg rounded-xl',
    xl: 'px-10 py-5 text-xl rounded-2xl',
  };

  const glowClasses = glow ? {
    primary: 'hover:shadow-neon-blue',
    secondary: 'hover:shadow-neon-purple',
    ghost: 'hover:shadow-glass',
    glass: 'hover:shadow-glass-lg',
    gradient: 'hover:shadow-neon-purple',
  }[variant] : '';

  const pulseClasses = pulse ? 'animate-pulse-slow' : '';

  const handleRippleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!ripple || disabled || loading) {
      onClick?.(event);
      return;
    }

    const button = buttonRef.current;
    if (!button) {
      onClick?.(event);
      return;
    }

    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newRipple = {
      id: Date.now(),
      x,
      y,
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);

    onClick?.(event);
  };

  const buttonContent = (
    <>
      {icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}
      
      {loading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
          Loading...
        </div>
      ) : (
        children
      )}
      
      {icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </>
  );

  return (
    <motion.button
      ref={buttonRef}
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative overflow-hidden font-medium border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        `focus:ring-offset-${theme === 'dark' ? 'dark-900' : 'white'}`,
        variants[variant],
        sizes[size],
        glowClasses,
        pulseClasses,
        !disabled && !loading && 'hover:-translate-y-0.5',
        className
      )}
      style={{
        backgroundColor: theme === 'professional-dark' && variant === 'primary' ? '#2563EB' :
                        theme === 'professional-dark' && variant === 'secondary' ? 'transparent' :
                        theme === 'professional-dark' && variant === 'ghost' ? '#3C4043' :
                        theme === 'professional-dark' && variant === 'glass' ? '#2D2D30' :
                        theme === 'light' && variant === 'primary' ? '#60A5FA' :
                        theme === 'dark' && variant === 'primary' ? '#6366F1' :
                        theme === 'light' && variant === 'secondary' ? 'transparent' : undefined,
        color: theme === 'professional-dark' && variant === 'primary' ? '#1F1F1F' :
               theme === 'professional-dark' && variant === 'secondary' ? '#9AA0A6' :
               theme === 'professional-dark' && (variant === 'ghost' || variant === 'glass') ? '#E8EAED' :
               theme === 'light' && variant === 'secondary' ? '#1F2937' : undefined,
        border: theme === 'professional-dark' && variant === 'secondary' ? '1px solid #5F6368' : undefined
      }}
      onClick={handleRippleClick}
      disabled={disabled || loading}
      {...props}
    >
      {/* Background gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r -translate-x-full hover:translate-x-full transition-transform duration-1000 ${
        theme === 'dark' 
          ? 'from-white/0 via-white/10 to-white/0'
          : 'from-gray-900/0 via-gray-900/10 to-gray-900/0'
      }`} />
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className={`absolute rounded-full animate-ripple ${
            theme === 'dark' ? 'bg-white/30' : 'bg-gray-900/30'
          }`}
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
        />
      ))}
      
      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center">
        {buttonContent}
      </span>
    </motion.button>
  );
};

export default Button;