/*
 * ============================================================
 *  DATA REJEKI UTAMA AC — EDIT FILE INI SAJA
 * ============================================================
 *  Semua teks di kartu nama & presentasi AR diambil dari sini.
 *  Yang bertanda  // ✏️ GANTI  masih CONTOH — ganti dengan data asli
 *  sebelum dicetak.
 * ============================================================
 */
window.RU = {
  perusahaan: "Rejeki Utama AC",
  tagline: "Sejuk • Bersih • Hemat Listrik",
  slogan: "Udara sejuk, rejeki lancar.",

  // Kontak (tampil di kartu belakang & tombol di AR)
  nama: "Nama Anda",                       // ✏️ GANTI
  jabatan: "Owner & Kepala Teknisi",       // ✏️ GANTI
  telepon: "0812-3456-7890",               // ✏️ GANTI
  whatsapp: "6281234567890",               // ✏️ GANTI (format 62..., tanpa + / spasi)
  email: "halo@rejekiutama-ac.com",        // ✏️ GANTI
  instagram: "@rejekiutama.ac",            // ✏️ GANTI
  alamat: "Jl. Contoh No. 12, Jakarta",    // ✏️ GANTI
  areaLayanan: "Jabodetabek",              // ✏️ GANTI

  // Link halaman AR (isi QR code). Biarkan kosong = otomatis pakai
  // alamat website tempat file ini di-hosting.
  urlAR: "",

  // Promo supaya kartu disimpan, bukan dibuang
  promo: {
    judul: "Simpan kartu ini = DISKON 15%",  // ✏️ GANTI sesuai promo
    detail: "untuk service pertama. Tunjukkan kartu ke teknisi kami.",
    kode: "KARTU15",
  },

  // ---------- PRESENTASI AR ----------
  tahunBerdiri: 2015,                      // ✏️ GANTI

  // Perjalanan perusahaan (timeline)
  sejarah: [                               // ✏️ GANTI semua
    { tahun: "2015", teks: "Berdiri — mulai dari 1 motor & 1 set alat" },
    { tahun: "2018", teks: "Tim 5 teknisi, mulai pegang kontrak kantor" },
    { tahun: "2021", teks: "Melayani ruko, sekolah & klinik" },
    { tahun: "2024", teks: "1.000+ unit AC dirawat tiap tahun" },
  ],

  // Angka-angka (counter animasi)
  statistik: [                             // ✏️ GANTI
    { angka: 5000, akhiran: "+", label: "Unit AC ditangani" },
    { angka: 120, akhiran: "+", label: "Klien bisnis" },
    { angka: 98, akhiran: "%", label: "Pelanggan repeat order" },
  ],

  // Apa saja yang dikerjakan
  layanan: [
    { ikon: "cuci", judul: "Cuci & Service AC", teks: "Indoor + outdoor, pakai jet cleaner" },
    { ikon: "freon", judul: "Isi & Tambah Freon", teks: "R32 • R410A • R22, cek kebocoran" },
    { ikon: "pasang", judul: "Bongkar Pasang", teks: "Pindah unit, instalasi pipa rapi" },
    { ikon: "perbaikan", judul: "Perbaikan", teks: "AC tidak dingin, bocor air, berisik" },
    { ikon: "kontrak", judul: "Kontrak Maintenance", teks: "Kantor, ruko, gedung, pabrik" },
    { ikon: "unit", judul: "Jual Unit Baru", teks: "Semua merk, gratis survei" },
  ],

  // Perusahaan yang sudah jadi klien (nama ditampilkan sebagai logo-teks)
  klien: [                                 // ✏️ GANTI dengan klien asli
    "PT Klien Satu",
    "Bank Contoh",
    "Klinik Sehat",
    "Sekolah Harapan",
    "Hotel Nusantara",
    "Kafe Kopi Kita",
    "Ruko Sentosa",
    "Gudang Jaya",
  ],

  // Hitung-hitungan "kenapa harus rajin service" (perkiraan, sesuaikan harga Anda)
  biaya: {                                 // ✏️ GANTI dengan harga Anda
    serviceRutin: 400000,   // service 4x setahun (per unit)
    kompresorRusak: 2500000, // ganti kompresor
    borosListrik: 30,        // AC kotor bisa boros listrik hingga (%)
  },

  // Kenapa pilih Rejeki Utama AC
  // Format: [tukang lain biasanya..., Rejeki Utama AC...]
  keunggulan: [                            // ✏️ sesuaikan dengan janji yang benar-benar Anda berikan
    ["Tanpa garansi, rusak lagi bayar lagi", "Garansi 30 hari — masalah sama, datang gratis"],
    ["Cuci asal semprot, hasil tak terlihat", "Foto sebelum & sesudah dikirim ke WA Anda"],
    ["Harga \"nanti dilihat dulu\"", "Harga jelas di depan, tanpa biaya tiba-tiba"],
    ["Janji datang, tapi molor", "Jadwal pasti, teknisi berseragam & sopan"],
    ["Asal isi freon tanpa cek bocor", "Cek tekanan & kebocoran sebelum isi freon"],
  ],
};
