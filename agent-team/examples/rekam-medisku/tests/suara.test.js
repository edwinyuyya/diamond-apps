// Test unit/integrasi fitur suara (CONTRACT.md 8B, 14.1 t27).
//
// Tanpa jaringan, tanpa model nyata, tanpa DOM. Semua mesin suara dan TTS
// diganti fake yang deterministik; waktu tetap.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  kenaliSuara,
  createAdaptorSuara,
  SuaraError,
  MESIN_SUARA,
  DISCLAIMERS_SUARA,
  PERINGATAN_WEB_SPEECH
} from '../app/js/suara/adaptor.js';
import {
  normalisasiPengaturanSuara,
  statusPersetujuan as statusPersetujuanMesin,
  bolehPakaiWebSpeech,
  mesinAktif,
  WEB_SPEECH_CONSENT_VERSION
} from '../app/js/suara/mesin.js';
import {
  webSpeechTersedia,
  buatWebSpeechEngine,
  WEB_SPEECH_LANG
} from '../app/js/suara/webSpeech.js';
import {
  berikanPersetujuan,
  cabutPersetujuan,
  statusPersetujuan
} from '../app/js/suara/persetujuan.js';
import {
  PERTANYAAN_KONFIRMASI,
  MAKS_PERTANYAAN_ULANG,
  klasifikasiJawaban,
  buatSesiKonfirmasi,
  jawabKonfirmasi
} from '../app/js/logic/konfirmasiSuara.js';
import { jalankanKonfirmasiSuara } from '../app/js/suara/konfirmasi.js';
import {
  teksUlangObat,
  teksUlangVital,
  teksUlangMinum,
  teksUlangJadwal
} from '../app/js/suara/tts.js';
import {
  PERINTAH_NAVIGASI,
  normalisasiPerintah,
  kenaliPerintah,
  daftarBantuan,
  teksBantuan
} from '../app/js/logic/perintahNavigasi.js';
import {
  PERNYATAAN_PEMERIKSAAN,
  LABEL_BELUM_DIPERIKSA,
  defaultPemeriksaan,
  normalisasiPemeriksaan,
  tandaiBelumDiperiksa,
  tandaiSudahDiperiksa,
  butuhPemeriksaan,
  labelPemeriksaan,
  ringkasPemeriksaan
} from '../app/js/logic/pemeriksaan.js';
import { pagarKewajaranDosis } from '../app/js/logic/ucapanObat.js';

const WAKTU = new Date(2026, 10, 9, 7, 0, 0); // 9 November 2026, 07:00 lokal

function sumberModul(relatif) {
  return readFile(path.resolve(relatif), 'utf8');
}

/** Mesin suara fake dengan pencatatan panggilan. */
function fakeEngine({
  teks = 'captopril dua belas koma lima miligram dua kali sehari',
  kepercayaan = 82,
  alternatif = [],
  // eslint-disable-next-line no-unused-vars
  gagal = null,
  tunggu = null,
  panggilanStatus = true
} = {}) {
  const calls = { start: 0, stop: 0, terminate: 0, recognize: 0, bahasa: null };
  return {
    id: 'offline',
    lokal: true,
    calls,
    async start() { calls.start += 1; },
    async stop() { calls.stop += 1; },
    async terminate() { calls.terminate += 1; },
    async recognize({ bahasa, signal, onStatus } = {}) {
      calls.recognize += 1;
      calls.bahasa = bahasa;
      if (panggilanStatus && typeof onStatus === 'function') {
        onStatus({ status: 'mendengarkan', mesin: 'offline' });
      }
      if (gagal) throw gagal;
      if (tunggu !== null) await tunggu;
      if (signal && signal.aborted) {
        const error = new Error('dibatalkan');
        error.name = 'AbortError';
        throw error;
      }
      return { teks, kepercayaan, alternatif };
    }
  };
}

/** State palsu minimal untuk persetujuan. */
function fakeState(awal = { settings: {} }) {
  let data = {
    settings: JSON.parse(JSON.stringify(awal.settings || {})),
    activeProfileId: 'p1'
  };
  return {
    getState: () => data,
    async setSettings(patch) {
      data = { ...data, settings: { ...data.settings, ...patch } };
      return data;
    }
  };
}

function settingsWebSpeech(versi = WEB_SPEECH_CONSENT_VERSION) {
  return {
    suara: {
      mesin: 'web-speech',
      webSpeechPersetujuan: {
        diberikan: true,
        diberikanPada: '2026-11-09T00:00:00.000Z',
        versi
      }
    }
  };
}

/* ================================================================== */
/* Adaptor + kenaliSuara (8B.2)                                       */
/* ================================================================== */

test('kenaliSuara memakai fake engine: teks, kepercayaan 0..100 dinormalisasi, mesin benar', async () => {
  const engine = fakeEngine({ teks: '  captopril dua belas koma lima  ', kepercayaan: 82 });
  const status = [];
  const hasil = await kenaliSuara({
    mesin: 'offline',
    engineImpl: engine,
    onStatus: (info) => status.push(info.status),
    timeoutMs: 5000
  });

  assert.equal(hasil.teks, 'captopril dua belas koma lima');
  assert.equal(hasil.kepercayaan, 0.82);
  assert.equal(hasil.mesin, 'offline');
  assert.ok(Number.isFinite(hasil.durasiMs) && hasil.durasiMs >= 0);
  assert.deepEqual(hasil.alternatif, []);
  assert.ok(hasil.peringatan.includes(DISCLAIMERS_SUARA));
  assert.equal(engine.calls.start, 1);
  assert.equal(engine.calls.recognize, 1);
  assert.equal(engine.calls.stop, 1);
  assert.equal(engine.calls.terminate, 1);
  assert.equal(engine.calls.bahasa, 'id-ID');
  assert.ok(status.includes('mulai'));
  assert.ok(status.includes('berhenti'));
});

test('kenaliSuara menormalkan confidence desimal dan membatasi 3 alternatif unik', async () => {
  const engine = fakeEngine({
    teks: 'utama',
    kepercayaan: 0.55,
    alternatif: ['utama', 'satu', 'satu', 'dua', 'tiga', 'empat']
  });
  const hasil = await kenaliSuara({ engineImpl: engine, timeoutMs: 5000 });
  assert.equal(hasil.kepercayaan, 0.55);
  assert.deepEqual(hasil.alternatif, ['satu', 'dua', 'tiga']);
});

test('kepercayaan tidak tersedia -> 0 + peringatan tambahan, bukan menebak', async () => {
  const engine = fakeEngine({ kepercayaan: null });
  const hasil = await kenaliSuara({ engineImpl: engine, timeoutMs: 5000 });
  assert.equal(hasil.kepercayaan, 0);
  assert.ok(hasil.peringatan.some((teks) => /kepercayaan mesin tidak tersedia/i.test(teks)));
});

test('teks kosong/whitespace -> SUARA_KOSONG', async () => {
  const engine = fakeEngine({ teks: '   ' });
  await assert.rejects(
    kenaliSuara({ engineImpl: engine, timeoutMs: 5000 }),
    (error) => error instanceof SuaraError && error.code === 'SUARA_KOSONG'
  );
  assert.equal(engine.calls.stop, 1);
  assert.equal(engine.calls.terminate, 1);
});

test('timeoutMs habis -> SUARA_TIMEOUT dan sumber daya dilepas', async () => {
  const engine = fakeEngine({ tunggu: new Promise(() => {}) });
  await assert.rejects(
    kenaliSuara({ engineImpl: engine, timeoutMs: 25 }),
    (error) => error instanceof SuaraError && error.code === 'SUARA_TIMEOUT'
  );
  assert.equal(engine.calls.start, 1);
  assert.equal(engine.calls.terminate, 1);
});

test('signal abort -> SUARA_GAGAL, bukan hasil palsu', async () => {
  const controller = new AbortController();
  const engine = fakeEngine({
    tunggu: new Promise((resolve) => setTimeout(resolve, 200))
  });
  const janji = kenaliSuara({
    engineImpl: engine,
    signal: controller.signal,
    timeoutMs: 5000
  });
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(janji, (error) => error instanceof SuaraError && error.code === 'SUARA_GAGAL');
});

test('createAdaptorSuara menolak mesin tak dikenal; engineImpl dapat diinjeksi', async () => {
  assert.throws(
    () => createAdaptorSuara({ mesin: 'ngawur' }),
    (error) => error.code === 'MESIN_TIDAK_DIKENAL'
  );

  const engine = fakeEngine({ teks: 'halo' });
  const adaptor = createAdaptorSuara({ mesin: 'offline', engineImpl: engine });
  assert.equal(adaptor.id, 'offline');
  assert.equal(adaptor.lokal, true);
  await adaptor.mulai();
  const hasil = await adaptor.kenali();
  assert.equal(hasil.teks, 'halo');
  await adaptor.terminate();
  assert.ok(engine.calls.start >= 1);
  assert.ok(engine.calls.terminate >= 1);
});

test('adaptor tidak memuat storage/URL eksternal dan tidak memanggil jaringan', async () => {
  const sumber = await sumberModul('app/js/suara/adaptor.js');
  assert.ok(!/localStorage|sessionStorage|indexedDB/.test(sumber), 'adaptor tidak boleh menyentuh storage');
  // Abaikan komentar agar kata "fetch" di dokumentasi tidak dianggap panggilan.
  const kode = sumber
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  assert.ok(!/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(kode), 'adaptor tidak boleh memanggil jaringan');
  assert.ok(!/https?:\/\//.test(sumber), 'adaptor tidak boleh memuat URL eksternal');

  const engine = fakeEngine({ teks: 'aman' });
  const fetchAsli = globalThis.fetch;
  let dipanggil = false;
  globalThis.fetch = () => { dipanggil = true; throw new Error('jaringan dilarang'); };
  try {
    await kenaliSuara({ engineImpl: engine, timeoutMs: 5000 });
  } finally {
    globalThis.fetch = fetchAsli;
  }
  assert.equal(dipanggil, false);
});

/* ================================================================== */
/* Web Speech + persetujuan (8B.4)                                    */
/* ================================================================== */

test('Web Speech nonaktif bawaan dan tidak tersedia tanpa API peramban', () => {
  assert.equal(MESIN_SUARA['web-speech'].enabled, false);
  assert.equal(MESIN_SUARA['web-speech'].butuhPersetujuan, true);
  assert.equal(MESIN_SUARA['web-speech'].lokal, false);
  const adaApi = typeof globalThis.SpeechRecognition === 'function'
    || typeof globalThis.webkitSpeechRecognition === 'function';
  if (!adaApi) {
    assert.equal(webSpeechTersedia(), false);
    assert.equal(buatWebSpeechEngine(), null);
  }
  assert.equal(WEB_SPEECH_LANG, 'id-ID');
});

test('createAdaptorSuara web-speech tanpa persetujuan -> PERSETUJUAN_DIPERLUKAN sebelum mikrofon', async () => {
  assert.throws(
    () => createAdaptorSuara({ mesin: 'web-speech' }),
    (error) => error instanceof SuaraError && error.code === 'PERSETUJUAN_DIPERLUKAN'
  );

  const engine = fakeEngine({ teks: 'halo' });
  await assert.rejects(
    kenaliSuara({ mesin: 'web-speech', engineImpl: engine, settings: {} }),
    (error) => error.code === 'PERSETUJUAN_DIPERLUKAN'
  );
  assert.equal(engine.calls.start, 0, 'mikrofon tidak boleh diminta tanpa persetujuan');
});

test('dengan persetujuan berlaku, web-speech memakai engineImpl dan menambah peringatan pihak ketiga', async () => {
  const engine = fakeEngine({ teks: 'pemeriksaan', kepercayaan: 90 });
  const hasil = await kenaliSuara({
    mesin: 'web-speech',
    engineImpl: engine,
    settings: settingsWebSpeech(),
    timeoutMs: 5000
  });
  assert.equal(hasil.teks, 'pemeriksaan');
  assert.ok(hasil.peringatan.includes(DISCLAIMERS_SUARA));
  assert.ok(hasil.peringatan.includes(PERINGATAN_WEB_SPEECH));
  assert.equal(engine.calls.start, 1);
});

test('persetujuan versi lama tidak berlaku dan tidak pernah naik otomatis', () => {
  assert.equal(statusPersetujuanMesin(settingsWebSpeech('web-speech-v0')).berlaku, false);
  assert.equal(statusPersetujuanMesin(settingsWebSpeech()).berlaku, true);

  assert.equal(normalisasiPengaturanSuara({ suara: { mesin: 'web-speech' } }).suara.mesin, 'offline');
  assert.equal(
    normalisasiPengaturanSuara({
      suara: { mesin: 'web-speech', webSpeechPersetujuan: { diberikan: true } }
    }).suara.mesin,
    'offline'
  );
  assert.equal(
    normalisasiPengaturanSuara({
      suara: { mesin: 'web-speech', webSpeechPersetujuan: { diberikan: false, versi: WEB_SPEECH_CONSENT_VERSION } }
    }).suara.mesin,
    'offline'
  );
  assert.equal(mesinAktif({ suara: { mesin: 'web-speech' } }), 'offline');
});

test('berikanPersetujuan mencatat waktu+versi lalu cabutPersetujuan memaksa offline', async () => {
  const state = fakeState();
  const suara = await berikanPersetujuan(state, { now: WAKTU });

  assert.equal(suara.mesin, 'web-speech');
  assert.equal(suara.webSpeechPersetujuan.diberikan, true);
  assert.equal(suara.webSpeechPersetujuan.versi, WEB_SPEECH_CONSENT_VERSION);
  assert.equal(suara.webSpeechPersetujuan.diberikanPada, WAKTU.toISOString());
  assert.equal(state.getState().settings.suara.mesin, 'web-speech');

  const status = statusPersetujuan(state.getState().settings);
  assert.equal(status.diberikan, true);
  assert.equal(status.berlaku, true);

  const dicabut = await cabutPersetujuan(state, { now: WAKTU });
  assert.equal(dicabut.mesin, 'offline');
  assert.equal(dicabut.webSpeechPersetujuan.diberikan, false);
  assert.equal(dicabut.webSpeechPersetujuan.versi, null);
  assert.equal(statusPersetujuan(state.getState().settings).berlaku, false);
  assert.equal(bolehPakaiWebSpeech(state.getState().settings), false);
});

test('berikanPersetujuan dengan aktifkan:false mencatat persetujuan tanpa memaksa web-speech', async () => {
  const state = fakeState();
  const suara = await berikanPersetujuan(state, { now: WAKTU, aktifkan: false });
  assert.equal(suara.webSpeechPersetujuan.diberikan, true);
  assert.equal(suara.mesin, 'offline');
  assert.equal(statusPersetujuan(state.getState().settings).berlaku, true);
});

/* ================================================================== */
/* Konfirmasi ya/tidak (8B.6)                                         */
/* ================================================================== */

test('klasifikasiJawaban: ya/tidak/lain, cocok utuh bukan substring', () => {
  for (const teks of ['ya', 'Iya', 'benar', 'betul', 'Benar sekali.', 'ya benar', 'sudah benar', 'OK', 'oke', '“ya?”']) {
    assert.equal(klasifikasiJawaban(teks), 'ya', `"${teks}" harus ya`);
  }
  for (const teks of ['tidak', 'nggak', 'enggak', 'gak', 'bukan', 'salah', 'tidak benar', 'keliru', 'no']) {
    assert.equal(klasifikasiJawaban(teks), 'tidak', `"${teks}" harus tidak`);
  }
  for (const teks of ['', '   ', 'saya tidak yakin', 'mungkin', 'ya tidak', 'tolong ulangi', null]) {
    assert.equal(klasifikasiJawaban(teks), 'lain', `"${String(teks)}" harus lain`);
  }
});

test('jawabKonfirmasi: ya -> simpan, tidak -> ulangi-entri, tanpa mutasi objek', () => {
  const sesiAwal = buatSesiKonfirmasi({ ringkasan: 'Captopril 12,5 mg' });
  assert.equal(sesiAwal.status, 'menunggu');
  assert.equal(sesiAwal.pertanyaan, PERTANYAAN_KONFIRMASI);
  assert.equal(sesiAwal.maksUlang, MAKS_PERTANYAAN_ULANG);

  const ya = jawabKonfirmasi(sesiAwal, 'Benar sekali.');
  assert.equal(ya.aksi, 'simpan');
  assert.equal(ya.sesi.status, 'selesai-simpan');
  assert.equal(ya.sesi.jumlahTanyaUlang, 0);
  assert.equal(ya.sesi.riwayat.length, 1);
  assert.equal(sesiAwal.status, 'menunggu', 'objek asli tidak dimutasi');
  assert.equal(sesiAwal.riwayat.length, 0);

  const tidak = jawabKonfirmasi(sesiAwal, 'salah');
  assert.equal(tidak.aksi, 'ulangi-entri');
  assert.equal(tidak.sesi.status, 'selesai-ulangi');
  assert.equal(tidak.sesi.jumlahTanyaUlang, 0);
});

test('jawabKonfirmasi: lain ke-1/ke-2 -> tanya-ulang, ke-3 -> batal, tidak pernah simpan', () => {
  let sesi = buatSesiKonfirmasi({ ringkasan: 'draf' });

  const satu = jawabKonfirmasi(sesi, 'entah');
  assert.equal(satu.aksi, 'tanya-ulang');
  assert.equal(satu.sesi.status, 'menunggu');
  assert.equal(satu.sesi.jumlahTanyaUlang, 1);
  assert.equal(satu.ucapan, PERTANYAAN_KONFIRMASI);
  sesi = satu.sesi;

  const dua = jawabKonfirmasi(sesi, 'mungkin');
  assert.equal(dua.aksi, 'tanya-ulang');
  assert.equal(dua.sesi.status, 'menunggu');
  assert.equal(dua.sesi.jumlahTanyaUlang, 2);
  sesi = dua.sesi;

  const tiga = jawabKonfirmasi(sesi, 'tidak jelas');
  assert.equal(tiga.aksi, 'batal');
  assert.equal(tiga.sesi.status, 'selesai-batal');
  assert.equal(tiga.sesi.jumlahTanyaUlang, 3);
  assert.equal(tiga.sesi.riwayat.length, 3);

  // Sesi selesai idempoten dan tidak pernah menjadi simpan.
  const ulang = jawabKonfirmasi(tiga.sesi, 'ya');
  assert.equal(ulang.aksi, 'tidak-berlaku');
  assert.equal(ulang.sesi, tiga.sesi);
  assert.equal(ulang.ucapan, '');
});

test('jalankanKonfirmasiSuara: berhenti sebelum TTS, mulai setelahnya, keputusan benar', async () => {
  const events = [];
  const ttsTexts = [];
  const adaptor = {
    async berhenti() { events.push('berhenti'); },
    async mulai() { events.push('mulai'); },
    async kenali() { events.push('kenali'); return { teks: 'ya' }; }
  };
  const tts = {
    async bacakan(teks) { events.push('tts'); ttsTexts.push(String(teks)); }
  };

  const hasil = await jalankanKonfirmasiSuara({
    adaptor,
    tts,
    ringkasan: 'Captopril 12,5 mg, dua kali sehari'
  });

  assert.equal(hasil.keputusan, 'simpan');
  assert.equal(hasil.jawabanTerakhir, 'ya');
  assert.equal(hasil.sesi.status, 'selesai-simpan');
  assert.deepEqual(events, ['berhenti', 'tts', 'mulai', 'kenali']);
  assert.ok(ttsTexts[0].includes('Captopril 12,5 mg'));
  assert.ok(ttsTexts[0].includes(PERTANYAAN_KONFIRMASI));
});

test('jalankanKonfirmasiSuara: tidak -> ulangi-entri dan setiap TTS didahului berhenti', async () => {
  const events = [];
  const adaptor = {
    async berhenti() { events.push('berhenti'); },
    async mulai() { events.push('mulai'); },
    async kenali() { events.push('kenali'); return { teks: 'tidak' }; }
  };
  const tts = { async bacakan() { events.push('tts'); } };

  const hasil = await jalankanKonfirmasiSuara({ adaptor, tts, ringkasan: 'draf' });
  assert.equal(hasil.keputusan, 'ulangi-entri');
  assert.equal(hasil.jawabanTerakhir, 'tidak');
  assert.deepEqual(events, ['berhenti', 'tts', 'mulai', 'kenali']);
});

test('jalankanKonfirmasiSuara: dua jawaban ambigu lalu batal; TTS diulang tepat 2 kali', async () => {
  const events = [];
  const jawaban = ['entah', 'mungkin', 'tidak jelas'];
  const adaptor = {
    async berhenti() { events.push('berhenti'); },
    async mulai() { events.push('mulai'); },
    async kenali() { events.push('kenali'); return { teks: jawaban.shift() ?? '' }; }
  };
  const ttsTexts = [];
  const tts = { async bacakan(teks) { events.push('tts'); ttsTexts.push(String(teks)); } };

  const hasil = await jalankanKonfirmasiSuara({ adaptor, tts, ringkasan: 'draf' });
  assert.equal(hasil.keputusan, 'batal');
  assert.equal(hasil.sesi.status, 'selesai-batal');
  assert.equal(hasil.jumlahTanyaUlang, 3);
  assert.equal(events.filter((item) => item === 'tts').length, 3);
  // Setiap TTS selalu didahului berhenti dan diikuti mulai.
  assert.deepEqual(events.slice(0, 4), ['berhenti', 'tts', 'mulai', 'kenali']);
  assert.equal(ttsTexts[1], PERTANYAAN_KONFIRMASI);
  assert.equal(ttsTexts[2], PERTANYAAN_KONFIRMASI);
});

/* ================================================================== */
/* Bacaan ulang TTS (8B.5)                                            */
/* ================================================================== */

test('teksUlangObat memuat nama, dosis, frekuensi, takaran, aturan, jadwal, status belum', () => {
  const obat = {
    name: 'Captopril',
    kekuatan: { nilai: 12.5, satuan: 'mg' },
    kaliSehari: 2,
    takaranPerDosis: 0.5,
    stock: { unit: 'tablet', remaining: 10 },
    aturanMakan: 'sebelum',
    jadwalJam: ['07:00', '19:00'],
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: '2026-11-09',
    endDate: '2026-11-14',
    notes: 'sesudah sarapan',
    pemeriksaanOrangLain: defaultPemeriksaan()
  };
  const teks = teksUlangObat(obat);

  assert.match(teks, /Captopril/);
  assert.match(teks, /dua belas koma lima miligram/);
  assert.match(teks, /dua kali sehari/);
  assert.match(teks, /setengah tablet/);
  assert.match(teks, /sebelum makan/);
  assert.match(teks, /pukul tujuh/);
  assert.match(teks, /setiap hari/);
  assert.match(teks, /Mulai sembilan November dua ribu dua puluh enam/);
  assert.match(teks, /stok tersisa sepuluh tablet/i);
  assert.match(teks, /Catatan: sesudah sarapan/);
  assert.match(teks, /belum diperiksa pendamping atau apoteker/i);
  assert.doesNotMatch(teks, /terverifikasi/i);
});

test('teksUlangVital memuat jenis, nilai, satuan, tanggal/jam, dan catatan', () => {
  const teks = teksUlangVital({
    type: 'tension',
    values: { systolic: 140, diastolic: 90 },
    unit: 'mmHg',
    date: '2026-11-09',
    time: '07:00',
    note: 'setelah istirahat',
    pemeriksaanOrangLain: defaultPemeriksaan()
  });
  assert.match(teks, /Tekanan darah/);
  assert.match(teks, /seratus empat puluh per sembilan puluh/);
  assert.match(teks, /milimeter merkuri/);
  assert.match(teks, /sembilan November dua ribu dua puluh enam/);
  assert.match(teks, /pukul tujuh/);
  assert.match(teks, /catatan: setelah istirahat/);
});

test('teksUlangMinum memuat nama, jam, dan status pemeriksaan', () => {
  const teks = teksUlangMinum({
    name: 'Captopril',
    time: '07:00',
    dose: 12.5,
    doseUnit: 'mg',
    pemeriksaanOrangLain: defaultPemeriksaan()
  });
  assert.match(teks, /Captopril/);
  assert.match(teks, /pukul tujuh/);
  assert.match(teks, /belum diperiksa pendamping atau apoteker/i);
});

test('teksUlangJadwal memuat status pemeriksaan tiap dosis dan pesan kosong', () => {
  assert.equal(teksUlangJadwal([]), 'Tidak ada jadwal obat hari ini.');

  const med = { name: 'Amlodipin', pemeriksaanOrangLain: defaultPemeriksaan() };
  const teks = teksUlangJadwal(
    [{ name: 'Amlodipin', time: '07:00', dose: 5, doseUnit: 'mg', medicationId: 'm1' }],
    { statusPemeriksaan: { m1: med } }
  );
  assert.match(teks, /pukul tujuh/i);
  assert.match(teks, /Amlodipin/);
  assert.match(teks, /Status obat Amlodipin: belum diperiksa pendamping atau apoteker\./);
});

/* ================================================================== */
/* Perintah navigasi (8B.8)                                           */
/* ================================================================== */

test('kenaliPerintah cocok persis untuk semua frasa kontrak', () => {
  for (const perintah of PERINTAH_NAVIGASI) {
    for (const frasa of perintah.frasa) {
      const hasil = kenaliPerintah(frasa.toUpperCase());
      assert.ok(hasil, `frasa "${frasa}" harus dikenali`);
      assert.equal(hasil.id, perintah.id, `frasa "${frasa}" -> ${perintah.id}`);
      assert.equal(hasil.skor, 1);
      if (perintah.route) assert.equal(hasil.route, perintah.route);
      if (perintah.action) assert.equal(hasil.action, perintah.action);
    }
  }
  assert.equal(kenaliPerintah('Bantuan!').id, 'bantuan');
  assert.equal(kenaliPerintah('berhenti').action, 'berhenti');
  assert.equal(kenaliPerintah('berhenti').route, null);
});

test('kenaliPerintah: normalisasi, determinisme, dan perintah tak dikenal/medis -> null', () => {
  assert.equal(normalisasiPerintah('  BUKA   Obat!! '), 'buka obat');
  assert.equal(kenaliPerintah('buka obat').id, 'obat');
  assert.deepEqual(kenaliPerintah('buka obat'), kenaliPerintah('buka obat'));

  for (const teks of ['berapa dosis saya', 'obat apa untuk sakit kepala', '', null, 'halo dunia']) {
    assert.equal(kenaliPerintah(teks), null, `"${String(teks)}" tidak boleh dikenali`);
  }
});

test('daftarBantuan/teksBantuan mencakup semua perintah dan menegaskan bukan nasihat medis', () => {
  const daftar = daftarBantuan();
  assert.equal(daftar.length, PERINTAH_NAVIGASI.length);
  const gabungan = daftar.join(' ');
  for (const perintah of PERINTAH_NAVIGASI) {
    for (const frasa of perintah.frasa) {
      assert.ok(gabungan.includes(frasa), `bantuan harus menyebut "${frasa}"`);
    }
  }
  assert.match(gabungan, /berhenti/);
  assert.match(gabungan, /bantuan/);
  assert.match(teksBantuan(), /tidak menjawab pertanyaan medis/);
});

/* ================================================================== */
/* Pemeriksaan Pendamping (8B.9)                                      */
/* ================================================================== */

test('tandaiSudahDiperiksa menolak nama kosong, pernyataan salah, waktu invalid', () => {
  const item = { id: 'm1', name: 'Captopril' };
  const dasar = { oleh: 'dr. Ani', waktu: WAKTU, pernyataan: PERNYATAAN_PEMERIKSAAN };

  for (const opsi of [
    { ...dasar, oleh: '   ' },
    { ...dasar, pernyataan: 'Saya setuju.' },
    { ...dasar, waktu: 'bukan-waktu' }
  ]) {
    assert.throws(
      () => tandaiSudahDiperiksa(item, opsi),
      (error) => error.code === 'PEMERIKSAAN_TIDAK_VALID'
    );
  }
});

test('tandaiSudahDiperiksa berhasil hanya dengan data lengkap dan tidak memutasi item', () => {
  const item = { id: 'm1', name: 'Captopril' };
  const hasil = tandaiSudahDiperiksa(item, {
    oleh: '  dr. Ani  ',
    waktu: WAKTU,
    pernyataan: PERNYATAAN_PEMERIKSAAN
  });

  assert.equal(hasil.pemeriksaanOrangLain.status, 'sudah');
  assert.equal(hasil.pemeriksaanOrangLain.oleh, 'dr. Ani');
  assert.equal(hasil.pemeriksaanOrangLain.waktu, WAKTU.toISOString());
  assert.equal(hasil.pemeriksaanOrangLain.pernyataan, PERNYATAAN_PEMERIKSAAN);
  assert.equal(item.pemeriksaanOrangLain, undefined, 'item asli tidak dimutasi');
  assert.equal(labelPemeriksaan(hasil).startsWith('Sudah diperiksa oleh dr. Ani pada '), true);
});

test('tandaiBelumDiperiksa mereset jejak pemeriksa dan normalisasi tidak pernah menaikkan status', () => {
  const sudah = tandaiSudahDiperiksa(
    { id: 'm1', name: 'Captopril' },
    { oleh: 'dr. Ani', waktu: WAKTU, pernyataan: PERNYATAAN_PEMERIKSAAN }
  );
  const belum = tandaiBelumDiperiksa(sudah, { sumber: 'belum-diperiksa' });
  assert.equal(belum.pemeriksaanOrangLain.status, 'belum');
  assert.equal(belum.pemeriksaanOrangLain.oleh, '');
  assert.equal(belum.pemeriksaanOrangLain.waktu, null);
  assert.equal(belum.pemeriksaanOrangLain.pernyataan, null);

  // 'sudah' tidak lengkap -> 'belum'
  assert.equal(normalisasiPemeriksaan({ status: 'sudah' }).status, 'belum');
  assert.equal(
    normalisasiPemeriksaan({
      status: 'sudah', oleh: 'dr. Ani', waktu: WAKTU, pernyataan: 'salah'
    }).status,
    'belum'
  );
  // 'belum' tidak pernah naik walau membawa jejak pemeriksa
  const dariBelum = normalisasiPemeriksaan({
    status: 'belum', oleh: 'dr. Ani', waktu: WAKTU.toISOString(), pernyataan: PERNYATAAN_PEMERIKSAAN
  });
  assert.equal(dariBelum.status, 'belum');
  assert.equal(dariBelum.oleh, '');
});

test('labelPemeriksaan/ringkasPemeriksaan konsisten dan entri suara tetap belum', () => {
  assert.equal(labelPemeriksaan({ id: 'm1', name: 'A' }), LABEL_BELUM_DIPERIKSA);
  assert.equal(butuhPemeriksaan({ id: 'm1', name: 'A' }), true);

  const entriSuara = tandaiBelumDiperiksa({
    id: 'm2',
    name: 'Captopril',
    dibuatDengan: 'suara',
    dikonfirmasiDengan: 'suara'
  }, { sumber: 'belum-diperiksa' });

  assert.equal(entriSuara.dibuatDengan, 'suara');
  assert.equal(entriSuara.dikonfirmasiDengan, 'suara');
  assert.equal(normalisasiPemeriksaan(entriSuara.pemeriksaanOrangLain).status, 'belum');
  assert.equal(butuhPemeriksaan(entriSuara), true);
  assert.equal(labelPemeriksaan(entriSuara), LABEL_BELUM_DIPERIKSA);

  const ringkas = ringkasPemeriksaan([entriSuara, { id: 'm3', name: 'B' }]);
  assert.deepEqual(
    { total: ringkas.total, belum: ringkas.belum, sudah: ringkas.sudah },
    { total: 2, belum: 2, sudah: 0 }
  );
  assert.match(ringkas.teks, /0 dari 2|2 dari 2/);

  const kosong = ringkasPemeriksaan([]);
  assert.equal(kosong.total, 0);
  assert.match(kosong.teks, /Tidak ada obat/);
});

/* ================================================================== */
/* Pagar dosis (8B.7)                                                 */
/* ================================================================== */

test('pagar dosis menolak >4 tablet dan >8 kali sehari, menerima batas', () => {
  assert.equal(pagarKewajaranDosis({ takaranPerDosis: 4 }).ok, true);
  assert.equal(pagarKewajaranDosis({ kaliSehari: 8 }).ok, true);

  const takaran = pagarKewajaranDosis({ takaranPerDosis: 4.5 });
  assert.equal(takaran.ok, false);
  assert.equal(takaran.kode, 'TAKARAN_TIDAK_WAJAR');

  const frekuensi = pagarKewajaranDosis({ kaliSehari: 9 });
  assert.equal(frekuensi.ok, false);
  assert.equal(frekuensi.kode, 'FREKUENSI_TIDAK_WAJAR');
});

test('tidak ada modul suara yang memuat URL eksternal', async () => {
  const berkas = [
    'app/js/suara/mesin.js',
    'app/js/suara/webSpeech.js',
    'app/js/suara/persetujuan.js',
    'app/js/suara/konfirmasi.js',
    'app/js/logic/konfirmasiSuara.js',
    'app/js/logic/perintahNavigasi.js',
    'app/js/logic/pemeriksaan.js',
    'app/js/suara/tts.js'
  ];
  for (const file of berkas) {
    const isi = await sumberModul(file);
    const tanpaNamespace = isi.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
    assert.ok(!/https?:\/\//.test(tanpaNamespace), `${file} memuat URL eksternal`);
    assert.ok(!/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(isi), `${file} memanggil jaringan`);
  }
});
