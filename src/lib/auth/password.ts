// Simple password hashing using Web Crypto API (works in Bun)
// For production, consider using argon2 via bun's native bindings

const ITERATIONS = 100000;
const KEY_LENGTH = 64;

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await deriveKey(password, salt);
  const saltHex = bufferToHex(salt);
  const hashHex = bufferToHex(derivedKey);
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;
  
  const salt = hexToBuffer(saltHex);
  const derivedKey = await deriveKey(password, salt);
  const derivedHex = bufferToHex(derivedKey);
  
  return derivedHex === hashHex;
}

// Generate a random token
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bufferToHex(bytes);
}
