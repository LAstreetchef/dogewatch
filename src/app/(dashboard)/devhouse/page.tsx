'use client';

import { useState } from 'react';
import { 
  Hammer, 
  Clock, 
  CheckCircle, 
  Rocket,
  Heart,
  ChevronUp,
  Zap,
  Shield,
  Brain,
  Users,
  Bell,
  BarChart3,
  MessageSquare,
  Trophy
} from 'lucide-react';
import { TipJarButton } from '@/components/tips';

type FeatureStatus = 'building' | 'next' | 'shipped';

interface Feature {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  progress?: number; // 0-100 for building status
  tipTarget?: number; // DOGE target
  tipsReceived?: number;
  shippedDate?: string;
}

const features: Feature[] = [
  // In Progress
  {
    id: 'devhouse',
    name: 'Dev House',
    description: 'Transparent roadmap showing what we\'re building. You\'re looking at it!',
    status: 'building',
    icon: Hammer,
    progress: 90,
  },
  {
    id: 'alerts',
    name: 'Anomaly Alerts',
    description: 'Get notified when suspicious billing patterns are detected in your watched providers.',
    status: 'building',
    icon: Bell,
    progress: 40,
    tipTarget: 500,
    tipsReceived: 125,
  },
  {
    id: 'social-share',
    name: 'Social Proof Sharing',
    description: 'Share your fraud findings on X/Twitter with auto-generated graphics.',
    status: 'building',
    icon: MessageSquare,
    progress: 25,
    tipTarget: 300,
    tipsReceived: 45,
  },
  
  // Up Next
  {
    id: 'bounty-board',
    name: 'Bounty Board',
    description: 'Community-funded investigations. Put up DOGE to prioritize specific fraud patterns.',
    status: 'next',
    icon: Trophy,
    tipTarget: 1000,
    tipsReceived: 200,
  },
  {
    id: 'pack-collab',
    name: 'Pack Collaboration',
    description: 'Team up with other investigators. Share notes, coordinate deep dives.',
    status: 'next',
    icon: Users,
    tipTarget: 750,
    tipsReceived: 50,
  },
  {
    id: 'ai-patterns',
    name: 'AI Pattern Recognition',
    description: 'Machine learning to auto-detect billing anomalies across the entire dataset.',
    status: 'next',
    icon: Brain,
    tipTarget: 2000,
    tipsReceived: 350,
  },
  {
    id: 'state-drilldown',
    name: 'State-by-State Drilldown',
    description: 'Interactive maps showing fraud hotspots by state and county.',
    status: 'next',
    icon: BarChart3,
    tipTarget: 500,
    tipsReceived: 0,
  },
  
  // Shipped
  {
    id: 'sniffer',
    name: 'The Sniffer',
    description: 'Provider search with anomaly scoring. Find suspicious billing in seconds.',
    status: 'shipped',
    icon: Zap,
    shippedDate: '2026-02-15',
  },
  {
    id: 'bloodhound',
    name: 'Bloodhound AI',
    description: 'Natural language queries against Medicaid data. Ask questions in plain English.',
    status: 'shipped',
    icon: Brain,
    shippedDate: '2026-02-15',
  },
  {
    id: 'wallet',
    name: 'DOGE Wallet',
    description: 'Real Dogecoin wallet with HD derivation. Deposit, withdraw, earn.',
    status: 'shipped',
    icon: Shield,
    shippedDate: '2026-02-16',
  },
  {
    id: 'inscription',
    name: 'Blockchain Inscriptions',
    description: 'Immortalize fraud tips on the Dogecoin blockchain via IPFS + OP_RETURN.',
    status: 'shipped',
    icon: CheckCircle,
    shippedDate: '2026-02-16',
  },
];

const statusConfig = {
  building: {
    label: 'Building',
    icon: Hammer,
    color: 'text-risk-moderate',
    bg: 'bg-risk-moderate/20',
    border: 'border-risk-moderate/30',
  },
  next: {
    label: 'Up Next',
    icon: Clock,
    color: 'text-doge-muted',
    bg: 'bg-doge-border/50',
    border: 'border-doge-border',
  },
  shipped: {
    label: 'Shipped',
    icon: CheckCircle,
    color: 'text-risk-safe',
    bg: 'bg-risk-safe/20',
    border: 'border-risk-safe/30',
  },
};

function FeatureCard({ feature }: { feature: Feature }) {
  const config = statusConfig[feature.status];
  const Icon = feature.icon;
  const StatusIcon = config.icon;
  
  const tipProgress = feature.tipTarget && feature.tipsReceived 
    ? (feature.tipsReceived / feature.tipTarget) * 100 
    : 0;

  return (
    <div className={`rounded-xl border ${config.border} bg-doge-panel/80 backdrop-blur-sm p-5 hover:border-doge-gold/30 transition-all`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${config.bg}`}>
          <Icon size={24} className={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-doge-text">{feature.name}</h3>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
              <StatusIcon size={12} />
              {config.label}
            </span>
          </div>
          <p className="text-sm text-doge-muted mb-3">{feature.description}</p>
          
          {/* Progress bar for building */}
          {feature.status === 'building' && feature.progress !== undefined && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-doge-muted mb-1">
                <span>Progress</span>
                <span>{feature.progress}%</span>
              </div>
              <div className="h-2 bg-doge-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-risk-moderate to-doge-gold transition-all"
                  style={{ width: `${feature.progress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Tip target */}
          {feature.tipTarget && (
            <div className="mt-3 pt-3 border-t border-doge-border/50">
              <div className="flex justify-between text-xs text-doge-muted mb-1">
                <span className="flex items-center gap-1">
                  <Heart size={12} className="text-doge-gold" />
                  Tips received
                </span>
                <span>
                  <span className="text-doge-gold">{feature.tipsReceived || 0}</span>
                  <span className="text-doge-muted"> / {feature.tipTarget} DOGE</span>
                </span>
              </div>
              <div className="h-1.5 bg-doge-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-doge-gold-dark to-doge-gold transition-all"
                  style={{ width: `${Math.min(tipProgress, 100)}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Shipped date */}
          {feature.shippedDate && (
            <div className="mt-2 text-xs text-doge-muted">
              Shipped {feature.shippedDate}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DevHousePage() {
  const building = features.filter(f => f.status === 'building');
  const next = features.filter(f => f.status === 'next');
  const shipped = features.filter(f => f.status === 'shipped');
  
  const totalTips = features.reduce((sum, f) => sum + (f.tipsReceived || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-doge-gold/20 text-doge-gold text-sm font-medium">
          <Hammer size={16} />
          Building in Public
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-doge-text">
          The Dev House
        </h1>
        <p className="text-doge-muted max-w-xl mx-auto">
          See what we&apos;re building, what&apos;s next, and what just shipped. 
          Tip to prioritize features — the pack decides what gets built.
        </p>
        
        {/* Stats bar */}
        <div className="flex items-center justify-center gap-6 pt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-risk-moderate">{building.length}</div>
            <div className="text-xs text-doge-muted">Building</div>
          </div>
          <div className="h-8 w-px bg-doge-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-doge-muted">{next.length}</div>
            <div className="text-xs text-doge-muted">Queued</div>
          </div>
          <div className="h-8 w-px bg-doge-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-risk-safe">{shipped.length}</div>
            <div className="text-xs text-doge-muted">Shipped</div>
          </div>
          <div className="h-8 w-px bg-doge-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-doge-gold">{totalTips}</div>
            <div className="text-xs text-doge-muted">DOGE Tipped</div>
          </div>
        </div>
      </div>

      {/* Tip CTA */}
      <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-r from-doge-gold/10 to-doge-gold/5 border border-doge-gold/20">
        <div className="flex items-center gap-2 text-doge-gold">
          <Heart size={20} />
          <span className="font-semibold">Fund the Build</span>
        </div>
        <p className="text-sm text-doge-muted text-center max-w-md">
          Every tip goes directly to development. Higher-tipped features get prioritized.
        </p>
        <TipJarButton variant="primary" size="lg" />
      </div>

      {/* Building Now */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Hammer size={20} className="text-risk-moderate" />
          <h2 className="text-xl font-semibold text-doge-text">Building Now</h2>
        </div>
        <div className="grid gap-4">
          {building.map(feature => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </section>

      {/* Up Next */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} className="text-doge-muted" />
          <h2 className="text-xl font-semibold text-doge-text">Up Next</h2>
          <span className="text-xs text-doge-muted bg-doge-border/50 px-2 py-0.5 rounded">
            Tip to prioritize
          </span>
        </div>
        <div className="grid gap-4">
          {next.map(feature => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </section>

      {/* Shipped */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={20} className="text-risk-safe" />
          <h2 className="text-xl font-semibold text-doge-text">Recently Shipped</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {shipped.map(feature => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <div className="text-center py-8 border-t border-doge-border">
        <p className="text-doge-muted mb-4">
          Got a feature idea? Drop it in the pack chat or tip with a note.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-doge-gold">
          <Rocket size={16} />
          <span>Built by the pack, for the pack</span>
        </div>
      </div>
    </div>
  );
}
