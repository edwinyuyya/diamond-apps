# Panduan dubbing dengan ElevenLabs, dan cara menggabungkannya

> Tampilan ElevenLabs sering berubah. Nama menu di bawah adalah gambaran umum; sesuaikan dengan yang Anda lihat. Hal yang **belum terverifikasi** diberi tanda ⚠️.

## 1. Paket dan lisensi (penting untuk YouTube)
- Paket gratis cocok untuk **uji coba** suara.
- Untuk video yang **dimonetisasi di YouTube**, pakai **paket berbayar** (paket paling murah sekitar US$5–6 per bulan menurut sumber pihak ketiga; cek halaman harga resmi). Paket gratis tidak punya lisensi komersial dan mewajibkan atribusi.
- Simpan bukti langganan dan tanggal pembuatan audio (untuk berjaga-jaga jika ada sengketa lisensi).
- Baca halaman lisensi dan syarat layanan ElevenLabs saat ini sebelum mengunggah.

## 2. Memilih suara (lakukan sekali, pakai terus)
1. Buka **Voice Library**, filter **Bahasa: Indonesia**. ⚠️ Pastikan model yang dipilih mendukung Bahasa Indonesia (biasanya model "Multilingual"); uji dengan 1 kalimat dulu.
2. Dengarkan 5–6 suara. Cari yang **ceria, jelas, lambat, hangat** (bukan suara berita).
3. Simpan yang dipilih ke **My Voices**. **Jangan ganti suara antar episode.** Suara yang sama membuat karakter terasa konsisten.
4. Saran peran:
   - **Narator / Kak Pemandu:** suara perempuan atau laki-laki dewasa yang hangat dan ceria.
   - **Lumo:** suara anak yang riang (bisa suara yang sama dengan narator, dibuat sedikit lebih tinggi lewat pilihan suara lain). Awalnya cukup 1 suara untuk semua.
   - **Gaja:** tidak bicara. Suaranya efek "tuuut" belalai.

## 3. Pengaturan awal yang disarankan ⚠️ (titik mulai, bukan angka pasti)
| Pengaturan | Saran | Alasan |
|---|---|---|
| Stability | sekitar 40–50% | Lebih ekspresif dan ceria |
| Similarity / Clarity | sekitar 75% | Suara tetap jernih |
| Style exaggeration | rendah (0–20%) | Menghindari suara berlebihan |
| Speed | sekitar 0,9× | Anak balita butuh bicara yang lebih pelan |

Coba 3 kalimat pertama, dengarkan, baru ubah. Setelah cocok, **catat pengaturannya di `CHARACTERS.md`** dan pakai terus.

## 4. Membuat audio per kalimat
1. Buka `episodes/ep01/script.md`. Tiap kalimat punya **ID** (mis. `L07`).
2. Salin teks satu kalimat → tempel di ElevenLabs → **Generate** → dengarkan.
   - Kalau salah ucap, tulis ulang ejaan (mis. "Lumo" → "Lumo" dengan tanda baca, atau beri jeda dengan koma).
   - Satu kalimat = satu file. Jangan gabung beberapa kalimat.
3. Unduh **MP3** dan beri nama persis: `ep01_L07.mp3` (ID dari naskah).
4. Ulangi untuk semua kalimat (episode 1 = 32 file).

Tip hemat: kalimat pendek lebih murah dan hasilnya lebih stabil.

## 5. Mengirim file ke saya
Pilih salah satu:
- **Lampirkan semua MP3 sekaligus** di chat ini (jika aplikasi Anda mengizinkan beberapa lampiran), atau
- **Zip** semuanya (`ep01_audio.zip`) lalu lampirkan, atau
- Unggah ke folder `kids-channel/episodes/ep01/audio/` di GitHub repo ini.

## 6. Penggabungan: saya yang kerjakan, Anda tidak perlu menggabungkan apa pun
Setelah file masuk, otomatis:
1. Setiap file diukur durasinya (`ffprobe`).
2. Waktu adegan disusun mengikuti durasi suara (adegan tidak terpotong).
3. Suara ditaruh di lajur suara, musik di lajur sendiri, efek suara di lajur ketiga.
4. Level suara disamakan ke sekitar **-14 LUFS** dan dicek tidak pecah.
5. Subtitle dibuat dari teks naskah dengan waktu yang sama persis (teks di layar dan file `.srt`).
6. Render ke 16:9 (video utama) dan 9:16 (Shorts).

## 7. Kalau mau mengedit sendiri
Saya bisa keluarkan juga **`voice.wav`**, **`music.wav`**, dan video **tanpa suara** terpisah. Anda bisa menggabungkannya manual di CapCut atau DaVinci Resolve (lajur video + 3 lajur audio).

## 8. Menyisipkan jeda interaktif
Untuk bagian "Mana yang merah?", tulis jeda di naskah (`[JEDA 3 detik]`). Saya akan menyisipkan diam 3 detik di waktu itu, tanpa Anda perlu membuat file suara kosong.
