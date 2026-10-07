/*
 * ============================================================
 *  DATA REJEKI UTAMA AC — EDIT FILE INI SAJA
 * ============================================================
 *  Semua teks di kartu nama & pengalaman AR diambil dari sini.
 *  Yang bertanda  // ✏️ GANTI  masih CONTOH — ganti dengan data asli
 *  sebelum dicetak. Jangan tampilkan klien/testimoni yang belum
 *  memberi izin.
 * ============================================================
 */
window.RU = {
  perusahaan: "Rejeki Utama AC",
  subjudul: "Professional Air Conditioning Service",
  tagline: "AC Sehat. Ruangan Nyaman. Bisnis Lancar.",

  // ---------- KONTAK ----------
  nama: "Nama Anda",                       // ✏️ GANTI
  jabatan: "Founder & Lead Technician",    // ✏️ GANTI
  telepon: "0812-3456-7890",               // ✏️ GANTI (tampil di kartu)
  whatsapp: "6281234567890",               // ✏️ GANTI (format 62..., tanpa + / spasi)
  email: "halo@rejekiutama-ac.com",        // ✏️ GANTI
  instagram: "@rejekiutama.ac",            // ✏️ GANTI
  areaLayanan: "Jabodetabek",              // ✏️ GANTI

  // Link halaman AR (isi QR code). Kosong = otomatis pakai alamat
  // website tempat file ini di-hosting.
  urlAR: "",

  // Promo di akhir presentasi (kosongkan judul "" kalau tidak mau ada promo)
  promo: { judul: "Diskon 15% service pertama", kode: "KARTU15" },  // ✏️ GANTI

  // ---------- COMPANY PROFILE ----------
  tahunBerdiri: 2015,                      // ✏️ GANTI

  sejarah: [                               // ✏️ GANTI semua
    { tahun: "2015", teks: "Berdiri — 1 teknisi, 1 motor, 1 set alat" },
    { tahun: "2018", teks: "Mulai pegang kontrak maintenance kantor" },
    { tahun: "2021", teks: "Masuk proyek komersial: ruko, klinik, sekolah" },
    { tahun: "2024", teks: "Tim teknisi tetap, 1.000+ unit dirawat per tahun" },
  ],

  layanan: [
    { ikon: "rumah", judul: "Residential", teks: "Rumah & apartemen" },
    { ikon: "gedung", judul: "Commercial", teks: "Kantor, toko, resto, hotel" },
    { ikon: "kontrak", judul: "Maintenance", teks: "Kontrak berkala, terjadwal" },
    { ikon: "tameng", judul: "Preventive Maintenance", teks: "Cegah rusak sebelum terjadi" },
    { ikon: "perbaikan", judul: "Troubleshooting", teks: "Tidak dingin, bocor, berisik" },
    { ikon: "pasang", judul: "Installation", teks: "Pasang baru & bongkar pasang" },
  ],

  proyek: [                                // ✏️ GANTI dengan proyek asli
    { judul: "Maintenance 40 unit AC", detail: "Kantor 4 lantai — kontrak tahunan" },
    { judul: "Instalasi 12 unit split", detail: "Restoran & dapur komersial" },
    { judul: "Overhaul AC cassette", detail: "Klinik kesehatan" },
  ],

  // Klien yang BOLEH ditampilkan. Bisa teks saja, atau { nama, logo: "foto/logo-x.png" }
  klien: [                                 // ✏️ GANTI dengan klien asli
    "PT Klien Satu", "Bank Contoh", "Klinik Sehat", "Hotel Nusantara",
    "Kafe Kopi Kita", "Sekolah Harapan",
  ],

  // Foto before/after. Taruh foto di folder foto/ lalu isi path-nya.
  // Kosong = tampil ilustrasi.
  beforeAfter: [                           // ✏️ isi dengan foto asli Anda
    // { before: "foto/before-1.jpg", after: "foto/after-1.jpg", caption: "Evaporator AC kantor, 2 tahun tidak dicuci" },
  ],

  testimoni: [                             // ✏️ GANTI dengan testimoni asli (dengan izin)
    { nama: "Bu Rina", peran: "Pemilik kafe", teks: "Teknisinya rapi, kirim foto sebelum-sesudah. AC kafe sekarang dingin lagi." },
    { nama: "Pak Andi", peran: "Office manager", teks: "Sudah 3 tahun kontrak maintenance, belum pernah ada AC mati pas jam kerja." },
  ],

  // Kenapa Rejeki Utama AC? (ikon: shield, pro, tools, gear, clock, smile, bolt, drop)
  keunggulan: [                            // ✏️ sesuaikan dengan janji yang benar-benar Anda berikan
    { ikon: "shield", judul: "Berpengalaman", teks: "Menangani beragam kebutuhan AC" },
    { ikon: "pro", judul: "Tim Profesional", teks: "Teknisi terlatih & berpengalaman" },
    { ikon: "tools", judul: "Pengerjaan Rapi", teks: "Standar kerja bersih, aman & efisien" },
    { ikon: "gear", judul: "Solusi Tepat", teks: "Analisa masalah, solusi yang pas" },
    { ikon: "clock", judul: "Respons Cepat", teks: "Siap membantu sesuai kebutuhan" },
    { ikon: "smile", judul: "Fokus Kepuasan", teks: "Kepuasan pelanggan prioritas kami" },
  ],

  tim: { jumlah: "Tim teknisi tetap", foto: "" },  // ✏️ foto: "foto/tim.jpg" kalau ada
  standar: [                               // ✏️ sesuaikan dengan SOP yang benar-benar Anda jalankan
    "Teknisi berseragam & membawa ID",
    "Lantai & furnitur ditutup sebelum kerja",
    "Cek tekanan freon & kebocoran",
    "Foto sebelum & sesudah dikirim ke WA",
    "Area kerja dibersihkan kembali",
    "Garansi pekerjaan 30 hari",
  ],
};
