// Unggah foto dari admin (dipakai halaman produk & slide banner).
// Foto diperkecil dulu di HP supaya cepat & hemat kuota, lalu server mengompres ke WebP.
export async function shrink(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.9));
  } catch { return file; }
}

// → URL foto, atau melempar Error dengan pesan yang bisa ditampilkan
export async function uploadImage(file, { banner = false } = {}) {
  const fd = new FormData();
  fd.append('file', await shrink(file, banner ? 2000 : 1600), 'foto.jpg');
  if (banner) fd.append('kind', 'banner');
  const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { location.href = '/admin/login'; throw new Error('Sesi habis, silakan login lagi'); }
  if (!r.ok) throw new Error(d.error || 'Gagal mengunggah foto');
  return d.url;
}
