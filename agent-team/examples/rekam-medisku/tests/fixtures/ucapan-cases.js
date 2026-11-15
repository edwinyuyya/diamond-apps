/**
 * Korpus uji parser ucapan angka/satuan Indonesia (CONTRACT.md 8B.7.4) — t17.
 *
 * Setiap kasus:
 *   { id, jenis: 'angka'|'obat'|'vital', ucapan, harapan }
 *
 * `harapan` adalah ekspektasi parsial:
 *   - angka : `{ nilai }` untuk `ucapkanKeAngka`, `{ nilai: null }` untuk frasa
 *             ambigu, atau `{ deret: number[] }` untuk `parseDeretAngka`.
 *   - obat  : bidang `DikteObat` yang harus cocok (termasuk `resepteks`),
 *             atau `null` bila bukan dikte obat.
 *   - vital : bidang `DikteVital` yang harus cocok.
 *
 * Kunci tambahan:
 *   - `pagar`: ekspektasi `pagarKewajaranDosis` lewat `dikteKeObat`.
 *
 * Semua ucapan ditulis seperti orang berbicara (huruf kecil/besar bebas,
 * koma, dan angka digit diperbolehkan).
 */

export const UCAPAN_CASES = [
  // ---------------------------------------------------------------- angka
  { id: 'u01', jenis: 'angka', ucapan: 'nol', harapan: { nilai: 0 } },
  { id: 'u02', jenis: 'angka', ucapan: 'satu', harapan: { nilai: 1 } },
  { id: 'u03', jenis: 'angka', ucapan: 'dua', harapan: { nilai: 2 } },
  { id: 'u04', jenis: 'angka', ucapan: 'tiga', harapan: { nilai: 3 } },
  { id: 'u05', jenis: 'angka', ucapan: 'empat', harapan: { nilai: 4 } },
  { id: 'u06', jenis: 'angka', ucapan: 'lima', harapan: { nilai: 5 } },
  { id: 'u07', jenis: 'angka', ucapan: 'enam', harapan: { nilai: 6 } },
  { id: 'u08', jenis: 'angka', ucapan: 'tujuh', harapan: { nilai: 7 } },
  { id: 'u09', jenis: 'angka', ucapan: 'delapan', harapan: { nilai: 8 } },
  { id: 'u10', jenis: 'angka', ucapan: 'sembilan', harapan: { nilai: 9 } },
  { id: 'u11', jenis: 'angka', ucapan: 'sepuluh', harapan: { nilai: 10 } },
  { id: 'u12', jenis: 'angka', ucapan: 'sebelas', harapan: { nilai: 11 } },
  { id: 'u13', jenis: 'angka', ucapan: 'dua belas', harapan: { nilai: 12 } },
  { id: 'u14', jenis: 'angka', ucapan: 'sembilan belas', harapan: { nilai: 19 } },
  { id: 'u15', jenis: 'angka', ucapan: 'dua puluh', harapan: { nilai: 20 } },
  { id: 'u16', jenis: 'angka', ucapan: 'sembilan puluh', harapan: { nilai: 90 } },
  { id: 'u17', jenis: 'angka', ucapan: 'dua puluh lima', harapan: { nilai: 25 } },
  { id: 'u18', jenis: 'angka', ucapan: 'seratus', harapan: { nilai: 100 } },
  { id: 'u19', jenis: 'angka', ucapan: 'seratus empat puluh', harapan: { nilai: 140 } },
  { id: 'u20', jenis: 'angka', ucapan: 'dua ratus lima puluh', harapan: { nilai: 250 } },
  { id: 'u21', jenis: 'angka', ucapan: 'seribu', harapan: { nilai: 1000 } },
  { id: 'u22', jenis: 'angka', ucapan: 'dua ribu lima ratus', harapan: { nilai: 2500 } },
  { id: 'u23', jenis: 'angka', ucapan: 'satu koma lima', harapan: { nilai: 1.5 } },
  { id: 'u24', jenis: 'angka', ucapan: 'nol koma lima', harapan: { nilai: 0.5 } },
  { id: 'u25', jenis: 'angka', ucapan: 'dua belas koma lima', harapan: { nilai: 12.5 } },
  { id: 'u26', jenis: 'angka', ucapan: 'setengah', harapan: { nilai: 0.5 } },
  { id: 'u27', jenis: 'angka', ucapan: 'seperempat', harapan: { nilai: 0.25 } },
  { id: 'u28', jenis: 'angka', ucapan: 'dua setengah', harapan: { nilai: 2.5 } },
  { id: 'u29', jenis: 'angka', ucapan: 'satu setengah', harapan: { nilai: 1.5 } },
  { id: 'u30', jenis: 'angka', ucapan: '140', harapan: { nilai: 140 } },
  { id: 'u31', jenis: 'angka', ucapan: '12,5', harapan: { nilai: 12.5 } },
  { id: 'u32', jenis: 'angka', ucapan: '12.5', harapan: { nilai: 12.5 } },
  { id: 'u33', jenis: 'angka', ucapan: 'dua belas koma 5', harapan: { nilai: 12.5 } },
  { id: 'u34', jenis: 'angka', ucapan: 'lima ribu', harapan: { nilai: 5000 } },
  { id: 'u35', jenis: 'angka', ucapan: 'puluh', harapan: { nilai: null } },
  { id: 'u36', jenis: 'angka', ucapan: 'dua dua', harapan: { nilai: null } },
  { id: 'u37', jenis: 'angka', ucapan: 'belas', harapan: { nilai: null } },
  {
    id: 'u38',
    jenis: 'angka',
    ucapan: 'seratus empat puluh per sembilan puluh',
    harapan: { deret: [140, 90] }
  },
  {
    id: 'u39',
    jenis: 'angka',
    ucapan: 'tensi 140/90',
    harapan: { deret: [140, 90] }
  },

  // ---------------------------------------------------------------- vital
  {
    id: 'v01',
    jenis: 'vital',
    ucapan: 'tensi seratus empat puluh per sembilan puluh',
    harapan: {
      jenis: 'tension',
      values: { systolic: 140, diastolic: 90 },
      unit: 'mmHg'
    }
  },
  {
    id: 'v02',
    jenis: 'vital',
    ucapan: 'tekanan darah seratus lima puluh per sembilan puluh lima',
    harapan: {
      jenis: 'tension',
      values: { systolic: 150, diastolic: 95 },
      unit: 'mmHg'
    }
  },
  {
    id: 'v03',
    jenis: 'vital',
    ucapan: 'gula darah seratus delapan puluh',
    harapan: { jenis: 'glucose', values: { value: 180 }, unit: 'mg/dL' }
  },
  {
    id: 'v04',
    jenis: 'vital',
    ucapan: 'berat badan tujuh puluh dua koma lima kilo',
    harapan: { jenis: 'weight', values: { value: 72.5 }, unit: 'kg' }
  },
  {
    id: 'v05',
    jenis: 'vital',
    ucapan: 'suhu tiga puluh tujuh koma lima derajat',
    harapan: { jenis: 'temperature', values: { value: 37.5 }, unit: '°C' }
  },
  {
    id: 'v06',
    jenis: 'vital',
    ucapan: 'nadi delapan puluh',
    harapan: { jenis: 'pulse', values: { value: 80 }, unit: 'bpm' }
  },
  {
    id: 'v07',
    jenis: 'vital',
    ucapan: 'saturasi sembilan puluh delapan persen',
    harapan: { jenis: 'spo2', values: { value: 98 }, unit: '%' }
  },
  {
    id: 'v08',
    jenis: 'vital',
    ucapan: 'tensi 140 per 90',
    harapan: {
      jenis: 'tension',
      values: { systolic: 140, diastolic: 90 },
      unit: 'mmHg'
    }
  },
  {
    id: 'v09',
    jenis: 'vital',
    ucapan: 'tekanan darah 150/95',
    harapan: {
      jenis: 'tension',
      values: { systolic: 150, diastolic: 95 },
      unit: 'mmHg'
    }
  },

  // ----------------------------------------------------------------- obat
  {
    id: 'o01',
    jenis: 'obat',
    ucapan: 'Captopril dua belas koma lima miligram, dua kali sehari, setengah tablet, sebelum makan',
    harapan: {
      nama: 'Captopril',
      kekuatan: { nilai: 12.5, satuan: 'mg' },
      kaliSehari: 2,
      takaranPerDosis: 0.5,
      satuanTakaran: 'tablet',
      aturanMakan: 'sebelum',
      resepteks: 'Captopril 12.5 mg 2 x 0.5 tablet sebelum makan'
    }
  },
  {
    id: 'o02',
    jenis: 'obat',
    ucapan: 'Paracetamol lima ratus miligram, tiga kali sehari, satu tablet, sesudah makan',
    harapan: {
      nama: 'Paracetamol',
      kekuatan: { nilai: 500, satuan: 'mg' },
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      aturanMakan: 'sesudah',
      resepteks: 'Paracetamol 500 mg 3 x 1 tablet sesudah makan'
    }
  },
  {
    id: 'o03',
    jenis: 'obat',
    ucapan: 'Amoxicillin dua ratus lima puluh miligram, dua kali sehari, satu kapsul, sebelum makan',
    harapan: {
      nama: 'Amoxicillin',
      kekuatan: { nilai: 250, satuan: 'mg' },
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'kapsul',
      aturanMakan: 'sebelum',
      resepteks: 'Amoxicillin 250 mg 2 x 1 kapsul sebelum makan'
    }
  },
  {
    id: 'o04',
    jenis: 'obat',
    ucapan: 'Metformin lima ratus miligram, dua kali sehari, satu tablet, saat makan',
    harapan: {
      nama: 'Metformin',
      kekuatan: { nilai: 500, satuan: 'mg' },
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      aturanMakan: 'saat',
      resepteks: 'Metformin 500 mg 2 x 1 tablet saat makan'
    }
  },
  {
    id: 'o05',
    jenis: 'obat',
    ucapan: 'Vitamin D seribu mikrogram, sekali sehari, satu tablet, sesudah makan',
    harapan: {
      nama: 'Vitamin D',
      kekuatan: { nilai: 1000, satuan: 'mcg' },
      kaliSehari: 1,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      aturanMakan: 'sesudah',
      resepteks: 'Vitamin D 1000 mcg 1 x 1 tablet sesudah makan'
    }
  },
  {
    id: 'o06',
    jenis: 'obat',
    ucapan: 'Amlodipine lima miligram, sekali sehari, setengah tablet',
    harapan: {
      nama: 'Amlodipine',
      kekuatan: { nilai: 5, satuan: 'mg' },
      kaliSehari: 1,
      takaranPerDosis: 0.5,
      satuanTakaran: 'tablet',
      aturanMakan: null,
      resepteks: 'Amlodipine 5 mg 1 x 0.5 tablet'
    }
  },
  {
    id: 'o07',
    jenis: 'obat',
    ucapan: 'Salbutamol dua koma lima miligram, tiga kali sehari, satu sendok teh',
    harapan: {
      nama: 'Salbutamol',
      kekuatan: { nilai: 2.5, satuan: 'mg' },
      kaliSehari: 3,
      takaranPerDosis: 1,
      satuanTakaran: 'sendok teh',
      resepteks: 'Salbutamol 2.5 mg 3 x 1 sendok teh'
    }
  },
  {
    id: 'o08',
    jenis: 'obat',
    ucapan: 'Kalsium satu gram, dua kali sehari, dua tablet, sesudah makan',
    harapan: {
      nama: 'Kalsium',
      kekuatan: { nilai: 1, satuan: 'g' },
      kaliSehari: 2,
      takaranPerDosis: 2,
      satuanTakaran: 'tablet',
      aturanMakan: 'sesudah',
      resepteks: 'Kalsium 1 g 2 x 2 tablet sesudah makan'
    }
  },
  {
    id: 'o09',
    jenis: 'obat',
    ucapan: 'Ranitidin seratus lima puluh miligram, dua kali sehari, satu setengah tablet, sebelum makan',
    harapan: {
      nama: 'Ranitidin',
      kekuatan: { nilai: 150, satuan: 'mg' },
      kaliSehari: 2,
      takaranPerDosis: 1.5,
      satuanTakaran: 'tablet',
      aturanMakan: 'sebelum',
      resepteks: 'Ranitidin 150 mg 2 x 1.5 tablet sebelum makan'
    }
  },
  {
    id: 'o10',
    jenis: 'obat',
    ucapan: 'Furosemid empat puluh miligram, empat kali sehari, dua setengah tablet, bila perlu',
    harapan: {
      nama: 'Furosemid',
      kekuatan: { nilai: 40, satuan: 'mg' },
      kaliSehari: 4,
      takaranPerDosis: 2.5,
      satuanTakaran: 'tablet',
      aturanMakan: 'bila-perlu',
      resepteks: 'Furosemid 40 mg 4 x 2.5 tablet bila perlu',
      jadwalJam: []
    }
  },
  {
    id: 'o11',
    jenis: 'obat',
    ucapan: 'Sirup Paracetamol seratus dua puluh miligram, dua kali sehari, lima mililiter, sesudah makan',
    harapan: {
      nama: 'Sirup Paracetamol',
      kekuatan: { nilai: 120, satuan: 'mg' },
      kaliSehari: 2,
      takaranPerDosis: 5,
      satuanTakaran: 'ml',
      aturanMakan: 'sesudah',
      resepteks: 'Sirup Paracetamol 120 mg 2 x 5 ml sesudah makan'
    }
  },
  {
    id: 'o12',
    jenis: 'obat',
    ucapan: 'Tetes Mata Timolol lima miligram, dua kali sehari, satu tetes, sebelum makan',
    harapan: {
      nama: 'Tetes Mata Timolol',
      kekuatan: { nilai: 5, satuan: 'mg' },
      kaliSehari: 2,
      takaranPerDosis: 1,
      satuanTakaran: 'tetes',
      aturanMakan: 'sebelum',
      resepteks: 'Tetes Mata Timolol 5 mg 2 x 1 tetes sebelum makan'
    }
  },
  {
    id: 'o13',
    jenis: 'obat',
    ucapan: 'Paracetamol tablet',
    harapan: null
  },
  {
    id: 'o14',
    jenis: 'obat',
    ucapan: 'Captopril sepuluh miligram, tiga kali sehari, lima tablet, sebelum makan',
    harapan: {
      nama: 'Captopril',
      kekuatan: { nilai: 10, satuan: 'mg' },
      kaliSehari: 3,
      takaranPerDosis: 5,
      satuanTakaran: 'tablet',
      aturanMakan: 'sebelum',
      resepteks: 'Captopril 10 mg 3 x 5 tablet sebelum makan'
    },
    pagar: { ok: false, kode: 'TAKARAN_TIDAK_WAJAR' }
  },
  {
    id: 'o15',
    jenis: 'obat',
    ucapan: 'Paracetamol lima ratus miligram, sembilan kali sehari, satu tablet',
    harapan: {
      nama: 'Paracetamol',
      kekuatan: { nilai: 500, satuan: 'mg' },
      kaliSehari: 9,
      takaranPerDosis: 1,
      satuanTakaran: 'tablet',
      resepteks: 'Paracetamol 500 mg 9 x 1 tablet'
    },
    pagar: { ok: false, kode: 'FREKUENSI_TIDAK_WAJAR' }
  }
];
