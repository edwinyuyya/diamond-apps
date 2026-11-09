// Rawatku — kamera & berkas foto untuk layar pindai.
// getUserMedia selalu same-origin/local; tidak ada unggahan ke luar perangkat.
// Modul ini tidak menyentuh kamera saat impor; hanya saat fungsinya dipanggil.

export const CAMERA_CONSTRAINTS = {
  audio: false,
  video: { facingMode: { ideal: 'environment' } }
};

export class PhotoCaptureError extends Error {
  constructor(message, { code = 'GAGAL_KAMERA', cause = null } = {}) {
    super(message);
    this.name = 'PhotoCaptureError';
    this.code = code;
    if (cause) this.cause = cause;
  }
}

export function kameraDidukung() {
  return typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices)
    && typeof navigator.mediaDevices.getUserMedia === 'function';
}

/** Pesan ramah untuk error getUserMedia; selalu menawarkan jalur unggah. */
export function pesanErrorKamera(error) {
  const name = error?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Akses kamera ditolak. Izinkan kamera di pengaturan peramban, atau unggah foto dari galeri.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') {
    return 'Kamera tidak ditemukan di perangkat ini. Unggah foto dari galeri sebagai gantinya.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu, atau unggah foto dari galeri.';
  }
  if (name === 'AbortError') {
    return 'Kamera dihentikan sebelum siap. Coba lagi atau unggah foto dari galeri.';
  }
  if (name === 'TypeError' || !kameraDidukung()) {
    return 'Peramban ini tidak mendukung kamera. Unggah foto dari galeri sebagai gantinya.';
  }
  return 'Kamera tidak dapat dibuka. Coba lagi atau unggah foto dari galeri.';
}

/** Hentikan semua track pada MediaStream. Aman dipanggil berulang/kosong. */
export function hentikanKamera(stream) {
  if (!stream || typeof stream.getTracks !== 'function') return;
  try {
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch {
        // track sudah berhenti
      }
    }
  } catch {
    // stream tidak valid
  }
}

/**
 * Meminta kamera belakang dan memasangnya ke elemen <video>.
 * @returns {Promise<{stream: MediaStream, stop: () => void}>}
 */
export async function mulaiKamera({
  video = null,
  constraints = CAMERA_CONSTRAINTS
} = {}) {
  if (!kameraDidukung()) {
    throw new PhotoCaptureError(
      'Peramban ini tidak mendukung kamera. Unggah foto dari galeri sebagai gantinya.',
      { code: 'TIDAK_DIDUKUNG' }
    );
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    throw new PhotoCaptureError(pesanErrorKamera(error), {
      code: error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
        ? 'IZIN_DITOLAK'
        : 'GAGAL_KAMERA',
      cause: error
    });
  }

  if (video) {
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    try {
      video.srcObject = stream;
    } catch {
      // sebagian peramban membutuhkan srcObject lewat properti; tetap dicoba
    }
    try {
      await video.play();
    } catch {
      // Autoplay dapat ditolak; track tetap hidup dan tombol ambil tetap tersedia.
    }
  }

  const stop = () => hentikanKamera(stream);
  return { stream, stop };
}

/**
 * Menggambar frame video ke canvas dan mengembalikan data URL JPEG.
 */
export function ambilFrame(video, canvas, { mime = 'image/jpeg', quality = 0.9 } = {}) {
  if (!video || !canvas) {
    throw new PhotoCaptureError('Kamera belum siap. Nyalakan kamera terlebih dahulu.',
      { code: 'KAMERA_BELUM_SIAP' });
  }
  const width = video.videoWidth || canvas.width || 0;
  const height = video.videoHeight || canvas.height || 0;
  if (!width || !height) {
    throw new PhotoCaptureError('Gambar kamera belum tersedia. Tunggu sebentar lalu coba lagi.',
      { code: 'KAMERA_BELUM_SIAP' });
  }
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new PhotoCaptureError('Peramban ini tidak mendukung pengambilan gambar.',
      { code: 'GAGAL_KAMERA' });
  }
  context.drawImage(video, 0, 0, width, height);
  let dataUrl;
  try {
    dataUrl = canvas.toDataURL(mime, quality);
  } catch (error) {
    throw new PhotoCaptureError('Gambar kamera gagal diambil. Coba lagi.',
      { code: 'GAGAL_KAMERA', cause: error });
  }
  return { dataUrl, width, height };
}

function base64ToBytes(base64) {
  const clean = String(base64 || '').replace(/\s+/g, '');
  if (clean === '') return new Uint8Array(0);
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Ubah data URL menjadi File/Blob agar bisa diproses `fileToSourcePhoto`. */
export function dataUrlKeFile(dataUrl, { name = 'kamera.jpg', type = 'image/jpeg' } = {}) {
  const text = String(dataUrl || '');
  const comma = text.indexOf(',');
  if (comma < 0) {
    throw new PhotoCaptureError('Gambar kamera tidak valid. Coba ambil ulang.',
      { code: 'GAGAL_KAMERA' });
  }
  const header = text.slice(0, comma);
  const mimeMatch = /^data:([^;,]+)/.exec(header);
  const mime = mimeMatch ? mimeMatch[1] : type;
  let bytes;
  try {
    bytes = base64ToBytes(text.slice(comma + 1));
  } catch (error) {
    throw new PhotoCaptureError('Gambar kamera tidak valid. Coba ambil ulang.',
      { code: 'GAGAL_KAMERA', cause: error });
  }
  if (typeof File === 'function') {
    return new File([bytes], name, { type: mime, lastModified: Date.now() });
  }
  if (typeof Blob === 'function') {
    const blob = new Blob([bytes], { type: mime });
    return blob;
  }
  throw new PhotoCaptureError('Peramban ini tidak mendukung pemrosesan gambar.',
    { code: 'TIDAK_DIDUKUNG' });
}

/** Ambil frame kamera langsung sebagai File siap kompres. */
export function ambilFotoKameraFile(video, canvas, { mime = 'image/jpeg', quality = 0.9 } = {}) {
  const frame = ambilFrame(video, canvas, { mime, quality });
  return dataUrlKeFile(frame.dataUrl, {
    name: `kamera-${Date.now()}.jpg`,
    type: mime
  });
}
