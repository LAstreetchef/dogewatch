import * as bip39 from 'bip39';
import BIP32Factory from 'bip32';
import * as ecc from '@bitcoinerlab/secp256k1';
import bs58check from 'bs58check';
import { createHash } from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.prod' });

const bip32 = BIP32Factory(ecc);

const DOGE_NETWORK = {
  pubKeyHash: 0x1e,
  wif: 0x9e,
};

function pubkeyToAddress(publicKey) {
  const sha256Hash = createHash('sha256').update(publicKey).digest();
  const ripemd160Hash = createHash('ripemd160').update(sha256Hash).digest();
  const versionedPayload = Buffer.concat([
    Buffer.from([DOGE_NETWORK.pubKeyHash]),
    ripemd160Hash,
  ]);
  return bs58check.encode(versionedPayload);
}

function deriveAddress(mnemonic, index) {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const master = bip32.fromSeed(seed);
  const path = `m/44'/3'/0'/0/${index}`;
  const child = master.derivePath(path);
  return {
    address: pubkeyToAddress(Buffer.from(child.publicKey)),
    path,
  };
}

// Get mnemonic from env
const mnemonic = process.env.DOGE_MASTER_MNEMONIC
  ?.replace(/\\n/g, '')
  ?.replace(/\n/g, '')
  ?.trim();

if (!mnemonic) {
  console.error('❌ DOGE_MASTER_MNEMONIC not found in .env.local');
  process.exit(1);
}

// Derive treasury at index 999999
const TREASURY_INDEX = 999999;
const result = deriveAddress(mnemonic, TREASURY_INDEX);

console.log('🔐 Treasury Wallet Verification');
console.log('================================');
console.log(`Index:   ${TREASURY_INDEX}`);
console.log(`Path:    ${result.path}`);
console.log(`Address: ${result.address}`);
console.log('');
console.log('Expected: DQbybF9eow19Lso1qmTmTtDquzeyHhAwM4');
console.log(`Match:    ${result.address === 'DQbybF9eow19Lso1qmTmTtDquzeyHhAwM4' ? '✅ YES' : '❌ NO'}`);

// Also show first few user wallet addresses for reference
console.log('');
console.log('📋 First 3 User Wallet Addresses (for reference):');
for (let i = 0; i < 3; i++) {
  const userWallet = deriveAddress(mnemonic, i);
  console.log(`  Index ${i}: ${userWallet.address}`);
}
