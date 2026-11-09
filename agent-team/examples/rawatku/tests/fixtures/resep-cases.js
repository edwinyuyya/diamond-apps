/**
 * Korpus uji penerjemah resep (CONTRACT.md 7.8–7.9, 14.1) — t15.
 *
 * Setiap kasus minimal memuat:
 *   { id, teks, harapan }
 *
 * `harapan` adalah ekspektasi sebagian `ObatTerjemahan` untuk obat pertama
 * (bentuk persis CONTRACT.md 7.8.2, termasuk `teksTerjemahan` dan
 * `bagianTidakDipahami`). Kunci tambahan yang dipakai tes:
 *
 *   - `sisaObat`                  : ekspektasi obat ke-2 dan seterusnya
 *                                   (untuk resep multi-obat).
 *   - `totalObat`                 : jumlah obat yang diharapkan (default:
 *                                   jumlah `harapan` + `sisaObat`).
 *   - `kepercayaanHasil`          : ekspektasi `kenaliResep().kepercayaan`.
 *   - `bagianTidakDipahamiGlobal` : ekspektasi `kenaliResep().bagianTidakDipahami`.
 *   - `harapan: null`             : teks tidak menghasilkan obat sama sekali.
 *
 * Obat kedua dan seterusnya memakai bentuk yang sama dengan `harapan`.
 * Semua teks ditulis seperti yang muncul pada resep nyata (termasuk singkatan
 * bertitik, huruf besar, dan baris yang tidak lengkap).
 */

/** Bentuk sediaan persis BENTUK_SEDIAAN (empat bidang kontrak). */
const BENTUK = {
  tab: { kode: 'tab', label: 'tablet', satuan: 'tablet', satuanLabel: 'tablet' },
  caps: { kode: 'caps', label: 'kapsul', satuan: 'kapsul', satuanLabel: 'kapsul' },
  syr: { kode: 'syr', label: 'sirup', satuan: 'ml', satuanLabel: 'ml' },
  cth: { kode: 'cth', label: 'sendok teh', satuan: 'ml', satuanLabel: 'sendok teh' },
  gtt: { kode: 'gtt', label: 'tetes', satuan: 'tetes', satuanLabel: 'tetes' },
  supp: { kode: 'supp', label: 'supositoria', satuan: 'supositoria', satuanLabel: 'supositoria' },
  ung: { kode: 'ung', label: 'salep', satuan: 'salep', satuanLabel: 'salep' },
  inj: { kode: 'inj', label: 'suntikan', satuan: 'suntikan', satuanLabel: 'suntikan' }
};

/** Kekuatan: { nilai, satuan, teks }. */
const k = (nilai, satuan, teks) => ({ nilai, satuan, teks });

/** Jumlah total: { jumlah, satuan }. */
const jml = (jumlah, satuan) => ({ jumlah, satuan });

/**
 * Nilai netral semua bidang `ObatTerjemahan` yang diuji. `teksAsli` sengaja
 * tidak diberi default agar tes hanya membandingkannya saat eksplisit diuji.
 */
const DASAR = {
  nama: null,
  kekuatan: null,
  bentukSediaan: null,
  kaliSehari: null,
  takaranPerDosis: null,
  satuanTakaran: null,
  waktuMinum: [],
  aturanMakan: null,
  durasiHari: null,
  jumlahTotal: null,
  jadwalJam: [],
  polaHarian: null,
  teksTerjemahan: null,
  kepercayaan: null,
  bagianTidakDipahami: []
};

/** Susun ekspektasi ObatTerjemahan dengan nilai netral untuk bidang lain. */
const o = (bidang) => ({ ...DASAR, ...bidang });

const JADWAL_3X = ['07:00', '13:00', '19:00'];
const JADWAL_2X = ['07:00', '19:00'];
const PAGI_SIANG_MALAM = ['pagi', 'siang', 'malam'];
const PAGI_MALAM = ['pagi', 'malam'];

export const RESEP_CASES = [
  // -----------------------------------------------------------------------
  // Pola frekuensi wajib: 3 dd 1, 3x1, 3 x 1 tab, S 3 dd tab I,
  // S.2.d.d.C.I, 1-0-1.
  // -----------------------------------------------------------------------
  {
    id: 'r01',
    teks: 'Amlodipin 5 mg 3 dd 1 tab pc selama 5 hari',
    harapan: o({
      nama: 'Amlodipin',
      kekuatan: k(5, 'mg', '5 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      aturanMakan: 'sesudah',
      durasiHari: 5,
      jumlahTotal: jml(15, 'tablet'),
      jadwalJam: JADWAL_3X,
      teksAsli: 'Amlodipin 5 mg 3 dd 1 tab pc selama 5 hari',
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, sesudah makan, selama 5 hari',
      kepercayaan: 1
    })
  },
  {
    id: 'r02',
    teks: 'Paracetamol 500 mg 3x1 tab',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r03',
    teks: 'Metformin 500 mg 3 x 1 tab sesudah makan',
    harapan: o({
      nama: 'Metformin',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      aturanMakan: 'sesudah',
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, sesudah makan',
      kepercayaan: 1
    })
  },
  {
    id: 'r04',
    teks: 'Amoxicillin 500 mg S 3 dd tab I selama 5 hari',
    harapan: o({
      nama: 'Amoxicillin',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      durasiHari: 5,
      jumlahTotal: jml(15, 'tablet'),
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, selama 5 hari',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r05',
    teks: 'Cefadroxil 500 mg S.2.d.d.C.I',
    harapan: o({
      nama: 'Cefadroxil',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.caps,
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'kapsul',
      waktuMinum: PAGI_MALAM,
      jadwalJam: JADWAL_2X,
      teksTerjemahan: 'Diminum 2 kali sehari, 1 kapsul',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r06',
    teks: 'Metformin 500 mg 1-0-1',
    harapan: o({
      nama: 'Metformin',
      kekuatan: k(500, 'mg', '500 mg'),
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_MALAM,
      jadwalJam: JADWAL_2X,
      polaHarian: [1, 0, 1],
      teksTerjemahan: 'Diminum 2 kali sehari, 1 tablet',
      kepercayaan: 0.8
    })
  },

  // -----------------------------------------------------------------------
  // Aturan makan & waktu: p.c./pc, a.c., d.c., h.s., prn, k.p., mane, nocte.
  // -----------------------------------------------------------------------
  {
    id: 'r07',
    teks: 'Ranitidin 150 mg 2 dd 1 tab p.c.',
    harapan: o({
      nama: 'Ranitidin',
      kekuatan: k(150, 'mg', '150 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_MALAM,
      aturanMakan: 'sesudah',
      jadwalJam: JADWAL_2X,
      teksTerjemahan: 'Diminum 2 kali sehari, 1 tablet, sesudah makan',
      kepercayaan: 1
    })
  },
  {
    id: 'r08',
    teks: 'Omeprazol 20 mg 1 dd 1 caps a.c.',
    harapan: o({
      nama: 'Omeprazol',
      kekuatan: k(20, 'mg', '20 mg'),
      bentukSediaan: BENTUK.caps,
      kaliSehari: 1,
      takaranPerDosis: 1,
      satuanTakaran: 'kapsul',
      waktuMinum: ['pagi'],
      aturanMakan: 'sebelum',
      jadwalJam: ['07:00'],
      teksTerjemahan: 'Diminum 1 kali sehari, 1 kapsul, sebelum makan',
      kepercayaan: 1
    })
  },
  {
    id: 'r09',
    teks: 'Dexamethasone 0.5 mg 3 dd 1 tab d.c.',
    harapan: o({
      nama: 'Dexamethasone',
      kekuatan: k(0.5, 'mg', '0.5 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      aturanMakan: 'saat',
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, saat makan',
      kepercayaan: 1
    })
  },
  {
    id: 'r10',
    teks: 'Alprazolam 0.5 mg 1 dd 1 tab h.s.',
    harapan: o({
      nama: 'Alprazolam',
      kekuatan: k(0.5, 'mg', '0.5 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 1,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: ['sebelum-tidur'],
      jadwalJam: ['07:00'],
      teksTerjemahan: 'Diminum 1 kali sehari, 1 tablet',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r11',
    teks: 'Paracetamol 500 mg 3 dd 1 tab prn',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      aturanMakan: 'bila-perlu',
      jadwalJam: [],
      teksTerjemahan: 'Diminum bila perlu, 1 tablet',
      kepercayaan: 1
    })
  },
  {
    id: 'r12',
    teks: 'Salbutamol 2 mg 3 dd 1 tab k.p.',
    harapan: o({
      nama: 'Salbutamol',
      kekuatan: k(2, 'mg', '2 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      aturanMakan: 'bila-perlu',
      jadwalJam: [],
      teksTerjemahan: 'Diminum bila perlu, 1 tablet',
      kepercayaan: 1
    })
  },
  {
    id: 'r13',
    teks: 'Metformin 500 mg 1 dd 1 tab mane',
    harapan: o({
      nama: 'Metformin',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 1,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: ['pagi'],
      jadwalJam: ['07:00'],
      teksTerjemahan: 'Diminum 1 kali sehari, 1 tablet',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r14',
    teks: 'Simvastatin 20 mg 1 dd 1 tab nocte',
    harapan: o({
      nama: 'Simvastatin',
      kekuatan: k(20, 'mg', '20 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 1,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: ['malam'],
      jadwalJam: ['07:00'],
      teksTerjemahan: 'Diminum 1 kali sehari, 1 tablet',
      kepercayaan: 0.95
    })
  },

  // -----------------------------------------------------------------------
  // Durasi & jumlah: selama 5 hari, x 7 hari, No. 10, No. X, #20, #X.
  // -----------------------------------------------------------------------
  {
    id: 'r15',
    teks: 'Paracetamol 500 mg 3 dd 1 tab selama 5 hari',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      durasiHari: 5,
      jumlahTotal: jml(15, 'tablet'),
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, selama 5 hari',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r16',
    teks: 'Amoxicillin 500 mg 3 dd 1 caps x 7 hari',
    harapan: o({
      nama: 'Amoxicillin',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.caps,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'kapsul',
      waktuMinum: PAGI_SIANG_MALAM,
      durasiHari: 7,
      jumlahTotal: jml(21, 'kapsul'),
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 kapsul, selama 7 hari',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r17',
    teks: 'Vitamin C 500 mg 1 dd 1 tab No. 10',
    harapan: o({
      nama: 'Vitamin C',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 1,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: ['pagi'],
      jumlahTotal: jml(10, 'tablet'),
      jadwalJam: ['07:00'],
      teksTerjemahan: 'Diminum 1 kali sehari, 1 tablet',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r18',
    teks: 'Paracetamol 500 mg 3 dd 1 tab #20',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      jumlahTotal: jml(20, 'tablet'),
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r19',
    teks: 'Cefixime 100 mg 2 dd 1 caps No. X',
    harapan: o({
      nama: 'Cefixime',
      kekuatan: k(100, 'mg', '100 mg'),
      bentukSediaan: BENTUK.caps,
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'kapsul',
      waktuMinum: PAGI_MALAM,
      jumlahTotal: jml(10, 'kapsul'),
      jadwalJam: JADWAL_2X,
      teksTerjemahan: 'Diminum 2 kali sehari, 1 kapsul',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r20',
    teks: 'Paracetamol 500 mg 3 dd 1 tab #X',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      jumlahTotal: jml(10, 'tablet'),
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet',
      kepercayaan: 0.95
    })
  },

  // -----------------------------------------------------------------------
  // Bentuk sediaan: tab, caps, syr, cth, gtt, supp, ung, inj.
  // -----------------------------------------------------------------------
  {
    id: 'r21',
    teks: 'Amoxicillin syr 125 mg 3 dd 1',
    harapan: o({
      nama: 'Amoxicillin',
      kekuatan: k(125, 'mg', '125 mg'),
      bentukSediaan: BENTUK.syr,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'ml',
      waktuMinum: PAGI_SIANG_MALAM,
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 ml',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r22',
    teks: 'OBH syr 3 dd 1 cth pc',
    harapan: o({
      nama: 'OBH',
      bentukSediaan: BENTUK.cth,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'ml',
      waktuMinum: PAGI_SIANG_MALAM,
      aturanMakan: 'sesudah',
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 sendok teh (5 ml), sesudah makan',
      kepercayaan: 1
    })
  },
  {
    id: 'r23',
    teks: 'Paracetamol gtt 3 dd 3 gtt',
    harapan: o({
      nama: 'Paracetamol',
      bentukSediaan: BENTUK.gtt,
      kaliSehari: 3,
      takaranPerDosis: 3,
      satuanTakaran: 'tetes',
      waktuMinum: PAGI_SIANG_MALAM,
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 3 tetes',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r24',
    teks: 'Dexamethasone 0.5 mg 3 dd 1 supp',
    harapan: o({
      nama: 'Dexamethasone',
      kekuatan: k(0.5, 'mg', '0.5 mg'),
      bentukSediaan: BENTUK.supp,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'supositoria',
      waktuMinum: PAGI_SIANG_MALAM,
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 supositoria',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r25',
    teks: 'Hydrocortisone 2 % 2 dd 1 ung',
    harapan: o({
      nama: 'Hydrocortisone',
      kekuatan: k(2, '%', '2 %'),
      bentukSediaan: BENTUK.ung,
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'salep',
      waktuMinum: PAGI_MALAM,
      jadwalJam: JADWAL_2X,
      teksTerjemahan: 'Diminum 2 kali sehari, 1 salep',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r26',
    teks: 'Cefotaxime 1 g 2 dd 1 inj',
    harapan: o({
      nama: 'Cefotaxime',
      kekuatan: k(1, 'g', '1 g'),
      bentukSediaan: BENTUK.inj,
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'suntikan',
      waktuMinum: PAGI_MALAM,
      jadwalJam: JADWAL_2X,
      teksTerjemahan: 'Diminum 2 kali sehari, 1 suntikan',
      kepercayaan: 0.95
    })
  },

  // -----------------------------------------------------------------------
  // Satuan kekuatan: mg, mcg, µg/ug, g, ml, %.
  // -----------------------------------------------------------------------
  {
    id: 'r27',
    teks: 'Vitamin D 1000 mcg 1 dd 1 tab',
    harapan: o({
      nama: 'Vitamin D',
      kekuatan: k(1000, 'mcg', '1000 mcg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 1,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: ['pagi'],
      jadwalJam: ['07:00'],
      teksTerjemahan: 'Diminum 1 kali sehari, 1 tablet',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r28',
    teks: 'Folic acid 400 ug 1 dd 1 tab',
    harapan: o({
      nama: 'Folic acid',
      kekuatan: k(400, 'mcg', '400 mcg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 1,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: ['pagi'],
      jadwalJam: ['07:00'],
      teksTerjemahan: 'Diminum 1 kali sehari, 1 tablet',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r29',
    teks: 'Paracetamol 100 ml 1 dd 1',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(100, 'ml', '100 ml'),
      kaliSehari: 1,
      takaranPerDosis: 1,
      waktuMinum: ['pagi'],
      jadwalJam: ['07:00'],
      teksTerjemahan: 'Diminum 1 kali sehari',
      kepercayaan: 0.8
    })
  },

  // -----------------------------------------------------------------------
  // Frekuensi verbal, durasi panjang, dan catatan kotor.
  // -----------------------------------------------------------------------
  {
    id: 'r30',
    teks: 'Paracetamol 500 mg 3 kali sehari',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(500, 'mg', '500 mg'),
      kaliSehari: 3,
      takaranPerDosis: 1,
      waktuMinum: PAGI_SIANG_MALAM,
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari',
      kepercayaan: 0.8
    })
  },
  {
    id: 'r31',
    teks: 'Metformin 500 mg 3 dd 1 tab sesudah makan selama 30 hari',
    harapan: o({
      nama: 'Metformin',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      aturanMakan: 'sesudah',
      durasiHari: 30,
      jumlahTotal: jml(90, 'tablet'),
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, sesudah makan, selama 30 hari',
      kepercayaan: 1
    })
  },
  {
    id: 'r32',
    teks: 'Paracetamol 500 mg 2 dd 1 tab selama 1 minggu',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_MALAM,
      jadwalJam: JADWAL_2X,
      teksTerjemahan: 'Diminum 2 kali sehari, 1 tablet',
      kepercayaan: 0.85,
      bagianTidakDipahami: ['selama 1 minggu']
    })
  },
  {
    id: 'r33',
    teks: 'Paracetamol 500 mg 3 dd',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(500, 'mg', '500 mg'),
      kaliSehari: 3,
      takaranPerDosis: 1,
      waktuMinum: PAGI_SIANG_MALAM,
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari',
      kepercayaan: 0.7,
      bagianTidakDipahami: ['takaran tidak tertulis; default 1']
    })
  },
  {
    id: 'r34',
    teks: 'Metformin 500 mg 1-0-2',
    harapan: o({
      nama: 'Metformin',
      kekuatan: k(500, 'mg', '500 mg'),
      kaliSehari: 2,
      takaranPerDosis: 2,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_MALAM,
      jadwalJam: JADWAL_2X,
      polaHarian: [1, 0, 2],
      teksTerjemahan: 'Diminum 2 kali sehari, 2 tablet',
      kepercayaan: 0.7,
      bagianTidakDipahami: ['pola dosis tidak seragam: 1-0-2']
    })
  },
  {
    id: 'r35',
    teks: 'Paracetamol 500 mg',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(500, 'mg', '500 mg'),
      teksTerjemahan: 'Aturan minum belum dikenali; cocokkan dengan apoteker atau dokter.',
      kepercayaan: 0.3,
      bagianTidakDipahami: ['frekuensi tidak dikenali']
    })
  },
  {
    id: 'r36',
    teks: 'Obat rahasia tanpa dosis',
    harapan: o({
      nama: 'Obat rahasia tanpa dosis',
      teksTerjemahan: 'Aturan minum belum dikenali; cocokkan dengan apoteker atau dokter.',
      kepercayaan: 0.3,
      bagianTidakDipahami: ['frekuensi tidak dikenali']
    })
  },
  {
    id: 'r37',
    teks: 'tablet',
    harapan: o({
      nama: 'Obat 1',
      bentukSediaan: BENTUK.tab,
      satuanTakaran: 'tablet',
      teksTerjemahan: 'Aturan minum belum dikenali; cocokkan dengan apoteker atau dokter.',
      kepercayaan: 0.35,
      bagianTidakDipahami: ['nama obat tidak dikenali', 'frekuensi tidak dikenali']
    })
  },
  {
    id: 'r38',
    teks: '3 dd 1 tab pc',
    harapan: o({
      nama: 'Obat 1',
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      aturanMakan: 'sesudah',
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, sesudah makan',
      kepercayaan: 0.9,
      bagianTidakDipahami: ['nama obat tidak dikenali']
    })
  },

  // -----------------------------------------------------------------------
  // Pola wajib tanpa nama obat (masih harus diterjemahkan + ditandai).
  // -----------------------------------------------------------------------
  {
    id: 'r39',
    teks: '3x1',
    harapan: o({
      nama: 'Obat 1',
      kaliSehari: 3,
      takaranPerDosis: 1,
      waktuMinum: PAGI_SIANG_MALAM,
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari',
      kepercayaan: 0.7,
      bagianTidakDipahami: ['nama obat tidak dikenali']
    })
  },
  {
    id: 'r40',
    teks: 'S.2.d.d.C.I',
    harapan: o({
      nama: 'Obat 1',
      bentukSediaan: BENTUK.caps,
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'kapsul',
      waktuMinum: PAGI_MALAM,
      jadwalJam: JADWAL_2X,
      teksTerjemahan: 'Diminum 2 kali sehari, 1 kapsul',
      kepercayaan: 0.85,
      bagianTidakDipahami: ['nama obat tidak dikenali']
    })
  },
  {
    id: 'r41',
    teks: 'S 3 dd tab I',
    harapan: o({
      nama: 'Obat 1',
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet',
      kepercayaan: 0.85,
      bagianTidakDipahami: ['nama obat tidak dikenali']
    })
  },
  {
    id: 'r42',
    teks: '1-0-1',
    harapan: o({
      nama: 'Obat 1',
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_MALAM,
      jadwalJam: JADWAL_2X,
      polaHarian: [1, 0, 1],
      teksTerjemahan: 'Diminum 2 kali sehari, 1 tablet',
      kepercayaan: 0.7,
      bagianTidakDipahami: ['nama obat tidak dikenali']
    })
  },

  // -----------------------------------------------------------------------
  // Resume multi-obat dan baris lanjutan.
  // -----------------------------------------------------------------------
  {
    id: 'r43',
    teks: [
      'RESEP',
      'Nama Pasien: Budi',
      'Umur: 45 tahun',
      'Tanggal: 09/11/2026',
      'R/ Amlodipin 5 mg 3 dd 1 tab pc selama 5 hari',
      'R/ Metformin 500 mg 2 dd 1 tab ac',
      'R/ Simvastatin 20 mg 1 dd 1 tab nocte'
    ].join('\n'),
    harapan: o({
      nama: 'Amlodipin',
      kekuatan: k(5, 'mg', '5 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      aturanMakan: 'sesudah',
      durasiHari: 5,
      jumlahTotal: jml(15, 'tablet'),
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, sesudah makan, selama 5 hari',
      kepercayaan: 1
    }),
    sisaObat: [
      o({
        nama: 'Metformin',
        kekuatan: k(500, 'mg', '500 mg'),
        bentukSediaan: BENTUK.tab,
        kaliSehari: 2,
        takaranPerDosis: 1,
        satuanTakaran: 'tablet',
        waktuMinum: PAGI_MALAM,
        aturanMakan: 'sebelum',
        jadwalJam: JADWAL_2X,
        teksTerjemahan: 'Diminum 2 kali sehari, 1 tablet, sebelum makan',
        kepercayaan: 1
      }),
      o({
        nama: 'Simvastatin',
        kekuatan: k(20, 'mg', '20 mg'),
        bentukSediaan: BENTUK.tab,
        kaliSehari: 1,
        takaranPerDosis: 1,
        satuanTakaran: 'tablet',
        waktuMinum: ['malam'],
        jadwalJam: ['07:00'],
        teksTerjemahan: 'Diminum 1 kali sehari, 1 tablet',
        kepercayaan: 0.95
      })
    ],
    totalObat: 3,
    kepercayaanHasil: 0.98,
    bagianTidakDipahamiGlobal: []
  },
  {
    id: 'r44',
    teks: [
      'R/ Amlodipin 5 mg',
      'S 3 dd 1 tab pc',
      'R/ Metformin 500 mg 2 dd 1 tab'
    ].join('\n'),
    harapan: o({
      nama: 'Amlodipin',
      kekuatan: k(5, 'mg', '5 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      aturanMakan: 'sesudah',
      jadwalJam: JADWAL_3X,
      teksAsli: 'R/ Amlodipin 5 mg S 3 dd 1 tab pc',
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, sesudah makan',
      kepercayaan: 1
    }),
    sisaObat: [
      o({
        nama: 'Metformin',
        kekuatan: k(500, 'mg', '500 mg'),
        bentukSediaan: BENTUK.tab,
        kaliSehari: 2,
        takaranPerDosis: 1,
        satuanTakaran: 'tablet',
        waktuMinum: PAGI_MALAM,
        jadwalJam: JADWAL_2X,
        teksTerjemahan: 'Diminum 2 kali sehari, 1 tablet',
        kepercayaan: 0.95
      })
    ],
    totalObat: 2,
    kepercayaanHasil: 0.98,
    bagianTidakDipahamiGlobal: []
  },
  {
    id: 'r45',
    teks: [
      'Klinik Sehat',
      'Jl. Merdeka No. 10',
      'dr. Siti, SIP 123',
      'R/ Amoxicillin 500 mg S 3 dd tab I selama 5 hari',
      '#20'
    ].join('\n'),
    harapan: o({
      nama: 'Amoxicillin',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      durasiHari: 5,
      jumlahTotal: jml(20, 'tablet'),
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, selama 5 hari',
      kepercayaan: 0.95
    }),
    totalObat: 1,
    kepercayaanHasil: 0.95,
    bagianTidakDipahamiGlobal: []
  },
  {
    id: 'r46',
    teks: 'R/ Paracetamol 500 mg 3 dd 1 tab',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r47',
    teks: 'Amoxicillin 500 mg 3 dd 1 tab pc selama 5 hari, habiskan',
    harapan: o({
      nama: 'Amoxicillin',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      aturanMakan: 'sesudah',
      durasiHari: 5,
      jumlahTotal: jml(15, 'tablet'),
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet, sesudah makan, selama 5 hari',
      kepercayaan: 0.9,
      bagianTidakDipahami: ['habiskan']
    })
  },
  {
    id: 'r48',
    teks: 'Metformin 500 mg dua kali sehari',
    harapan: o({
      nama: 'Metformin',
      kekuatan: k(500, 'mg', '500 mg'),
      teksTerjemahan: 'Aturan minum belum dikenali; cocokkan dengan apoteker atau dokter.',
      kepercayaan: 0.2,
      bagianTidakDipahami: ['frekuensi tidak dikenali', 'dua kali sehari']
    })
  },
  {
    id: 'r49',
    teks: 'Paracetamol 500 mg 2 dd 1 tab prn selama 5 hari',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      aturanMakan: 'bila-perlu',
      durasiHari: 5,
      jadwalJam: [],
      teksTerjemahan: 'Diminum bila perlu, 1 tablet, selama 5 hari',
      kepercayaan: 1
    })
  },
  {
    id: 'r50',
    teks: 'Methylprednisolone 4 mg 2 dd 2 tab selama 3 hari',
    harapan: o({
      nama: 'Methylprednisolone',
      kekuatan: k(4, 'mg', '4 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 2,
      takaranPerDosis: 2,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_MALAM,
      durasiHari: 3,
      jumlahTotal: jml(12, 'tablet'),
      jadwalJam: JADWAL_2X,
      teksTerjemahan: 'Diminum 2 kali sehari, 2 tablet, selama 3 hari',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r51',
    teks: 'Amoxicillin 500 mg 2 x 3 tab',
    harapan: o({
      nama: 'Amoxicillin',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 2,
      takaranPerDosis: 3,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_MALAM,
      jadwalJam: JADWAL_2X,
      teksTerjemahan: 'Diminum 2 kali sehari, 3 tablet',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r52',
    teks: 'Paracetamol 500 mg 1 dd 2 tab No. 10 selama 5 hari',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(500, 'mg', '500 mg'),
      bentukSediaan: BENTUK.tab,
      kaliSehari: 1,
      takaranPerDosis: 2,
      satuanTakaran: 'tablet',
      waktuMinum: ['pagi'],
      durasiHari: 5,
      jumlahTotal: jml(10, 'tablet'),
      jadwalJam: ['07:00'],
      teksTerjemahan: 'Diminum 1 kali sehari, 2 tablet, selama 5 hari',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r53',
    teks: 'Bodrex 1 tablet 3 kali sehari',
    harapan: o({
      nama: 'Bodrex 1',
      bentukSediaan: BENTUK.tab,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      waktuMinum: PAGI_SIANG_MALAM,
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 tablet',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r54',
    teks: '12345',
    harapan: null,
    totalObat: 0,
    kepercayaanHasil: 0,
    bagianTidakDipahamiGlobal: []
  },
  {
    id: 'r55',
    teks: 'Ketorolac 30 mg 3 dd 1 inj selama 2 hari',
    harapan: o({
      nama: 'Ketorolac',
      kekuatan: k(30, 'mg', '30 mg'),
      bentukSediaan: BENTUK.inj,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'suntikan',
      waktuMinum: PAGI_SIANG_MALAM,
      durasiHari: 2,
      jumlahTotal: jml(6, 'suntikan'),
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 suntikan, selama 2 hari',
      kepercayaan: 0.95
    })
  },
  {
    id: 'r56',
    teks: 'Sirup Paracetamol 250 mg 3 dd 1 cth',
    harapan: o({
      nama: 'Paracetamol',
      kekuatan: k(250, 'mg', '250 mg'),
      bentukSediaan: BENTUK.cth,
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'ml',
      waktuMinum: PAGI_SIANG_MALAM,
      jadwalJam: JADWAL_3X,
      teksTerjemahan: 'Diminum 3 kali sehari, 1 sendok teh (5 ml)',
      kepercayaan: 0.95
    })
  }
];

export default RESEP_CASES;
