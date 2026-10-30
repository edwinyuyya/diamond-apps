// Ubah link Google Drive jadi link gambar langsung.
// Bisa diisi: link share Drive (https://drive.google.com/file/d/ID/view?usp=sharing),
// link "open?id=ID", ID file saja, atau link gambar biasa / path /produk/xxx.jpg.
// Syarat: file di Drive di-share "Siapa saja yang memiliki link".
export function imgUrl(src, width = 1000) {
  if (!src) return '';
  const s = String(src).trim();
  const m = s.match(/\/d\/([\w-]{20,})/) || s.match(/[?&]id=([\w-]{20,})/);
  const id = m ? m[1] : /^[\w-]{25,}$/.test(s) ? s : null;
  return id ? `https://lh3.googleusercontent.com/d/${id}=w${width}` : s;
}
