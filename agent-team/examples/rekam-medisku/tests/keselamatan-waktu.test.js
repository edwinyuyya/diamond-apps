// Regresi KESELAMATAN: keterangan "bila perlu" dan waktu minum yang TERTULIS tidak boleh hilang dari terjemahan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { kenaliResep } from '../app/js/logic/resep.js';
import { dikteKeObat } from '../app/js/logic/ucapanObat.js';
import { waktuYangTertulis } from '../app/js/logic/resepKamus.js';

const resep = (teks) => kenaliResep(teks).obat[0];

test('dikte "kalau/jika/apabila perlu" = obat bila perlu, BUKAN obat rutin', () => {
  for (const frasa of ['kalau perlu', 'jika perlu', 'apabila perlu', 'bila perlu', 'seperlunya']) {
    const hasil = dikteKeObat(`Paracetamol lima ratus miligram tiga kali sehari satu tablet ${frasa}`);
    const o = hasil.obat ?? hasil;
    assert.equal(o.aturanMakan, 'bila-perlu', frasa);
    assert.match(o.teksTerjemahan, /bila perlu/, frasa);
    assert.doesNotMatch(o.teksTerjemahan, /3 kali sehari|tiga kali sehari/i, frasa);
  }
});

test('h.s. / sebelum tidur muncul di terjemahan resep tertulis', () => {
  assert.match(resep('Simvastatin 20 mg S 1 dd tab I h.s.').teksTerjemahan, /sebelum tidur/);
});

test('waktu yang diucapkan ikut ke terjemahan dikte suara', () => {
  const hasil = dikteKeObat('Simvastatin dua puluh miligram satu kali sehari satu tablet sebelum tidur');
  const o = hasil.obat ?? hasil;
  assert.match(o.teksTerjemahan, /sebelum tidur/);
});

test('kata waktu tertulis: pagi/mane/nocte/siang/sore terbaca; tanpa kata waktu = tidak ditambah', () => {
  assert.equal(waktuYangTertulis('Amlodipine 10 mg 1-0-0 pagi'), 'pagi hari');
  assert.equal(waktuYangTertulis('Obat B 2 dd 1 tab mane'), 'pagi hari');
  assert.equal(waktuYangTertulis('Obat C 1 dd 1 tab nocte'), 'malam hari');
  assert.equal(waktuYangTertulis('Obat H 20 mg 1 dd 1 tab siang'), 'siang hari');
  assert.equal(waktuYangTertulis('Obat I 20 mg 1 dd 1 tab sore'), 'sore hari');
  assert.equal(waktuYangTertulis('Amoxicillin 500 mg 3x1 tab'), null);
});

test('waktu bawaan jadwal TIDAK ditampilkan sebagai fakta resep (1x sehari tanpa kata waktu)', () => {
  const o = resep('Obat D 20 mg 1x1 tab');
  assert.doesNotMatch(o.teksTerjemahan, /pagi|siang|sore|malam|tidur/);
});

test('beberapa kata waktu berbeda (ambigu) tidak ditampilkan sebagai satu waktu', () => {
  assert.equal(waktuYangTertulis('Obat A 3x1 tab pagi siang malam'), null);
  assert.doesNotMatch(resep('Obat A 3x1 tab pagi siang malam').teksTerjemahan, /pagi hari|malam hari|siang hari/);
});
