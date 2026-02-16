'use client';

import { useState } from 'react';
import { ExternalLink, Copy, Check, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface InscriptionCertificateProps {
  txId: string;
  ipfsHash: string;
  tipId: string;
  timestamp: string;
  providerNpi?: string;
  providerName?: string;
  anomalyScore?: number;
  onShare?: () => void;
}

export function InscriptionCertificate({
  txId,
  ipfsHash,
  tipId,
  timestamp,
  providerNpi,
  providerName,
  anomalyScore,
  onShare,
}: InscriptionCertificateProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const dogeExplorerUrl = `https://dogechain.info/tx/${txId}`;
  const ipfsGatewayUrl = `https://ipfs.io/ipfs/${ipfsHash}`;

  const shareText = `🐕 I just inscribed fraud evidence permanently on the Dogecoin blockchain!

📋 Tip ID: ${tipId}
${providerName ? `🏥 Provider: ${providerName}` : ''}
${anomalyScore ? `⚠️ Anomaly Score: ${anomalyScore}%` : ''}

🔗 Proof: ${dogeExplorerUrl}

#DogeWatch #DOGE #FraudDetection`;

  const handleShareToX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
    onShare?.();
  };

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-doge-gold bg-gradient-to-br from-doge-panel via-doge-bg to-doge-panel">
      {/* Gold corner accents */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-doge-gold rounded-tl-xl" />
      <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-doge-gold rounded-tr-xl" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-doge-gold rounded-bl-xl" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-doge-gold rounded-br-xl" />

      {/* Certificate content */}
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-doge-gold/20 border border-doge-gold/50 mb-4">
            <span className="text-2xl">🐕</span>
            <span className="text-doge-gold font-mono text-sm tracking-wider">BLOCKCHAIN VERIFIED</span>
            <span className="text-2xl">🐕</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-doge-gold glow-gold-subtle">
            Inscription Certificate
          </h2>
          <p className="text-doge-muted mt-2 text-sm">
            This fraud tip has been permanently inscribed on the Dogecoin blockchain
          </p>
        </div>

        {/* Certificate details */}
        <div className="space-y-4 bg-doge-bg/50 rounded-lg p-4 border border-doge-border">
          {/* Tip ID */}
          <div className="flex items-center justify-between">
            <span className="text-doge-muted text-sm">Tip ID</span>
            <span className="font-mono text-doge-gold">{tipId}</span>
          </div>

          {/* Provider info */}
          {providerName && (
            <div className="flex items-center justify-between">
              <span className="text-doge-muted text-sm">Provider</span>
              <span className="font-mono text-doge-text">{providerName}</span>
            </div>
          )}
          {providerNpi && (
            <div className="flex items-center justify-between">
              <span className="text-doge-muted text-sm">NPI</span>
              <span className="font-mono text-doge-text">{providerNpi}</span>
            </div>
          )}
          {anomalyScore && (
            <div className="flex items-center justify-between">
              <span className="text-doge-muted text-sm">Anomaly Score</span>
              <span className={`font-mono font-bold ${anomalyScore >= 80 ? 'text-risk-high' : anomalyScore >= 50 ? 'text-risk-medium' : 'text-risk-low'}`}>
                {anomalyScore}%
              </span>
            </div>
          )}

          <div className="border-t border-doge-border my-2" />

          {/* Transaction ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-doge-muted text-sm">Dogecoin Transaction</span>
              <button
                onClick={() => copyToClipboard(txId, 'tx')}
                className="text-doge-muted hover:text-doge-gold transition-colors"
              >
                {copied === 'tx' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
            <a
              href={dogeExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-doge-gold hover:underline break-all flex items-center gap-1"
            >
              {txId}
              <ExternalLink size={12} />
            </a>
          </div>

          {/* IPFS Hash */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-doge-muted text-sm">IPFS Content Hash</span>
              <button
                onClick={() => copyToClipboard(ipfsHash, 'ipfs')}
                className="text-doge-muted hover:text-doge-gold transition-colors"
              >
                {copied === 'ipfs' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
            <a
              href={ipfsGatewayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-doge-text hover:text-doge-gold break-all flex items-center gap-1"
            >
              {ipfsHash}
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Timestamp */}
          <div className="flex items-center justify-between">
            <span className="text-doge-muted text-sm">Inscribed At</span>
            <span className="font-mono text-sm text-doge-text">
              {new Date(timestamp).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button
            onClick={handleShareToX}
            className="flex-1 bg-doge-gold hover:bg-doge-gold/90 text-black"
          >
            <Share2 size={16} className="mr-2" />
            Share to X
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.open(dogeExplorerUrl, '_blank')}
            className="flex-1"
          >
            <ExternalLink size={16} className="mr-2" />
            View on Chain
          </Button>
        </div>

        {/* Footer badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-doge-muted text-xs">
            <span>🏆</span>
            <span>Badge Earned: Chain Witness</span>
            <span>🏆</span>
          </div>
        </div>
      </div>
    </div>
  );
}
