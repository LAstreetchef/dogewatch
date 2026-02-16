'use client';

import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  type: 'confetti' | 'doge' | 'coin';
  opacity: number;
}

interface InscriptionCelebrationProps {
  active: boolean;
  onComplete?: () => void;
}

const COLORS = [
  '#FFD700', // Gold
  '#FFA500', // Orange
  '#FFE135', // Banana yellow
  '#F4C430', // Saffron
  '#FFDF00', // Golden yellow
  '#DAA520', // Goldenrod
];

export function InscriptionCelebration({ active, onComplete }: InscriptionCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const dogeImageRef = useRef<HTMLImageElement | null>(null);
  const [visible, setVisible] = useState(false);

  // Load doge image
  useEffect(() => {
    const img = new Image();
    img.src = '/logo/doge-v2-64.png';
    img.onload = () => {
      dogeImageRef.current = img;
    };
  }, []);

  // Spawn particles when active
  useEffect(() => {
    if (!active) return;
    
    setVisible(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Spawn initial burst of particles
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    particlesRef.current = [];

    // Confetti burst
    for (let i = 0; i < 150; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 8 + Math.random() * 12;
      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        size: 8 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        type: 'confetti',
        opacity: 1,
      });
    }

    // Add some doges
    for (let i = 0; i < 8; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 5 + Math.random() * 8;
      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 8,
        size: 32 + Math.random() * 24,
        color: '#FFD700',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        type: 'doge',
        opacity: 1,
      });
    }

    // Add coins
    for (let i = 0; i < 20; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 6 + Math.random() * 10;
      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6,
        size: 16 + Math.random() * 12,
        color: '#FFD700',
        rotation: 0,
        rotationSpeed: 0.2,
        type: 'coin',
        opacity: 1,
      });
    }

    let frameCount = 0;
    const maxFrames = 180; // ~3 seconds at 60fps

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameCount++;

      let activeParticles = 0;

      particlesRef.current.forEach(p => {
        // Update physics
        p.vy += 0.3; // Gravity
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99; // Air resistance
        p.rotation += p.rotationSpeed;
        
        // Fade out
        if (frameCount > maxFrames - 60) {
          p.opacity -= 0.02;
        }

        if (p.opacity <= 0 || p.y > canvas.height + 100) return;
        activeParticles++;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.type === 'confetti') {
          // Draw confetti rectangle
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.type === 'doge' && dogeImageRef.current) {
          // Draw doge
          ctx.drawImage(
            dogeImageRef.current,
            -p.size / 2,
            -p.size / 2,
            p.size,
            p.size
          );
        } else if (p.type === 'coin') {
          // Draw coin (Ð symbol)
          ctx.fillStyle = '#FFD700';
          ctx.font = `bold ${p.size}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Ð', 0, 0);
        }

        ctx.restore();
      });

      if (activeParticles > 0 && frameCount < maxFrames) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setVisible(false);
        onComplete?.();
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, onComplete]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[100] pointer-events-none"
      style={{ background: 'transparent' }}
    />
  );
}
