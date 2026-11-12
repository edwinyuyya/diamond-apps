# Buku Karakter (design v1.1)

Sumber kebenaran visual. Perubahan apa pun pada bentuk atau warna harus menaikkan nomor versi, memperbarui file ini, dan membuat ulang `sheet/character-sheet-v*.png`.
Kode: `engine/characters.js` (`KC.makeLumo()` dan `KC.makeGaja()`). Karena dibangun dari kode, wajah dan bentuknya **identik di setiap episode**.

## LUMO
- **Siapa:** anak laki-laki 3–4 tahun, ceria, penasaran, sering bertanya "kenapa?". Jadi murid yang belajar bersama penonton.
- **Ciri khas (jangan diubah):** sanggul bulat di puncak kepala dengan ikat merah kecil; pelangi tiga warna di dada baju.
- **Bentuk:** kepala besar bulat (diameter sekitar 1,24 satuan), badan pendek gemuk, tangan dan kaki bulat. Tinggi total sekitar 2,7 satuan.
- **Warna (hex):** kulit kuning langsat `#F0C58F` · rambut `#2A1C15` · baju krem `#FFF1D6` · celana merah `#E0453A` · sepatu putih dengan ujung merah · pelangi: merah `#E0453A`, kuning `#FFC61A`, biru `#2F8FE6`.
- **Wajah:** mata besar cokelat tua dengan kilau putih, alis tebal, pipi pink `#FF8F8F`, hidung kecil bulat. Ekspresi: senang (mulut terbuka), terkejut ("oh", mulut bulat), kedip satu mata.
- **Gerakan khas:** melompat kecil saat senang, mengangkat kedua tangan saat terkejut atau berseru.

## GAJA
- **Siapa:** bayi gajah, sahabat Lumo, lembut dan sedikit pemalu, suka bertepuk dengan belalai.
- **Ciri khas (jangan diubah):** tubuh warna teal, bintang kuning kecil di dahi, telinga lebar dengan bagian dalam pink.
- **Bentuk:** badan bulat, kepala bulat, telinga besar pipih, belalai tiga ruas yang bisa melengkung. Tinggi total sekitar 2,6 satuan.
- **Warna (hex):** badan `#4FC3C9` · perut `#C6F1EE` · kaki `#3AA9B0` · telinga dalam `#FF9FB6` · bintang `#FFC61A`.
- **Gerakan khas:** mengepakkan telinga saat kaget atau senang, melambai dengan belalai, tos belalai dengan Lumo.

## Aturan agar tetap konsisten
1. Jangan ubah proporsi tanpa menaikkan versi.
2. Warna hanya dari tabel di atas (`PALETTE` di kode).
3. Dilarang menambah aksesori baru ke wajah (kacamata, topi) kecuali menjadi bagian baru dari buku ini.
4. Sudut kamera utama: sejajar mata anak, sedikit dari atas. Jarak sama tiap episode.
5. Suara: Lumo = suara anak ceria; Gaja = suara lembut pelan. (Isi nama pengisi suara / jenis suara AI di sini setelah dipilih.)

## Riwayat versi
- **v1.1:** kulit Lumo diganti menjadi kuning langsat (`#F0C58F`) atas permintaan pemilik channel; celana dirapikan (tidak ada bintik putih); pelangi dinaikkan agar terlihat penuh.
- **v1.0:** rancangan awal.

## Hal yang masih bisa diperbaiki di v1.2
- Wajah Gaja: tambah bulu mata atau kerutan senyum agar lebih ekspresif.
- Rambut Lumo: tambah sedikit volume di dahi.
