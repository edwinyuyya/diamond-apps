// Rekam Medisku — shell aplikasi, router hash, header/nav, toast, dan status kunci.
// Modul layar diimpor dinamis agar shell tetap dapat dimuat saat modul UI
// dikerjakan paralel.

import { DISCLAIMERS } from './model.js';
import { h, qs, qsa, clear, on, setText } from './dom.js';
import { pasangLiveRegion } from './a11y.js';

export const ROUTES = {
  '#/':          { title: 'Beranda',                 module: './ui/dashboard.js' },
  '#/profil':    { title: 'Profil',                  module: './ui/profile.js' },
  '#/kunjungan': { title: 'Kunjungan',               module: './ui/visits.js' },
  '#/obat':      { title: 'Obat',                    module: './ui/meds.js' },
  '#/vital':     { title: 'Vital & Lab',             module: './ui/vitals.js' },
  '#/pindai':    { title: 'Pindai Dokumen',          module: './ui/scan.js' },
  '#/tinjau':    { title: 'Tinjau Hasil Pindai',      module: './ui/scan-review.js' },
  '#/darurat':   { title: 'Kartu Darurat',           module: './ui/emergency.js' },
  '#/ringkasan': { title: 'Ringkasan Dokter',        module: './ui/report.js' },
  '#/pengaturan':{ title: 'Pengaturan',              module: './ui/settings.js' },
  '#/kunci':     { title: 'Terkunci',                module: './ui/lock.js' },
  '#/suara':     { title: 'Isi dengan Suara',        module: './ui/isi-suara.js' },
  '#/suara/tanya':      { title: 'Tanya Obat Satu per Satu', module: './ui/tanya-suara.js' },
  '#/suara/pengaturan': { title: 'Pengaturan Suara', module: './ui/suara-pengaturan.js' },
  '#/bantuan-suara':    { title: 'Bantuan Suara',    module: './ui/bantuan-suara.js' },
  '#/pemeriksaan':      { title: 'Pemeriksaan Pendamping', module: './ui/pemeriksaan.js' }
};

const NAV_ITEMS = [
  ['#nav-home', '#/'],
  ['#nav-meds', '#/obat'],
  ['#nav-visits', '#/kunjungan'],
  ['#nav-vitals', '#/vital'],
  ['#nav-voice', '#/suara']
];

const SECONDARY_ROUTES = new Set([
  '#/profil', '#/pindai', '#/darurat', '#/ringkasan', '#/pengaturan', '#/pemeriksaan']);

const TOAST_DURATION_MS = 4000;

let state = null;
let storage = null;
let bootPromise = null;
let renderSeq = 0;
let currentCleanup = null;
let profileSignature = null;
let lastLocked = false;
let shellBound = false;

// ---------------------------------------------------------------------------
// Utilitas route
// ---------------------------------------------------------------------------

/**
 * Route aktif yang ternormalisasi. Hash tak dikenal diperlakukan sebagai beranda.
 */
export function currentRoute() {
  const raw = typeof location !== 'undefined' && typeof location.hash === 'string'
    ? location.hash
    : '';
  return Object.prototype.hasOwnProperty.call(ROUTES, raw) ? raw : '#/';
}

function normalizeTarget(hash) {
  return Object.prototype.hasOwnProperty.call(ROUTES, hash) ? hash : '#/';
}

/**
 * Mengubah hash lokasi. Bila route sama, layar dirender ulang.
 */
export function navigate(hash) {
  const target = normalizeTarget(hash);
  if (typeof location === 'undefined') return;
  if (location.hash === target) {
    renderRoute({ focus: true }).catch(() => {});
    return;
  }
  location.hash = target;
}

// ---------------------------------------------------------------------------
// Toast & dialog
// ---------------------------------------------------------------------------

function safeTone(tone) {
  return tone === 'success' || tone === 'error' ? tone : 'info';
}

function toast(message, tone = 'info') {
  const region = qs('#toast-region');
  if (!region) return;
  const text = message == null ? '' : String(message);
  if (!text) return;
  const toneValue = safeTone(tone);
  const item = h('div', {
    class: `toast toast--${toneValue}`,
    'data-tone': toneValue
  }, text);
  region.appendChild(item);
  const timer = setTimeout(() => {
    item.classList.add('is-leaving');
    const removeTimer = setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 220);
    // Timer pembersih tidak perlu ditahan; item sudah dilepas dari dokumen.
    void removeTimer;
  }, TOAST_DURATION_MS);
  void timer;
}

function confirmDialog(message) {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') return false;
  try {
    return Boolean(window.confirm(String(message == null ? '' : message)));
  } catch {
    return false;
  }
}

function getMoreDialog() {
  return qs('#more-menu');
}

function closeMoreMenu() {
  const dialog = getMoreDialog();
  const trigger = qs('#btn-more');
  if (dialog) {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.classList.remove('is-active-popup');
  }
}

function openMoreMenu() {
  const dialog = getMoreDialog();
  const trigger = qs('#btn-more');
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
    }
  } else {
    dialog.setAttribute('open', '');
  }
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'true');
    trigger.classList.add('is-active-popup');
  }
}

// ---------------------------------------------------------------------------
// Header / shell
// ---------------------------------------------------------------------------

function applySettings(settings) {
  const root = document.documentElement;
  root.classList.toggle('is-large-text', Boolean(settings && settings.fontLarge));
  root.dataset.contrast = settings && settings.highContrast ? 'high' : 'normal';
}

function applySettingsIfPossible() {
  if (!state || state.isLocked()) return;
  try {
    applySettings(state.getState().settings);
  } catch {
    // State terkunci/rusak: pengaturan diterapkan saat tersedia kembali.
  }
}

function profileSignatureFor(data) {
  const profiles = Array.isArray(data.profiles) ? data.profiles : [];
  return JSON.stringify([
    data.activeProfileId || '',
    profiles.map((profile) => [profile.id, profile.name || ''])
  ]);
}

function updateProfileSwitcher() {
  const select = qs('#profile-switcher');
  if (!select) return;
  if (!state || state.isLocked()) {
    select.disabled = true;
    profileSignature = null;
    return;
  }
  let data;
  try {
    data = state.getState();
  } catch {
    select.disabled = true;
    return;
  }
  select.disabled = false;
  const signature = profileSignatureFor(data);
  const profiles = Array.isArray(data.profiles) ? data.profiles : [];
  if (signature !== profileSignature) {
    profileSignature = signature;
    clear(select);
    for (const profile of profiles) {
      select.appendChild(h('option', {
        value: profile.id,
        selected: profile.id === data.activeProfileId
      }, profile.name || 'Tanpa nama'));
    }
  }
  if (data.activeProfileId) select.value = data.activeProfileId;
  const active = profiles.find((profile) => profile.id === data.activeProfileId);
  select.setAttribute('aria-label', active ? `Profil aktif: ${active.name || 'Tanpa nama'}` : 'Profil aktif');
}

function syncLockButton() {
  const button = qs('#btn-lock');
  if (!button) return;
  let encrypted = false;
  try {
    encrypted = Boolean(state && state.isEncrypted());
  } catch {
    encrypted = false;
  }
  button.hidden = !encrypted;
  button.setAttribute('aria-label', 'Kunci aplikasi');
}

function syncShell() {
  if (!state) return;
  const locked = state.isLocked();
  document.body.classList.toggle('is-locked', locked);
  syncLockButton();
  updateProfileSwitcher();
  if (!locked) applySettingsIfPossible();
}

function handleStateChange() {
  if (!state) return;
  const locked = state.isLocked();
  document.body.classList.toggle('is-locked', locked);
  syncShell();

  if (lastLocked !== locked) {
    lastLocked = locked;
    if (locked) {
      if (currentRoute() !== '#/kunci') navigate('#/kunci');
      // Segera ganti layar agar data tidak sempat terlihat setelah dikunci.
      renderRoute().catch(() => {});
    } else if (currentRoute() === '#/kunci') {
      navigate('#/');
      renderRoute().catch(() => {});
    }
  }
}

function bindShell() {
  if (shellBound) return;
  shellBound = true;

  // Skip-link harus memindahkan fokus tanpa mengubah hash route.
  const skipLink = qs('.skip-link');
  if (skipLink) {
    on(skipLink, 'click', (event) => {
      event.preventDefault();
      const view = qs('#app-view');
      if (view && typeof view.focus === 'function') view.focus();
    });
  }

  // Navigasi bawah (dan brand) — cegah lompatan penuh halaman.
  const brand = qs('#app-header .brand');
  if (brand) {
    on(brand, 'click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      closeMoreMenu();
      navigate('#/');
    });
  }

  for (const [id, route] of NAV_ITEMS) {
    const link = qs(id);
    if (!link) continue;
    on(link, 'click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      closeMoreMenu();
      navigate(route);
    });
  }

  const moreButton = qs('#btn-more');
  if (moreButton) {
    on(moreButton, 'click', () => {
      const dialog = getMoreDialog();
      if (dialog && dialog.open) closeMoreMenu();
      else openMoreMenu();
    });
  }

  const dialog = getMoreDialog();
  if (dialog) {
    on(dialog, 'close', () => {
      const trigger = qs('#btn-more');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
        trigger.classList.remove('is-active-popup');
        if (!document.body.classList.contains('is-locked') && typeof trigger.focus === 'function') {
          trigger.focus();
        }
      }
    });
    // Klik pada backdrop dialog menutup menu.
    on(dialog, 'click', (event) => {
      if (event.target === dialog) closeMoreMenu();
    });
  }

  const closeMore = qs('#btn-close-more');
  if (closeMore) on(closeMore, 'click', () => closeMoreMenu());

  for (const link of qsa('#more-menu a[href^="#/"]')) {
    on(link, 'click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const route = link.getAttribute('href');
      if (!route) return;
      event.preventDefault();
      closeMoreMenu();
      navigate(route);
    });
  }

  const switcher = qs('#profile-switcher');
  if (switcher) {
    on(switcher, 'change', async () => {
      if (!state || state.isLocked()) return;
      const profileId = switcher.value;
      if (!profileId) return;
      try {
        await state.setActiveProfile(profileId);
        toast('Profil aktif diganti.', 'success');
        await renderRoute();
      } catch (error) {
        toast(error && error.message ? error.message : 'Profil gagal diganti.', 'error');
        updateProfileSwitcher();
      }
    });
  }

  const lockButton = qs('#btn-lock');
  if (lockButton) {
    on(lockButton, 'click', async () => {
      if (!state || state.isLocked()) return;
      try {
        await state.lock();
      } catch (error) {
        toast(error && error.message ? error.message : 'Aplikasi gagal dikunci.', 'error');
        return;
      }
      document.body.classList.add('is-locked');
      closeMoreMenu();
      navigate('#/kunci');
      await renderRoute();
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', () => {
      closeMoreMenu();
      renderRoute({ focus: true }).catch(() => {});
    });
  }
}

function syncNav(route) {
  for (const [id, navRoute] of NAV_ITEMS) {
    const link = qs(id);
    if (!link) continue;
    const active = navRoute === route
      || (navRoute === '#/suara' && (route.startsWith('#/suara') || route === '#/bantuan-suara'));
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const moreButton = qs('#btn-more');
  if (moreButton) {
    const active = SECONDARY_ROUTES.has(route);
    moreButton.classList.toggle('is-active', active);
    if (active) moreButton.setAttribute('aria-current', 'page');
    else moreButton.removeAttribute('aria-current');
  }
}

// ---------------------------------------------------------------------------
// Error layar
// ---------------------------------------------------------------------------

const SAFE_ERROR_CODES = new Set([
  'DATA_RUSAK',
  'KRIPTO_TIDAK_TERSEDIA',
  'PENYIMPANAN_PENUH',
  'TERKUNCI',
  'KATA_SANDI_SALAH'
]);

function friendlyError(error, fallback) {
  if (error && typeof error.code === 'string' && SAFE_ERROR_CODES.has(error.code) && error.message) {
    return error.message;
  }
  return fallback || 'Layar ini gagal dimuat. Coba muat ulang perangkat.';
}

function detachCurrent() {
  if (typeof currentCleanup === 'function') {
    try {
      currentCleanup();
    } catch {
      // Cleanup layar tidak boleh menghalangi navigasi.
    }
  }
  currentCleanup = null;
}

function showFatal(error, message) {
  renderSeq += 1;
  detachCurrent();
  const root = qs('#app-view');
  if (!root) return;
  clear(root);
  root.removeAttribute('aria-busy');
  document.body.classList.remove('is-loading');

  const section = h('section', {
    id: 'screen-error',
    class: 'card stack',
    role: 'alert',
    'aria-labelledby': 'screen-error-title'
  },
  h('h2', { id: 'screen-error-title' }, 'Terjadi kesalahan'),
  h('p', { id: 'fatal-error', class: 'error-text' }, friendlyError(error, message)),
  h('p', { class: 'muted' }, 'Data Anda tidak dihapus. Jika masalah berlanjut, buka cadangan terakhir.'),
  h('div', { class: 'actions' },
    h('button', { id: 'btn-fatal-reload', class: 'button button--primary', type: 'button' }, 'Muat ulang')));

  root.appendChild(section);
  const reload = qs('#btn-fatal-reload');
  if (reload) on(reload, 'click', () => window.location.reload());
  document.title = 'Kesalahan — Rekam Medisku';
}

// ---------------------------------------------------------------------------
// Render route
// ---------------------------------------------------------------------------

function buildContext(profile) {
  return {
    state,
    profile,
    now: () => new Date(),
    navigate,
    toast,
    confirm: confirmDialog,
    refresh: () => renderRoute()
  };
}

/**
 * Merender route aktif ke #app-view.
 */
export async function renderRoute({ focus = false } = {}) {
  if (!state) return;
  if (typeof document === 'undefined') return;

  const locked = state.isLocked();
  document.body.classList.toggle('is-locked', locked);

  let route = currentRoute();
  if (locked && route !== '#/kunci') {
    navigate('#/kunci');
    return;
  }
  if (!locked && route === '#/kunci') {
    navigate('#/');
    return;
  }
  route = currentRoute();

  const definition = ROUTES[route];
  const root = qs('#app-view');
  if (!root) return;

  const seq = ++renderSeq;
  detachCurrent();
  syncNav(route);
  document.title = `${definition.title} — Rekam Medisku`;

  clear(root);
  root.setAttribute('aria-busy', 'true');
  root.appendChild(h('p', { class: 'loading', role: 'status' }, 'Memuat…'));

  let profile = null;
  try {
    profile = state.isLocked() ? null : state.getActiveProfile();
  } catch {
    profile = null;
  }

  let module;
  try {
    module = await import(definition.module);
  } catch {
    if (seq !== renderSeq) return;
    showFatal(null, `Layar "${definition.title}" gagal dimuat. Coba muat ulang perangkat.`);
    return;
  }
  if (seq !== renderSeq) return;

  if (!module || typeof module.render !== 'function') {
    showFatal(null, `Layar "${definition.title}" tidak tersedia. Coba muat ulang perangkat.`);
    return;
  }

  let cleanup;
  try {
    cleanup = await module.render(root, buildContext(profile));
  } catch (error) {
    if (seq !== renderSeq) return;
    showFatal(error);
    return;
  }
  if (seq !== renderSeq) {
    if (typeof cleanup === 'function') {
      try {
        cleanup();
      } catch {
        // abaikan
      }
    }
    return;
  }

  currentCleanup = typeof cleanup === 'function' ? cleanup : null;
  root.setAttribute('aria-busy', 'false');
  // Jangan rebut fokus dari kontrol yang sengaja di-autofocus layar (mis. kata sandi).
  const active = document.activeElement;
  const screenAlreadyFocused = active && active !== root && active !== document.body
    && typeof root.contains === 'function' && root.contains(active);
  if (focus && !screenAlreadyFocused && typeof root.focus === 'function') {
    try {
      root.focus({ preventScroll: false });
    } catch {
      root.focus();
    }
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (typeof location === 'undefined') return;
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  try {
    const registration = navigator.serviceWorker.register('./sw.js');
    if (registration && typeof registration.catch === 'function') registration.catch(() => {});
  } catch {
    // Registrasi service worker gagal senyap.
  }
}

function siapkanAksesibilitas() {
  try {
    pasangLiveRegion({ id: 'live-region', politeness: 'polite', atomic: true });
  } catch {
    // Live region global bersifat tambahan; kegagalannya tidak menghalangi boot.
  }
}

async function bootInternal() {
  siapkanAksesibilitas();
  bindShell();
  registerServiceWorker();

  const disclaimer = qs('#app-disclaimer');
  if (disclaimer) setText(disclaimer, DISCLAIMERS.app);

  try {
    const [storageModule, stateModule] = await Promise.all([
      import('./storage.js'),
      import('./state.js')
    ]);
    storage = storageModule.createStorage();
    state = stateModule.createState({ storage });
    await state.init();
  } catch (error) {
    state = null;
    storage = null;
    showFatal(error, 'Aplikasi gagal dimuat. Coba muat ulang perangkat.');
    return;
  }

  lastLocked = state.isLocked();
  syncShell();
  try {
    state.subscribe(handleStateChange);
  } catch {
    // Subscribe gagal tidak boleh mencegah layar pertama.
  }

  await renderRoute();
}

/**
 * Titik masuk aplikasi. Aman dipanggil lebih dari sekali.
 */
export async function boot() {
  if (!bootPromise) {
    bootPromise = bootInternal().catch((error) => {
      showFatal(error, 'Aplikasi gagal dimuat. Coba muat ulang perangkat.');
    });
  }
  return bootPromise;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { void boot(); }, { once: true });
  } else {
    void boot();
  }
}
