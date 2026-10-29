import type { StateStorage } from 'zustand/middleware';

// Stockage chiffré (AES-GCM) pour le store zustand.
// La clé est générée dans le navigateur, non extractable, et gardée dans IndexedDB :
// elle n'apparaît ni dans le bundle ni dans localStorage, donc une copie du localStorage
// seule ne permet pas de relire les prompts.
const DB_NAME = 'nexus-secure';
const KEY_STORE = 'keys';
const KEY_ID = 'main';
const PREFIX = 'enc:v1:';

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(KEY_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const run = <T>(db: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    const request = action(db.transaction(KEY_STORE, mode).objectStore(KEY_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const loadOrCreateKey = async (): Promise<CryptoKey> => {
  const db = await openDb();
  const existing = await run<CryptoKey | undefined>(db, 'readonly', (s) => s.get(KEY_ID));
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await run(db, 'readwrite', (s) => s.put(key, KEY_ID));
  return key;
};

let keyPromise: Promise<CryptoKey> | null = null;

const getKey = (): Promise<CryptoKey> => {
  if (keyPromise) return keyPromise;
  // Le verrou évite que deux onglets créent chacun une clé différente
  const created = (async (): Promise<CryptoKey> =>
    navigator.locks ? await navigator.locks.request('nexus-key', loadOrCreateKey) : await loadOrCreateKey())();
  keyPromise = created.catch((error) => {
    keyPromise = null;
    throw error;
  });
  return keyPromise;
};

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
};
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

const encryptText = async (text: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await getKey(), new TextEncoder().encode(text))
  );
  const payload = new Uint8Array(iv.length + cipher.length);
  payload.set(iv);
  payload.set(cipher, iv.length);
  return PREFIX + toBase64(payload);
};

const decryptText = async (value: string) => {
  const payload = fromBase64(value.slice(PREFIX.length));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: payload.slice(0, 12) },
    await getKey(),
    payload.slice(12)
  );
  return new TextDecoder().decode(plain);
};

// Écritures sérialisées : la dernière valeur gagne et on peut attendre qu'elles soient finies
let pending: Promise<void> = Promise.resolve();
export const flushSecureStorage = () => pending;

export const secureStorage: StateStorage = {
  getItem: async (name) => {
    const raw = localStorage.getItem(name);
    if (raw === null) return null;

    if (!raw.startsWith(PREFIX)) {
      // Données en clair d'une ancienne version : on les chiffre tout de suite
      try {
        localStorage.setItem(name, await encryptText(raw));
      } catch (error) {
        console.error('Could not encrypt existing data:', error);
      }
      return raw;
    }

    try {
      return await decryptText(raw);
    } catch (error) {
      // Clé perdue (données du site effacées dans IndexedDB) : on garde l'ancienne copie à part
      console.error('Could not decrypt stored data, keeping a backup copy:', error);
      localStorage.setItem(`${name}.unreadable`, raw);
      return null;
    }
  },

  setItem: (name, value) => {
    pending = pending.then(async () => {
      try {
        localStorage.setItem(name, await encryptText(value));
      } catch (error) {
        console.error('Could not save encrypted data:', error);
      }
    });
    return pending;
  },

  removeItem: (name) => {
    pending = pending.then(() => localStorage.removeItem(name));
    return pending;
  },
};
