// app/sw.js — service worker Rekam Medisku.
// Cache-first untuk app shell dan aset /vendor/ same-origin. Tanpa request eksternal,
// tanpa push, tanpa background sync. Aset OCR besar TIDAK di-precache saat install.

const CACHE_NAME = 'rawatku-v1';
const VENDOR_CACHE = 'rawatku-vendor-v1';

// Daftar precache persis sesuai CONTRACT.md bagian 11.2 (semua path harus ada).
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './css/style.css',
  './css/print.css',
  './js/app.js',
  './js/dom.js',
  './js/model.js',
  './js/storage.js',
  './js/state.js',
  './js/crypto.js',
  './js/backup.js',
  './js/qr.js',
  './js/photos.js',
  './js/scanSession.js',
  './js/ocr/adaptor.js',
  './js/ocr/tesseractEngine.js',
  './js/logic/dates.js',
  './js/logic/schedule.js',
  './js/logic/stock.js',
  './js/logic/adherence.js',
  './js/logic/safety.js',
  './js/logic/vitals.js',
  './js/logic/summary.js',
  './js/logic/resepKamus.js',
  './js/logic/resep.js',
  './js/logic/resepSediaan.js',
  './js/logic/resepJadwal.js',
  './js/logic/rekam.js',
  './js/logic/labParse.js',
  './js/ui/dashboard.js',
  './js/ui/profile.js',
  './js/ui/settings.js',
  './js/ui/lock.js',
  './js/ui/visits.js',
  './js/ui/attachments.js',
  './js/ui/meds.js',
  './js/ui/vitals.js',
  './js/ui/chart.js',
  './js/ui/emergency.js',
  './js/ui/report.js',
  './js/ui/scan.js',
  './js/ui/photo-capture.js',
  './js/ui/scan-review.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith('rawatku-') &&
              key !== CACHE_NAME &&
              key !== VENDOR_CACHE
          )
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isCacheable(response) {
  return Boolean(
    response && response.status === 200 && response.type === 'basic'
  );
}

// App shell: cache-first, lalu perbarui cache dari network di latar belakang.
async function handleShellRequest(request, event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });

  if (cached) {
    event.waitUntil(refreshShellCache(cache, request));
    return cached;
  }

  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      event.waitUntil(cache.put(request, response.clone()));
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function refreshShellCache(cache, request) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      await cache.put(request, response.clone());
    }
  } catch {
    // Offline: pertahankan cache lama.
  }
}

// Navigasi: cache-first dengan fallback index.html, lalu network.
async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached =
    (await cache.match(request, { ignoreSearch: true })) ||
    (await cache.match('./index.html')) ||
    (await cache.match('./'));

  if (cached) return cached;
  return fetch(request);
}

// Aset OCR: runtime cache-first. Miss -> network -> simpan ke VENDOR_CACHE.
// Tidak pernah precache vendor saat install.
async function handleVendorRequest(request, event) {
  const cache = await caches.open(VENDOR_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
    }
    return response;
  } catch {
    // Offline dan aset vendor belum pernah dipakai: gagal dengan jelas,
    // adaptor OCR memetakannya menjadi OCR_TIDAK_TERSEDIA.
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Hanya GET same-origin. Selain itu biarkan browser menanganinya.
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Health check selalu ke network dan tidak pernah di-cache.
  if (url.pathname === '/health') return;

  if (url.pathname.startsWith('/vendor/')) {
    event.respondWith(handleVendorRequest(request, event));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(handleShellRequest(request, event));
});
