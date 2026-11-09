// Rawatku — primitive kriptografi (PBKDF2-SHA256 + AES-GCM-256).
// Bebas DOM: memakai globalThis.crypto.subtle (browser & Node >= 20).

export const DEFAULT_ITERATIONS = 310000;
export const KDF = 'PBKDF2-SHA256';
export const ALG = 'AES-GCM-256';

const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;

const MESSAGES = {
  KATA_SANDI_SALAH: 'Kata sandi salah. Data tidak diubah.',
  DATA_RUSAK: 'Data tidak dapat dibaca. Jangan hapus apa pun; coba cadangan terakhir.',
  KRIPTO_TIDAK_TERSEDIA: 'Peramban ini tidak mendukung enkripsi yang dibutuhkan.'
};

export class CryptoError extends Error {
  constructor(message, { code = 'DATA_RUSAK' } = {}) {
    super(message || MESSAGES[code] || MESSAGES.DATA_RUSAK);
    this.name = 'CryptoError';
    this.code = code;
  }
}

function error(code, message) {
  return new CryptoError(message, { code });
}

function getCrypto() {
  return typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
}

export function cryptoAvailable() {
  const c = getCrypto();
  return Boolean(c && c.subtle && typeof c.subtle.importKey === 'function');
}

export function randomBytes(length) {
  const size = Number(length);
  if (!Number.isInteger(size) || size < 0) {
    throw error('DATA_RUSAK', 'Panjang byte acak tidak valid.');
  }
  const c = getCrypto();
  const bytes = new Uint8Array(size);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
    return bytes;
  }
  throw error('KRIPTO_TIDAK_TERSEDIA');
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = '';
  for (let i = 0; i < input.length; i += 3) {
    const a = input[i];
    const hasB = i + 1 < input.length;
    const hasC = i + 2 < input.length;
    const b = hasB ? input[i + 1] : 0;
    const c = hasC ? input[i + 2] : 0;
    out += B64_ALPHABET[a >> 2];
    out += B64_ALPHABET[((a & 0x03) << 4) | (b >> 4)];
    out += hasB ? B64_ALPHABET[((b & 0x0f) << 2) | (c >> 6)] : '=';
    out += hasC ? B64_ALPHABET[c & 0x3f] : '=';
  }
  return out;
}

function base64Index(ch) {
  const idx = B64_ALPHABET.indexOf(ch);
  return idx;
}

export function fromBase64(str) {
  if (typeof str !== 'string') {
    throw error('DATA_RUSAK', 'Data base64 tidak valid.');
  }
  const clean = str.replace(/\s+/g, '');
  if (clean.length === 0) return new Uint8Array(0);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) {
    throw error('DATA_RUSAK', 'Data base64 tidak valid.');
  }
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const body = padding ? clean.slice(0, -padding) : clean;
  const out = new Uint8Array((body.length * 3) >> 2);
  let o = 0;
  for (let i = 0; i < body.length; i += 4) {
    const a = base64Index(body[i]);
    const b = base64Index(body[i + 1]);
    const c = i + 2 < body.length ? base64Index(body[i + 2]) : 0;
    const d = i + 3 < body.length ? base64Index(body[i + 3]) : 0;
    if (a < 0 || b < 0 || c < 0 || d < 0) {
      throw error('DATA_RUSAK', 'Data base64 tidak valid.');
    }
    out[o++] = (a << 2) | (b >> 4);
    if (i + 2 < body.length) out[o++] = ((b & 0x0f) << 4) | (c >> 2);
    if (i + 3 < body.length) out[o++] = ((c & 0x03) << 6) | d;
  }
  return out;
}

function encodeUTF8(text) {
  return new TextEncoder().encode(text);
}

function decodeUTF8(bytes) {
  return new TextDecoder().decode(bytes);
}

function asUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw error('DATA_RUSAK', 'Data biner tidak valid.');
}

export async function deriveKey(password, saltBytes, iterations = DEFAULT_ITERATIONS) {
  if (!cryptoAvailable()) throw error('KRIPTO_TIDAK_TERSEDIA');
  const salt = asUint8Array(saltBytes);
  const rounds = Number(iterations);
  if (!Number.isInteger(rounds) || rounds <= 0) {
    throw error('DATA_RUSAK', 'Jumlah iterasi tidak valid.');
  }
  const subtle = getCrypto().subtle;
  const baseKey = await subtle.importKey(
    'raw',
    encodeUTF8(String(password ?? '')),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: rounds, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function sealWithKey(object, key) {
  if (!cryptoAvailable()) throw error('KRIPTO_TIDAK_TERSEDIA');
  if (!key) throw error('DATA_RUSAK', 'Kunci enkripsi tidak tersedia.');
  const iv = randomBytes(IV_BYTES);
  let plaintext;
  try {
    plaintext = encodeUTF8(JSON.stringify(object));
  } catch {
    throw error('DATA_RUSAK', 'Data tidak dapat diserialisasi.');
  }
  let encrypted;
  try {
    encrypted = await getCrypto().subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  } catch {
    throw error('DATA_RUSAK', 'Data tidak dapat dienkripsi.');
  }
  return {
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted))
  };
}

export async function openWithKey({ iv, ciphertext } = {}, key) {
  if (!cryptoAvailable()) throw error('KRIPTO_TIDAK_TERSEDIA');
  if (!key) throw error('DATA_RUSAK', 'Kunci enkripsi tidak tersedia.');
  if (typeof iv !== 'string' || typeof ciphertext !== 'string') {
    throw error('DATA_RUSAK', 'Envelope kripto tidak valid.');
  }
  const ivBytes = fromBase64(iv);
  const cipherBytes = fromBase64(ciphertext);
  let plainBuffer;
  try {
    plainBuffer = await getCrypto().subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      cipherBytes
    );
  } catch {
    throw error('DATA_RUSAK', 'Data tidak dapat dibuka.');
  }
  let parsed;
  try {
    parsed = JSON.parse(decodeUTF8(new Uint8Array(plainBuffer)));
  } catch {
    throw error('DATA_RUSAK', 'Data tidak dapat dibaca.');
  }
  return parsed;
}

export async function encryptJSON(object, password, { iterations = DEFAULT_ITERATIONS, salt } = {}) {
  if (!cryptoAvailable()) throw error('KRIPTO_TIDAK_TERSEDIA');
  const rounds = Number(iterations);
  if (!Number.isInteger(rounds) || rounds <= 0) {
    throw error('DATA_RUSAK', 'Jumlah iterasi tidak valid.');
  }
  const saltBytes = salt == null
    ? randomBytes(SALT_BYTES)
    : typeof salt === 'string'
      ? fromBase64(salt)
      : asUint8Array(salt);
  const key = await deriveKey(password, saltBytes, rounds);
  const sealed = await sealWithKey(object, key);
  return {
    alg: ALG,
    kdf: KDF,
    iterations: rounds,
    salt: toBase64(saltBytes),
    iv: sealed.iv,
    ciphertext: sealed.ciphertext
  };
}

export async function decryptJSON(envelope, password) {
  if (!cryptoAvailable()) throw error('KRIPTO_TIDAK_TERSEDIA');
  if (!envelope || typeof envelope !== 'object') {
    throw error('DATA_RUSAK', 'Envelope kripto tidak valid.');
  }
  if (envelope.alg != null && envelope.alg !== ALG) {
    throw error('DATA_RUSAK', 'Algoritma enkripsi tidak didukung.');
  }
  if (envelope.kdf != null && envelope.kdf !== KDF) {
    throw error('DATA_RUSAK', 'Fungsi turunan kunci tidak didukung.');
  }
  const rounds = Number(envelope.iterations);
  if (!Number.isInteger(rounds) || rounds <= 0) {
    throw error('DATA_RUSAK', 'Jumlah iterasi tidak valid.');
  }
  if (typeof envelope.salt !== 'string' || typeof envelope.iv !== 'string'
    || typeof envelope.ciphertext !== 'string') {
    throw error('DATA_RUSAK', 'Envelope kripto tidak valid.');
  }
  let saltBytes;
  try {
    saltBytes = fromBase64(envelope.salt);
  } catch {
    throw error('DATA_RUSAK', 'Envelope kripto tidak valid.');
  }
  let key;
  try {
    key = await deriveKey(password, saltBytes, rounds);
  } catch (err) {
    if (err instanceof CryptoError) throw err;
    throw error('DATA_RUSAK', 'Kunci tidak dapat diturunkan.');
  }
  let ivBytes;
  let cipherBytes;
  try {
    ivBytes = fromBase64(envelope.iv);
    cipherBytes = fromBase64(envelope.ciphertext);
  } catch {
    throw error('DATA_RUSAK', 'Envelope kripto tidak valid.');
  }
  let plainBuffer;
  try {
    plainBuffer = await getCrypto().subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      cipherBytes
    );
  } catch {
    // Kata sandi salah dan ciphertext rusak sengaja tidak dibedakan.
    throw error('KATA_SANDI_SALAH');
  }
  let parsed;
  try {
    parsed = JSON.parse(decodeUTF8(new Uint8Array(plainBuffer)));
  } catch {
    throw error('DATA_RUSAK', 'Isi data tidak dapat dibaca.');
  }
  return parsed;
}
