'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge, PostTypeBadge, TierBadge } from '@/components/ui/Badge';
import { Logo } from '@/components/ui/Logo';
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Share2, 
  TrendingUp,
  Clock,
  Filter,
  Coins
} from 'lucide-react';
import { TipButton } from '@/components/tips';

// Mock feed data
const mockPosts = [
  {
    id: '1',
    author: {
      id: 'user-1',
      handle: 'shibasleuthhh',
      displayName: 'ShibaSleuth',
      tier: 'Bloodhound',
      avatar: null,
    },
    type: 'finding',
    title: 'Minnesota Autism Billing Anomaly — $847M Spike',
    body: 'Identified a 340% increase in autism-related Medicaid claims in MN from 2020-2023. This mirrors the pattern discussed in recent investigations. Provider NPI 1234567890 shows $12M in billings concentrated in a single procedure code.\n\nKey findings:\n• 73% of claims from 3 providers\n• Average claim 5x state median\n• Geographic clustering in Twin Cities metro',
    tags: ['Minnesota', 'Autism', 'Anomaly'],
    bountyAmount: 500,
    relatedProvider: { npi: '1234567890', name: 'Comfort Care Services', state: 'MN' },
    likeCount: 127,
    commentCount: 34,
    repostCount: 18,
    shareCount: 45,
    createdAt: '2024-02-14T08:30:00Z',
  },
  {
    id: '2',
    author: {
      id: 'system',
      handle: 'dogewatch',
      displayName: 'DogeWatch',
      tier: 'Alpha',
      avatar: 'system',
    },
    type: 'bounty',
    title: '🏆 Weekly Bounty: Top Verifier Rewards',
    body: 'This week\'s top verifiers earned a total of 2,450 DOGE for accurate case reviews!\n\n🥇 @cryptoauditor — 850 DOGE\n🥈 @fraudhunter99 — 620 DOGE\n🥉 @shibasleuthhh — 480 DOGE\n\nKeep sniffing, pack! Every verified report strengthens the network.',
    tags: ['Bounty', 'Weekly'],
    bountyAmount: 2450,
    likeCount: 89,
    commentCount: 12,
    repostCount: 24,
    shareCount: 67,
    createdAt: '2024-02-13T12:00:00Z',
  },
  {
    id: '3',
    author: {
      id: 'user-3',
      handle: 'datadog42',
      displayName: 'DataDog',
      tier: 'Tracker',
      avatar: null,
    },
    type: 'analysis',
    title: 'Procedure Code 96153 — National Trend Analysis',
    body: 'Built a dashboard analyzing billing patterns for procedure code 96153 (therapeutic interventions) across all 50 states. Notable outliers in MN, FL, and CA.\n\nInteractive chart attached — zoom into any state to see provider-level breakdowns.',
    tags: ['Analysis', 'National', '96153'],
    bountyAmount: 0,
    hasChart: true,
    likeCount: 203,
    commentCount: 56,
    repostCount: 41,
    shareCount: 89,
    createdAt: '2024-02-12T15:45:00Z',
  },
];

export default function FeedPage() {
  const [sortBy, setSortBy] = useState<'hot' | 'new'>('hot');
  const [filterType, setFilterType] = useState<string | null>(null);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-doge text-2xl font-bold text-doge-gold">Community Feed</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={sortBy === 'hot' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('hot')}
          >
            <TrendingUp size={16} /> Hot
          </Button>
          <Button
            variant={sortBy === 'new' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('new')}
          >
            <Clock size={16} /> New
          </Button>
        </div>
      </div>

      {/* Compose Box */}
      <ComposeBox />

      {/* Feed Posts */}
      <div className="space-y-4 mt-6">
        {mockPosts.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

function ComposeBox() {
  return (
    <Panel>
      <textarea
        placeholder="Share a finding, analysis, or start a discussion..."
        className="w-full bg-transparent border-none outline-none resize-none text-doge-text placeholder:text-doge-muted"
        rows={3}
      />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-doge-border">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="default" className="cursor-pointer hover:bg-doge-border">
            🔍 Finding
          </Badge>
          <Badge variant="default" className="cursor-pointer hover:bg-doge-border">
            📊 Analysis
          </Badge>
          <Badge variant="default" className="cursor-pointer hover:bg-doge-border">
            💬 Discussion
          </Badge>
        </div>
        <Button size="sm">Post</Button>
      </div>
    </Panel>
  );
}

function FeedPost({ post }: { post: typeof mockPosts[0] }) {
  const isSystemPost = post.author.avatar === 'system';
  
  return (
    <Panel className="hover:border-doge-gold/30 transition-colors">
      {/* Author header */}
      <div className="flex items-start gap-3 mb-3">
        {isSystemPost ? (
          <Logo size={40} glow />
        ) : (
          <div className="w-10 h-10 rounded-full bg-doge-border flex items-center justify-center">
            <Logo size={28} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-doge-text">
              {post.author.displayName}
            </span>
            {isSystemPost && (
              <Badge variant="gold" size="sm">✓ Official</Badge>
            )}
            <TierBadge tier={post.author.tier} />
            <span className="text-doge-muted text-sm">
              @{post.author.handle}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <PostTypeBadge type={post.type} />
            <span className="text-doge-muted text-xs">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        {post.bountyAmount > 0 && (
          <Badge variant="gold" size="md">
            💰 {post.bountyAmount} Ð
          </Badge>
        )}
      </div>

      {/* Content */}
      <h3 className="font-doge text-lg font-semibold text-doge-text mb-2">
        {post.title}
      </h3>
      <p className="text-doge-muted whitespace-pre-line text-sm leading-relaxed">
        {post.body}
      </p>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {post.tags.map((tag) => (
            <span key={tag} className="text-doge-gold text-sm">#{tag}</span>
          ))}
        </div>
      )}

      {/* Related Provider */}
      {post.relatedProvider && (
        <div className="mt-3 p-2 bg-doge-bg rounded border border-doge-border">
          <span className="text-doge-muted text-xs">Related Provider:</span>
          <span className="text-doge-gold text-sm ml-2 font-mono">
            {post.relatedProvider.name} ({post.relatedProvider.state}) — NPI {post.relatedProvider.npi}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-doge-border">
        <div className="flex items-center gap-4">
          <ActionButton icon={Heart} count={post.likeCount} />
          <ActionButton icon={MessageCircle} count={post.commentCount} />
          <ActionButton icon={Repeat2} count={post.repostCount} />
          {/* Tip button - only show for non-system posts */}
          {post.author.avatar !== 'system' && (
            <TipButton
              recipientId={post.author.id}
              recipientName={post.author.displayName}
              tipType="fraud_tip"
              referenceId={post.id}
            />
          )}
        </div>
        <Button variant="ghost" size="sm" className="text-doge-gold">
          <Share2 size={16} /> Share to X
        </Button>
      </div>
    </Panel>
  );
}

function ActionButton({ icon: Icon, count }: { icon: any; count: number }) {
  return (
    <button className="flex items-center gap-1.5 text-doge-muted hover:text-doge-gold transition-colors">
      <Icon size={18} />
      <span className="font-mono text-sm">{count}</span>
    </button>
  );
}
