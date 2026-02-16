'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { InscriptionModal } from '@/components/inscription';
import { Zap, FileText, Link2 } from 'lucide-react';

// Demo data for testing
const DEMO_INSCRIPTION = {
  txId: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
  ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
  tipId: 'TIP-2024-0042',
  timestamp: new Date().toISOString(),
  providerNpi: '1234567890',
  providerName: 'Comfort Care Services LLC',
  anomalyScore: 87,
};

export default function InscriptionDemoPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInscribe = () => {
    setIsLoading(true);
    setModalOpen(true);
    
    // Simulate inscription process
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-doge-gold mb-2">
          Blockchain Inscription
        </h1>
        <p className="text-doge-muted">
          Permanently inscribe fraud evidence on the Dogecoin blockchain
        </p>
      </div>

      {/* How it works */}
      <Panel>
        <h2 className="text-lg font-semibold text-doge-text mb-4">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center text-center p-4 bg-doge-bg rounded-lg">
            <div className="w-12 h-12 rounded-full bg-doge-gold/20 flex items-center justify-center mb-3">
              <FileText className="text-doge-gold" size={24} />
            </div>
            <h3 className="font-semibold text-doge-text mb-1">1. Submit Tip</h3>
            <p className="text-sm text-doge-muted">
              Your fraud finding is packaged with provider info, evidence, and timestamp
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-doge-bg rounded-lg">
            <div className="w-12 h-12 rounded-full bg-doge-gold/20 flex items-center justify-center mb-3">
              <Link2 className="text-doge-gold" size={24} />
            </div>
            <h3 className="font-semibold text-doge-text mb-1">2. IPFS Storage</h3>
            <p className="text-sm text-doge-muted">
              Full content is stored on IPFS for permanent, decentralized access
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-doge-bg rounded-lg">
            <div className="w-12 h-12 rounded-full bg-doge-gold/20 flex items-center justify-center mb-3">
              <Zap className="text-doge-gold" size={24} />
            </div>
            <h3 className="font-semibold text-doge-text mb-1">3. Chain Inscription</h3>
            <p className="text-sm text-doge-muted">
              IPFS hash is inscribed on Dogecoin via OP_RETURN — permanent proof!
            </p>
          </div>
        </div>
      </Panel>

      {/* Demo Section */}
      <Panel>
        <h2 className="text-lg font-semibold text-doge-text mb-4">Demo: Try It Out</h2>
        <div className="bg-doge-bg rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-doge-muted">Provider:</span>
              <span className="ml-2 text-doge-text">{DEMO_INSCRIPTION.providerName}</span>
            </div>
            <div>
              <span className="text-doge-muted">NPI:</span>
              <span className="ml-2 font-mono text-doge-text">{DEMO_INSCRIPTION.providerNpi}</span>
            </div>
            <div>
              <span className="text-doge-muted">Anomaly Score:</span>
              <span className="ml-2 font-mono text-risk-high font-bold">{DEMO_INSCRIPTION.anomalyScore}%</span>
            </div>
            <div>
              <span className="text-doge-muted">Tip ID:</span>
              <span className="ml-2 font-mono text-doge-gold">{DEMO_INSCRIPTION.tipId}</span>
            </div>
          </div>
        </div>
        <Button
          onClick={handleInscribe}
          className="w-full bg-doge-gold hover:bg-doge-gold/90 text-black font-bold"
        >
          <Zap size={18} className="mr-2" />
          Inscribe on Dogecoin Blockchain
        </Button>
      </Panel>

      {/* Info */}
      <Panel className="bg-doge-gold/10 border-doge-gold/30">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-semibold text-doge-gold mb-1">Why Blockchain Inscription?</h3>
            <p className="text-sm text-doge-muted">
              Inscribing fraud evidence on the Dogecoin blockchain creates an immutable, 
              timestamped record that cannot be altered or deleted. This provides permanent 
              proof of your discovery, protects whistleblowers, and creates an auditable 
              trail for investigators.
            </p>
          </div>
        </div>
      </Panel>

      {/* Inscription Modal */}
      <InscriptionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={isLoading ? null : DEMO_INSCRIPTION}
        isLoading={isLoading}
      />
    </div>
  );
}
