'use client';

import { useState, useEffect } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/lib/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { 
  Copy, 
  Check, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Trophy,
  Gift,
  Coins,
  TrendingUp,
  QrCode,
  ExternalLink,
  Wallet as WalletIcon,
  History
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bounty_payout' | 'tip_sent' | 'tip_received' | 'stake' | 'stake_return' | 'subscription';
  amount: number;
  doge_tx_hash?: string;
  description?: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
}

const txTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
  deposit: { icon: ArrowDownLeft, label: 'Deposit', color: 'text-risk-low' },
  withdrawal: { icon: ArrowUpRight, label: 'Withdrawal', color: 'text-risk-high' },
  bounty_payout: { icon: Trophy, label: 'Bounty', color: 'text-doge-gold' },
  tip_sent: { icon: Gift, label: 'Tip Sent', color: 'text-risk-medium' },
  tip_received: { icon: Gift, label: 'Tip Received', color: 'text-risk-low' },
  stake: { icon: Coins, label: 'Stake', color: 'text-doge-muted' },
  stake_return: { icon: TrendingUp, label: 'Stake Return', color: 'text-risk-low' },
  subscription: { icon: WalletIcon, label: 'Subscription', color: 'text-risk-medium' },
};

export default function WalletPage() {
  const { user, wallet, profile, refreshProfile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);

  const supabase = createClient();

  // Sync balance from blockchain on load
  const syncBalance = async () => {
    if (!user?.id) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/wallet/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setLiveBalance(data.balance);
        // Also refresh profile to get updated wallet data
        await refreshProfile();
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync on mount
  useEffect(() => {
    if (user?.id && wallet?.doge_address) {
      syncBalance();
    }
  }, [user?.id, wallet?.doge_address]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!wallet) return;
      
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) {
        setTransactions(data);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [wallet]);

  const copyAddress = async () => {
    if (!wallet?.doge_address) return;
    await navigator.clipboard.writeText(wallet.doge_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toFixed(2);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawAddress || !user) return;
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid amount');
      return;
    }

    if (amount < 10) {
      alert('Minimum withdrawal is 10 DOGE');
      return;
    }

    // Basic sanity check - server does full validation
    if (!withdrawAddress.startsWith('D') || withdrawAddress.length !== 34) {
      alert('Invalid DOGE address format (must start with D, 34 characters)');
      return;
    }

    if (!confirm(`Send ${amount} DOGE to ${withdrawAddress}?\n\nNetwork fee: ~1 DOGE\nThis cannot be undone.`)) {
      return;
    }

    setWithdrawing(true);
    
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          toAddress: withdrawAddress,
          amount: amount,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Withdrawal failed');
        return;
      }

      alert(`✅ Sent ${amount} DOGE!\n\nTx: ${data.txHash.slice(0, 16)}...\n\nView on DogeChain explorer.`);
      setWithdrawAmount('');
      setWithdrawAddress('');
      
      // Sync balance and refresh transactions
      await syncBalance();
      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', wallet?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (txs) setTransactions(txs);
      
    } catch (err: any) {
      alert(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (!wallet) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Logo size={80} className="mx-auto mb-6 opacity-50" />
        <h2 className="text-xl font-semibold text-doge-text mb-2">Wallet Not Available</h2>
        <p className="text-doge-muted mb-6">
          Sign in to access your DOGE wallet and start earning bounties.
        </p>
        <Button variant="primary" onClick={() => window.location.href = '/login?redirect=/wallet'}>
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Balance Card */}
      <Panel className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-doge-text">Your Wallet</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={syncBalance}
              disabled={syncing}
              className="text-doge-muted hover:text-doge-gold"
            >
              {syncing ? '⟳ Syncing...' : '⟳ Sync'}
            </Button>
            <div className="flex items-center gap-2 text-sm text-doge-muted">
              <span className="w-2 h-2 rounded-full bg-risk-low animate-pulse" />
              Connected
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Balance */}
          <div className="md:col-span-2">
            <div className="text-doge-muted text-sm mb-1">Available Balance</div>
            <div className="flex items-baseline gap-3">
              <Logo size={40} glow />
              <span className="text-5xl font-bold text-doge-gold font-mono">
                {formatAmount(liveBalance ?? wallet.balance)}
              </span>
              <span className="text-2xl text-doge-muted">DOGE</span>
            </div>
            
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <span className="text-doge-muted">Total Earned: </span>
                <span className="text-risk-low font-mono">{formatAmount(wallet.total_earned)} Ð</span>
              </div>
              <div>
                <span className="text-doge-muted">Total Spent: </span>
                <span className="text-risk-medium font-mono">{formatAmount(wallet.total_spent)} Ð</span>
              </div>
            </div>
          </div>

          {/* Tier Progress */}
          <div className="bg-doge-bg rounded-lg p-4 border border-doge-border">
            <div className="text-doge-muted text-sm mb-2">Researcher Tier</div>
            <div className="text-xl font-bold text-doge-gold mb-2">
              {profile?.tier || 'Pup'} 🐕
            </div>
            <div className="text-xs text-doge-muted">
              {profile?.xp || 0} XP • {profile?.verified_reports || 0} verified reports
            </div>
          </div>
        </div>
      </Panel>

      {/* Address & Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Deposit */}
        <Panel className="p-6">
          <h2 className="text-lg font-semibold text-doge-text mb-4 flex items-center gap-2">
            <ArrowDownLeft className="text-risk-low" size={20} />
            Deposit DOGE
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-doge-muted block mb-2">Your Deposit Address</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-sm font-mono text-doge-text break-all">
                  {wallet.doge_address}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyAddress}
                  className="shrink-0"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowQR(!showQR)}
            >
              <QrCode size={16} />
              {showQR ? 'Hide' : 'Show'} QR Code
            </Button>

            {showQR && (
              <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                <QRCodeSVG 
                  value={`dogecoin:${wallet.doge_address}`}
                  size={160}
                  level="M"
                  includeMargin={true}
                />
              </div>
            )}

            <p className="text-xs text-doge-muted">
              Send DOGE to this address. Deposits are credited after 6 confirmations (~6 min).
            </p>
          </div>
        </Panel>

        {/* Withdraw */}
        <Panel className="p-6">
          <h2 className="text-lg font-semibold text-doge-text mb-4 flex items-center gap-2">
            <ArrowUpRight className="text-risk-high" size={20} />
            Withdraw DOGE
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-doge-muted block mb-2">Amount</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-sm font-mono text-doge-text focus:outline-none focus:border-doge-gold"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWithdrawAmount(wallet.balance.toString())}
                >
                  MAX
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm text-doge-muted block mb-2">Destination Address</label>
              <input
                type="text"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                placeholder="D..."
                className="w-full bg-doge-bg border border-doge-border rounded-lg px-3 py-2 text-sm font-mono text-doge-text focus:outline-none focus:border-doge-gold"
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || !withdrawAddress}
            >
              {withdrawing ? 'Processing...' : 'Withdraw'}
            </Button>

            <p className="text-xs text-doge-muted">
              Min withdrawal: 10 DOGE. Network fee: ~1 DOGE.
            </p>
          </div>
        </Panel>
      </div>

      {/* Transaction History */}
      <Panel className="p-6">
        <h2 className="text-lg font-semibold text-doge-text mb-4 flex items-center gap-2">
          <History size={20} />
          Transaction History
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Logo size={40} sniff />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-doge-muted">
            <Coins size={48} className="mx-auto mb-3 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm mt-1">Earn DOGE by verifying fraud cases!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const config = txTypeConfig[tx.type] || txTypeConfig.deposit;
              const Icon = config.icon;
              const isPositive = tx.amount > 0;
              
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-doge-bg border border-doge-border hover:border-doge-gold/30 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full bg-doge-panel flex items-center justify-center ${config.color}`}>
                    <Icon size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-doge-text">{config.label}</span>
                      {tx.status === 'pending' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-risk-medium/20 text-risk-medium">
                          Pending
                        </span>
                      )}
                      {tx.status === 'failed' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-risk-high/20 text-risk-high">
                          Failed
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-doge-muted truncate">
                      {tx.description || formatDate(tx.created_at)}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-mono font-semibold ${isPositive ? 'text-risk-low' : 'text-doge-text'}`}>
                      {isPositive ? '+' : ''}{formatAmount(Math.abs(tx.amount))} Ð
                    </div>
                    {tx.doge_tx_hash && (
                      <a
                        href={`https://dogechain.info/tx/${tx.doge_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-doge-gold hover:underline flex items-center gap-1 justify-end"
                      >
                        View <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Earn More CTA */}
      <Panel className="p-6 border-doge-gold/30 bg-gradient-to-r from-doge-gold/5 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-doge-gold mb-1">Earn More DOGE</h3>
            <p className="text-sm text-doge-muted">
              Find fraud, verify cases, and climb the pack ranks to earn bounties.
            </p>
          </div>
          <Button variant="primary" onClick={() => window.location.href = '/sniffer'}>
            Start Sniffing
          </Button>
        </div>
      </Panel>
    </div>
  );
}
