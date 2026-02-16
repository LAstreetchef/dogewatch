/**
 * Dogecoin HD Wallet Library
 * 
 * Generates real Dogecoin addresses using BIP32/BIP44 derivation
 * 
 * Derivation path: m/44'/3'/0'/0/{index}
 * - 44' = BIP44
 * - 3' = Dogecoin coin type
 * - 0' = account
 * - 0 = external chain
 * - {index} = address index per user
 */

import * as bip39 from 'bip39';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import bs58check from 'bs58check';
import { createHash } from 'crypto';

// Initialize BIP32 with secp256k1
const bip32 = BIP32Factory(ecc);

// Dogecoin network parameters
const DOGE_NETWORK = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: 'doge',
  bip32: {
    public: 0x02facafd,  // dgub
    private: 0x02fac398, // dgpv
  },
  pubKeyHash: 0x1e,  // D prefix for addresses
  scriptHash: 0x16,  // 9 or A prefix
  wif: 0x9e,         // Q prefix for WIF
};

/**
 * Generate a new master seed (only do once, store securely!)
 */
export function generateMasterSeed(): string {
  const mnemonic = bip39.generateMnemonic(256); // 24 words
  return mnemonic;
}

/**
 * Get master node from mnemonic
 */
export function getMasterNode(mnemonic: string) {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  return bip32.fromSeed(seed);
}

/**
 * Derive a Dogecoin address for a user by index
 */
export function deriveAddress(mnemonic: string, index: number): {
  address: string;
  publicKey: string;
  privateKeyWIF: string;
  path: string;
} {
  const master = getMasterNode(mnemonic);
  
  // BIP44 path for Dogecoin: m/44'/3'/0'/0/{index}
  const path = `m/44'/3'/0'/0/${index}`;
  const child = master.derivePath(path);
  
  if (!child.privateKey) {
    throw new Error('Failed to derive private key');
  }
  
  // Generate address from public key
  const address = pubkeyToAddress(Buffer.from(child.publicKey));
  
  // Convert private key to WIF
  const privateKeyWIF = privateKeyToWIF(Buffer.from(child.privateKey));
  
  return {
    address,
    publicKey: Buffer.from(child.publicKey).toString('hex'),
    privateKeyWIF,
    path,
  };
}

/**
 * Convert public key to Dogecoin address
 */
function pubkeyToAddress(publicKey: Buffer): string {
  // SHA256 then RIPEMD160
  const sha256Hash = createHash('sha256').update(publicKey).digest();
  const ripemd160Hash = createHash('ripemd160').update(sha256Hash).digest();
  
  // Add version byte (0x1e for Dogecoin mainnet)
  const versionedPayload = Buffer.concat([
    Buffer.from([DOGE_NETWORK.pubKeyHash]),
    ripemd160Hash,
  ]);
  
  // Base58Check encode
  return bs58check.encode(versionedPayload);
}

/**
 * Convert private key to WIF format
 */
function privateKeyToWIF(privateKey: Buffer): string {
  // Add version byte and compression flag
  const versionedKey = Buffer.concat([
    Buffer.from([DOGE_NETWORK.wif]),
    privateKey,
    Buffer.from([0x01]), // compressed
  ]);
  
  return bs58check.encode(versionedKey);
}

/**
 * Validate a Dogecoin address
 */
export function isValidAddress(address: string): boolean {
  try {
    const decoded = bs58check.decode(address);
    return decoded[0] === DOGE_NETWORK.pubKeyHash && decoded.length === 21;
  } catch {
    return false;
  }
}

/**
 * Get the derivation index for a user (use their DB row number or a counter)
 */
export function getUserAddressIndex(userId: string, existingCount: number): number {
  // Simple approach: use the count of existing wallets as index
  return existingCount;
}
