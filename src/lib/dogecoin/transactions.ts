/**
 * Dogecoin Transaction Utilities
 * 
 * Uses BlockCypher API for:
 * - Checking balances
 * - Building transactions
 * - Broadcasting signed transactions
 */

const BLOCKCYPHER_BASE = 'https://api.blockcypher.com/v1/doge/main';

interface UTXO {
  tx_hash: string;
  tx_output_n: number;
  value: number;
  script: string;
}

interface AddressBalance {
  address: string;
  balance: number;          // in satoshis (koinu)
  unconfirmed_balance: number;
  final_balance: number;
  n_tx: number;
}

interface TxSkeleton {
  tx: {
    hash: string;
    inputs: any[];
    outputs: any[];
  };
  tosign: string[];
  pubkeys?: string[];
  signatures?: string[];
}

/**
 * Get address balance from blockchain
 */
export async function getAddressBalance(address: string): Promise<AddressBalance> {
  const token = process.env.BLOCKCYPHER_TOKEN || '';
  const url = `${BLOCKCYPHER_BASE}/addrs/${address}/balance${token ? `?token=${token}` : ''}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to get balance: ${res.statusText}`);
  }
  
  return res.json();
}

/**
 * Get balance in DOGE (not koinu/satoshis)
 */
export async function getBalanceInDoge(address: string): Promise<number> {
  const data = await getAddressBalance(address);
  return data.final_balance / 100000000;
}

/**
 * Get unspent transaction outputs for an address
 */
export async function getUTXOs(address: string): Promise<UTXO[]> {
  const token = process.env.BLOCKCYPHER_TOKEN || '';
  const url = `${BLOCKCYPHER_BASE}/addrs/${address}?unspentOnly=true${token ? `&token=${token}` : ''}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to get UTXOs: ${res.statusText}`);
  }
  
  const data = await res.json();
  return data.txrefs || [];
}

/**
 * Create and sign a transaction
 */
export async function createTransaction(
  fromAddress: string,
  toAddress: string,
  amountDoge: number,
  privateKeyWIF: string
): Promise<{ txHash: string; txHex: string }> {
  const token = process.env.BLOCKCYPHER_TOKEN || '';
  const amountKoinu = Math.floor(amountDoge * 100000000);
  
  // Step 1: Create transaction skeleton
  const txBody = {
    inputs: [{ addresses: [fromAddress] }],
    outputs: [{ addresses: [toAddress], value: amountKoinu }],
  };
  
  const newTxRes = await fetch(`${BLOCKCYPHER_BASE}/txs/new${token ? `?token=${token}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(txBody),
  });
  
  if (!newTxRes.ok) {
    const error = await newTxRes.text();
    throw new Error(`Failed to create tx: ${error}`);
  }
  
  const txSkeleton: TxSkeleton = await newTxRes.json();
  
  // Step 2: Sign the transaction
  const { signTransaction } = await import('./signing');
  const signatures = await signTransaction(txSkeleton.tosign, privateKeyWIF);
  
  // Get public key from WIF
  const { getPublicKeyFromWIF } = await import('./signing');
  const publicKey = getPublicKeyFromWIF(privateKeyWIF);
  
  const signedTx = {
    ...txSkeleton,
    signatures,
    pubkeys: txSkeleton.tosign.map(() => publicKey),
  };
  
  // Step 3: Broadcast transaction
  const sendRes = await fetch(`${BLOCKCYPHER_BASE}/txs/send${token ? `?token=${token}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signedTx),
  });
  
  if (!sendRes.ok) {
    const error = await sendRes.text();
    throw new Error(`Failed to broadcast tx: ${error}`);
  }
  
  const result = await sendRes.json();
  
  return {
    txHash: result.tx.hash,
    txHex: result.tx.hex || '',
  };
}

/**
 * Check if a transaction is confirmed
 */
export async function getTransactionStatus(txHash: string): Promise<{
  confirmed: boolean;
  confirmations: number;
  blockHeight?: number;
}> {
  const token = process.env.BLOCKCYPHER_TOKEN || '';
  const url = `${BLOCKCYPHER_BASE}/txs/${txHash}${token ? `?token=${token}` : ''}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to get tx: ${res.statusText}`);
  }
  
  const data = await res.json();
  
  return {
    confirmed: data.confirmations > 0,
    confirmations: data.confirmations || 0,
    blockHeight: data.block_height,
  };
}

/**
 * Register a webhook for address notifications
 */
export async function registerAddressWebhook(
  address: string,
  callbackUrl: string,
  event: 'confirmed-tx' | 'unconfirmed-tx' | 'tx-confirmation' = 'confirmed-tx'
): Promise<string> {
  const token = process.env.BLOCKCYPHER_TOKEN;
  if (!token) {
    throw new Error('BLOCKCYPHER_TOKEN required for webhooks');
  }
  
  const webhookBody = {
    event,
    address,
    url: callbackUrl,
    confirmations: 6, // Wait for 6 confirmations
  };
  
  const res = await fetch(`${BLOCKCYPHER_BASE}/hooks?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookBody),
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to create webhook: ${error}`);
  }
  
  const data = await res.json();
  return data.id;
}
