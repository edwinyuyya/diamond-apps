/**
 * Dikte obat Indonesia -> teks resep kanonik -> penerjemah resep yang ada
 * (CONTRACT.md 8B.7.2).
 *
 * Modul ini TIDAK menebak dosis dan TIDAK memberi saran medis. Angka yang
 * diucapkan diurai deterministik, lalu diserahkan ke `kenaliResep`/`jadwalUntukObat`
 * yang sudah ada. Pagar kewajaran wajib dipanggil sebelum UI menyimpan.
 */

import { jadwalUntukObat, kenaliResep } from './resep.js';
import {
  KATA_ANGKA,
  normalisasiUcapan,
  ucapkanKeAngka
} from './ucapanAngka.js';

import { waktuYangTertulis } from './resepKamus.js';

/** Batas wajar tablet/kapsul per dosis. */
export const PAGAR_TAKARAN_MAKS = 4;

/** Batas wajar frekuensi minum per hari. */
export const PAGAR_FREKUENSI_MAKS = 8;

const POLA_TOKEN = /[a-z]+|\d+(?:[.,]\d+)?/g;

const UNIT_KEKUATAN = [
  { pola: /\bmiligram\b/g, satuan: 'mg' },
  { pola: /\bmikrogram\b/g, satuan: 'mcg' },
  { pola: /\bmcg\b/g, satuan: 'mcg' },
  { pola: /\bµg\b/g, satuan: 'mcg' },
  { pola: /\bug\b/g, satuan: 'mcg' },
  { pola: /\bmililiter\b/g, satuan: 'ml' },
  { pola: /\bml\b/g, satuan: 'ml' },
  { pola: /\bgram\b/g, satuan: 'g' },
  { pola: /\bmg\b/g, satuan: 'mg' },
  { pola: /\bg\b/g, satuan: 'g' }
];

const UNIT_TAKARAN = [
  { pola: /\bsendok\s+teh\b/g, satuan: 'sendok teh' },
  { pola: /\bsendok\b/g, satuan: 'sendok teh' },
  { pola: /\btablet\b/g, satuan: 'tablet' },
  { pola: /\btab\b/g, satuan: 'tablet' },
  { pola: /\bkapsul\b/g, satuan: 'kapsul' },
  { pola: /\bcaps\b/g, satuan: 'kapsul' },
  { pola: /\btetes\b/g, satuan: 'tetes' },
  { pola: /\bgtt\b/g, satuan: 'tetes' },
  { pola: /\bmililiter\b/g, satuan: 'ml' },
  { pola: /\bml\b/g, satuan: 'ml' }
];

const POLA_ATURAN = [
  { pola: /\bsebelum\s+makan\b/, nilai: 'sebelum' },
  { pola: /\bsesudah\s+makan\b/, nilai: 'sesudah' },
  { pola: /\bsetelah\s+makan\b/, nilai: 'sesudah' },
  { pola: /\bsaat\s+makan\b/, nilai: 'saat' },
  { pola: /\b(?:bila|kalau|jika|apabila)\s+(?:di)?perlu(?:kan)?\b|\bseperlunya\b/, nilai: 'bila-perlu' }
];

const LABEL_ATURAN = {
  sebelum: 'sebelum makan',
  sesudah: 'sesudah makan',
  saat: 'saat makan',
  'bila-perlu': 'bila perlu'
};

/** Kata penghubung yang bukan bagian yang perlu dilaporkan. */
const KATA_UMUM = new Set([
  'kali', 'sehari', 'setiap', 'hari', 'sekali', 'per', 'dan', 'dengan',
  'obat', 'diminum', 'minum', 'makan', 'sebelum', 'sesudah', 'setelah',
  'saat', 'bila', 'perlu', 'tolong', 'catat', 'catatan', 'mohon', 'ya',
  'dong', 'untuk', 'ini', 'itu', 'saja'
]);

/** Token dengan posisi pada teks yang sudah dinormalisasi. */
function tokenisasi(teks) {
  const hasil = [];
  const re = new RegExp(POLA_TOKEN.source, 'g');
  let cocok = re.exec(teks);
  while (cocok !== null) {
    hasil.push({
      teks: cocok[0],
      norm: cocok[0].toLowerCase(),
      awal: cocok.index,
      akhir: cocok.index + cocok[0].length
    });
    if (cocok[0] === '') re.lastIndex += 1;
    cocok = re.exec(teks);
  }
  return hasil;
}

/** Kata penanda bilangan yang bukan kunci `KATA_ANGKA` (mis. `belas`). */
const KATA_BILANGAN = new Set(['koma', 'belas', 'puluh', 'ratus', 'ribu']);

/** Token yang boleh menjadi bagian frasa angka. */
function tokenAngka(norm) {
  return /^\d+(?:[.,]\d+)?$/.test(norm)
    || KATA_BILANGAN.has(norm)
    || Object.prototype.hasOwnProperty.call(KATA_ANGKA, norm);
}

/**
 * Ambil frasa angka yang tepat mendahului posisi tertentu.
 * @returns {{nilai:number, awal:number, akhir:number}|null}
 */
function ambilAngkaSebelum(teks, posisi) {
  const tokens = tokenisasi(teks).filter((token) => token.akhir <= posisi);
  if (tokens.length === 0) return null;

  const dipakai = [];
  let batas = posisi;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const token = tokens[i];
    if (!tokenAngka(token.norm)) break;
    const antara = teks.slice(token.akhir, batas);
    if (!/^[\s,.]*$/.test(antara)) break;
    dipakai.unshift(token);
    batas = token.awal;
  }
  if (dipakai.length === 0) return null;

  const frasa = dipakai.map((token) => token.norm).join(' ');
  const nilai = ucapkanKeAngka(frasa);
  if (nilai === null) return null;

  return {
    nilai,
    awal: dipakai[0].awal,
    akhir: posisi
  };
}

/** Semua kecocokan unit (dengan angka di depannya) untuk daftar pola. */
function cariUnit(teks, daftar, jenis) {
  const hasil = [];
  for (const { pola, satuan } of daftar) {
    const re = new RegExp(pola.source, 'g');
    let cocok = re.exec(teks);
    while (cocok !== null) {
      const angka = ambilAngkaSebelum(teks, cocok.index);
      if (angka !== null) {
        hasil.push({
          jenis,
          satuan,
          indeks: cocok.index,
          akhir: cocok.index + cocok[0].length,
          panjang: cocok[0].length,
          angka
        });
      }
      if (cocok[0] === '') re.lastIndex += 1;
      cocok = re.exec(teks);
    }
  }
  return hasil;
}

/** Buang kandidat unit yang tumpang tindih (pertahankan token terpanjang). */
function unitUnik(kandidat) {
  const urut = [...kandidat].sort(
    (a, b) => a.indeks - b.indeks || b.panjang - a.panjang
  );
  const hasil = [];
  for (const kandidatUnit of urut) {
    const sudahAda = hasil.some(
      (unit) => unit.indeks < kandidatUnit.akhir && kandidatUnit.indeks < unit.akhir
    );
    if (!sudahAda) hasil.push(kandidatUnit);
  }
  return hasil;
}

/** Frekuensi minum: `sekali sehari`, `dua kali sehari`, `setiap hari`. */
function cariFrekuensi(teks) {
  const setiap = /\bsetiap\s+hari\b/.exec(teks);
  if (setiap) {
    return {
      kaliSehari: 1,
      awal: setiap.index,
      akhir: setiap.index + setiap[0].length
    };
  }

  const sekali = /\bsekali\s+sehari\b/.exec(teks);
  if (sekali) {
    return {
      kaliSehari: 1,
      awal: sekali.index,
      akhir: sekali.index + sekali[0].length
    };
  }

  const kali = /\bkali\s+sehari\b/.exec(teks);
  if (kali) {
    const angka = ambilAngkaSebelum(teks, kali.index);
    return {
      kaliSehari: angka === null ? null : angka.nilai,
      awal: angka === null ? kali.index : angka.awal,
      akhir: kali.index + kali[0].length
    };
  }

  return null;
}

/** Aturan makan pertama yang tertulis. */
function cariAturan(teks) {
  let terbaik = null;
  for (const { pola, nilai } of POLA_ATURAN) {
    const cocok = pola.exec(teks);
    if (!cocok) continue;
    if (terbaik === null || cocok.index < terbaik.awal) {
      terbaik = {
        nilai,
        awal: cocok.index,
        akhir: cocok.index + cocok[0].length
      };
    }
  }
  return terbaik;
}

/** Format angka untuk teks resep: desimal titik, tanpa nol berlebih. */
function formatResep(nilai) {
  if (!Number.isFinite(nilai)) return '';
  return String(Math.round((nilai + Number.EPSILON) * 1e6) / 1e6);
}

/** Format angka seperti diucapkan: desimal koma (`12,5`). */
function formatUcapan(nilai) {
  return formatResep(nilai).replace('.', ',');
}

/** Kapitalkan awal setiap kata pada nama obat. */
function rapikanNama(nama) {
  return nama
    .split(/\s+/)
    .filter((kata) => kata !== '')
    .map((kata) => kata[0].toUpperCase() + kata.slice(1))
    .join(' ');
}

/** Susun teks resep kanonik yang dapat dibaca `kenaliResep`. */
function susunResepTeks({ nama, kekuatan, kaliSehari, takaranPerDosis, satuanTakaran, aturanMakan, waktu = null }) {
  const bagian = [];
  if (nama) bagian.push(nama);
  if (kekuatan) bagian.push(`${formatResep(kekuatan.nilai)} ${kekuatan.satuan}`);

  if (kaliSehari !== null) {
    if (takaranPerDosis !== null) {
      const satuan = satuanTakaran || 'tablet';
      bagian.push(`${formatResep(kaliSehari)} x ${formatResep(takaranPerDosis)} ${satuan}`);
    } else {
      bagian.push(`${formatResep(kaliSehari)} kali sehari`);
    }
  }

  if (aturanMakan) bagian.push(LABEL_ATURAN[aturanMakan] || aturanMakan);
  // Waktu yang benar-benar diucapkan (mis. "sebelum tidur", "pagi") ikut ke teks resep kanonik.
  if (waktu) bagian.push(waktu.replace(/ hari$/, ''));
  return bagian.join(' ');
}

/** Bagian teks yang tidak dikenali (deterministik, bukan tebakan). */
function cariBagianTidakDipahami(teks, rentang) {
  const hasil = [];
  for (const token of tokenisasi(teks)) {
    const tertutup = rentang.some(
      (bagian) => token.awal < bagian.akhir && token.akhir > bagian.awal
    );
    if (tertutup) continue;
    if (tokenAngka(token.norm)) continue;
    if (KATA_UMUM.has(token.norm)) continue;
    if (!hasil.includes(token.norm)) hasil.push(token.norm);
  }
  return hasil;
}

/**
 * Pagar kewajaran dosis (CONTRACT.md 8B.7.2). Wajib dipanggil sebelum simpan.
 *
 * @param {{takaranPerDosis?:number|null, kaliSehari?:number|null,
 *   satuanTakaran?:string|null}} [dosis]
 * @returns {{ok:boolean, kode:null|'TAKARAN_TIDAK_WAJAR'|'FREKUENSI_TIDAK_WAJAR',
 *   pesan:string}}
 */
export function pagarKewajaranDosis({
  takaranPerDosis = null,
  kaliSehari = null,
  satuanTakaran = null
} = {}) {
  const takaran = Number.isFinite(takaranPerDosis) ? takaranPerDosis : null;
  const frekuensi = Number.isFinite(kaliSehari) ? kaliSehari : null;

  const padat = satuanTakaran === null
    || satuanTakaran === 'tablet'
    || satuanTakaran === 'kapsul';

  if (padat && takaran !== null && takaran > PAGAR_TAKARAN_MAKS) {
    return {
      ok: false,
      kode: 'TAKARAN_TIDAK_WAJAR',
      pesan: `Takaran ${formatUcapan(takaran)} ${satuanTakaran || 'tablet'} per dosis `
        + `melebihi batas wajar ${PAGAR_TAKARAN_MAKS}. `
        + 'Jangan disimpan otomatis; periksa kembali dan minta Pemeriksaan Pendamping.'
    };
  }

  if (frekuensi !== null && frekuensi > PAGAR_FREKUENSI_MAKS) {
    return {
      ok: false,
      kode: 'FREKUENSI_TIDAK_WAJAR',
      pesan: `Frekuensi ${formatUcapan(frekuensi)} kali sehari melebihi batas wajar `
        + `${PAGAR_FREKUENSI_MAKS}. `
        + 'Jangan disimpan otomatis; periksa kembali dan minta Pemeriksaan Pendamping.'
    };
  }

  return { ok: true, kode: null, pesan: '' };
}

/**
 * Urai dikte obat menjadi `DikteObat` (tanpa menebak yang tidak diucapkan).
 *
 * @param {string} teks
 * @returns {object|null}
 */
export function parseDikteObat(teks) {
  if (typeof teks !== 'string' || teks.trim() === '') return null;
  const norm = normalisasiUcapan(teks);
  if (norm === '') return null;

  const frekuensi = cariFrekuensi(norm);
  const aturan = cariAturan(norm);

  let kandidatUnit = unitUnik([
    ...cariUnit(norm, UNIT_KEKUATAN, 'kekuatan'),
    ...cariUnit(norm, UNIT_TAKARAN, 'takaran')
  ]);

  let kekuatan = null;
  let takaran = null;

  for (const unit of kandidatUnit) {
    if (unit.jenis === 'kekuatan') {
      // `ml` sebelum frekuensi = kekuatan; sesudah frekuensi = takaran.
      const mlSebagaiTakaran = unit.satuan === 'ml'
        && frekuensi !== null
        && unit.indeks > frekuensi.awal;
      if (mlSebagaiTakaran) {
        if (takaran === null) takaran = unit;
        continue;
      }
      if (kekuatan !== null) continue;
      kekuatan = unit;
      continue;
    }
    if (takaran === null) takaran = unit;
  }

  // Tanpa angka sama sekali -> bukan dikte obat (jangan mengisi 0).
  if (kekuatan === null && frekuensi === null && takaran === null) return null;

  const penanda = [];
  if (kekuatan !== null) {
    penanda.push({
      awal: kekuatan.angka.awal,
      akhir: Math.max(kekuatan.angka.akhir, kekuatan.akhir)
    });
  }
  if (frekuensi !== null) penanda.push({ awal: frekuensi.awal, akhir: frekuensi.akhir });
  if (takaran !== null) {
    penanda.push({
      awal: takaran.angka.awal,
      akhir: Math.max(takaran.angka.akhir, takaran.akhir)
    });
  }
  if (aturan !== null) penanda.push({ awal: aturan.awal, akhir: aturan.akhir });

  const awalPenanda = penanda.length > 0
    ? Math.min(...penanda.map((item) => item.awal))
    : norm.length;
  const mentahNama = norm
    .slice(0, awalPenanda)
    .replace(/^[\s,.;:]+|[\s,.;:]+$/g, '');
  const nama = rapikanNama(mentahNama);

  const kaliSehari = frekuensi === null ? null : frekuensi.kaliSehari;
  const takaranPerDosis = takaran === null ? null : takaran.angka.nilai;
  const satuanTakaran = takaran === null ? null : takaran.satuan;

  const kekuatanHasil = kekuatan === null
    ? null
    : {
      nilai: kekuatan.angka.nilai,
      satuan: kekuatan.satuan,
      teks: `${formatUcapan(kekuatan.angka.nilai)} ${kekuatan.satuan}`
    };

  const aturanMakan = aturan === null ? null : aturan.nilai;
  const resepTeks = susunResepTeks({
    nama,
    kekuatan: kekuatanHasil,
    kaliSehari,
    takaranPerDosis,
    satuanTakaran,
    aturanMakan,
    waktu: waktuYangTertulis(norm)
  });

  const jadwalJam = jadwalUntukObat({
    kaliSehari,
    aturanMakan,
    polaHarian: null,
    waktuMinum: []
  });

  return {
    nama,
    kekuatan: kekuatanHasil,
    kaliSehari,
    takaranPerDosis,
    satuanTakaran,
    aturanMakan,
    jadwalJam,
    resepteks: resepTeks,
    ucapanAsli: teks.trim(),
    bagianTidakDipahami: cariBagianTidakDipahami(norm, penanda)
  };
}

/**
 * Urai dikte lalu kembalikan teks resep kanonik beserta `DikteObat`.
 *
 * @param {string} teks
 * @returns {{resepteks:string}&object|null}
 */
export function dikteKeTeksResep(teks) {
  const dikte = parseDikteObat(teks);
  if (dikte === null) return null;
  return { ...dikte, resepteks: dikte.resepteks };
}

/**
 * Urai dikte menjadi `ObatTerjemahan` lewat `kenaliResep` yang sudah ada.
 *
 * @param {string} teks
 * @param {{now?:Date, profileId?:string|null}} [options]
 * @returns {object|null}
 */
export function dikteKeObat(teks, { now = new Date(), profileId = null } = {}) {
  const dikte = parseDikteObat(teks);
  if (dikte === null) return null;

  const pagar = pagarKewajaranDosis({
    takaranPerDosis: dikte.takaranPerDosis,
    kaliSehari: dikte.kaliSehari,
    satuanTakaran: dikte.satuanTakaran
  });

  const hasilResep = kenaliResep(dikte.resepteks, { now });
  if (!Array.isArray(hasilResep.obat) || hasilResep.obat.length === 0) return null;

  const dasar = hasilResep.obat[0];
  const obat = {
    ...dasar,
    jadwalJam: jadwalUntukObat(dasar)
  };

  const peringatan = [];
  if (!pagar.ok) peringatan.push(pagar.pesan);

  void profileId; // disimpan oleh pemanggil; kontrak tidak memuatnya di obat

  return {
    obat,
    hasilResep,
    pagar,
    teksAsli: teks.trim(),
    bagianTidakDipahami: [...dikte.bagianTidakDipahami],
    peringatan,
    isMedicalAdvice: false
  };
}
