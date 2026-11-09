// Parser rekam medis rumah sakit (CONTRACT.md 7.10.2).
// Murni, deterministik, tanpa DOM. Modul ini HANYA menyalin teks yang tertulis
// pada dokumen menjadi DRAF; tidak menambah diagnosis, tidak menafsirkan hasil,
// dan tidak pernah menyimpan apa pun ke state.

import {
  DISCLAIMERS,
  MAX_OCR_TEXT_CHARS,
  PARSER_REKAM_VERSION
} from '../model.js';
import { isValidDateISO, todayISO } from './dates.js';
import { parseHasilLab } from './labParse.js';

export { PARSER_REKAM_VERSION };

export const PERINGATAN_REKAM = [
  'Hasil ini hanya menyalin teks dokumen, bukan diagnosis atau interpretasi.',
  'Periksa tanggal, nama obat/lab, dan angka dengan dokumen asli.'
];

const BULAN = {
  januari: 1, january: 1, jan: 1,
  februari: 2, february: 2, feb: 2, pebruari: 2,
  maret: 3, march: 3, mar: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, june: 6, jun: 6,
  juli: 7, july: 7, jul: 7,
  agustus: 8, august: 8, agu: 8, agt: 8, aug: 8,
  september: 9, sept: 9, sep: 9,
  oktober: 10, october: 10, okt: 10, oct: 10,
  november: 11, nov: 11,
  desember: 12, december: 12, des: 12, dec: 12
};
const BULAN_POLA = Object.keys(BULAN)
  .sort((a, b) => b.length - a.length)
  .join('|');

// Label yang menandai akhir blok hasil laboratorium.
const LABEL_SEKSI_LAIN = /^\s*(?:catatan|kesimpulan|saran|rencana|terapi|resep|obat|tindakan|diagnosa|diagnosis|dx|keluhan|anamnesis|dokter|dpjp|no\.?\s*(?:rm|rekam\s*medis)|nomor\s*(?:rm|rekam\s*medis)|mrn|tanggal|tgl)\b/i;

// Baris narasi/identitas yang tidak boleh dianggap baris laboratorium.
const BARIS_NON_LAB = /^\s*(?:keluhan|anamnesis|diagnosa|diagnosis|dx|dokter|dpjp|pasien|nama|umur|usia|alamat|tanggal|tgl|no\.?\s*(?:rm|rekam\s*medis)|nomor\s*(?:rm|rekam\s*medis)|mrn|catatan|terapi|resep|obat|tindakan|kesimpulan|saran|rencana|kunjungan)\b/i;

const TOKEN_HEADER_LAB = new Set([
  'nama', 'hasil', 'satuan', 'rujukan', 'nilai', 'normal', 'ref', 'acuan',
  'unit', 'parameter', 'pemeriksaan', 'keterangan', 'flag', 'batas'
]);

const TANGGAL_LABEL_RE = /^\s*(?:tanggal|tgl)\.?\s*(?:pemeriksaan|kunjungan|periksa|masuk|rawat)?\s*[:\-=]?\s*(.+)$/i;
const RM_LABEL_RE = /^\s*(?:no\.?\s*(?:rm|rekam\s*medis)|nomor\s*(?:rm|rekam\s*medis)|mrn)\s*[:\-.]?\s*(.+)$/i;
const DIAGNOSIS_LABEL_RE = /^\s*(?:diagnosa|diagnosis|dx)\s*[:\-.]\s*(.+)$/i;
const KELUHAN_LABEL_RE = /^\s*(?:keluhan|anamnesis)\s*[:\-.]\s*(.+)$/i;
const DOKTER_LABEL_RE = /^\s*(?:dokter(?:\s+penanggung\s+jawab)?|dpjp)\s*[:\-.]\s*(.+)$/i;
const DOKTER_LINE_RE = /^\s*dr\.?\s+(.+)$/i;
const FASKES_LABEL_RE = /^\s*(?:faskes|fasilitas(?:\s+kesehatan)?|rumah\s+sakit|rs\.?|klinik|puskesmas|lab(?:oratorium)?)\s*[:\-]\s*(.+)$/i;
const FASKES_LINE_RE = /^\s*(?:rumah\s+sakit|rs(?![a-z])|klinik|puskesmas|laboratorium|lab(?![a-z]))\b/i;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function bulatkan2(nilai) {
  return Math.round(nilai * 100) / 100;
}

function batasi(nilai, min, max) {
  return Math.min(max, Math.max(min, nilai));
}

/**
 * Ambil tanggal pertama yang dikenali dari sebuah teks.
 * Mendukung `dd/mm/yyyy`, `dd-mm-yyyy`, `yyyy-mm-dd`, `9 November 2026`
 * (nama bulan Indonesia/Inggris), dan `November 9, 2026`.
 *
 * @param {string} teks
 * @returns {{iso:string, teks:string}|null}
 */
function parseTanggal(teks) {
  if (typeof teks !== 'string' || !teks.trim()) return null;
  let m = /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/.exec(teks);
  if (m) {
    const iso = `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
    if (isValidDateISO(iso)) return { iso, teks: m[0] };
  }

  m = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/.exec(teks);
  if (m) {
    // Konvensi Indonesia: dd/mm/yyyy.
    const iso = `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;
    if (isValidDateISO(iso)) return { iso, teks: m[0] };
  }

  m = new RegExp(`\\b(\\d{1,2})\\s+(${BULAN_POLA})\\.?\\s+(\\d{4})\\b`, 'i').exec(teks);
  if (m) {
    const bulan = BULAN[m[2].toLowerCase()];
    if (bulan) {
      const iso = `${m[3]}-${pad2(bulan)}-${pad2(m[1])}`;
      if (isValidDateISO(iso)) return { iso, teks: m[0] };
    }
  }

  m = new RegExp(`\\b(${BULAN_POLA})\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, 'i').exec(teks);
  if (m) {
    const bulan = BULAN[m[1].toLowerCase()];
    if (bulan) {
      const iso = `${m[3]}-${pad2(bulan)}-${pad2(m[2])}`;
      if (isValidDateISO(iso)) return { iso, teks: m[0] };
    }
  }

  return null;
}

/**
 * Kenali label blok hasil laboratorium pada satu baris.
 * `Lab: Prodia` (tanpa angka) tidak dianggap label blok, melainkan nama faskes.
 *
 * @param {string} baris
 * @returns {{inline:string}|null}
 */
function cariLabelLab(baris) {
  const berisiHasil = /^\s*(?:hasil\s*(?:pemeriksaan\s*)?(?:lab(?:oratorium)?|laboratorium)|pemeriksaan\s+(?:lab(?:oratorium)?|laboratorium))\s*[:\-]?\s*(.*)$/i.exec(baris);
  if (berisiHasil) return { inline: berisiHasil[1].trim() };

  const polos = /^\s*(?:lab(?:oratorium)?|laboratorium)\s*[:\-]?\s*$/i.exec(baris);
  if (polos) return { inline: '' };

  const berlabel = /^\s*(?:lab(?:oratorium)?|laboratorium)\s*[:\-]\s*(.*)$/i.exec(baris);
  if (berlabel && /\d/.test(berlabel[1])) return { inline: berlabel[1].trim() };

  return null;
}

function terlihatHeaderLab(baris) {
  const token = String(baris)
    .toLowerCase()
    .replace(/[()[\]{}:;,\-|]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (token.length === 0) return false;
  return token.every((t) => TOKEN_HEADER_LAB.has(t));
}

/**
 * Kenali teks rekam medis menjadi draf kunjungan + hasil lab.
 * Tidak pernah menambah diagnosis yang tidak tertulis.
 *
 * @param {string} teks
 * @param {{now?:Date}} [opsi]
 * @returns {object}
 */
export function kenaliRekamMedis(teks, { now = new Date() } = {}) {
  void now; // `now` disediakan kontrak; pengenalan teks sendiri deterministik.
  const teksAsli = typeof teks === 'string' ? teks : '';
  const lines = teksAsli.replace(/\r\n?/g, '\n').split('\n');
  const used = new Set();

  const tidakDipahami = [];
  const tambahTidakDipahami = (pesan) => {
    if (pesan && !tidakDipahami.includes(pesan)) tidakDipahami.push(pesan);
  };

  // 1) Tangkap label blok laboratorium lebih dulu agar baris itu tidak
  //    ditafsirkan sebagai faskes/dokter.
  let indeksLabelLab = -1;
  let inlineLab = '';
  for (let i = 0; i < lines.length; i += 1) {
    const label = cariLabelLab(lines[i]);
    if (label) {
      indeksLabelLab = i;
      inlineLab = label.inline;
      used.add(i);
      break;
    }
  }

  let tanggal = null;
  let tanggalTeks = '';
  let faskes = '';
  let dokter = '';
  let keluhan = '';
  let nomorRekamMedis = '';
  const diagnosisTertulis = [];

  // 2) Ekstraksi label per baris dengan prioritas tetap.
  for (let i = 0; i < lines.length; i += 1) {
    const baris = lines[i].trim();
    if (!baris || used.has(i)) continue;

    const tgl = TANGGAL_LABEL_RE.exec(baris);
    if (tgl) {
      used.add(i);
      const isi = tgl[1].trim();
      // Tanggal lahir bukan tanggal kunjungan.
      if (!/^(?:lahir|birth)\b/i.test(isi) && !tanggal) {
        const hasil = parseTanggal(isi);
        if (hasil) {
          tanggal = hasil.iso;
          tanggalTeks = hasil.teks;
        } else {
          tambahTidakDipahami(`tanggal tidak dipahami: ${isi.slice(0, 120)}`);
        }
      }
      continue;
    }

    const rm = RM_LABEL_RE.exec(baris);
    if (rm) {
      used.add(i);
      if (!nomorRekamMedis) nomorRekamMedis = rm[1].trim();
      continue;
    }

    const dx = DIAGNOSIS_LABEL_RE.exec(baris);
    if (dx) {
      used.add(i);
      for (const bagian of dx[1].split(/[;,]/)) {
        const diagnosis = bagian.trim();
        if (diagnosis && !diagnosisTertulis.includes(diagnosis)) {
          diagnosisTertulis.push(diagnosis);
        }
      }
      continue;
    }

    const kel = KELUHAN_LABEL_RE.exec(baris);
    if (kel) {
      used.add(i);
      if (!keluhan) keluhan = kel[1].trim();
      continue;
    }

    const dok = DOKTER_LABEL_RE.exec(baris);
    if (dok) {
      used.add(i);
      if (!dokter) dokter = dok[1].trim();
      continue;
    }

    const faskesLabel = FASKES_LABEL_RE.exec(baris);
    if (faskesLabel) {
      used.add(i);
      if (!faskes) faskes = faskesLabel[1].trim();
      continue;
    }

    const dokterBaris = DOKTER_LINE_RE.exec(baris);
    if (dokterBaris) {
      used.add(i);
      if (!dokter) dokter = baris;
      continue;
    }

    if (FASKES_LINE_RE.test(baris)) {
      used.add(i);
      if (!faskes) faskes = baris;
      continue;
    }
  }

  // 2b) Bila tidak ada label tanggal, cari tanggal berdiri sendiri.
  //     Baris identitas (lahir/umur/nama pasien) dilewati.
  if (!tanggal) {
    for (let i = 0; i < lines.length; i += 1) {
      const baris = lines[i].trim();
      if (!baris || used.has(i)) continue;
      if (/lahir|birth|umur|usia|nama\s+pasien/i.test(baris)) continue;
      const hasil = parseTanggal(baris);
      if (hasil) {
        tanggal = hasil.iso;
        tanggalTeks = hasil.teks;
        if (baris === hasil.teks) used.add(i);
        break;
      }
    }
  }

  // 3) Susun baris blok laboratorium.
  const barisBlok = [];
  if (indeksLabelLab >= 0) {
    if (inlineLab) barisBlok.push({ teks: inlineLab, index: indeksLabelLab });
    for (let i = indeksLabelLab + 1; i < lines.length; i += 1) {
      const baris = lines[i].trim();
      if (!baris) break;
      if (LABEL_SEKSI_LAIN.test(baris)) break;
      barisBlok.push({ teks: baris, index: i });
    }
  } else {
    for (let i = 0; i < lines.length; i += 1) {
      const baris = lines[i].trim();
      if (!baris) continue;
      barisBlok.push({ teks: baris, index: i });
    }
  }

  const hasilLab = parseHasilLab(barisBlok.map((b) => b.teks).join('\n'));

  // 4) Tandai baris yang sudah terpakai sebagai lab dan catat yang tidak dikenali.
  const barisTerpakaiLab = new Set();
  for (const item of hasilLab) {
    const posisi = barisBlok.findIndex(
      (b, idx) => b.teks === item.barisAsli && !barisTerpakaiLab.has(idx)
    );
    if (posisi >= 0) {
      barisTerpakaiLab.add(posisi);
      used.add(barisBlok[posisi].index);
    }
  }

  for (let idx = 0; idx < barisBlok.length; idx += 1) {
    const { teks: baris, index } = barisBlok[idx];
    if (barisTerpakaiLab.has(idx)) continue;

    const header = terlihatHeaderLab(baris);
    const nonLab = BARIS_NON_LAB.test(baris);
    if (header) {
      used.add(index);
      continue;
    }
    if (indeksLabelLab >= 0) {
      // Seluruh isi blok setelah label adalah bagian laboratorium.
      used.add(index);
      if (/\d/.test(baris) && baris.split(/\s+/).filter(Boolean).length >= 2) {
        tambahTidakDipahami(`baris lab tidak dipahami: ${baris.slice(0, 120)}`);
      }
      continue;
    }
    if (nonLab) continue;
    if (/\d/.test(baris) && baris.split(/\s+/).filter(Boolean).length >= 2) {
      used.add(index);
      tambahTidakDipahami(`baris lab tidak dipahami: ${baris.slice(0, 120)}`);
    }
  }

  if (indeksLabelLab >= 0 && hasilLab.length === 0) {
    tambahTidakDipahami('blok hasil lab tidak dikenali');
  }

  // 5) Catatan = baris lain yang tidak terpakai.
  const catatan = lines
    .map((baris, i) => ({ teks: baris.trim(), i }))
    .filter((x) => x.teks && !used.has(x.i))
    .map((x) => x.teks)
    .join('\n')
    .slice(0, 2000);

  // 6) Kepercayaan sesuai rumus kontrak.
  let skorDraf = 1;
  if (!tanggal) skorDraf -= 0.2;
  if (!faskes) skorDraf -= 0.15;
  if (!dokter) skorDraf -= 0.1;
  if (diagnosisTertulis.length === 0) skorDraf -= 0.15;
  skorDraf = batasi(skorDraf, 0, 1);

  const rataLab = hasilLab.length
    ? hasilLab.reduce((total, item) => total + item.kepercayaan, 0) / hasilLab.length
    : 0;

  const kepercayaan = bulatkan2(
    batasi(
      hasilLab.length ? skorDraf * 0.5 + rataLab * 0.5 : skorDraf,
      0,
      1
    )
  );

  return {
    draf: {
      tanggal,
      tanggalTeks,
      faskes,
      dokter,
      diagnosisTertulis,
      keluhan,
      catatan,
      nomorRekamMedis
    },
    hasilLab,
    bagianTidakDipahami: tidakDipahami,
    kepercayaan,
    teksAsli,
    peringatan: [DISCLAIMERS.ocr, DISCLAIMERS.rekam, ...PERINGATAN_REKAM],
    parserVersion: PARSER_REKAM_VERSION,
    isMedicalAdvice: false
  };
}

function buatSource({
  photoId = null,
  photoMime = null,
  ocrText = '',
  ocrConfidence = null,
  verifiedAt = null
} = {}) {
  const terverifikasi = Boolean(verifiedAt);
  return {
    kind: 'rekam-medis',
    photoId: photoId ?? null,
    photoMime: photoMime ?? null,
    ocrText: String(ocrText ?? '').slice(0, MAX_OCR_TEXT_CHARS),
    ocrConfidence: Number.isFinite(ocrConfidence) ? ocrConfidence : null,
    translatedText: '',
    verifiedByUser: terverifikasi,
    verifiedAt: terverifikasi ? verifiedAt : null,
    parserVersion: PARSER_REKAM_VERSION
  };
}

/**
 * Ubah draf rekam medis menjadi draf kunjungan (belum disimpan).
 *
 * @param {object} draf
 * @param {object} [opsi]
 * @returns {object} Visit draft
 */
export function rekamKeKunjungan(draf, {
  profileId = null,
  photoId = null,
  photoMime = null,
  ocrText = '',
  ocrConfidence = null,
  verifiedAt = null,
  now = new Date()
} = {}) {
  void profileId; // profil diisi pemanggil saat menyimpan; draf tidak menyimpan ID.
  const data = draf && typeof draf === 'object' ? draf : {};
  const diagnosis = Array.isArray(data.diagnosisTertulis)
    ? data.diagnosisTertulis.join(', ')
    : '';

  return {
    date: data.tanggal || todayISO(now),
    doctorName: String(data.dokter ?? ''),
    facility: String(data.faskes ?? ''),
    complaint: String(data.keluhan ?? ''),
    diagnosis,
    notes: String(data.catatan ?? ''),
    attachments: [],
    source: buatSource({ photoId, photoMime, ocrText, ocrConfidence, verifiedAt })
  };
}

/**
 * Ubah satu hasil laboratorium menjadi draf Lab (belum disimpan).
 *
 * @param {object} hasil
 * @param {object} [opsi]
 * @returns {object} Lab draft
 */
export function labKeLab(hasil, {
  profileId = null,
  date = null,
  facility = '',
  photoId = null,
  photoMime = null,
  ocrText = '',
  ocrConfidence = null,
  verifiedAt = null,
  now = new Date()
} = {}) {
  void profileId;
  const data = hasil && typeof hasil === 'object' ? hasil : {};
  const rujukan = data.rujukan && typeof data.rujukan === 'object' ? data.rujukan : null;

  return {
    date: date || todayISO(now),
    name: String(data.nama ?? ''),
    value: Number.isFinite(data.nilai) ? data.nilai : null,
    unit: String(data.satuan ?? ''),
    refLow: rujukan && Number.isFinite(rujukan.low) ? rujukan.low : null,
    refHigh: rujukan && Number.isFinite(rujukan.high) ? rujukan.high : null,
    note: '',
    facility: String(facility ?? ''),
    source: buatSource({ photoId, photoMime, ocrText, ocrConfidence, verifiedAt })
  };
}
