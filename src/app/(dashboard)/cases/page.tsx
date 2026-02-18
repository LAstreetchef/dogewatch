'use client';

import { useState, useEffect } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth/AuthProvider';
import { 
  FolderOpen, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  Coins,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Timer,
  Loader2,
  MessageSquare,
  Shield,
  FileText,
  Send
} from 'lucide-react';

interface CaseResponse {
  id: string;
  case_id: string;
  responder_id?: string;
  response_type: 'comment' | 'defense' | 'evidence' | 'official';
  content: string;
  evidence_urls?: string[];
  is_verified_party: boolean;
  created_at: string;
  responder?: {
    handle: string;
    display_name: string;
    avatar_emoji: string;
    tier: string;
  };
}

interface Case {
  id: string;
  submitter_id: string;
  title: string;
  summary: string;
  evidence?: string;
  provider_npi?: string;
  provider_name?: string;
  bounty_amount: number;
  status: 'open' | 'verified' | 'rejected' | 'disputed';
  verification_closes_at: string;
  valid_votes_count: number;
  invalid_votes_count: number;
  valid_stake_total: number;
  invalid_stake_total: number;
  created_at: string;
  submitter?: {
    handle: string;
    display_name: string;
    avatar_emoji: string;
    tier: string;
  };
}

type TabType = 'open' | 'verified' | 'rejected' | 'my-votes';

export default function CasesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('open');
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCase, setShowNewCase] = useState(false);

  useEffect(() => {
    fetchCases();
  }, [activeTab]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const status = activeTab === 'my-votes' ? 'all' : activeTab;
      const res = await fetch(`/api/cases?status=${status}`);
      const data = await res.json();
      setCases(data.cases || []);
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'open', label: 'Open', icon: Clock, count: cases.filter(c => c.status === 'open').length },
    { id: 'verified', label: 'Verified', icon: CheckCircle },
    { id: 'rejected', label: 'Rejected', icon: XCircle },
    { id: 'my-votes', label: 'My Votes', icon: Users },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-doge-gold font-doge">Case Files</h1>
          <p className="text-doge-muted text-sm mt-1">
            Community-verified fraud investigations
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowNewCase(true)}>
          <Plus size={18} />
          Submit Finding
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-doge-gold text-doge-bg'
                  : 'bg-doge-panel border border-doge-border text-doge-muted hover:border-doge-gold hover:text-doge-gold'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  isActive ? 'bg-doge-bg/20' : 'bg-doge-gold/20 text-doge-gold'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-doge-gold" />
        </div>
      ) : cases.length === 0 ? (
        <EmptyState tab={activeTab} onNewCase={() => setShowNewCase(true)} />
      ) : (
        <div className="space-y-4">
          {cases.map((c) => (
            <CaseCard key={c.id} caseData={c} onVote={fetchCases} />
          ))}
        </div>
      )}

      {/* New Case Modal */}
      {showNewCase && (
        <NewCaseModal 
          onClose={() => setShowNewCase(false)} 
          onSuccess={() => {
            setShowNewCase(false);
            fetchCases();
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ tab, onNewCase }: { tab: TabType; onNewCase: () => void }) {
  const messages = {
    'open': {
      icon: FolderOpen,
      title: 'No Open Cases',
      desc: 'Be the first to submit a fraud finding for community verification.',
      action: 'Submit Finding',
    },
    'verified': {
      icon: CheckCircle,
      title: 'No Verified Cases Yet',
      desc: 'Cases that pass community verification will appear here.',
      action: null,
    },
    'rejected': {
      icon: XCircle,
      title: 'No Rejected Cases',
      desc: 'Cases rejected by the community will appear here.',
      action: null,
    },
    'my-votes': {
      icon: Users,
      title: 'No Votes Yet',
      desc: 'Stake DOGE to verify findings and earn rewards.',
      action: 'Browse Open Cases',
    },
  };

  const msg = messages[tab];
  const Icon = msg.icon;

  return (
    <Panel className="p-12 text-center">
      <Icon size={64} className="mx-auto mb-4 text-doge-muted opacity-50" />
      <h2 className="text-xl font-semibold text-doge-text mb-2">{msg.title}</h2>
      <p className="text-doge-muted mb-6 max-w-md mx-auto">{msg.desc}</p>
      {msg.action && (
        <Button variant="secondary" onClick={onNewCase}>
          {msg.action}
        </Button>
      )}
    </Panel>
  );
}

function CaseCard({ caseData, onVote }: { caseData: Case; onVote: () => void }) {
  const { user, wallet } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [voting, setVoting] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('5');
  const [voteError, setVoteError] = useState<string | null>(null);

  const totalStake = caseData.valid_stake_total + caseData.invalid_stake_total;
  const validPercent = totalStake > 0 ? (caseData.valid_stake_total / totalStake) * 100 : 50;
  const timeLeft = getTimeLeft(caseData.verification_closes_at);
  const isOpen = caseData.status === 'open' && timeLeft.total > 0;

  const handleVote = async (vote: 'valid' | 'invalid') => {
    if (!user) return;
    setVoting(true);
    setVoteError(null);

    try {
      const res = await fetch('/api/cases/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseData.id,
          voterId: user.id,
          vote,
          stakeAmount: parseFloat(stakeAmount),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onVote();
    } catch (err: any) {
      setVoteError(err.message);
    } finally {
      setVoting(false);
    }
  };

  return (
    <Panel className="overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-doge-bg/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={caseData.status} />
              {caseData.bounty_amount > 0 && (
                <Badge variant="gold" size="sm">
                  💰 {caseData.bounty_amount} Ð
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-doge-text truncate">{caseData.title}</h3>
            <p className="text-sm text-doge-muted mt-1 line-clamp-2">{caseData.summary}</p>
          </div>
          <ChevronRight 
            size={20} 
            className={`text-doge-muted transition-transform ${expanded ? 'rotate-90' : ''}`} 
          />
        </div>

        {/* Vote Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-doge-muted mb-1">
            <span className="flex items-center gap-1">
              <ThumbsUp size={12} className="text-risk-low" />
              Valid ({caseData.valid_votes_count}) · {(caseData.valid_stake_total ?? 0).toFixed(1)} Ð
            </span>
            <span className="flex items-center gap-1">
              {(caseData.invalid_stake_total ?? 0).toFixed(1)} Ð · ({caseData.invalid_votes_count}) Invalid
              <ThumbsDown size={12} className="text-risk-high" />
            </span>
          </div>
          <div className="h-2 bg-doge-border rounded-full overflow-hidden flex">
            <div 
              className="bg-risk-low transition-all"
              style={{ width: `${validPercent}%` }}
            />
            <div 
              className="bg-risk-high transition-all"
              style={{ width: `${100 - validPercent}%` }}
            />
          </div>
        </div>

        {/* Time Left */}
        {isOpen && (
          <div className="flex items-center gap-1 mt-2 text-xs text-doge-muted">
            <Timer size={12} />
            {timeLeft.display} left to vote
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-doge-border p-4 bg-doge-bg/30">
          {/* Evidence */}
          {caseData.evidence && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-doge-text mb-2">Evidence</h4>
              <p className="text-sm text-doge-muted whitespace-pre-wrap">{caseData.evidence}</p>
            </div>
          )}

          {/* Provider Link */}
          {caseData.provider_npi && (
            <div className="mb-4 p-2 bg-doge-panel rounded border border-doge-border">
              <span className="text-xs text-doge-muted">Related Provider: </span>
              <a 
                href={`/sniffer/${caseData.provider_npi}`}
                className="text-doge-gold text-sm hover:underline"
              >
                {caseData.provider_name || caseData.provider_npi}
              </a>
            </div>
          )}

          {/* Voting Interface */}
          {isOpen && user && (
            <div className="mt-4 p-4 bg-doge-panel rounded-lg border border-doge-border">
              <h4 className="text-sm font-semibold text-doge-text mb-3">Cast Your Vote</h4>
              
              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs text-doge-muted">Stake:</label>
                <input
                  type="number"
                  min="1"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="w-24 bg-doge-bg border border-doge-border rounded px-2 py-1 text-sm font-mono"
                />
                <span className="text-doge-muted text-sm">DOGE</span>
                {wallet && (
                  <span className="text-xs text-doge-muted ml-auto">
                    Balance: {(wallet.balance ?? 0).toFixed(2)} Ð
                  </span>
                )}
              </div>

              {voteError && (
                <div className="text-risk-high text-sm mb-3 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  {voteError}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 border-risk-low text-risk-low hover:bg-risk-low hover:text-white"
                  onClick={() => handleVote('valid')}
                  disabled={voting}
                >
                  {voting ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
                  Valid
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 border-risk-high text-risk-high hover:bg-risk-high hover:text-white"
                  onClick={() => handleVote('invalid')}
                  disabled={voting}
                >
                  {voting ? <Loader2 size={14} className="animate-spin" /> : <ThumbsDown size={14} />}
                  Invalid
                </Button>
              </div>
              
              <p className="text-xs text-doge-muted mt-2 text-center">
                Win: Get stake back + share of losing stakes. Lose: Stake slashed.
              </p>
            </div>
          )}

          {!user && isOpen && (
            <div className="mt-4 p-4 bg-doge-panel rounded-lg border border-doge-border text-center">
              <p className="text-doge-muted text-sm">Sign in to vote on this case</p>
            </div>
          )}

          {/* Discussion Section */}
          <DiscussionSection caseId={caseData.id} />
        </div>
      )}
    </Panel>
  );
}

function StatusBadge({ status }: { status: Case['status'] }) {
  const config = {
    open: { label: 'Open', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    verified: { label: 'Verified', color: 'bg-risk-low/20 text-risk-low border-risk-low/30' },
    rejected: { label: 'Rejected', color: 'bg-risk-high/20 text-risk-high border-risk-high/30' },
    disputed: { label: 'Disputed', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  };

  const { label, color } = config[status];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}

function getTimeLeft(closeDate: string) {
  const diff = new Date(closeDate).getTime() - Date.now();
  if (diff <= 0) return { total: 0, display: 'Closed' };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return { total: diff, display: `${days}d ${hours % 24}h` };
  }

  return { total: diff, display: `${hours}h ${minutes}m` };
}

function NewCaseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user, wallet } = useAuth();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [evidence, setEvidence] = useState('');
  const [providerNpi, setProviderNpi] = useState('');
  const [bounty, setBounty] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user || !title || !summary) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitterId: user.id,
          title,
          summary,
          evidence: evidence || undefined,
          providerNpi: providerNpi || undefined,
          bountyAmount: parseFloat(bounty) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <Panel className="relative w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-doge-gold mb-4">Submit Finding</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-doge-muted mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-doge-text"
              placeholder="e.g., Suspicious billing pattern in Minnesota"
            />
          </div>

          <div>
            <label className="block text-sm text-doge-muted mb-1">Summary *</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-doge-text resize-none"
              placeholder="Brief description of what you found..."
            />
          </div>

          <div>
            <label className="block text-sm text-doge-muted mb-1">Evidence / Analysis</label>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={4}
              className="w-full bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-doge-text resize-none"
              placeholder="Detailed evidence, data sources, methodology..."
            />
          </div>

          <div>
            <label className="block text-sm text-doge-muted mb-1">Related Provider NPI (optional)</label>
            <input
              type="text"
              value={providerNpi}
              onChange={(e) => setProviderNpi(e.target.value)}
              className="w-full bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-doge-text font-mono"
              placeholder="10-digit NPI"
            />
          </div>

          <div>
            <label className="block text-sm text-doge-muted mb-1">Bounty (optional)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={bounty}
                onChange={(e) => setBounty(e.target.value)}
                className="w-32 bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-doge-text font-mono"
              />
              <span className="text-doge-muted">DOGE</span>
              {wallet && (
                <span className="text-xs text-doge-muted ml-auto">
                  Balance: {(wallet.balance ?? 0).toFixed(2)} Ð
                </span>
              )}
            </div>
            <p className="text-xs text-doge-muted mt-1">
              Bounty returned if verified, distributed to voters if rejected.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-risk-high/10 border border-risk-high rounded-lg text-risk-high text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit} 
              disabled={loading || !title || !summary}
              className="flex-1"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Submit for Verification'}
            </Button>
          </div>
        </div>

        <p className="text-xs text-doge-muted text-center mt-4">
          Cases are open for 72 hours of community verification.
        </p>
      </Panel>
    </div>
  );
}

function DiscussionSection({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [responses, setResponses] = useState<CaseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [responseType, setResponseType] = useState<'comment' | 'defense' | 'evidence'>('comment');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, [caseId]);

  const fetchResponses = async () => {
    try {
      const res = await fetch(`/api/cases/respond?caseId=${caseId}`);
      const data = await res.json();
      setResponses(data.responses || []);
    } catch (err) {
      console.error('Failed to fetch responses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/cases/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          responderId: user?.id,
          responseType,
          content: newComment,
        }),
      });

      if (res.ok) {
        setNewComment('');
        fetchResponses();
      }
    } catch (err) {
      console.error('Failed to submit response:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const responseTypeConfig = {
    comment: { icon: MessageSquare, label: 'Comment', color: 'text-doge-muted' },
    defense: { icon: Shield, label: 'Defense', color: 'text-blue-400' },
    evidence: { icon: FileText, label: 'Evidence', color: 'text-doge-gold' },
    official: { icon: CheckCircle, label: 'Official', color: 'text-risk-low' },
  };

  return (
    <div className="mt-6 border-t border-doge-border pt-4">
      <h4 className="text-sm font-semibold text-doge-text mb-4 flex items-center gap-2">
        <MessageSquare size={16} />
        Discussion ({responses.length})
      </h4>

      {/* Response Type Selector */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {(['comment', 'defense', 'evidence'] as const).map((type) => {
          const config = responseTypeConfig[type];
          const Icon = config.icon;
          return (
            <button
              key={type}
              onClick={() => setResponseType(type)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-all ${
                responseType === type
                  ? 'bg-doge-gold/20 border-doge-gold text-doge-gold'
                  : 'border-doge-border text-doge-muted hover:border-doge-gold'
              }`}
            >
              <Icon size={12} />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Comment Input */}
      <div className="flex gap-2 mb-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={
            responseType === 'defense' 
              ? "Present a counter-argument or defense..." 
              : responseType === 'evidence'
              ? "Add supporting evidence or analysis..."
              : "Add your thoughts to the discussion..."
          }
          rows={2}
          className="flex-1 bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-sm text-doge-text resize-none"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !newComment.trim()}
          className="self-end"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </Button>
      </div>

      {/* Responses List */}
      {loading ? (
        <div className="text-center py-4">
          <Loader2 size={20} className="animate-spin text-doge-gold mx-auto" />
        </div>
      ) : responses.length === 0 ? (
        <p className="text-sm text-doge-muted text-center py-4">
          No discussion yet. Be the first to weigh in!
        </p>
      ) : (
        <div className="space-y-3">
          {responses.map((response) => {
            const config = responseTypeConfig[response.response_type];
            const Icon = config.icon;
            return (
              <div 
                key={response.id} 
                className={`p-3 rounded-lg border ${
                  response.response_type === 'defense' 
                    ? 'bg-blue-500/5 border-blue-500/20' 
                    : response.response_type === 'evidence'
                    ? 'bg-doge-gold/5 border-doge-gold/20'
                    : 'bg-doge-panel border-doge-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={12} className={config.color} />
                  <span className={`text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  {response.responder && (
                    <>
                      <span className="text-doge-muted">·</span>
                      <span className="text-xs text-doge-text">
                        {response.responder.avatar_emoji} {response.responder.display_name}
                      </span>
                      <span className="text-xs text-doge-muted">
                        @{response.responder.handle}
                      </span>
                    </>
                  )}
                  {!response.responder && (
                    <span className="text-xs text-doge-muted">Anonymous</span>
                  )}
                  <span className="text-xs text-doge-muted ml-auto">
                    {new Date(response.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-doge-text whitespace-pre-wrap">
                  {response.content}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-doge-muted text-center mt-4">
        All parties welcome. Present evidence, not attacks.
      </p>
    </div>
  );
}
