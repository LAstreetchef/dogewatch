'use client';

import { useState } from 'react';
import { X, Coins, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { useAuth } from '@/lib/auth/AuthProvider';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName?: string;
  tipType?: 'fraud_tip' | 'comment' | 'profile' | 'general';
  referenceId?: string;
}

const PRESET_AMOUNTS = [1, 5, 10, 25, 50, 100];
const PLATFORM_FEE_PERCENT = 10;
const MIN_TIP = 1;

export function TipModal({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  tipType = 'general',
  referenceId,
}: TipModalProps) {
  const { user, wallet, refreshProfile } = useAuth();
  const [amount, setAmount] = useState<string>('5');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const platformFee = numAmount * (PLATFORM_FEE_PERCENT / 100);
  const recipientReceives = numAmount - platformFee;
  const hasEnough = wallet && wallet.balance >= numAmount;

  const handleTip = async () => {
    if (!user || !wallet || numAmount < MIN_TIP) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: user.id,
          toUserId: recipientId,
          amount: numAmount,
          tipType,
          referenceId,
          message: message || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send tip');
      }

      setSuccess(true);
      await refreshProfile();

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setAmount('5');
        setMessage('');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to send tip');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <Panel className="relative w-full max-w-md p-6 z-10">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-doge-muted hover:text-doge-text transition-colors"
          disabled={loading}
        >
          <X size={20} />
        </button>

        {success ? (
          // Success state
          <div className="text-center py-8">
            <CheckCircle size={64} className="mx-auto text-risk-low mb-4" />
            <h3 className="text-xl font-doge font-bold text-doge-gold mb-2">
              Tip Sent! 🎉
            </h3>
            <p className="text-doge-muted">
              {numAmount} DOGE sent to {recipientName || 'recipient'}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-doge-gold/20 flex items-center justify-center">
                <Coins size={24} className="text-doge-gold" />
              </div>
              <div>
                <h3 className="text-lg font-doge font-bold text-doge-text">
                  Send Tip
                </h3>
                <p className="text-sm text-doge-muted">
                  to {recipientName || 'this user'}
                </p>
              </div>
            </div>

            {/* Balance */}
            {wallet && (
              <div className="mb-4 p-3 bg-doge-bg rounded-lg border border-doge-border">
                <div className="text-xs text-doge-muted mb-1">Your Balance</div>
                <div className="font-mono font-bold text-doge-gold">
                  {(wallet.balance ?? 0).toFixed(2)} DOGE
                </div>
              </div>
            )}

            {/* Preset amounts */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset.toString())}
                  className={`py-2 px-3 rounded-lg border transition-all font-mono text-sm ${
                    amount === preset.toString()
                      ? 'bg-doge-gold text-doge-bg border-doge-gold'
                      : 'bg-doge-bg border-doge-border text-doge-text hover:border-doge-gold'
                  }`}
                >
                  {preset} Ð
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="mb-4">
              <label className="block text-xs text-doge-muted mb-1">
                Custom Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={MIN_TIP}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-doge-bg border border-doge-border rounded-lg px-4 py-2 pr-12 font-mono text-doge-text focus:border-doge-gold focus:outline-none"
                  placeholder="Enter amount"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-doge-muted font-mono">
                  Ð
                </span>
              </div>
            </div>

            {/* Optional message */}
            <div className="mb-4">
              <label className="block text-xs text-doge-muted mb-1">
                Message (optional)
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={100}
                className="w-full bg-doge-bg border border-doge-border rounded-lg px-4 py-2 text-doge-text focus:border-doge-gold focus:outline-none"
                placeholder="Great find!"
              />
            </div>

            {/* Fee breakdown */}
            {numAmount >= MIN_TIP && (
              <div className="mb-4 p-3 bg-doge-bg rounded-lg border border-doge-border text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-doge-muted">Tip Amount</span>
                  <span className="font-mono text-doge-text">{numAmount.toFixed(2)} Ð</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-doge-muted">Platform Fee ({PLATFORM_FEE_PERCENT}%)</span>
                  <span className="font-mono text-doge-muted">-{platformFee.toFixed(2)} Ð</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-doge-border">
                  <span className="text-doge-text font-semibold">Recipient Gets</span>
                  <span className="font-mono text-doge-gold font-bold">{recipientReceives.toFixed(2)} Ð</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-risk-high/10 border border-risk-high rounded-lg flex items-center gap-2 text-risk-high text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Not logged in */}
            {!user && (
              <div className="mb-4 p-3 bg-doge-panel border border-doge-border rounded-lg text-center text-doge-muted text-sm">
                Sign in to send tips
              </div>
            )}

            {/* Insufficient balance */}
            {user && wallet && !hasEnough && numAmount > 0 && (
              <div className="mb-4 p-3 bg-risk-high/10 border border-risk-high rounded-lg text-risk-high text-sm text-center">
                Insufficient balance. Need {numAmount.toFixed(2)} DOGE.
              </div>
            )}

            {/* Submit button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleTip}
              disabled={!user || !hasEnough || numAmount < MIN_TIP || loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Coins size={18} />
                  Send {numAmount > 0 ? `${numAmount} DOGE` : 'Tip'}
                </>
              )}
            </Button>
          </>
        )}
      </Panel>
    </div>
  );
}
