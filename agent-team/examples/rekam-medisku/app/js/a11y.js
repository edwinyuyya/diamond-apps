// Rekam Medisku — utilitas aksesibilitas bersama (CONTRACT.md 10.3).
//
// Modul ini hanya membantu DOM: live region, pengumuman, fokus, dan atribut
// ARIA. Tidak menyimpan data apa pun (tidak ada localStorage/IndexedDB/
// sessionStorage), tidak melakukan request jaringan, dan tidak menyentuh DOM
// saat diimpor. Semua fungsi aman dipanggil saat `document` tidak tersedia.

let urutanId = 0;

function buatId(prefix) {
  urutanId += 1;
  return `${prefix}-${urutanId}`;
}

function ambilDokumen(root) {
  if (root && root.nodeType === 9) return root;
  if (root && root.ownerDocument) return root.ownerDocument;
  if (typeof document !== 'undefined') return document;
  return null;
}

function ambilWadah(root) {
  const doc = ambilDokumen(root);
  if (!doc) return null;
  if (root && root.nodeType === 1) return root;
  return doc.body || doc.documentElement || null;
}

function normalisasiPoliteness(nilai) {
  return nilai === 'assertive' ? 'assertive' : 'polite';
}

function teksAman(nilai) {
  return nilai === null || nilai === undefined ? '' : String(nilai).trim();
}

function tambahKelas(el, className) {
  if (!el || !el.classList || typeof className !== 'string') return;
  for (const kelas of className.split(/\s+/)) {
    if (kelas) el.classList.add(kelas);
  }
}

function tambahDescribedBy(el, id) {
  if (!el || !id || typeof el.getAttribute !== 'function') return;
  const sekarang = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (!sekarang.includes(id)) {
    sekarang.push(id);
    el.setAttribute('aria-describedby', sekarang.join(' '));
  }
}

function hapusDescribedBy(el, id) {
  if (!el || !id || typeof el.getAttribute !== 'function') return;
  const sisa = (el.getAttribute('aria-describedby') || '')
    .split(/\s+/)
    .filter((item) => item && item !== id);
  if (sisa.length) el.setAttribute('aria-describedby', sisa.join(' '));
  else el.removeAttribute('aria-describedby');
}

/**
 * Memasang (atau memakai ulang) live region global.
 *
 * @param {{id?:string, politeness?:'polite'|'assertive', atomic?:boolean,
 *   root?:Element|Document|null, className?:string, buat?:boolean}} [opsi]
 * @returns {HTMLElement|null}
 */
export function pasangLiveRegion({
  id = 'live-region',
  politeness = 'polite',
  atomic = true,
  root = null,
  className = 'sr-only',
  buat = true
} = {}) {
  const doc = ambilDokumen(root);
  if (!doc) return null;
  const wadah = ambilWadah(root);

  let region = null;
  if (doc.getElementById) region = doc.getElementById(id);
  if (!region && wadah && wadah.querySelector) {
    region = wadah.querySelector(`#${String(id).replace(/["\\]/g, '\\$&')}`);
  }
  if (!region) {
    if (!buat || !wadah || typeof doc.createElement !== 'function') return null;
    region = doc.createElement('div');
    region.id = id;
    wadah.appendChild(region);
  }

  const sopan = normalisasiPoliteness(politeness);
  region.setAttribute('role', sopan === 'assertive' ? 'alert' : 'status');
  region.setAttribute('aria-live', sopan);
  region.setAttribute('aria-atomic', atomic ? 'true' : 'false');
  tambahKelas(region, className);
  return region;
}

/**
 * Mengumumkan pesan ke live region. Pesan yang sama berulang tetap
 * diumumkan karena isi region diberi pembeda tak terlihat.
 *
 * @param {string} pesan
 * @param {{politeness?:'polite'|'assertive', region?:HTMLElement|null,
 *   id?:string, root?:Element|Document|null}} [opsi]
 * @returns {HTMLElement|null} live region yang dipakai
 */
export function umumkan(pesan, {
  politeness = 'polite',
  region = null,
  id = 'live-region',
  root = null
} = {}) {
  const teks = teksAman(pesan);
  if (!teks) return null;

  const doc = ambilDokumen(root);
  let target = region;
  if (!target && doc && doc.getElementById) target = doc.getElementById(id);
  if (!target) target = pasangLiveRegion({ id, politeness, root });
  if (!target) return null;

  const sopan = normalisasiPoliteness(politeness);
  target.setAttribute('role', sopan === 'assertive' ? 'alert' : 'status');
  target.setAttribute('aria-live', sopan);
  target.setAttribute('aria-atomic', 'true');

  // Selalu ubah isi agar pembaca layar membacakan ulang pesan identik.
  const bergantian = target.dataset && target.dataset.a11yToggle === '1';
  if (target.dataset) target.dataset.a11yToggle = bergantian ? '0' : '1';
  target.textContent = bergantian ? `${teks}\u00a0` : teks;
  return target;
}

/**
 * Memindahkan fokus ke elemen. Menerima elemen atau selector CSS.
 * Elemen non-fokusabel diberi `tabindex="-1"` agar tetap dapat difokus.
 *
 * @param {Element|string|null} el
 * @param {{preventScroll?:boolean, pilih?:boolean, fallback?:Element|string|null}} [opsi]
 * @returns {boolean} apakah fokus berhasil dipindahkan
 */
export function fokuskan(el, {
  preventScroll = false,
  pilih = false,
  fallback = null
} = {}) {
  const doc = ambilDokumen(el);
  if (!doc) return false;

  const cari = (nilai) => {
    if (!nilai) return null;
    if (typeof nilai === 'string') {
      if (typeof doc.querySelector !== 'function') return null;
      try {
        return doc.querySelector(nilai);
      } catch {
        return null;
      }
    }
    return nilai;
  };

  let target = cari(el);
  if (!target) target = cari(fallback);
  if (!target || typeof target.focus !== 'function') return false;

  if (typeof target.tabIndex === 'number' && target.tabIndex < 0
      && typeof target.setAttribute === 'function'
      && !target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
  }

  try {
    target.focus({ preventScroll });
  } catch {
    try {
      target.focus();
    } catch {
      return false;
    }
  }

  if (pilih && typeof target.select === 'function') {
    try {
      target.select();
    } catch {
      // Elemen tanpa teks yang dapat dipilih.
    }
  }
  return doc.activeElement === target || typeof doc.activeElement === 'undefined';
}

/** Alias eksplisit untuk pemindahan fokus. */
export const fokusKe = fokuskan;

/** Menyimpan elemen yang sedang fokus (untuk dipulihkan setelah dialog). */
export function simpanFokus() {
  if (typeof document === 'undefined') return null;
  return document.activeElement || null;
}

/** Memulihkan fokus ke elemen yang disimpan; no-op bila tidak valid. */
export function kembalikanFokus(el) {
  if (!el || typeof el.focus !== 'function') return false;
  return fokuskan(el);
}

/** Memberi nama aksesibel lewat `aria-label`. */
export function beriLabel(el, teks) {
  if (!el || typeof el.setAttribute !== 'function') return el;
  const isi = teksAman(teks);
  if (isi) el.setAttribute('aria-label', isi);
  else el.removeAttribute('aria-label');
  return el;
}

/** Alias: `labelAria(el, teks)`. */
export const labelAria = beriLabel;

/** Menghapus `aria-label` elemen. */
export function hapusLabel(el) {
  if (el && typeof el.removeAttribute === 'function') el.removeAttribute('aria-label');
  return el;
}

/**
 * Menghubungkan kontrol ke elemen label lewat id/elemen. Bila `label`
 * berupa teks, dibuat span `.sr-only` agar kontrol tetap punya nama.
 *
 * @param {Element} kontrol
 * @param {Element|string} label elemen label, id label, atau teks label
 * @returns {Element|null} kontrol
 */
export function hubungkanLabel(kontrol, label) {
  if (!kontrol || typeof kontrol.setAttribute !== 'function') return kontrol;
  const doc = ambilDokumen(kontrol);
  if (!doc) return kontrol;

  let labelEl = null;
  if (label && typeof label === 'object' && label.nodeType === 1) {
    labelEl = label;
  } else if (typeof label === 'string' && doc.getElementById) {
    labelEl = doc.getElementById(label);
  }

  if (!labelEl && typeof label === 'string' && teksAman(label)) {
    if (typeof doc.createElement !== 'function') return kontrol;
    labelEl = doc.createElement('span');
    labelEl.className = 'sr-only';
    labelEl.textContent = teksAman(label);
    const wadah = kontrol.parentNode || (doc && doc.body) || null;
    if (wadah) wadah.appendChild(labelEl);
  }
  if (!labelEl) return kontrol;

  if (!labelEl.id) labelEl.id = buatId('a11y-label');
  kontrol.setAttribute('aria-labelledby', labelEl.id);
  if (labelEl.tagName === 'LABEL' && !labelEl.htmlFor && kontrol.id) {
    labelEl.htmlFor = kontrol.id;
  }
  return kontrol;
}

/**
 * Menambahkan deskripsi aksesibel (mis. petunjuk format).
 * @param {Element} el
 * @param {Element|string} deskripsi elemen, id, atau teks
 * @returns {Element|null} elemen deskripsi
 */
export function deskripsikan(el, deskripsi) {
  if (!el || typeof el.setAttribute !== 'function') return null;
  const doc = ambilDokumen(el);
  if (!doc) return null;

  let target = null;
  if (deskripsi && typeof deskripsi === 'object' && deskripsi.nodeType === 1) {
    target = deskripsi;
  } else if (typeof deskripsi === 'string' && doc.getElementById) {
    target = doc.getElementById(deskripsi);
  }

  if (!target && teksAman(deskripsi)) {
    if (typeof doc.createElement !== 'function') return null;
    target = doc.createElement('span');
    target.className = 'sr-only';
    target.textContent = teksAman(deskripsi);
    const wadah = el.parentNode || (doc && doc.body) || null;
    if (wadah) wadah.appendChild(target);
  }
  if (!target) return null;

  if (!target.id) target.id = buatId('a11y-desc');
  tambahDescribedBy(el, target.id);
  return target;
}

/** Menandai error pada kontrol dan menampilkan pesan `role="alert"`. */
export function tandaiError(el, pesan, { id = null } = {}) {
  if (!el || typeof el.setAttribute !== 'function') return null;
  const doc = ambilDokumen(el);
  if (!doc || typeof doc.createElement !== 'function') return null;

  el.setAttribute('aria-invalid', 'true');
  const pesanTeks = teksAman(pesan);
  if (!pesanTeks) return null;

  const errorId = id || el.getAttribute('aria-errormessage') || buatId('a11y-error');
  let errorEl = doc.getElementById ? doc.getElementById(errorId) : null;
  if (!errorEl) {
    errorEl = doc.createElement('p');
    errorEl.id = errorId;
    errorEl.className = 'error-text';
    errorEl.setAttribute('role', 'alert');
    errorEl.setAttribute('data-a11y-error', 'true');
    const wadah = el.parentNode || (doc && doc.body) || null;
    if (!wadah) return null;
    if (el.nextSibling && el.parentNode === wadah) wadah.insertBefore(errorEl, el.nextSibling);
    else wadah.appendChild(errorEl);
  }
  errorEl.textContent = pesanTeks;
  el.setAttribute('aria-errormessage', errorId);
  tambahDescribedBy(el, errorId);
  umumkan(pesanTeks, { politeness: 'assertive', root: doc });
  return errorEl;
}

/** Membersihkan tanda error pada kontrol. */
export function bersihkanError(el) {
  if (!el || typeof el.removeAttribute !== 'function') return el;
  const doc = ambilDokumen(el);
  const errorId = el.getAttribute('aria-errormessage');
  el.removeAttribute('aria-invalid');
  el.removeAttribute('aria-errormessage');
  if (errorId) {
    hapusDescribedBy(el, errorId);
    const errorEl = doc && doc.getElementById ? doc.getElementById(errorId) : null;
    if (errorEl && errorEl.getAttribute('data-a11y-error') === 'true' && errorEl.parentNode) {
      errorEl.parentNode.removeChild(errorEl);
    }
  }
  return el;
}

/** Memfokuskan kontrol pertama yang dapat dijangkau di dalam wadah. */
export function fokusPertama(wadah, selector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')) {
  if (!wadah || typeof wadah.querySelector !== 'function') return false;
  let target = null;
  try {
    target = wadah.querySelector(selector);
  } catch {
    target = null;
  }
  return target ? fokuskan(target) : false;
}

/**
 * Menahan fokus Tab di dalam wadah (mis. dialog) dan memulihkan fokus
 * ke pemicu saat dilepas.
 *
 * @param {Element} wadah
 * @param {{onEscape?:Function|null, kembalikan?:boolean, pemicu?:Element|null}} [opsi]
 * @returns {Function} pelepas
 */
export function perangkapFokus(wadah, {
  onEscape = null,
  kembalikan = true,
  pemicu = null
} = {}) {
  if (!wadah || typeof wadah.addEventListener !== 'function') return () => {};
  const doc = ambilDokumen(wadah);
  const asal = pemicu || simpanFokus();
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function daftarFokus() {
    if (typeof wadah.querySelectorAll !== 'function') return [];
    try {
      return Array.from(wadah.querySelectorAll(selector))
        .filter((item) => !item.hidden && item.getAttribute('aria-hidden') !== 'true');
    } catch {
      return [];
    }
  }

  function tanganiTombol(event) {
    if (event.key === 'Escape' && typeof onEscape === 'function') {
      event.preventDefault();
      onEscape(event);
      return;
    }
    if (event.key !== 'Tab') return;
    const daftar = daftarFokus();
    if (!daftar.length) {
      event.preventDefault();
      fokuskan(wadah);
      return;
    }
    const pertama = daftar[0];
    const terakhir = daftar[daftar.length - 1];
    const aktif = doc ? doc.activeElement : null;
    if (event.shiftKey && (aktif === pertama || aktif === wadah)) {
      event.preventDefault();
      fokuskan(terakhir);
    } else if (!event.shiftKey && aktif === terakhir) {
      event.preventDefault();
      fokuskan(pertama);
    }
  }

  wadah.addEventListener('keydown', tanganiTombol);
  let aktif = true;
  return () => {
    if (!aktif) return;
    aktif = false;
    wadah.removeEventListener('keydown', tanganiTombol);
    if (kembalikan && asal) kembaliKefokusAman(asal);
  };

  function kembaliKefokusAman(el) {
    // Fungsi lokal agar pelepas tetap ringkas dan tidak melempar.
    if (el && typeof el.focus === 'function') {
      try {
        el.focus();
      } catch {
        // abaikan
      }
    }
  }
}

/**
 * Menerapkan preferensi tampilan aksesibilitas ke elemen akar.
 * @param {Element} [root=document.documentElement]
 * @param {{fontLarge?:boolean, highContrast?:boolean}} [preferensi]
 */
export function terapkanPreferensiAksesibilitas(root, {
  fontLarge = false,
  highContrast = false
} = {}) {
  const doc = ambilDokumen(root);
  const target = root && root.nodeType === 1
    ? root
    : (doc ? doc.documentElement : null);
  if (!target) return false;
  if (target.classList) target.classList.toggle('is-large-text', Boolean(fontLarge));
  if (target.dataset) target.dataset.contrast = highContrast ? 'high' : 'normal';
  return true;
}

export default {
  pasangLiveRegion,
  umumkan,
  fokuskan,
  fokusKe,
  simpanFokus,
  kembalikanFokus,
  beriLabel,
  labelAria,
  hapusLabel,
  hubungkanLabel,
  deskripsikan,
  tandaiError,
  bersihkanError,
  fokusPertama,
  perangkapFokus,
  terapkanPreferensiAksesibilitas
};
