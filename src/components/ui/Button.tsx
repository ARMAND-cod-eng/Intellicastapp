import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

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
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const variants = {
    primary: 'bg-gradient-to-r from-primary-600 to-primary-700 text-white border-primary-500/20 hover:from-primary-500 hover:to-primary-600 shadow-lg hover:shadow-primary-500/25',
    secondary: 'bg-gradient-to-r from-secondary-600 to-secondary-700 text-white border-secondary-500/20 hover:from-secondary-500 hover:to-secondary-600 shadow-lg hover:shadow-secondary-500/25',
    ghost: 'bg-white/5 text-white border-white/20 hover:bg-white/10 hover:border-white/30',
    glass: 'bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20 hover:border-white/40',
    gradient: 'bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 bg-size-200 text-white border-primary-500/20 hover:bg-pos-100 animated-gradient',
  };

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
        'relative overflow-hidden font-medium border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-dark-900 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        glowClasses,
        pulseClasses,
        !disabled && !loading && 'hover:-translate-y-0.5',
        className
      )}
      onClick={handleRippleClick}
      disabled={disabled || loading}
      {...props}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full hover:translate-x-full transition-transform duration-1000" />
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ripple"
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