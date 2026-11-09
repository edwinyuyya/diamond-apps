// Regresi KESELAMATAN pencocok jawaban tertutup (ditemukan lewat uji nyata Whisper di browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cocokkanJawaban } from '../app/js/logic/pencocokJawaban.js';

test('angka di tengah kalimat ngawur (potongan nama obat) tidak diterima sebagai frekuensi', () => {
  for (const t of ['Moksi chili lima rato', 'para catamul lima tablet obat', 'halo apa kabar tiga orang teman']) {
    const r = cocokkanJawaban(t, 'frekuensi');
    assert.notEqual(r.status, 'cocok', `"${t}" -> ${JSON.stringify(r.nilai)}`);
  }
});

test('jawaban angka wajar dengan kata pengisi tetap diterima', () => {
  const kasus = [['dua kali', 2], ['dua kali sehari', 2], ['tiga kali sehari', 3], ['satu', 1], ['lima kali sehari', 5], ['Dua Kalisahari', 2]];
  for (const [t, nilai] of kasus) {
    const r = cocokkanJawaban(t, 'frekuensi');
    assert.equal(r.status, 'cocok', t);
    assert.equal(r.nilai, nilai, t);
  }
  assert.equal(cocokkanJawaban('satu setengah tablet', 'takaran').nilai, 1.5);
});

test('angka di luar rentang tetap ditolak (frekuensi > 8, takaran > 4)', () => {
  assert.notEqual(cocokkanJawaban('sembilan', 'frekuensi').status, 'cocok');
  assert.notEqual(cocokkanJawaban('dua belas', 'takaran').status, 'cocok');
  assert.notEqual(cocokkanJawaban('sepuluh', 'takaran').status, 'cocok');
});

test('teks yang bukan jawaban tidak dipaksa cocok pada pertanyaan apa pun', () => {
  const ngawur = ['selamat pagi', 'terima kasih', 'halo', 'sahurabla', 'thank you for watching', '4.5.2.2.2.2.2.2.2.2.2.2.2.2'];
  for (const id of ['frekuensi', 'takaran', 'aturanMakan', 'bilaPerlu']) {
    for (const t of ngawur) {
      assert.notEqual(cocokkanJawaban(t, id).status, 'cocok', `${id}: "${t}"`);
    }
  }
});

test('ya/tidak: "betul", "benar", "bukan" dikenali', () => {
  assert.equal(cocokkanJawaban('betul', 'bilaPerlu').nilai, true);
  assert.equal(cocokkanJawaban('ya betul', 'bilaPerlu').nilai, true);
  assert.equal(cocokkanJawaban('bukan', 'bilaPerlu').nilai, false);
  assert.equal(cocokkanJawaban('tidak benar', 'bilaPerlu').nilai, false);
});

test('salah dengar nyata dari Whisper tetap dikenali dengan benar', () => {
  assert.equal(cocokkanJawaban('digakali', 'frekuensi').nilai, 3);
  assert.equal(cocokkanJawaban('Semelum Makan', 'aturanMakan').nilai, 'sebelum');
  assert.equal(cocokkanJawaban('kalaupeluh', 'bilaPerlu').nilai, true);
});
