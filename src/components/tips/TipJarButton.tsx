'use client';

import { useState } from 'react';
import { Heart, X, Coins, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { useAuth } from '@/lib/auth/AuthProvider';

interface TipJarButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PRESET_AMOUNTS = [5, 10, 25, 50, 100, 500];
const MIN_TIP = 1;

export function TipJarButton({
  variant = 'secondary',
  size = 'md',
  className = '',
}: TipJarButtonProps) {
  const { user, wallet, refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>('10');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numAmount = parseFloat(amount) || 0;
  const hasEnough = wallet && wallet.balance >= numAmount;

  const handleTip = async () => {
    if (!user || !wallet || numAmount < MIN_TIP) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tips/jar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: user.id,
          amount: numAmount,
          message: message || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send tip');
      }

      setSuccess(true);
      await refreshProfile();

      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setAmount('10');
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
      setIsOpen(false);
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={`gap-2 ${className}`}
      >
        <img 
          src="/images/dogebowl.png" 
          alt="" 
          className={size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'}
        />
        Support DogeWatch
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          <Panel className="relative w-full max-w-md p-6 z-10">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-doge-muted hover:text-doge-text transition-colors"
              disabled={loading}
            >
              <X size={20} />
            </button>

            {success ? (
              <div className="text-center py-8">
                <CheckCircle size={64} className="mx-auto text-risk-low mb-4" />
                <h3 className="text-xl font-doge font-bold text-doge-gold mb-2">
                  Thank You! 🐕❤️
                </h3>
                <p className="text-doge-muted">
                  Your support helps keep DogeWatch running!
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-doge-gold to-doge-gold-dark mx-auto mb-4 flex items-center justify-center">
                    <Heart size={32} className="text-doge-bg" />
                  </div>
                  <h3 className="text-xl font-doge font-bold text-doge-text mb-2">
                    Support DogeWatch
                  </h3>
                  <p className="text-sm text-doge-muted">
                    Help us keep fighting fraud and building tools for the community
                  </p>
                </div>

                {wallet && (
                  <div className="mb-4 p-3 bg-doge-bg rounded-lg border border-doge-border text-center">
                    <div className="text-xs text-doge-muted mb-1">Your Balance</div>
                    <div className="font-mono font-bold text-doge-gold">
                      {wallet.balance.toFixed(2)} DOGE
                    </div>
                  </div>
                )}

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

                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="number"
                      min={MIN_TIP}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-doge-bg border border-doge-border rounded-lg px-4 py-2 pr-12 font-mono text-doge-text focus:border-doge-gold focus:outline-none"
                      placeholder="Custom amount"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-doge-muted font-mono">
                      Ð
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={100}
                    className="w-full bg-doge-bg border border-doge-border rounded-lg px-4 py-2 text-doge-text focus:border-doge-gold focus:outline-none"
                    placeholder="Leave a message (optional)"
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-risk-high/10 border border-risk-high rounded-lg flex items-center gap-2 text-risk-high text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {!user && (
                  <div className="mb-4 p-3 bg-doge-panel border border-doge-border rounded-lg text-center text-doge-muted text-sm">
                    Sign in to support DogeWatch
                  </div>
                )}

                {user && wallet && !hasEnough && numAmount > 0 && (
                  <div className="mb-4 p-3 bg-risk-high/10 border border-risk-high rounded-lg text-risk-high text-sm text-center">
                    Insufficient balance
                  </div>
                )}

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
                      <Heart size={18} />
                      Donate {numAmount > 0 ? `${numAmount} DOGE` : ''}
                    </>
                  )}
                </Button>

                <p className="text-xs text-doge-muted text-center mt-4">
                  100% goes to platform development & maintenance
                </p>
              </>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
