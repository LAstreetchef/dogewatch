'use client';

import { Logo } from '@/components/ui/Logo';

interface WalletBadgeProps {
  balance: number;
  onClick?: () => void;
}

export function WalletBadge({ balance, onClick }: WalletBadgeProps) {
  const formatBalance = (amt: number) => {
    if (amt >= 1000000) return `${(amt / 1000000).toFixed(2)}M`;
    if (amt >= 1000) return `${(amt / 1000).toFixed(1)}K`;
    return amt.toFixed(2);
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-doge-panel border border-doge-border rounded-full hover:border-doge-gold transition-colors group"
    >
      <Logo size={18} glow />
      <span className="font-mono font-semibold text-doge-gold group-hover:text-doge-gold">
        {formatBalance(balance)} Ð
      </span>
    </button>
  );
}
