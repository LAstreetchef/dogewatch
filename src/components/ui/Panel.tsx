'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glow';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ className = '', variant = 'default', padding = 'md', children, ...props }, ref) => {
    const baseStyles = 'bg-doge-panel border border-doge-border rounded-lg';
    
    const variants = {
      default: '',
      elevated: 'shadow-lg shadow-black/50',
      glow: 'shadow-gold border-doge-gold/30',
    };
    
    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Panel.displayName = 'Panel';
