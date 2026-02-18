'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BootScreen } from '@/components/ui/BootScreen';
import { Logo, LogoWordmark } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { TipJarButton } from '@/components/tips';

export default function LandingPage() {
  const router = useRouter();
  const [showBoot, setShowBoot] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (showBoot) {
    return <BootScreen onComplete={() => setShowBoot(false)} duration={3000} />;
  }

  return (
    <div className="min-h-screen bg-doge-bg">
      {/* Top bar with Support button */}
      <div className="absolute top-4 right-4 z-50">
        <TipJarButton variant="secondary" size="sm" />
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-doge-gold/5 to-transparent" />
        
        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <Logo size={100} glow className="glow-gold" />
            </div>

            {/* Title */}
            <h1 className="font-doge text-5xl md:text-7xl font-bold text-doge-gold tracking-wider mb-6">
              DOGEWATCH
            </h1>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-doge-text mb-4">
              Crowdsourced Medicaid Fraud Detection
            </p>
            <p className="text-doge-muted mb-12 max-w-2xl mx-auto">
              Analyze open-sourced HHS Medicaid claims data (2018-2024). 
              Flag suspicious billing patterns. Earn DOGE bounties for verified fraud reports. 
              Share your findings. Join the pack.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => router.push('/signup')}>
                🐕 Join the Pack
              </Button>
              <Button variant="secondary" size="lg" onClick={() => router.push('/feed')}>
                Explore Feed →
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            emoji="🔍"
            title="The Sniffer"
            description="Search and filter millions of provider records. Spot anomalies in billing patterns with visual analytics."
          />
          <FeatureCard
            emoji="🐕"
            title="The Bloodhound"
            description="AI-powered natural language queries. Ask questions about the data and get instant insights."
          />
          <FeatureCard
            emoji="💰"
            title="DOGE Bounties"
            description="Stake DOGE on your findings. Earn rewards when your fraud reports are verified by the community."
          />
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-12">
        <Panel variant="glow" className="p-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <StatItem value="$2.3B" label="Total Billed Analyzed" />
            <StatItem value="847K" label="Provider Records" />
            <StatItem value="12,450" label="DOGE in Bounties" />
            <StatItem value="1,247" label="Pack Members" />
          </div>
        </Panel>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 text-center">
        <LogoWordmark size={24} className="justify-center mb-4" />
        <p className="text-doge-muted text-sm font-mono">
          Open data. Open source. Much transparency.
        </p>
        <p className="text-doge-muted/50 text-xs font-mono mt-2">
          #DogeWatch #DOGE #MedicaidFraud #OpenData
        </p>
        <div className="mt-6 pt-6 border-t border-doge-border">
          <p className="text-xs text-doge-muted mb-2">
            DogeWatch is an independent research platform. Statistical anomalies do not constitute accusations.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <Link href="/terms" className="text-doge-muted hover:text-doge-gold">Terms</Link>
            <span className="text-doge-border">|</span>
            <Link href="/privacy" className="text-doge-muted hover:text-doge-gold">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <Panel variant="elevated" className="text-center hover:border-doge-gold/50 transition-colors">
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className="font-doge text-xl font-bold text-doge-gold mb-2">{title}</h3>
      <p className="text-doge-muted text-sm">{description}</p>
    </Panel>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-mono text-3xl font-bold text-doge-gold">{value}</div>
      <div className="text-doge-muted text-sm mt-1">{label}</div>
    </div>
  );
}
