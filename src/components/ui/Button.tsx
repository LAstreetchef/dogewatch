'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-doge font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-doge-gold focus:ring-offset-2 focus:ring-offset-doge-bg disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-doge-gold text-doge-bg hover:bg-doge-gold-dark shadow-gold hover:shadow-gold-lg',
      secondary: 'bg-doge-panel border border-doge-border text-doge-text hover:border-doge-gold hover:text-doge-gold',
      ghost: 'bg-transparent text-doge-muted hover:text-doge-gold hover:bg-doge-panel',
      danger: 'bg-risk-high/20 border border-risk-high text-risk-high hover:bg-risk-high hover:text-white',
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
