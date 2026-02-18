'use client';

import { useState, useEffect } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge, PostTypeBadge, TierBadge } from '@/components/ui/Badge';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/lib/auth/AuthProvider';
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Share2, 
  TrendingUp,
  Clock,
  Filter,
  Coins,
  Loader2
} from 'lucide-react';
import { TipButton } from '@/components/tips';

interface Post {
  id: string;
  author_id: string;
  type: string;
  title?: string;
  body: string;
  tags: string[];
  provider_npi?: string;
  bounty_amount: number;
  like_count: number;
  comment_count: number;
  repost_count: number;
  created_at: string;
  author?: {
    id: string;
    handle: string;
    display_name: string;
    avatar_emoji: string;
    tier: string;
  };
}

export default function FeedPage() {
  const [sortBy, setSortBy] = useState<'hot' | 'new'>('hot');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/posts?sort=${sortBy}`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [sortBy]);

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
      <ComposeBox onPostCreated={fetchPosts} />

      {/* Feed Posts */}
      <div className="space-y-4 mt-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-doge-gold" />
          </div>
        ) : posts.length === 0 ? (
          <Panel className="p-8 text-center">
            <p className="text-doge-muted">No posts yet. Be the first to share!</p>
          </Panel>
        ) : (
          posts.map((post) => (
            <FeedPost key={post.id} post={post} />
          ))
        )}
      </div>
    </div>
  );
}

function ComposeBox({ onPostCreated }: { onPostCreated: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'finding' | 'analysis' | 'discussion'>('finding');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setPosting(true);
    setError(null);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: user.id,
          type: postType,
          body: content,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setContent('');
      onPostCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  if (!user) {
    return (
      <Panel className="text-center py-6">
        <p className="text-doge-muted">Sign in to share findings</p>
      </Panel>
    );
  }

  return (
    <Panel>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share a finding, analysis, or start a discussion..."
        className="w-full bg-transparent border-none outline-none resize-none text-doge-text placeholder:text-doge-muted"
        rows={3}
      />
      {error && (
        <p className="text-risk-high text-sm mb-2">{error}</p>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-doge-border">
        <div className="flex gap-2 flex-wrap">
          <Badge 
            variant={postType === 'finding' ? 'gold' : 'default'} 
            className="cursor-pointer hover:bg-doge-border"
            onClick={() => setPostType('finding')}
          >
            🔍 Finding
          </Badge>
          <Badge 
            variant={postType === 'analysis' ? 'gold' : 'default'} 
            className="cursor-pointer hover:bg-doge-border"
            onClick={() => setPostType('analysis')}
          >
            📊 Analysis
          </Badge>
          <Badge 
            variant={postType === 'discussion' ? 'gold' : 'default'} 
            className="cursor-pointer hover:bg-doge-border"
            onClick={() => setPostType('discussion')}
          >
            💬 Discussion
          </Badge>
        </div>
        <Button 
          size="sm" 
          onClick={handlePost}
          disabled={posting || !content.trim()}
        >
          {posting ? <Loader2 size={14} className="animate-spin" /> : 'Post'}
        </Button>
      </div>
    </Panel>
  );
}

function FeedPost({ post }: { post: Post }) {
  const isSystemPost = post.author_id === '00000000-0000-0000-0000-000000000000';
  const author = post.author || { id: post.author_id, handle: 'anonymous', display_name: 'Anonymous', avatar_emoji: '🐕', tier: 'Pup' };
  
  return (
    <Panel className="hover:border-doge-gold/30 transition-colors">
      {/* Author header */}
      <div className="flex items-start gap-3 mb-3">
        {isSystemPost ? (
          <Logo size={40} glow />
        ) : (
          <div className="w-10 h-10 rounded-full bg-doge-border flex items-center justify-center text-xl">
            {author.avatar_emoji || '🐕'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-doge-text">
              {author.display_name}
            </span>
            {isSystemPost && (
              <Badge variant="gold" size="sm">✓ Official</Badge>
            )}
            <TierBadge tier={author.tier} />
            <span className="text-doge-muted text-sm">
              @{author.handle}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <PostTypeBadge type={post.type} />
            <span className="text-doge-muted text-xs">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        {post.bounty_amount > 0 && (
          <Badge variant="gold" size="md">
            💰 {post.bounty_amount} Ð
          </Badge>
        )}
      </div>

      {/* Content */}
      {post.title && (
        <h3 className="font-doge text-lg font-semibold text-doge-text mb-2">
          {post.title}
        </h3>
      )}
      <p className="text-doge-muted whitespace-pre-line text-sm leading-relaxed">
        {post.body}
      </p>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {post.tags.map((tag) => (
            <span key={tag} className="text-doge-gold text-sm">#{tag}</span>
          ))}
        </div>
      )}

      {/* Related Provider */}
      {post.provider_npi && (
        <div className="mt-3 p-2 bg-doge-bg rounded border border-doge-border">
          <span className="text-doge-muted text-xs">Related Provider:</span>
          <a 
            href={`/sniffer/${post.provider_npi}`}
            className="text-doge-gold text-sm ml-2 font-mono hover:underline"
          >
            NPI {post.provider_npi}
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-doge-border">
        <div className="flex items-center gap-4">
          <ActionButton icon={Heart} count={post.like_count} />
          <ActionButton icon={MessageCircle} count={post.comment_count} />
          <ActionButton icon={Repeat2} count={post.repost_count} />
          {/* Tip button - only show for non-system posts */}
          {!isSystemPost && author.id && (
            <TipButton
              recipientId={author.id}
              recipientName={author.display_name}
              tipType="fraud_tip"
              referenceId={post.id}
            />
          )}
        </div>
        <Button variant="ghost" size="sm" className="text-doge-gold">
          <Share2 size={16} /> Share
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
