'use client';

import { useState } from 'react';
import { Coins } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TipModal } from './TipModal';

interface TipButtonProps {
  recipientId: string;
  recipientName?: string;
  tipType?: 'fraud_tip' | 'comment' | 'profile' | 'general';
  referenceId?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showAmount?: boolean;
  className?: string;
}

export function TipButton({
  recipientId,
  recipientName,
  tipType = 'general',
  referenceId,
  variant = 'ghost',
  size = 'sm',
  showAmount = false,
  className = '',
}: TipButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={`gap-1 ${className}`}
      >
        <Coins size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
        {showAmount ? 'Tip DOGE' : 'Tip'}
      </Button>

      <TipModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        recipientId={recipientId}
        recipientName={recipientName}
        tipType={tipType}
        referenceId={referenceId}
      />
    </>
  );
}
