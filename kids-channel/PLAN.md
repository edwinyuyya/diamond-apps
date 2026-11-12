# Rencana Channel YouTube Edukasi Anak < 5 Tahun

> Status: v0.1 (rancangan). Semua angka waktu adalah **perkiraan dari pengukuran di sesi ini**, bukan janji.

## 1. Konsep

- **Sasaran:** balita 2–5 tahun dan orang tuanya (orang tua yang memilih video).
- **Isi:** pelajaran sederhana lewat cerita pendek + lagu: warna, angka, bentuk, huruf, hewan, perasaan, kebiasaan baik (cuci tangan, sikat gigi, bagi mainan).
- **Bahasa:** Indonesia sebagai utama. Kata kunci bahasa Inggris diselipkan (mis. "merah — red"). Satu video, dua kegunaan: belajar kosakata dan menjangkau penonton lebih luas.
- **Dunia:** satu "taman" tempat Lumo dan Gaja bermain. Tiap episode berpindah tempat (kebun, sungai, rumah, pasar), jadi dunia mudah dikembangkan.
- **Nilai tambah:** karakter tetap, kurikulum jelas per episode, ritme lambat dan berulang (cocok untuk balita), tanpa hal menakutkan.

## 2. Nama channel

**Tentang "survei":** pencarian saya tidak menemukan survei yang menyatakan nama channel mana yang paling disukai anak-anak. Yang ada hanya daftar channel anak terbesar di dunia (Cocomelon, Kids Diana Show, ChuChu TV, Pinkfong, dan lain-lain; sumber di bawah). Pola di bawah adalah **kesimpulan saya dari nama-nama channel terbesar itu**, bukan hasil survei.

**Pola nama channel anak yang sukses:**
1. **Pendek, 2–3 suku kata, mudah diucapkan balita** (Cocomelon, ChuChu, Pinkfong, Blippi).
2. **Kata buatan atau bunyi berulang**, jadi unik dan mudah dilindungi sebagai merek (ChuChu, Pinkfong).
3. **Berpusat pada karakter** (Kids Diana Show, Blippi), sehingga anak menyebut nama tokohnya.
4. **Ada keterangan pencarian di belakangnya** ("Nursery Rhymes", "Kids Songs") supaya muncul di pencarian orang tua.

**Rekomendasi 3 nama (urut dari yang saya sarankan):**

| # | Nama tampil | Mengapa | Catatan |
|---|---|---|---|
| 1 | **Lumo & Gaja** + keterangan "Lagu & Belajar Anak" | Berpusat pada karakter, mudah dicari ("Lumo Gaja"), anak bisa menyebut kedua tokoh | Cek handle `@lumogaja` |
| 2 | **LumoLumo** | Bunyi berulang seperti ChuChu, mudah diucapkan balita | "Lumo" kata umum; cek merek lain |
| 3 | **Taman Lumo** | Ada "dunia" (taman) yang bisa dikembangkan | Kurang menonjolkan Gaja |

Hindari nama yang mirip channel yang sudah ada: "Tiko", "Mimi", "Kiko", "Kancil".

**Daftar cek nama (lakukan sebelum membuat channel):**
1. Cari nama di YouTube dan Google. Pastikan tidak ada channel atau merek anak yang mirip.
2. Cek handle di YouTube, Instagram, TikTok.
3. Cek merek di pangkalan data DJKI (pdki-indonesia.dgip.go.id), kelas 41 (pendidikan/hiburan), 9, 16, 28. Kata "Lumo" dipakai banyak merek lain, jadi cek khusus.
4. Cek domain (.com / .id).

Sumber daftar channel: AIR Media-Tech (daftar channel anak berlanggan terbanyak), Statista (channel "made for kids" terbesar).

## 3. Karakter dan perlindungan hukum

- **Bukan paten.** Paten untuk penemuan teknis. Karakter dilindungi lewat:
  - **Hak cipta** (otomatis sejak diciptakan). Pencatatan ciptaan di DJKI tidak wajib, tapi berguna sebagai bukti.
  - **Merek** (nama dan logo, bisa juga bentuk karakter) didaftarkan di DJKI, kelas yang relevan.
- **Pegang bukti:** simpan kode sumber karakter (`engine/characters.js`), `CHARACTERS.md`, lembar karakter bertanggal, dan riwayat commit.
- **Karya yang dibantu AI:** perlindungan hak cipta untuk karya yang dibuat dengan bantuan AI belum sepenuhnya jelas di banyak negara. Catat keputusan kreatif Anda (nama, kepribadian, cerita, pilihan desain) agar ada unsur karya manusia yang jelas.
- **Desain unik:** karakter lama (Benny dan Ellie) sengaja diganti karena terlalu mirip karakter channel lain. Lumo (sanggul bulat, pelangi di dada) dan Gaja (gajah teal, bintang di dahi) dirancang berbeda.
- **Saran:** konsultasikan ke konsultan HKI (Hak Kekayaan Intelektual) sebelum mendaftar. Ini bukan nasihat hukum.

## 4. Format dan durasi

**Apakah 2 menit cukup?** Tidak, itu batas bawah. Pencarian saya tidak menemukan studi yang membandingkan panjang video untuk balita; yang ada hanya contoh: video lagu anak yang diputar ulang biasanya di bawah 5 menit, sedangkan channel besar (mis. Little Baby Bum) juga punya **kompilasi 30–60 menit** yang sangat banyak ditonton. Jadi kedua format dipakai.

**Keputusan:**
- **Episode utama: 3–5 menit.** Episode 1 saya targetkan sekitar 3,5 menit. Setelah ada data penonton (retensi), bisa dinaikkan ke 5 menit.
- **Kompilasi: 10–30 menit.** Gabungan 3–6 episode yang sudah jadi. **Tidak perlu render ulang** (cukup disambung), jadi murah dan menambah waktu tonton.
- **Shorts: 20–40 detik**, potongan dari episode untuk menarik penonton baru.

| Jenis | Durasi | Render (perkiraan)* |
|---|---|---|
| Episode utama (16:9, 1080p) | 3–5 menit | sekitar 55–90 menit |
| Kompilasi | 10–30 menit | hanya penyambungan (beberapa menit) |
| Shorts (9:16) | 20–40 detik | sekitar 6–12 menit |

\* Pengukuran di sesi ini: video 9:16 berdurasi 16,5 detik memakan sekitar 5 menit render (sekitar 17–18 detik waktu render per 1 detik video). 16:9 1080p punya jumlah piksel sama, jadi kecepatannya mirip. Render berjalan di latar belakang.

**Waktu penggarapan selain render (perkiraan):**
- Episode 1–3 lebih lama karena properti dan gerakan baru perlu dibuat dan diuji.
- Setelah perpustakaan terbentuk: satu episode kira-kira satu sesi kerja (naskah → suara → render → cek → ekspor).
- Jadwal realistis: **1 episode per minggu**, ditambah 2–3 Shorts dan kompilasi tiap beberapa episode.

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

Rekomendasi: mulai dengan **A** untuk uji coba, pindah ke **B atau C** untuk episode yang diunggah. **Pilihan pemilik channel: C (ElevenLabs).** Langkah lengkapnya ada di `ELEVENLABS.md`. Sistem otomatis mengatur waktu adegan mengikuti panjang tiap file suara.

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
