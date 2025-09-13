import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface WaveformVisualizerProps {
  audioUrl?: string;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
  variant?: 'bars' | 'wave' | 'spectrum';
  color?: string;
  height?: number;
  className?: string;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  audioUrl,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  onSeek,
  variant = 'bars',
  color = '#6366f1',
  height = 60,
  className = '',
}) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Generate sample waveform data for demo
  useEffect(() => {
    const sampleData = Array.from({ length: 100 }, (_, i) => {
      const base = Math.sin(i * 0.1) * 0.5 + 0.5;
      const noise = Math.random() * 0.3;
      return Math.max(0.1, Math.min(1, base + noise));
    });
    setWaveformData(sampleData);
  }, []);

  const drawBars = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const barCount = waveformData.length;
    const barWidth = (canvas.width - barCount + 1) / barCount;
    const progress = duration > 0 ? currentTime / duration : 0;
    const activeBarIndex = Math.floor(progress * barCount);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    waveformData.forEach((amplitude, index) => {
      const barHeight = amplitude * canvas.height * 0.8;
      const x = index * (barWidth + 1);
      const y = (canvas.height - barHeight) / 2;

      // Create gradient
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      
      if (index <= activeBarIndex) {
        // Active/played bars
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + '80');
        if (isPlaying) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
        }
      } else {
        // Inactive bars - theme aware
        const inactiveColor = theme === 'dark' ? '#ffffff20' : '#00000020';
        const inactiveColorDim = theme === 'dark' ? '#ffffff10' : '#00000010';
        gradient.addColorStop(0, inactiveColor);
        gradient.addColorStop(1, inactiveColorDim);
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Add pulsing effect for playing
      if (isPlaying && index <= activeBarIndex) {
        const pulse = Math.sin(Date.now() * 0.01 + index * 0.1) * 0.1 + 1;
        ctx.fillRect(x, y - (barHeight * pulse - barHeight) / 2, barWidth, barHeight * pulse);
      }
    });
  };

  const drawWave = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerY = canvas.height / 2;
    const progress = duration > 0 ? currentTime / duration : 0;
    const progressX = progress * canvas.width;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw played portion
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = isPlaying ? 10 : 0;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    
    for (let i = 0; i < Math.min(waveformData.length, Math.floor((progressX / canvas.width) * waveformData.length)); i++) {
      const x = (i / waveformData.length) * canvas.width;
      const y = centerY + (waveformData[i] - 0.5) * canvas.height * 0.8;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw unplayed portion - theme aware
    ctx.strokeStyle = theme === 'dark' ? '#ffffff20' : '#00000020';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(progressX, centerY + (waveformData[Math.floor((progressX / canvas.width) * waveformData.length)] || 0.5 - 0.5) * canvas.height * 0.8);
    
    for (let i = Math.floor((progressX / canvas.width) * waveformData.length); i < waveformData.length; i++) {
      const x = (i / waveformData.length) * canvas.width;
      const y = centerY + (waveformData[i] - 0.5) * canvas.height * 0.8;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw progress indicator
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = isPlaying ? 15 : 5;
    ctx.beginPath();
    ctx.arc(progressX, centerY, 4, 0, 2 * Math.PI);
    ctx.fill();
  };

  const drawSpectrum = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const barCount = 32;
    const barWidth = canvas.width / barCount;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < barCount; i++) {
      const amplitude = isPlaying 
        ? Math.random() * 0.8 + 0.2 
        : (waveformData[i * 3] || 0.3) * 0.5;
      
      const barHeight = amplitude * canvas.height;
      const x = i * barWidth;
      const y = canvas.height - barHeight;

      // Create gradient
      const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.6, color + '80');
      gradient.addColorStop(1, color + '20');

      ctx.fillStyle = gradient;
      
      if (isPlaying) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
      }
      
      ctx.fillRect(x, y, barWidth - 2, barHeight);
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    switch (variant) {
      case 'bars':
        drawBars(ctx, canvas);
        break;
      case 'wave':
        drawWave(ctx, canvas);
        break;
      case 'spectrum':
        drawSpectrum(ctx, canvas);
        break;
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(draw);
    }
  };

  useEffect(() => {
    draw();
    
    if (isPlaying) {
      const animate = () => {
        draw();
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTime, duration, variant, color, waveformData]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const progress = x / rect.width;
    const time = progress * duration;

    onSeek(Math.max(0, Math.min(duration, time)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative w-full ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full cursor-pointer rounded-lg"
        style={{ height: `${height}px` }}
        onClick={handleClick}
      />
      
      {/* Overlay gradient - theme aware */}
      <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent pointer-events-none rounded-lg ${
        theme === 'dark' ? 'via-white/5' : 'via-black/5'
      }`} />
    </motion.div>
  );
};

export default WaveformVisualizer;