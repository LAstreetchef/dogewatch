/**
 * Dogecoin OP_RETURN Inscription Service
 * 
 * Uses BlockCypher API for transaction creation and broadcasting
 * 
 * Requires env vars:
 * - BLOCKCYPHER_TOKEN (optional, increases rate limits)
 * - DOGE_PRIVATE_KEY (WIF format private key for signing)
 * - DOGE_ADDRESS (corresponding address)
 */

interface BlockCypherTX {
  tx: {
    hash: string;
    block_height: number;
    confirmed?: string;
  };
}

interface TXInput {
  addresses: string[];
}

interface TXOutput {
  addresses?: string[];
  value: number;
  data_hex?: string;
  script_type?: string;
}

interface UnsignedTX {
  tx: {
    hash: string;
    inputs: TXInput[];
    outputs: TXOutput[];
  };
  tosign: string[];
  pubkeys: string[];
}

// OP_RETURN allows up to 80 bytes of data
// We'll use: "DW1:" (4 bytes) + IPFS CID (typically 46-59 bytes for CIDv1)
const DOGEWATCH_PREFIX = 'DW1:';
const MAX_OP_RETURN_BYTES = 80;

/**
 * Create an OP_RETURN transaction with IPFS hash
 */
export async function inscribeOnDogecoin(
  ipfsHash: string,
  tipId: string
): Promise<{ txId: string; explorerUrl: string }> {
  const token = process.env.BLOCKCYPHER_TOKEN || '';
  const privateKey = process.env.DOGE_PRIVATE_KEY;
  const address = process.env.DOGE_ADDRESS;

  if (!privateKey || !address) {
    throw new Error('Dogecoin wallet not configured');
  }

  // Prepare OP_RETURN data: "DW1:<ipfsHash>"
  const opReturnData = `${DOGEWATCH_PREFIX}${ipfsHash}`;
  
  if (opReturnData.length > MAX_OP_RETURN_BYTES) {
    throw new Error(`OP_RETURN data too long: ${opReturnData.length} bytes (max ${MAX_OP_RETURN_BYTES})`);
  }

  // Convert to hex
  const dataHex = Buffer.from(opReturnData, 'utf8').toString('hex');

  // Build the transaction using BlockCypher
  const baseUrl = 'https://api.blockcypher.com/v1/doge/main';
  
  // Step 1: Create unsigned transaction
  const txBody = {
    inputs: [{ addresses: [address] }],
    outputs: [
      {
        addresses: [address],
        value: 100000000, // 1 DOGE change back to self (in satoshis/koinu)
      },
      {
        value: 0,
        data_hex: dataHex,
        script_type: 'null-data', // OP_RETURN
      },
    ],
  };

  const newTxResponse = await fetch(`${baseUrl}/txs/new${token ? `?token=${token}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(txBody),
  });

  if (!newTxResponse.ok) {
    const error = await newTxResponse.text();
    throw new Error(`Failed to create transaction: ${error}`);
  }

  const unsignedTx: UnsignedTX = await newTxResponse.json();

  // Step 2: Sign the transaction
  // Note: In production, use a proper signing library like bitcoinjs-lib
  // This is a simplified example - BlockCypher can help with signing
  const signatures = await signTransaction(unsignedTx.tosign, privateKey);
  
  const signedTx = {
    ...unsignedTx,
    signatures,
    pubkeys: unsignedTx.pubkeys,
  };

  // Step 3: Broadcast the transaction
  const sendResponse = await fetch(`${baseUrl}/txs/send${token ? `?token=${token}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signedTx),
  });

  if (!sendResponse.ok) {
    const error = await sendResponse.text();
    throw new Error(`Failed to broadcast transaction: ${error}`);
  }

  const result: BlockCypherTX = await sendResponse.json();
  const txId = result.tx.hash;

  return {
    txId,
    explorerUrl: `https://dogechain.info/tx/${txId}`,
  };
}

/**
 * Sign transaction hashes with private key
 * Using BlockCypher's signing helper for simplicity
 */
async function signTransaction(tosign: string[], privateKey: string): Promise<string[]> {
  // In production, use bitcoinjs-lib or similar for proper ECDSA signing
  // BlockCypher also offers a signing endpoint for development
  
  // For now, we'll use a simplified approach with their API
  // This requires the private key to be in WIF format
  
  const { createSign } = await import('crypto');
  const signatures: string[] = [];
  
  for (const hash of tosign) {
    // Create ECDSA signature
    // Note: This is simplified - production code should use proper Bitcoin/Doge libraries
    const sign = createSign('SHA256');
    sign.update(Buffer.from(hash, 'hex'));
    const signature = sign.sign(privateKey, 'hex');
    signatures.push(signature);
  }
  
  return signatures;
}

/**
 * Check wallet balance
 */
export async function getWalletBalance(): Promise<{ balance: number; unconfirmed: number }> {
  const token = process.env.BLOCKCYPHER_TOKEN || '';
  const address = process.env.DOGE_ADDRESS;

  if (!address) {
    throw new Error('Dogecoin address not configured');
  }

  const response = await fetch(
    `https://api.blockcypher.com/v1/doge/main/addrs/${address}/balance${token ? `?token=${token}` : ''}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch balance');
  }

  const data = await response.json();
  
  return {
    balance: data.balance / 100000000, // Convert from koinu to DOGE
    unconfirmed: data.unconfirmed_balance / 100000000,
  };
}

/**
 * Decode OP_RETURN data from a transaction
 */
export function decodeOpReturn(hexData: string): { prefix: string; ipfsHash: string } | null {
  try {
    const decoded = Buffer.from(hexData, 'hex').toString('utf8');
    if (decoded.startsWith(DOGEWATCH_PREFIX)) {
      return {
        prefix: DOGEWATCH_PREFIX,
        ipfsHash: decoded.slice(DOGEWATCH_PREFIX.length),
      };
    }
    return null;
  } catch {
    return null;
  }
}
