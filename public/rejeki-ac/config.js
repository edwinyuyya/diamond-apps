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
  subjudul: "Penjualan, Instalasi & Perawatan AC",
  tagline: "Solusi Lengkap untuk Kenyamanan & Keamanan Anda",  // dari brosur
  slogan: "Pelayanan Profesional",

  // ---------- KONTAK ----------
  nama: "Edwin",
  jabatan: "Business Development",
  telepon: "0813-2766-0660",               // tampil di kartu (dari brosur)
  whatsapp: "6281327660660",               // format 62..., tanpa + / spasi
  email: "halo@rejekiutama-ac.com",        // ✏️ GANTI
  instagram: "@rejekiutama.ac",            // ✏️ GANTI
  areaLayanan: "Jabodetabek",              // ✏️ GANTI

  // Link halaman AR (isi QR code). Kosong = otomatis pakai alamat
  // website tempat file ini di-hosting.
  urlAR: "",

  // Promo di akhir presentasi (kosongkan judul "" kalau tidak mau ada promo)
  // Kosong = tidak ditampilkan. Isi kalau memang ada promo, mis. { judul: "Diskon 15% service pertama", kode: "KARTU15" }
  promo: { judul: "", kode: "" },

  // ---------- COMPANY PROFILE ----------
  tahunBerdiri: 1996,                      // "SEJAK 1996" (brosur)

  // Jaminan dari brosur — tampil di slide "Kenapa kami" & penutup
  garansi: "Kami tidak bisa memberi solusi untuk masalah Anda? Kami kembalikan uang Anda 100%.",

  // Segmen pelanggan (brosur: "Layanan profesional untuk semua kebutuhan")
  segmen: ["Rumah Tinggal", "Gedung", "Hotel", "Rumah Sakit", "Kantor", "Pabrik", "Kampus", "Instansi Pemerintah", "BUMN / BUMD", "Perusahaan"],

  // Perjalanan. Tambahkan tahun-tahun penting lain bila ada (mis. { tahun: "2010", teks: "..." }).
  sejarah: [
    { tahun: "1996", teks: "Berdiri — penjualan, instalasi & perawatan AC" },
    { tahun: "Berkembang", teks: "Melayani rumah, gedung, hotel, rumah sakit, pabrik hingga BUMN/BUMD" },
    { tahun: "Kini", teks: "7 layanan: AC, CCTV, APAR, solar water heater, water torn, jet cleaner & pembersihan hunian" },
  ],

  layanan: [
    { ikon: "jual", judul: "Penjualan Unit AC", teks: "Berbagai merek, harga kompetitif, garansi resmi" },
    { ikon: "pasang", judul: "Instalasi", teks: "Pasang baru & bongkar pasang" },
    { ikon: "kontrak", judul: "Perawatan Rutin", teks: "Performa optimal, hemat listrik, udara lebih sehat" },
    { ikon: "tameng", judul: "Preventive Maintenance", teks: "Cegah rusak sebelum terjadi" },
    { ikon: "perbaikan", judul: "Troubleshooting", teks: "Tidak dingin, bocor, berisik" },
    { ikon: "gedung", judul: "Rumah & Gedung", teks: "Rumah tinggal, kantor, hotel, pabrik" },
  ],

  // Layanan lain di luar AC (slide "Bukan cuma AC" + pita layanan di kartu depan).
  // ikon: cctv, apar, solar, toren, jet, hunian. "pita" = teks singkat di kartu.
  layananLain: [
    { ikon: "cctv", pita: "CCTV", judul: "CCTV", teks: "Paket CCTV lengkap & perbaikan untuk rumah, kantor, gedung & area bisnis" },
    { ikon: "apar", pita: "APAR", judul: "Tabung APAR", teks: "Penjualan & perawatan / isi ulang alat pemadam api" },
    { ikon: "solar", pita: "SOLAR WATER HEATER", judul: "Solar Water Heater", teks: "Perawatan rutin agar pemanas air bekerja maksimal, efisien & awet" },
    { ikon: "toren", pita: "WATER TORN", judul: "Pembersihan Water Torn", teks: "Bersihkan toren agar air bersih, sehat & bebas endapan kotoran" },
    { ikon: "jet", pita: "JET CLEANER", judul: "High Pressure Jet Cleaner", teks: "Tekanan tinggi untuk lantai, paving, dinding & area industri" },
    { ikon: "hunian", pita: "PEMBERSIHAN HUNIAN KOSONG", judul: "Pembersihan Hunian Kosong", teks: "Rumput liar, sampah & debu dibersihkan — rapi & siap digunakan" },
  ],

  // Proyek, nama klien & testimoni ASLI (dengan izin). Kosong = slide/bagiannya disembunyikan.
  // Contoh: proyek: [{ judul: "Maintenance 40 unit AC", detail: "Kantor 4 lantai" }]
  proyek: [],

  // Klien yang BOLEH ditampilkan. Bisa teks saja, atau { nama, logo: "foto/logo-x.png" }
  // klien: ["PT ...", { nama: "Hotel ...", logo: "foto/logo-hotel.png" }]
  klien: [],

  // Foto before/after. Taruh foto di folder foto/ lalu isi path-nya.
  // Kosong = tampil ilustrasi.
  beforeAfter: [                           // ✏️ isi dengan foto asli Anda
    // { before: "foto/before-1.jpg", after: "foto/after-1.jpg", caption: "Evaporator AC kantor, 2 tahun tidak dicuci" },
  ],

  // testimoni: [{ nama: "Bu ...", peran: "Pemilik kafe", teks: "..." }]
  testimoni: [],

  // Kenapa Rejeki Utama AC? (ikon: shield, pro, tools, gear, clock, smile, bolt, drop)
  keunggulan: [                            // dari brosur (ikon: shield, gear, clock, tag, pro, tools, smile)
    { ikon: "pro", judul: "Teknisi Berpengalaman", teks: "Ditangani teknisi yang paham pekerjaannya" },
    { ikon: "gear", judul: "Pekerjaan Rapi & Berkualitas", teks: "Hasil kerja bersih, rapi & tahan lama" },
    { ikon: "clock", judul: "Layanan Cepat & Tepat Waktu", teks: "Datang sesuai jadwal, kerja cepat" },
    { ikon: "tag", judul: "Harga Terbaik & Transparan", teks: "Harga jelas di depan, tanpa biaya tersembunyi" },
  ],

  tim: { jumlah: "Tim teknisi tetap", foto: "" },  // ✏️ foto: "foto/tim.jpg" kalau ada
  standar: [                               // ✏️ sesuaikan dengan SOP yang benar-benar Anda jalankan
    "Teknisi berseragam & membawa ID",
    "Lantai & furnitur ditutup sebelum kerja",
    "Cek tekanan freon & kebocoran",
    "Foto sebelum & sesudah dikirim ke WA",
    "Area kerja dibersihkan kembali",
    "Garansi uang kembali 100%",
  ],
};
