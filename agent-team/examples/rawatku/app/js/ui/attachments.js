// Rawatku — lampiran kunjungan: baca berkas, kompres gambar, validasi.
// Tidak menyentuh DOM saat impor; canvas/FileReader hanya dipakai saat dipanggil.

import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_VISIT,
  ALLOWED_ATTACHMENT_MIME,
  newId
} from '../model.js';
import { formatBytes } from '../logic/dates.js';

export { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_VISIT, ALLOWED_ATTACHMENT_MIME, formatBytes };

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXTENSION_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf'
};

function attachmentError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/** Jumlah byte setelah base64 didekode; -1 bila bentuk base64 tidak valid. */
function decodedBase64Bytes(value) {
  if (typeof value !== 'string' || value.length === 0) return -1;
  const clean = value.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) return -1;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return (clean.length / 4) * 3 - padding;
}

function stripDataUrlPrefix(dataUrl) {
  if (typeof dataUrl !== 'string') return '';
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return '';
  return dataUrl.slice(comma + 1);
}

function mimeFromDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return '';
  const match = /^data:([^;,]+)[;,]/.exec(dataUrl);
  return match ? match[1].toLowerCase() : '';
}

/** Tebak MIME dari ekstensi nama berkas bila file.type kosong. */
function resolveMime(file) {
  const type = typeof file?.type === 'string' ? file.type.toLowerCase() : '';
  if (type) return type;
  const name = typeof file?.name === 'string' ? file.name : '';
  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  return EXTENSION_MIME[extension] || '';
}

function readAsDataUrl(file) {
  if (typeof FileReader === 'undefined') {
    return Promise.reject(attachmentError('GAGAL_MEMBACA',
      'Peramban ini tidak mendukung pembacaan berkas.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(attachmentError('GAGAL_MEMBACA',
      'Berkas tidak dapat dibaca. Coba berkas lain.'));
    reader.onabort = () => reject(attachmentError('GAGAL_MEMBACA',
      'Pembacaan berkas dibatalkan.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  if (typeof Image === 'undefined') {
    return Promise.reject(attachmentError('GAGAL_MEMBACA',
      'Kompresi gambar membutuhkan peramban.'));
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(attachmentError('GAGAL_MEMBACA',
      'Gambar tidak dapat dibaca.'));
    image.src = dataUrl;
  });
}

function canvasDataUrl(image, targetWidth, targetHeight, mime, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(targetWidth));
  canvas.height = Math.max(1, Math.round(targetHeight));
  const context = canvas.getContext('2d');
  if (!context) {
    throw attachmentError('GAGAL_MEMBACA', 'Peramban ini tidak mendukung kompresi gambar.');
  }
  // Latar putih agar transparansi PNG tidak menjadi hitam saat diubah ke JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(mime, quality);
}

/**
 * Membaca berkas menjadi lampiran. Gambar besar dikecilkan dan dikompres
 * hingga muat di `maxBytes`; PDF dan gambar kecil disimpan apa adanya.
 * Melempar Error dengan `.code` bila ditolak.
 *
 * @param {File|Blob} file
 * @param {{maxBytes?: number, maxDimension?: number}} [options]
 * @returns {Promise<object>} Attachment
 */
export async function fileToAttachment(file, {
  maxBytes = MAX_ATTACHMENT_BYTES,
  maxDimension = 1600
} = {}) {
  if (!file || typeof file.size !== 'number') {
    throw attachmentError('BERKAS_TIDAK_VALID', 'Berkas tidak valid.');
  }
  const limit = Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : MAX_ATTACHMENT_BYTES;
  const mime = resolveMime(file);
  if (!ALLOWED_ATTACHMENT_MIME.includes(mime)) {
    throw attachmentError('JENIS_TIDAK_DIDUKUNG',
      'Jenis berkas tidak didukung. Gunakan JPG, PNG, WebP, GIF, atau PDF.');
  }

  const name = typeof file.name === 'string' && file.name.trim()
    ? file.name.trim()
    : `lampiran-${Date.now()}`;
  const addedAt = new Date().toISOString();

  // Non-gambar tidak dapat dikompres: tolak bila melebihi batas.
  if (!IMAGE_MIME.has(mime)) {
    if (file.size > limit) {
      throw attachmentError('BERKAS_TERLALU_BESAR',
        `Berkas melebihi batas ${formatBytes(limit)} per lampiran.`);
    }
    const dataUrl = await readAsDataUrl(file);
    const dataBase64 = stripDataUrlPrefix(dataUrl);
    const bytes = decodedBase64Bytes(dataBase64);
    if (bytes <= 0) {
      throw attachmentError('GAGAL_MEMBACA', 'Isi berkas tidak dapat dibaca.');
    }
    if (bytes > limit) {
      throw attachmentError('BERKAS_TERLALU_BESAR',
        `Berkas melebihi batas ${formatBytes(limit)} per lampiran.`);
    }
    return {
      id: newId('att'),
      name,
      mime,
      size: bytes,
      dataBase64,
      addedAt
    };
  }

  // Gambar: baca, lalu simpan mentah bila sudah cukup kecil dan dimensinya aman.
  const rawDataUrl = await readAsDataUrl(file);
  const rawBase64 = stripDataUrlPrefix(rawDataUrl);
  const rawBytes = decodedBase64Bytes(rawBase64);
  if (rawBytes <= 0) {
    throw attachmentError('GAGAL_MEMBACA', 'Gambar tidak dapat dibaca.');
  }

  let image = null;
  try {
    image = await loadImage(rawDataUrl);
  } catch {
    image = null;
  }

  const dimensionLimit = Number.isFinite(maxDimension) && maxDimension > 0
    ? maxDimension
    : 1600;
  const withinDimension = image
    ? Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height) <= dimensionLimit
    : true;

  if (rawBytes <= limit && withinDimension) {
    return {
      id: newId('att'),
      name,
      mime,
      size: rawBytes,
      dataBase64: rawBase64,
      addedAt
    };
  }

  if (!image) {
    // Tidak ada canvas/gambar yang bisa diproses; hanya boleh bila muat.
    if (rawBytes <= limit) {
      return {
        id: newId('att'),
        name,
        mime,
        size: rawBytes,
        dataBase64: rawBase64,
        addedAt
      };
    }
    throw attachmentError('BERKAS_TERLALU_BESAR',
      `Gambar terlalu besar. Batas ${formatBytes(limit)} per lampiran.`);
  }

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scaleToFit = Math.min(1, dimensionLimit / Math.max(sourceWidth, sourceHeight));
  let scale = scaleToFit;
  let attempt = 0;
  const outputMime = 'image/jpeg';

  // Coba beberapa kualitas & ukuran sampai base64 muat di batas.
  while (attempt < 10) {
    const quality = Math.max(0.35, 0.86 - attempt * 0.08);
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
    let dataUrl = '';
    try {
      dataUrl = canvasDataUrl(image, targetWidth, targetHeight, outputMime, quality);
    } catch {
      dataUrl = '';
    }
    if (dataUrl) {
      const actualMime = mimeFromDataUrl(dataUrl) || outputMime;
      const dataBase64 = stripDataUrlPrefix(dataUrl);
      const bytes = decodedBase64Bytes(dataBase64);
      if (bytes > 0 && bytes <= limit) {
        return {
          id: newId('att'),
          name,
          mime: ALLOWED_ATTACHMENT_MIME.includes(actualMime) ? actualMime : 'image/jpeg',
          size: bytes,
          dataBase64,
          addedAt
        };
      }
    }
    attempt += 1;
    scale *= 0.82;
    if (scale < 0.05) break;
  }

  throw attachmentError('BERKAS_TERLALU_BESAR',
    `Gambar tidak dapat dikompres hingga di bawah ${formatBytes(limit)}.`);
}

/** Data URL untuk pratinjau/unduhan, atau '' bila lampiran tidak valid. */
export function attachmentDataUrl(att) {
  if (!att || typeof att.mime !== 'string' || typeof att.dataBase64 !== 'string') return '';
  if (!att.mime || !att.dataBase64) return '';
  return `data:${att.mime};base64,${att.dataBase64}`;
}

/** Ukuran byte hasil dekode base64; 0 bila tidak dapat dihitung. */
export function attachmentBytes(att) {
  if (!att || typeof att.dataBase64 !== 'string') return 0;
  const bytes = decodedBase64Bytes(att.dataBase64);
  return bytes > 0 ? bytes : 0;
}

/**
 * Validasi bentuk lampiran. Mengembalikan boolean; tidak melempar.
 * Aturan mengikuti model: mime diizinkan, data base64 tidak kosong,
 * ukuran hasil dekode ≤ 1 MiB, `size` angka ≥ 0.
 */
export function validateAttachment(att) {
  if (!att || typeof att !== 'object' || Array.isArray(att)) return false;
  if (!ALLOWED_ATTACHMENT_MIME.includes(att.mime)) return false;
  if (typeof att.dataBase64 !== 'string' || att.dataBase64.length === 0) return false;
  if (typeof att.size !== 'number' || !Number.isFinite(att.size) || att.size < 0) return false;
  const bytes = decodedBase64Bytes(att.dataBase64);
  return bytes > 0 && bytes <= MAX_ATTACHMENT_BYTES;
}
