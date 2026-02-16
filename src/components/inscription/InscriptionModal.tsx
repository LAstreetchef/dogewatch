'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { InscriptionCertificate } from './InscriptionCertificate';
import { InscriptionCelebration } from './InscriptionCelebration';

interface InscriptionData {
  txId: string;
  ipfsHash: string;
  tipId: string;
  timestamp: string;
  providerNpi?: string;
  providerName?: string;
  anomalyScore?: number;
}

interface InscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InscriptionData | null;
  isLoading?: boolean;
}

export function InscriptionModal({ isOpen, onClose, data, isLoading }: InscriptionModalProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    if (isOpen && data && !isLoading) {
      // Trigger celebration
      setShowCelebration(true);
      // Show certificate after a short delay
      setTimeout(() => setShowCertificate(true), 500);
    } else {
      setShowCelebration(false);
      setShowCertificate(false);
    }
  }, [isOpen, data, isLoading]);

  if (!isOpen) return null;

  return (
    <>
      {/* Celebration overlay */}
      <InscriptionCelebration 
        active={showCelebration} 
        onComplete={() => setShowCelebration(false)} 
      />

      {/* Modal backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal content */}
        <div 
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 p-2 bg-doge-panel rounded-full text-doge-muted hover:text-doge-gold transition-colors border border-doge-border"
          >
            <X size={20} />
          </button>

          {isLoading ? (
            // Loading state
            <div className="bg-doge-panel rounded-xl border border-doge-border p-8 text-center">
              <div className="animate-pulse">
                <div className="text-6xl mb-4">🐕</div>
                <h3 className="text-xl font-bold text-doge-gold mb-2">
                  Inscribing on Dogecoin...
                </h3>
                <p className="text-doge-muted text-sm mb-4">
                  Uploading to IPFS and creating blockchain transaction
                </p>
                <div className="flex justify-center gap-1">
                  <div className="w-2 h-2 bg-doge-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-doge-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-doge-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          ) : data ? (
            // Certificate
            <div className={`transition-all duration-500 ${showCertificate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <InscriptionCertificate
                txId={data.txId}
                ipfsHash={data.ipfsHash}
                tipId={data.tipId}
                timestamp={data.timestamp}
                providerNpi={data.providerNpi}
                providerName={data.providerName}
                anomalyScore={data.anomalyScore}
              />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
