/**
 * Parser dikte tanda vital Indonesia deterministik (CONTRACT.md 8B.7.3).
 *
 * Hanya membaca angka yang diucapkan. Tidak menilai normal/tinggi, tidak
 * mendiagnosis; penilaian rentang tetap tugas modul safety.
 */

import {
  normalisasiUcapan,
  parseAngkaDalamTeks,
  parseDeretAngka
} from './ucapanAngka.js';

/** Deteksi jenis; urutan penting agar `tekanan darah` tidak terbaca jenis lain. */
const JENIS = [
  { jenis: 'tension', pola: /\b(?:tekanan\s+darah|tensi)\b/ },
  { jenis: 'glucose', pola: /\b(?:gula\s+darah|glukosa|gula)\b/ },
  { jenis: 'weight', pola: /\b(?:berat\s+badan|berat)\b/ },
  { jenis: 'temperature', pola: /\b(?:suhu|temperatur)\b/ },
  { jenis: 'pulse', pola: /\b(?:nadi|denyut)\b/ },
  { jenis: 'spo2', pola: /\b(?:saturasi|spo2|oksigen)\b/ }
];

const UNIT = {
  tension: 'mmHg',
  glucose: 'mg/dL',
  weight: 'kg',
  temperature: '°C',
  pulse: 'bpm',
  spo2: '%'
};

/**
 * Urai dikte tanda vital.
 *
 * @param {string} teks
 * @returns {{
 *   jenis:'tension'|'glucose'|'weight'|'temperature'|'pulse'|'spo2',
 *   values:object, unit:string, teksAsli:string,
 *   bagianTidakDipahami:string[], peringatan:string[]
 * }|null}
 */
export function parseDikteVital(teks) {
  if (typeof teks !== 'string' || teks.trim() === '') return null;
  const norm = normalisasiUcapan(teks);
  if (norm === '') return null;

  let dikenal = null;
  for (const item of JENIS) {
    if (item.pola.test(norm)) {
      dikenal = item.jenis;
      break;
    }
  }
  if (dikenal === null) return null;

  let values = null;
  if (dikenal === 'tension') {
    const deret = parseDeretAngka(norm);
    if (deret.length < 2) return null;
    values = { systolic: deret[0], diastolic: deret[1] };
  } else {
    const angka = parseAngkaDalamTeks(norm);
    if (angka === null) return null;
    values = { value: angka.nilai };
  }

  return {
    jenis: dikenal,
    values,
    unit: UNIT[dikenal],
    teksAsli: teks.trim(),
    bagianTidakDipahami: [],
    peringatan: []
  };
}
