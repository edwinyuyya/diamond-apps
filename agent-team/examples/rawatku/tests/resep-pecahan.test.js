// Regresi KESELAMATAN: pecahan takaran tidak boleh terbaca sebagai bilangan bulat.
// Kasus nyata yang pernah salah dibaca: `2x1/2` -> 1 tablet (dosis dobel), `1½` -> 5,5 tablet, `1 1/2` -> 1 tablet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { kenaliResep } from '../app/js/logic/resep.js';

function obatPertama(teks) {
  const r = kenaliResep(teks);
  return (r.obat ?? r.daftar ?? r.items ?? [])[0] ?? r;
}

const KASUS = [
  // [teks resep, kaliSehari, takaranPerDosis]
  ['Captopril 12,5 mg 2x1/2 tab', 2, 0.5],
  ['Captopril 25 mg 3 x 1/2 tab', 3, 0.5],
  ['Captopril 25 mg 3x 1/4 tab', 3, 0.25],
  ['Bisoprolol 5 mg S 2 dd 1/2 tab', 2, 0.5],
  ['Bisoprolol 5 mg S 2 dd ½ tab', 2, 0.5],
  ['Glimepiride 2 mg 1 dd ½ tab', 1, 0.5],
  ['Obat X 50 mg S 3 dd 1 1/2 tab', 3, 1.5],
  ['Obat Y 50 mg 3x1 1/2 tab', 3, 1.5],
  ['Obat Z 5 mg 3 dd 1½ tab', 3, 1.5],
  ['Obat Z 5 mg 3 dd 1 ½ tab', 3, 1.5],
  // kontrol: bilangan bulat tetap bilangan bulat
  ['Amoxicillin 500 mg 3x1 tab', 3, 1],
  ['Amoxicillin 500 mg S 3 dd 1 tab', 3, 1],
  ['Amoxicillin 500 mg S 3 dd tab I p.c.', 3, 1],
  ['Paracetamol 500 mg 3x1/hari', 3, 1]
];

for (const [teks, kali, takaran] of KASUS) {
  test(`pecahan takaran: "${teks}" -> ${kali}x ${takaran}`, () => {
    const o = obatPertama(teks);
    assert.equal(o.kaliSehari, kali);
    assert.equal(o.takaranPerDosis, takaran);
  });
}

test('terjemahan memuat takaran pecahan, bukan angka bulat', () => {
  const o = obatPertama('Captopril 12,5 mg 2x1/2 tab');
  assert.match(o.teksTerjemahan, /0,5 tablet/);
  assert.doesNotMatch(o.teksTerjemahan, /\b1 tablet\b/);
});

test('pecahan yang tidak dapat diurai tidak boleh menghasilkan keyakinan tinggi', () => {
  const o = obatPertama('Captopril 25 mg S.3.d.d.1/2');
  assert.ok(o.kepercayaan <= 0.5, `keyakinan terlalu tinggi: ${o.kepercayaan}`);
});

// ---- Pagar kewajaran (keselamatan): angka absurd dari OCR berantakan tidak boleh tampil sebagai fakta ----
test('OCR menggabungkan huruf (S3ddtablp.c.) tidak menghasilkan "100 tablet" yang dipercaya', () => {
  const o = obatPertama('R/ Amoxicillin 500 mg tab No. XV\nS3ddtablp.c.');
  assert.doesNotMatch(o.teksTerjemahan, /100 tablet/);
  assert.ok(o.kepercayaan <= 0.3, `keyakinan terlalu tinggi: ${o.kepercayaan}`);
});

test('takaran tablet > 4 per dosis ditandai tidak wajar dan tidak diterjemahkan sebagai fakta', () => {
  const o = obatPertama('Paracetamol 500 mg S 3 dd tab X');
  assert.ok(o.bagianTidakDipahami.some((b) => /tidak wajar/.test(b)));
  assert.match(o.teksTerjemahan, /tidak wajar/i);
  assert.ok(o.kepercayaan <= 0.3);
});

test('frekuensi > 8 kali sehari ditandai tidak wajar', () => {
  const o = obatPertama('Paracetamol 500 mg 12 x 1 tab');
  assert.ok(o.bagianTidakDipahami.some((b) => /frekuensi tidak wajar/.test(b)));
});

test('dosis wajar tidak terkena pagar kewajaran', () => {
  for (const t of ['Amoxicillin 500 mg 3x1 tab', 'Paracetamol 500 mg S 3 dd tab II', 'Cefixime 100 mg syr S 2 dd cth I a.c.']) {
    const o = obatPertama(t);
    assert.doesNotMatch(o.teksTerjemahan, /tidak wajar/i, t);
    assert.ok(o.kepercayaan > 0.5, `${t}: keyakinan ${o.kepercayaan}`);
  }
});
