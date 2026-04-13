// Client-side AES-256-GCM encryption for prompt data.
// Key is derived from the Supabase user ID via PBKDF2 so it is consistent
// across all devices the user signs in to, but the data is not readable as
// plain text in the Supabase Table Editor.

const SALT = new TextEncoder().encode('promptvault-v1');
const ENC_PREFIX = 'enc:';

// Cache the derived CryptoKey per userId as a Promise so concurrent callers
// all await the same derivation instead of each starting their own.
const keyCache = new Map<string, Promise<CryptoKey>>();

function getOrDeriveKey(userId: string): Promise<CryptoKey> {
  if (!keyCache.has(userId)) {
    keyCache.set(
      userId,
      (async () => {
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(userId),
          'PBKDF2',
          false,
          ['deriveKey']
        );
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: SALT, iterations: 100_000, hash: 'SHA-256' },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
      })()
    );
  }
  return keyCache.get(userId)!;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function encryptField(plaintext: string, userId: string): Promise<string> {
  const key = await getOrDeriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), 12);

  return ENC_PREFIX + toBase64(combined);
}

export async function decryptField(data: string, userId: string): Promise<string> {
  // Pass through unencrypted data (e.g., prompts saved before encryption was added)
  if (!data.startsWith(ENC_PREFIX)) return data;

  try {
    const key = await getOrDeriveKey(userId);
    const combined = Uint8Array.from(atob(data.slice(ENC_PREFIX.length)), c =>
      c.charCodeAt(0)
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: combined.slice(0, 12) },
      key,
      combined.slice(12)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    // If decryption fails for any reason, return the raw value rather than crashing
    return data;
  }
}
