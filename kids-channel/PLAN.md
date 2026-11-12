# Rencana Channel YouTube Edukasi Anak < 5 Tahun

> Status: v0.1 (rancangan). Semua angka waktu adalah **perkiraan dari pengukuran di sesi ini**, bukan janji.

## 1. Konsep

- **Sasaran:** balita 2–5 tahun dan orang tuanya (orang tua yang memilih video).
- **Isi:** pelajaran sederhana lewat cerita pendek + lagu: warna, angka, bentuk, huruf, hewan, perasaan, kebiasaan baik (cuci tangan, sikat gigi, bagi mainan).
- **Bahasa:** Indonesia sebagai utama. Kata kunci bahasa Inggris diselipkan (mis. "merah — red"). Satu video, dua kegunaan: belajar kosakata dan menjangkau penonton lebih luas.
- **Dunia:** satu "taman" tempat Lumo dan Gaja bermain. Tiap episode berpindah tempat (kebun, sungai, rumah, pasar), jadi dunia mudah dikembangkan.
- **Nilai tambah:** karakter tetap, kurikulum jelas per episode, ritme lambat dan berulang (cocok untuk balita), tanpa hal menakutkan.

## 2. Nama channel (pilih satu, lalu cek ketersediaannya)

Saya tidak bisa memastikan nama bebas dipakai. Cek sendiri sebelum memutuskan (lihat daftar cek di bawah).

| # | Nama | Alasan |
|---|---|---|
| 1 | **Taman Lumo** (rekomendasi) | Pendek, mudah diucapkan anak, ada "dunia" (taman) yang bisa dikembangkan |
| 2 | Lumo & Gaja Belajar | Jelas isinya, nama tokoh langsung dikenal |
| 3 | Rumah Pelangi Lumo | Cocok dengan pelangi di baju Lumo |
| 4 | Bintang Kecil Lumo | Cocok dengan bintang di dahi Gaja |
| 5 | Ayo Lumo! | Seperti sapaan, mudah diingat |

Hindari nama yang sudah ramai di hasil pencarian: "Tiko", "Mimi", "Kiko", "Kancil". Sudah ada channel dengan nama mirip.

**Daftar cek nama (lakukan sebelum membuat channel):**
1. Ketik nama di kolom pencarian YouTube dan Google. Pastikan tidak ada channel atau merek anak yang mirip.
2. Cek handle `@tamanlumo` (atau pilihan Anda) di YouTube, Instagram, dan TikTok.
3. Cek merek di pangkalan data merek DJKI (pdki-indonesia.dgip.go.id), kelas 41 (pendidikan dan hiburan), 9, 16, 28.
4. Cek domain (.com / .id).

## 3. Karakter dan perlindungan hukum

- **Bukan paten.** Paten untuk penemuan teknis. Karakter dilindungi lewat:
  - **Hak cipta** (otomatis sejak diciptakan). Pencatatan ciptaan di DJKI tidak wajib, tapi berguna sebagai bukti.
  - **Merek** (nama dan logo, bisa juga bentuk karakter) didaftarkan di DJKI, kelas yang relevan.
- **Pegang bukti:** simpan kode sumber karakter (`engine/characters.js`), `CHARACTERS.md`, lembar karakter bertanggal, dan riwayat commit.
- **Karya yang dibantu AI:** perlindungan hak cipta untuk karya yang dibuat dengan bantuan AI belum sepenuhnya jelas di banyak negara. Catat keputusan kreatif Anda (nama, kepribadian, cerita, pilihan desain) agar ada unsur karya manusia yang jelas.
- **Desain unik:** karakter lama (Benny dan Ellie) sengaja diganti karena terlalu mirip karakter channel lain. Lumo (sanggul bulat, pelangi di dada) dan Gaja (gajah teal, bintang di dahi) dirancang berbeda.
- **Saran:** konsultasikan ke konsultan HKI (Hak Kekayaan Intelektual) sebelum mendaftar. Ini bukan nasihat hukum.

## 4. Format dan durasi

| Jenis | Durasi | Fungsi | Perkiraan waktu render* |
|---|---|---|---|
| **Video utama** (16:9, 1080p) | 2–3 menit | Pelajaran + lagu, ditonton orang tua dan anak | 35–55 menit |
| **Shorts** (9:16) | 20–40 detik | Potongan dari video utama, untuk penemuan | 6–12 menit |
| Lagu penuh (opsional) | 3–5 menit | Lagu tema atau kompilasi | 55–90 menit |

\* Pengukuran di sesi ini: video 9:16 berdurasi 16,5 detik memakan sekitar 5 menit render (sekitar 17–18 detik waktu render per 1 detik video). Video 16:9 1080p punya jumlah piksel sama, jadi kecepatannya mirip. Render berjalan di latar belakang.

**Waktu penggarapan selain render (perkiraan):**
- Episode 1–3: lebih lama, karena tiap properti dan gerakan baru perlu dibuat dan diuji.
- Setelah perpustakaan properti dan gerakan terbentuk: satu episode 2–3 menit kira-kira satu sesi kerja (naskah → suara → render → cek → ekspor).
- Jadwal realistis: **1 video utama per minggu**, ditambah 2–3 Shorts dari video itu.

## 5. Alur produksi (satu episode)

```
1. NASKAH      episode-XX/script.json   (adegan, kalimat suara, aksi, kata kunci Inggris)
2. SUARA       dubbing per kalimat -> assets/audio/*.wav (durasi menentukan waktu adegan)
3. ANIMASI     adegan 3D memakai karakter resmi (engine/characters.js)
4. TEKS        subtitle otomatis dari naskah -> .srt/.vtt + teks di layar
5. MUSIK/SFX   lagu latar (Suno atau perpustakaan gratis) + efek suara
6. RENDER      16:9 (video utama) + 9:16 (Shorts)
7. CEK         tangkapan frame, ukur kenyaringan (target -14 LUFS), tonton
8. UNGGAH      judul, deskripsi, thumbnail, subtitle .srt, "dibuat untuk anak"
```

## 6. Dubbing, musik, dan subtitle: cara termudah

**Dubbing (pilih satu per episode):**

| Cara | Kualitas | Usaha Anda | Catatan |
|---|---|---|---|
| **A. Suara komputer lokal (gratis)** | Cukup, suara dewasa-formal | Tidak ada | Piper (Indonesia) dan Kokoro (Inggris) berjalan di sini. Ada contoh yang bisa didengar |
| **B. Rekam suara sendiri/keluarga** | Terbaik untuk anak (hangat, alami) | Rekam di HP, kirim file | Saya potong dan susun per kalimat |
| **C. Suara AI berbayar** (mis. ElevenLabs) | Sangat natural, bisa ceria | Buat MP3 per kalimat, kirim ke saya | Layanan ini tidak bisa diakses dari lingkungan saya, jadi Anda yang membuat |

Rekomendasi: mulai dengan **A** untuk uji coba, pindah ke **B atau C** untuk episode yang diunggah. Sistem otomatis mengatur waktu adegan mengikuti panjang tiap file suara.

**Musik dan lagu:**
- **Suno** (Anda): buat lagu dari lirik episode dengan prompt dari saya, kirim file `.mp3`, saya pasang dan sesuaikan waktunya.
- Atau perpustakaan gratis (YouTube Audio Library, Pixabay Music). Cek lisensi komersial.
- Efek suara: perpustakaan Pixabay yang sudah ada (pop, whoosh, sparkle) dan tambahan.

**Subtitle (otomatis):**
- Teks sudah ada di naskah, jadi subtitle dibuat otomatis lengkap dengan waktunya.
- Dua keluaran: **(1) teks yang dibakar di video** (besar, ala anak-anak), **(2) file `.srt`** untuk diunggah ke YouTube sebagai teks tutup (CC), Indonesia dan Inggris.

## 7. Siap-unggah ke YouTube

- Video utama: **1920×1080, 30 fps, H.264 + AAC**, kenyaringan sekitar **-14 LUFS**, puncak ≤ -1 dBFS.
- Shorts: 1080×1920, ≤ 60 detik (rekomendasi ≤ 40 detik).
- Thumbnail 1280×720 (Lumo dan Gaja dengan ekspresi besar, teks maksimal 3 kata).
- Setelan YouTube: **"Dibuat untuk anak-anak"** (wajib untuk konten anak; mematikan komentar dan iklan yang dipersonalisasi).
- **Monetisasi:** YouTube menolak konten yang dianggap diproduksi massal atau berulang tanpa nilai tambah. Karakter tetap + kurikulum + cerita yang berbeda tiap episode membantu. Baca kebijakan YouTube terkini sebelum mendaftar program mitra.
- Keterbukaan konten buatan AI: ikuti kebijakan YouTube yang berlaku saat unggah.

## 8. Peta 12 episode awal (usulan)

1. Cuci tangan (sudah ada prototipe)
2. Warna: merah, kuning, biru
3. Angka 1–5 (menghitung buah)
4. Bentuk: lingkaran, kotak, segitiga
5. Sikat gigi
6. Hewan di kebun (suara dan nama)
7. Perasaan: senang, sedih, marah, takut
8. Membereskan mainan
9. Huruf A–E
10. Berbagi
11. Makan sayur
12. Naik-turun (konsep posisi: atas, bawah, dalam, luar)

## 9. Yang belum bisa dan risikonya (jujur)

- Gaya animasi adalah **3D mainan buatan kode**. Hasilnya konsisten dan murah, tapi **belum sebanding dengan studio besar** (rambut atau kain yang bergerak halus, ekspresi wajah sangat detail).
- Suara komputer lokal terdengar dewasa-formal; untuk anak, rekaman manusia atau suara AI berbayar lebih baik.
- Lagu dengan nyanyian harus dari Suno (atau sejenis); saya tidak bisa menyanyikannya.
- `/cinecode`: saya belum mengenal alat ini dan tidak bisa menilainya tanpa tautan atau contoh hasilnya. Kriteria pembanding yang layak: konsistensi wajah antar video, kontrol atas gerakan, biaya per menit, hak komersial, dan seberapa mudah mengganti suara.
