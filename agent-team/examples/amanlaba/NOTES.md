# NOTES

## t4 devops

- `.nvmrc` diisi `20` (Node 20 LTS, sesuai rekomendasi CONTRACT §1/§10); `engines` tetap `>=18.17`.
- `scripts/cek-node.sh` diuji untuk jalur sukses (Node v22.23.4), Node tidak ditemukan, dan versi 18.16.0 (gagal dengan pesan jelas). Script tidak dipasang sebagai lifecycle hook agar daftar `scripts` tetap persis seperti CONTRACT §12.4.
- `npm start` diuji pada `PORT=3977 HOST=127.0.0.1`: `/api/health` merespons `status: "ok"` dan `GET /` merespons 200 `text/html`.
- `npm test` dan `npm run verify` belum dapat dijalankan pada saat pengerjaan karena `test/` dan `verify.sh` adalah milik t5 dan belum ada. Skrip npm sudah ter-resolve ke perintah yang ditetapkan kontrak.
- `.gitignore` mempertahankan entri `.team/` yang sudah ada dan menambahkan `node_modules/`, `.env`, log, serta artefak lokal. Tidak ada lockfile yang dibuat.
- Tidak ada dependency yang ditambahkan; `dependencies` dan `devDependencies` kosong.
- `backend/package.json` (milik t1) sudah ada dan tidak diubah; itu tidak mengganggu karena root `package.json` sudah `"type": "module"`.

## t2c hasil & grafik

- `hasil.js` dan `grafik.js` sudah ada dari percobaan sebelumnya; dipertahankan lalu dilengkapi. Tidak menulis ulang dari nol.
- Grafik memakai `<title>` + `<desc>` (plus `aria-labelledby`/`aria-describedby`, `role="img"`) agar terbaca screen reader; semua node SVG dibuat via `createElementNS`, tanpa library/HTML injection.
- Histogram: 30 bin mengikuti data mesin, 1 bin penuh bila semua laba sama; garis dasar + 4 garis bantu, label sumbu Y ringkas, median P50 putus-putus, legenda Rugi/Untung.
- Tornado: 4 baris diurutkan `dampak` menurun, garis nol di tengah, label variabel dan nilai ringkas di ujung batang.
- Sapuan harga: domain dihitung hanya dari titik valid (harga & laba rata-rata finite), area opasitas rendah, penanda terbaik/teraman dengan label harga, garis impas putus-putus dari `biayaVariabel.mode + biayaTetap.mode / max(permintaan.mode, 1)` (sesuai CONTRACT §3.9).
- Data kosong/tidak lengkap: wadah grafik menampilkan "Jalankan simulasi untuk melihat grafik."; `renderHasil` melempar error jelas bila `data.ringkasan` tidak ada sehingga ditangani `#galat` oleh `utama.js`.
- Verifikasi: `node --check` kedua berkas, grep seluruh ID DOM §9.4 dan kelas SVG wajib, serta smoke test in-memory dengan DOM shim untuk histogram/tornado/harga, kasus 1 bin, data kosong, dan `renderHasil` lengkap. Tidak menjalankan server uji panjang atau browser otomatis.
