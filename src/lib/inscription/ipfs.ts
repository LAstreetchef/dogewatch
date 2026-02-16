/**
 * IPFS Upload Service using Pinata
 * 
 * Requires env vars:
 * - PINATA_API_KEY
 * - PINATA_SECRET_KEY
 */

interface TipContent {
  tipId: string;
  providerNpi: string;
  providerName?: string;
  anomalyScore: number;
  findings: string;
  evidence?: string[];
  submittedBy: string;
  submittedAt: string;
  metadata?: Record<string, unknown>;
}

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export async function uploadToIPFS(content: TipContent): Promise<string> {
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('Pinata API credentials not configured');
  }

  // Prepare the content with DogeWatch metadata
  const payload = {
    pinataContent: {
      ...content,
      _dogewatch: {
        version: '1.0',
        network: 'dogewatch',
        type: 'fraud-tip',
        inscribedAt: new Date().toISOString(),
      },
    },
    pinataMetadata: {
      name: `dogewatch-tip-${content.tipId}`,
      keyvalues: {
        tipId: content.tipId,
        providerNpi: content.providerNpi,
        anomalyScore: content.anomalyScore.toString(),
      },
    },
    pinataOptions: {
      cidVersion: 1,
    },
  };

  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'pinata_api_key': apiKey,
      'pinata_secret_api_key': secretKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata upload failed: ${error}`);
  }

  const result: PinataResponse = await response.json();
  return result.IpfsHash;
}

export function getIPFSUrl(hash: string): string {
  // Use multiple gateways for redundancy
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
}

export function getIPFSPublicUrl(hash: string): string {
  return `https://ipfs.io/ipfs/${hash}`;
}
