'use client';

import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

export function Badge({ 
  className = '', 
  variant = 'default', 
  size = 'sm',
  children, 
  ...props 
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-mono font-semibold rounded-full';
  
  const variants = {
    default: 'bg-doge-border text-doge-muted',
    gold: 'bg-doge-gold/20 text-doge-gold border border-doge-gold/30',
    success: 'bg-risk-safe/20 text-risk-safe border border-risk-safe/30',
    warning: 'bg-risk-moderate/20 text-risk-moderate border border-risk-moderate/30',
    danger: 'bg-risk-high/20 text-risk-high border border-risk-high/30',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

// Tier Badge for researcher rankings
export function TierBadge({ tier }: { tier: string }) {
  const tiers: Record<string, { emoji: string; color: string }> = {
    'Pup': { emoji: '🐕', color: 'default' },
    'Scout': { emoji: '🐕‍🦺', color: 'default' },
    'Tracker': { emoji: '🔍', color: 'warning' },
    'Bloodhound': { emoji: '🩸', color: 'danger' },
    'Alpha': { emoji: '👑', color: 'gold' },
  };
  
  const t = tiers[tier] || tiers['Pup'];
  
  return (
    <Badge variant={t.color as any}>
      {t.emoji} {tier}
    </Badge>
  );
}

// Risk Score Badge
export function RiskBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  
  let variant: 'success' | 'warning' | 'danger' = 'success';
  if (score >= 0.7) variant = 'danger';
  else if (score >= 0.4) variant = 'warning';
  
  return (
    <Badge variant={variant} size="md">
      {percentage}% RISK
    </Badge>
  );
}

// Post Type Badge
export function PostTypeBadge({ type }: { type: string }) {
  const types: Record<string, { label: string; variant: 'gold' | 'success' | 'warning' | 'danger' | 'default' }> = {
    'finding': { label: '🔍 Finding', variant: 'warning' },
    'analysis': { label: '📊 Analysis', variant: 'default' },
    'tool': { label: '🔧 Tool', variant: 'success' },
    'bounty': { label: '💰 Bounty', variant: 'gold' },
    'discussion': { label: '💬 Discussion', variant: 'default' },
  };
  
  const t = types[type] || types['discussion'];
  
  return <Badge variant={t.variant}>{t.label}</Badge>;
}
