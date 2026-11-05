# Deploy website + chat AI Nexora ke Vercel

Folder ini adalah satu project Vercel: halaman statis (`index.html`) + server chat AI (`api/chat.js`).

## Langkah
1. Vercel → **Add New → Project** → pilih repo `diamond-apps`.
2. **Root Directory**: `nexora-website` (penting, karena repo ini juga berisi aplikasi lain).
3. **Environment Variables**:
   - `ANTHROPIC_API_KEY` = kunci API dari console.anthropic.com (wajib, jangan ditaruh di kode).
   - `CHAT_MODEL` (opsional) = `claude-opus-5-5` (default) atau `claude-haiku-5-5` untuk demo publik yang jauh lebih hemat.
   - `RATE_LIMIT` (opsional) = maks. pertanyaan per IP per 10 menit (default 12).
   - `ALLOWED_ORIGINS` (opsional) = domain lain yang boleh memanggil `/api/chat`, pisahkan koma.
4. **Deploy**. Buka situs, klik "Coba ngobrol dengan AI kami".

## Catatan penting
- **Biaya:** setiap pertanyaan pengunjung memakai kuota API Anda. Pasang batas pengeluaran bulanan di console.anthropic.com.
- **Pembatas laju** di `api/chat.js` disimpan di memori tiap instance serverless, jadi hanya perlindungan dasar. Untuk perlindungan kuat, aktifkan Vercel Firewall / Rate Limiting di dashboard Vercel.
- Jawaban AI dibatasi oleh `SYSTEM` prompt di `api/chat.js` (hanya soal Nexora, tanpa harga/janji). Ubah di sana bila ada karya atau layanan baru.
- Tanpa endpoint (mis. `index.html` dibuka langsung dari file), chat otomatis memakai jawaban contoh.
