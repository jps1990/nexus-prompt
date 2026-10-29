// Chiffrement AES-GCM via Web Crypto (remplace crypto-js, déprécié).
// La clé dérive de VITE_ENCRYPTION_KEY, embarquée dans le bundle : c'est de l'obfuscation
// pour le localStorage, pas une protection contre quelqu'un qui a accès au navigateur.
const PASSPHRASE = import.meta.env.VITE_ENCRYPTION_KEY || 'nexus-prompt';
const SALT = new TextEncoder().encode('nexus-prompt-salt');
const PREFIX = 'v2:';
// Préfixe base64 de "Salted__", format produit par crypto-js
const LEGACY_PREFIX = 'U2FsdGVkX1';

let keyPromise: Promise<CryptoKey> | null = null;

const getKey = () => {
  keyPromise ??= crypto.subtle
    .importKey('raw', new TextEncoder().encode(PASSPHRASE), 'PBKDF2', false, ['deriveKey'])
    .then((baseKey) =>
      crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: SALT, iterations: 100_000, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      )
    );
  return keyPromise;
};

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

// Valeur chiffrée par l'ancienne version (crypto-js), illisible : la clé doit être ressaisie
export const isLegacyCiphertext = (value: string) => value.startsWith(LEGACY_PREFIX);

export const encrypt = async (text: string): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await getKey(),
    new TextEncoder().encode(text)
  );
  const payload = new Uint8Array(iv.length + cipher.byteLength);
  payload.set(iv);
  payload.set(new Uint8Array(cipher), iv.length);
  return PREFIX + toBase64(payload);
};

export const decrypt = async (value: string): Promise<string> => {
  if (isLegacyCiphertext(value)) {
    throw new Error('Legacy encrypted value, please re-enter the API key.');
  }
  // Clé stockée en clair (ancien fallback quand le chiffrement échouait)
  if (!value.startsWith(PREFIX)) return value;

  const payload = fromBase64(value.slice(PREFIX.length));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: payload.slice(0, 12) },
    await getKey(),
    payload.slice(12)
  );
  return new TextDecoder().decode(plain);
};
