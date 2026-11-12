# Roadmap: Pelangi di Taman (Kiko dan Teman Warna)

Status: DRAFT · Profile: Quality · Format: 2:00, 16:9, 1920x1080, 24 fps · Medium: 2D soft toon in code ("Permen Kilap")

## 1. Concept
- **Logline:** Kiko, panda merah kecil, ingin membuat pelangi di taman; tiap teman hewan membawa satu warna dan ikut bernyanyi.
- **The turn:** Before: taman pucat, tanpa warna / After: pelangi penuh dan taman berwarna.
- **Rule that breaks once:** tiap teman hanya punya satu warna; sekali saja dua teman berpelukan, warnanya bercampur jadi warna baru: Kuning + Merah = Jingga, dan Kiko sadar bulunya jingga.
- **Ending:** pelangi terbentang, matahari terbenam jadi ungu lembut, semua melambai; kata terakhir "sampai jumpa".
- **How code shows it:** satu halaman canvas 2D, karakter dari bentuk bulat dengan kilau kecil dan bayangan lembut, cahaya hangat dari kiri atas; tiap warna muncul sebagai teman hewan yang bergerak, bukan bentuk abstrak.
- **World test:** bunyi dan gambar dari taman anak: kepik, anak ayam, kupu-kupu, katak, ember dan kuas.

**Cast (semua orisinal):** Kiko panda merah kecil (jingga, pemandu) · Lala kepik (merah) · Pio anak ayam (kuning) · Bibi kupu-kupu (biru) · Koko katak (hijau).

**Tempo:** standard ~5 s per shot, cocok untuk anak balita, lagu 100 BPM (1 bar = 2,4 s; 2 bar = 4,8 s) · 24 shots.

## 2. Shots (grouped by chapter; full list in shots.json)
| # | Time | Chapter | What we see | Action | Camera | Read | Sound |
|---|---|---|---|---|---|---|---|
| 1-2 | 0:00-0:10 | Pembuka | Taman pucat, Kiko melompat masuk dengan ember cat | Kiko memantul dan menyapa | dekat, lalu lebar | "mau bikin pelangi!" | glockenspiel pukulan pertama di frame 1 |
| 3-5 | 0:10-0:30 | MERAH | Lala kepik mendarat di daun | Lala membawa titik merah, daun jadi merah | sedang, miring ke atas | kata "merah" | nada 1, kata diucapkan |
| 6-8 | 0:30-0:50 | KUNING | Pio anak ayam menetas dari bunga matahari | Pio melompat, matahari ikut kuning | rendah, mengikuti lompatan | "kuning" | nada 2 |
| 9-11 | 0:50-1:10 | BIRU | Bibi kupu-kupu terbang di atas kolam | sayap biru, kolam berubah biru | lebar, melayang | "biru" | nada 3 |
| 12-14 | 1:10-1:30 | HIJAU | Koko katak melompat dari daun ke daun | rumput jadi hijau | sedang, dari samping | "hijau" | nada 4 |
| 15-18 | 1:30-1:50 | JINGGA (aturan pecah) | Pio dan Lala berpelukan, warnanya bercampur | muncul warna jingga, Kiko melihat bulunya | dekat, kejutan, lalu lebar | "jingga" | tema empat nada terhenti sebentar, lalu naik |
| 19-24 | 1:50-2:00* | Pelangi | semua teman berkumpul, pelangi muncul, langit ungu | semua melambai | lebar, perlahan menjauh | "pelangi, sampai jumpa" | tema penuh, lalu tenang |
*Durasi total 2:00; babak pelangi dipadatkan, bab warna sekitar 20 s tiap satu. Hitungan detail di shots.json setelah naskah disetujui.

## 3. Look
- **Preset:** custom "Permen Kilap"
- **Changes:** bentuk bulat gemuk, kilau kecil di hidung dan mata, bayangan lembut ungu muda, cahaya matahari hangat dari kiri atas; palet #FFE9F2 #FF5C8A #FFC93C #3DBBF0 #5ED38A.
- **References:** gambar tangkapan layar pengguna sebagai suasana saja; karakter berbeda.

## 4. Sound identity
- **Concept:** orkestra mainan: pizzicato, glockenspiel dan xylophone, tema empat nada.
- **Signature sound:** nada glockenspiel naik tiap warna baru; kembali penuh di pelangi.
- **Silence:** jeda 1 ketukan saat dua teman berpelukan (aturan pecah).
- **Voice:** hanya nama warna diucapkan; kandidat suara dipilih pengguna dengan telinga.
- **Ambience:** taman: burung kecil, angin, rumput; satu ruang gema ringan.

## 5. Hook (first 2 s)
Kiko memantul masuk dari kiri bersama pukulan glockenspiel di frame 1.

## 6. Risks
| Risk | Why | Plan |
|---|---|---|
| Karakter 2D kaku | semua digambar dengan kode | bentuk bulat sederhana, gerak memantul dengan pegas |
| Suara nama warna terdengar robot | TTS | beberapa kandidat, pengguna pilih, perlakuan suara hangat |
| Terlalu cepat untuk balita | anak sampai 5 tahun | satu warna satu bab, ulang kata dua kali |

## 7. Director card
- **Structure:** satu lagu, satu warna per bab, satu kejutan di tengah.
- **Look:** Permen Kilap karena paling dekat dengan contoh pengguna dan paling cocok digambar kode · **Camera:** hangat, mengikuti karakter; gerak khas: dorongan kecil ke arah teman baru · **Motion:** bouncy
- **Tempo:** standard · **Transitions:** potong biasa, satu usapan warna saat warna baru mengisi taman · **Sound:** orkestra mainan.
- **Light:** matahari hangat kiri atas, bergeser sedikit ke senja ungu di akhir · **Signature:** percikan warna yang mengisi taman tiap bab.
- **How each thing is seen:** hewan bulat dengan kilau; daun dan bunga berbentuk sederhana; air berlapis pantulan.
- **Atmosphere:** taman cerah, awan kecil, rumput berlapis dekat dan jauh.
- **Type:** at step 4b · **Finishing:** at the style frame.

## 8. Next gates
Script → style frame (+ type) → animatic → draft cut → final.
