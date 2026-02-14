'use client';

import { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface BootScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export function BootScreen({ onComplete, duration = 2500 }: BootScreenProps) {
  const [status, setStatus] = useState('INITIALIZING THE SNIFFER...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const statuses = [
      'INITIALIZING THE SNIFFER...',
      'LOADING HHS DATASET...',
      'CALIBRATING ANOMALY DETECTION...',
      'CONNECTING TO DOGE NETWORK...',
      'READY TO HUNT.',
    ];

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProgress((step / (statuses.length - 1)) * 100);
      if (step < statuses.length) {
        setStatus(statuses[step]);
      }
      if (step >= statuses.length - 1) {
        clearInterval(interval);
        setTimeout(() => onComplete?.(), 500);
      }
    }, duration / statuses.length);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 bg-doge-bg flex flex-col items-center justify-center z-50">
      {/* Logo with glow animation */}
      <div className="mb-8">
        <Logo size={120} glow animate className="animate-glow-pulse" />
      </div>

      {/* Wordmark */}
      <h1 className="font-doge text-4xl font-bold text-doge-gold tracking-wider mb-6">
        DOGEWATCH
      </h1>

      {/* Status text with cursor blink */}
      <div className="font-mono text-doge-muted text-sm mb-8">
        <span className="cursor-blink">{status}</span>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-doge-panel rounded-full overflow-hidden">
        <div 
          className="h-full bg-doge-gold transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Tagline */}
      <p className="mt-8 text-doge-muted text-xs font-mono">
        CROWDSOURCED FRAUD DETECTION • POWERED BY DOGE
      </p>
    </div>
  );
}
