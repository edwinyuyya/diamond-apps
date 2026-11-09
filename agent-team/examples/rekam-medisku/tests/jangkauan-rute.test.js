// Regresi (laporan uji APK): layar suara ada tetapi TIDAK ada pintu masuk di antarmuka.
// Setiap rute terdaftar harus bisa dijangkau lewat tautan yang benar-benar tampil, bukan hanya ada di tabel rute.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const baca = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
function semuaJs(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? semuaJs(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []);
}

const appJs = baca('js/app.js');
const indexHtml = baca('index.html');
const tabelRute = appJs.slice(appJs.indexOf('const ROUTES'), appJs.indexOf('};', appJs.indexOf('const ROUTES')));
const rute = [...tabelRute.matchAll(/'(#\/[^']*)':\s*\{\s*title/g)].map((m) => m[1]).filter((r) => r !== '#/');

test('tabel rute terbaca dan memuat rute suara', () => {
  assert.ok(rute.length >= 10, `hanya ${rute.length} rute terbaca`);
  for (const r of ['#/suara', '#/suara/tanya', '#/suara/pengaturan', '#/bantuan-suara']) assert.ok(rute.includes(r), r);
});

test('setiap rute bisa dijangkau dari antarmuka (index.html atau tautan di layar lain)', () => {
  // app.js di luar tabel rute ikut dihitung: layar kunci dibuka secara terprogram saat aplikasi terkunci.
  const sumber = [{ nama: 'app.js (di luar tabel)', teks: appJs.replace(tabelRute, '') },
    { nama: 'index.html', teks: indexHtml }, ...semuaJs('js/ui').map((f) => ({ nama: f, teks: baca(f) })),
    ...semuaJs('js/suara').map((f) => ({ nama: f, teks: baca(f) }))];
  const tidakTerjangkau = rute.filter((r) => {
    const hash = r;
    return !sumber.some((s) => s.teks.includes(`'${hash}'`) || s.teks.includes(`"${hash}"`) || s.teks.includes(`\`${hash}\``));
  });
  assert.deepEqual(tidakTerjangkau, [], `rute tanpa pintu masuk: ${tidakTerjangkau.join(', ')}`);
});

test('fitur suara terlihat di tiga tempat utama: tab bawah, menu Lainnya, dan Beranda', () => {
  assert.match(indexHtml, /id="nav-voice"[^>]*href="#\/suara"/);
  assert.match(indexHtml, /id="more-voice"[^>]*href="#\/suara"/);
  assert.match(indexHtml, /href="#\/bantuan-suara"/);
  assert.match(baca('js/ui/dashboard.js'), /href:\s*'#\/suara'/);
});

test('tombol suara ada di layar Obat dan Vital', () => {
  assert.match(baca('js/ui/meds.js'), /link-voice-med[\s\S]{0,120}#\/suara/);
  assert.match(baca('js/ui/vitals.js'), /link-voice-vital[\s\S]{0,120}#\/suara/);
});

test('rute suara tidak lagi dianggap bagian dari "Lainnya" dan tab Suara menyala di semua rute suara', () => {
  const sekunder = appJs.slice(appJs.indexOf('const SECONDARY_ROUTES'), appJs.indexOf(']);', appJs.indexOf('const SECONDARY_ROUTES')));
  assert.doesNotMatch(sekunder, /#\/suara/);
  assert.match(appJs, /\['#nav-voice', '#\/suara'\]/);
  assert.match(appJs, /route\.startsWith\('#\/suara'\)/);
});
