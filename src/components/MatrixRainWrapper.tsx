'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with canvas
const MatrixRain = dynamic(() => import('./MatrixRain'), { ssr: false });

export default function MatrixRainWrapper() {
  const [fullMode, setFullMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Keyboard shortcut: press 'M' for Matrix mode
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        // Don't trigger if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        setFullMode(prev => !prev);
      }
      // ESC to exit full mode
      if (e.key === 'Escape' && fullMode) {
        setFullMode(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [fullMode]);

  if (!mounted) return null;

  return (
    <MatrixRain 
      fullMode={fullMode} 
      onToggle={() => setFullMode(prev => !prev)} 
    />
  );
}
