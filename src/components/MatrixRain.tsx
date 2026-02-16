'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface MatrixRainProps {
  fullMode?: boolean;
  onToggle?: () => void;
}

// Doge-themed characters: Ð, $, numbers, symbols
const CHARS = 'Ð$01234567890DOGEWATCHFRAUD%&#+@*NPI'.split('');

export default function MatrixRain({ fullMode = false, onToggle }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const dropsRef = useRef<number[]>([]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    
    // Initialize drops if needed
    if (dropsRef.current.length !== columns) {
      dropsRef.current = Array(columns).fill(0).map(() => Math.random() * -100);
    }

    // Fade effect - more transparent in subtle mode
    ctx.fillStyle = fullMode ? 'rgba(13, 10, 4, 0.05)' : 'rgba(13, 10, 4, 0.1)';
    ctx.fillRect(0, 0, width, height);

    // Gold/yellow gradient for text
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, fullMode ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 215, 0, 0.25)');
    gradient.addColorStop(0.5, fullMode ? 'rgba(212, 160, 23, 0.8)' : 'rgba(212, 160, 23, 0.2)');
    gradient.addColorStop(1, fullMode ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 215, 0, 0.15)');
    
    ctx.fillStyle = gradient;
    ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

    for (let i = 0; i < dropsRef.current.length; i++) {
      // Random character
      const char = CHARS[Math.floor(Math.random() * CHARS.length)];
      
      // Draw character
      const x = i * fontSize;
      const y = dropsRef.current[i] * fontSize;
      
      // Brighter leading character
      if (fullMode) {
        ctx.fillStyle = 'rgba(255, 255, 200, 1)';
        ctx.fillText(char, x, y);
        ctx.fillStyle = gradient;
      } else {
        ctx.fillText(char, x, y);
      }

      // Reset drop randomly when it goes off screen
      if (y > height && Math.random() > 0.975) {
        dropsRef.current[i] = 0;
      }
      
      // Move drop down (slower for readability)
      dropsRef.current[i] += fullMode ? 0.4 : 0.2;
    }
  }, [fullMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      draw(ctx, canvas.width, canvas.height);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 pointer-events-none ${fullMode ? 'z-40' : 'z-0'}`}
        style={{ background: 'transparent' }}
      />
      
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={`fixed bottom-4 right-4 z-50 px-3 py-2 rounded-lg text-xs font-mono transition-all
          ${fullMode 
            ? 'bg-yellow-500/90 text-black hover:bg-yellow-400' 
            : 'bg-black/50 text-yellow-500/70 hover:text-yellow-400 hover:bg-black/70 border border-yellow-500/30'
          }`}
        title={fullMode ? 'Exit Matrix Mode' : 'Enter Matrix Mode'}
      >
        {fullMode ? '◉ EXIT MATRIX' : '◎ MATRIX MODE'}
      </button>

      {/* Full mode overlay header */}
      {fullMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-center">
          <div className="text-yellow-400 font-mono text-sm tracking-widest animate-pulse">
            [ DOGEWATCH FRAUD FEED — LIVE ]
          </div>
        </div>
      )}
    </>
  );
}
