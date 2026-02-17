/**
 * Transaction Signing for Dogecoin
 * Uses @bitcoinerlab/secp256k1 (pure JS, works on Vercel)
 */

import * as ecc from '@bitcoinerlab/secp256k1';
import bs58check from 'bs58check';

const DOGE_WIF_PREFIX = 0x9e;

// secp256k1 curve order
const CURVE_ORDER = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
const HALF_CURVE_ORDER = CURVE_ORDER / BigInt(2);

/**
 * Sign transaction hashes with a WIF private key
 * Produces low-S signatures per BIP 62
 */
export async function signTransaction(
  tosign: string[],
  privateKeyWIF: string
): Promise<string[]> {
  const privateKey = wifToPrivateKey(privateKeyWIF);
  const signatures: string[] = [];
  
  for (const hash of tosign) {
    const hashBuffer = Buffer.from(hash, 'hex');
    const signature = ecc.sign(hashBuffer, privateKey);
    
    // Ensure low-S (BIP 62)
    const lowSSignature = ensureLowS(signature);
    
    // Convert to DER format and then hex
    const derSignature = signatureToDER(lowSSignature);
    signatures.push(derSignature.toString('hex'));
  }
  
  return signatures;
}

/**
 * Ensure the S value is in the lower half of the curve order (BIP 62)
 */
function ensureLowS(signature: Uint8Array): Uint8Array {
  const r = signature.slice(0, 32);
  const s = signature.slice(32, 64);
  
  const sBigInt = bytesToBigInt(s);
  
  if (sBigInt > HALF_CURVE_ORDER) {
    // S is too high, negate it: newS = curveOrder - S
    const newS = CURVE_ORDER - sBigInt;
    const newSBytes = bigIntToBytes(newS);
    return new Uint8Array([...r, ...newSBytes]);
  }
  
  return signature;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (const byte of bytes) {
    result = (result << BigInt(8)) | BigInt(byte);
  }
  return result;
}

function bigIntToBytes(num: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(num & BigInt(0xff));
    num >>= BigInt(8);
  }
  return bytes;
}

/**
 * Convert WIF to raw private key
 */
function wifToPrivateKey(wif: string): Buffer {
  const decoded = bs58check.decode(wif);
  
  // Check version byte
  if (decoded[0] !== DOGE_WIF_PREFIX) {
    throw new Error('Invalid WIF version byte');
  }
  
  // Remove version byte and compression flag if present
  if (decoded.length === 34) {
    // Compressed (has 0x01 suffix)
    return Buffer.from(decoded.slice(1, 33));
  } else if (decoded.length === 33) {
    // Uncompressed
    return Buffer.from(decoded.slice(1));
  }
  
  throw new Error('Invalid WIF length');
}

/**
 * Get public key from WIF private key
 */
export function getPublicKeyFromWIF(wif: string): string {
  const privateKey = wifToPrivateKey(wif);
  const publicKey = ecc.pointFromScalar(privateKey, true); // compressed
  
  if (!publicKey) {
    throw new Error('Failed to derive public key');
  }
  
  return Buffer.from(publicKey).toString('hex');
}

/**
 * Convert signature to DER format
 */
function signatureToDER(signature: Uint8Array): Buffer {
  const r = signature.slice(0, 32);
  const s = signature.slice(32, 64);
  
  // Remove leading zeros but keep one if high bit is set
  const rPadded = padSignatureComponent(r);
  const sPadded = padSignatureComponent(s);
  
  // Build DER structure
  const sequence = Buffer.concat([
    Buffer.from([0x02, rPadded.length]),
    rPadded,
    Buffer.from([0x02, sPadded.length]),
    sPadded,
  ]);
  
  return Buffer.concat([
    Buffer.from([0x30, sequence.length]),
    sequence,
  ]);
}

/**
 * Pad signature component for DER encoding
 */
function padSignatureComponent(component: Uint8Array): Buffer {
  let buf = Buffer.from(component);
  
  // Remove leading zeros
  while (buf.length > 1 && buf[0] === 0x00 && (buf[1] & 0x80) === 0) {
    buf = buf.slice(1);
  }
  
  // Add leading zero if high bit is set (negative in DER)
  if (buf[0] & 0x80) {
    buf = Buffer.concat([Buffer.from([0x00]), buf]);
  }
  
  return buf;
}

/**
 * Verify a signature
 */
export function verifySignature(
  hash: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const hashBuffer = Buffer.from(hash, 'hex');
    const sigBuffer = derToSignature(Buffer.from(signature, 'hex'));
    const pubkeyBuffer = Buffer.from(publicKey, 'hex');
    
    return ecc.verify(hashBuffer, pubkeyBuffer, sigBuffer);
  } catch {
    return false;
  }
}

/**
 * Convert DER signature back to raw format
 */
function derToSignature(der: Buffer): Uint8Array {
  // Skip 0x30 and length
  let pos = 2;
  
  // Read R
  if (der[pos] !== 0x02) throw new Error('Invalid DER');
  pos++;
  const rLen = der[pos];
  pos++;
  let r = der.slice(pos, pos + rLen);
  pos += rLen;
  
  // Read S
  if (der[pos] !== 0x02) throw new Error('Invalid DER');
  pos++;
  const sLen = der[pos];
  pos++;
  let s = der.slice(pos, pos + sLen);
  
  // Remove padding zeros
  while (r.length > 32) r = r.slice(1);
  while (s.length > 32) s = s.slice(1);
  
  // Pad to 32 bytes if needed
  while (r.length < 32) r = Buffer.concat([Buffer.from([0x00]), r]);
  while (s.length < 32) s = Buffer.concat([Buffer.from([0x00]), s]);
  
  return Buffer.concat([r, s]);
}
