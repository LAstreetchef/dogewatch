'use client';

import { Panel } from '@/components/ui/Panel';
import { Logo } from '@/components/ui/Logo';
import { Trophy, Users } from 'lucide-react';

const mockLeaderboard = [
  { rank: 1, handle: 'shibasleuthhh', displayName: 'ShibaSleuth', tier: 'Bloodhound', xp: 12450, verified: 23, emoji: '🩸' },
  { rank: 2, handle: 'datadog42', displayName: 'DataDog', tier: 'Tracker', xp: 8920, verified: 15, emoji: '🔍' },
  { rank: 3, handle: 'fraudhunter99', displayName: 'FraudHunter', tier: 'Tracker', xp: 7340, verified: 12, emoji: '🔍' },
  { rank: 4, handle: 'cryptoauditor', displayName: 'CryptoAuditor', tier: 'Scout', xp: 5120, verified: 8, emoji: '🐕‍🦺' },
  { rank: 5, handle: 'medicaidwatch', displayName: 'MedicaidWatch', tier: 'Scout', xp: 4200, verified: 6, emoji: '🐕‍🦺' },
];

export default function PackPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="text-doge-gold" size={28} />
        <h1 className="text-2xl font-bold text-doge-text">Pack Rankings</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Panel className="p-4 text-center">
          <div className="text-3xl font-bold text-doge-gold">247</div>
          <div className="text-sm text-doge-muted">Total Researchers</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-3xl font-bold text-risk-low">89</div>
          <div className="text-sm text-doge-muted">Verified Cases</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-3xl font-bold text-doge-gold">45.2K</div>
          <div className="text-sm text-doge-muted">DOGE Distributed</div>
        </Panel>
      </div>

      {/* Leaderboard */}
      <Panel>
        <div className="p-4 border-b border-doge-border">
          <h2 className="font-semibold text-doge-text flex items-center gap-2">
            <Users size={18} />
            Top Researchers
          </h2>
        </div>
        <div className="divide-y divide-doge-border">
          {mockLeaderboard.map((user) => (
            <div key={user.handle} className="flex items-center gap-4 p-4 hover:bg-doge-bg/50 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                user.rank === 1 ? 'bg-doge-gold/20 text-doge-gold' :
                user.rank === 2 ? 'bg-gray-400/20 text-gray-400' :
                user.rank === 3 ? 'bg-amber-600/20 text-amber-600' :
                'bg-doge-border text-doge-muted'
              }`}>
                {user.rank}
              </div>
              
              <div className="w-10 h-10 rounded-full bg-doge-panel border border-doge-border flex items-center justify-center text-xl">
                {user.emoji}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-doge-text">{user.displayName}</div>
                <div className="text-sm text-doge-muted">@{user.handle} · {user.tier}</div>
              </div>
              
              <div className="text-right">
                <div className="font-mono font-semibold text-doge-gold">{user.xp.toLocaleString()} XP</div>
                <div className="text-xs text-doge-muted">{user.verified} verified</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
