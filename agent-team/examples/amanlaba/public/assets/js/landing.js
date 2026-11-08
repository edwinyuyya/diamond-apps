/* AmanLaba — interaksi landing page.
   Tanpa dependency, tanpa request eksternal. */

const dokumen = document;
const PESAN_DEMO = "Versi demo: pembayaran belum tersedia.";

/* -------------------------------------------------------------------------
   1. Tahun berjalan
   ------------------------------------------------------------------------- */

const elemenTahun = dokumen.getElementById("tahun");
if (elemenTahun) {
  elemenTahun.textContent = String(new Date().getFullYear());
}

/* -------------------------------------------------------------------------
   2. Menu navigasi ponsel
   ------------------------------------------------------------------------- */

const tombolMenu = dokumen.getElementById("tombol-menu");
const navUtama = dokumen.getElementById("nav-utama");
const header = dokumen.querySelector(".situs-header");
const kueriDesktop = window.matchMedia("(min-width: 961px)");

function menuTerbuka() {
  return Boolean(navUtama && navUtama.classList.contains("nav-utama--terbuka"));
}

function aturMenu(buka) {
  if (!tombolMenu || !navUtama) return;
  navUtama.classList.toggle("nav-utama--terbuka", buka);
  tombolMenu.setAttribute("aria-expanded", String(buka));
  tombolMenu.setAttribute("aria-label", buka ? "Tutup menu navigasi" : "Buka menu navigasi");
}

if (tombolMenu && navUtama) {
  tombolMenu.addEventListener("click", (peristiwa) => {
    peristiwa.stopPropagation();
    aturMenu(!menuTerbuka());
  });

  navUtama.addEventListener("click", (peristiwa) => {
    if (peristiwa.target instanceof Element && peristiwa.target.closest("a")) {
      aturMenu(false);
    }
  });

  dokumen.addEventListener("click", (peristiwa) => {
    if (!menuTerbuka()) return;
    if (peristiwa.target instanceof Node && header && !header.contains(peristiwa.target)) {
      aturMenu(false);
    }
  });

  dokumen.addEventListener("keydown", (peristiwa) => {
    if (peristiwa.key === "Escape" && menuTerbuka()) {
      aturMenu(false);
      tombolMenu.focus();
    }
  });

  kueriDesktop.addEventListener("change", (peristiwa) => {
    if (peristiwa.matches) aturMenu(false);
  });
}

/* -------------------------------------------------------------------------
   3. Notifikasi paket demo
   ------------------------------------------------------------------------- */

const notifikasi = dokumen.getElementById("notifikasi-paket");
let pewaktuNotifikasi = 0;

function sembunyikanNotifikasi() {
  if (!notifikasi) return;
  notifikasi.classList.remove("notifikasi--tampil");
  window.setTimeout(() => {
    if (!notifikasi.classList.contains("notifikasi--tampil")) {
      notifikasi.hidden = true;
    }
  }, 160);
}

function tampilkanNotifikasi(pesan) {
  if (!notifikasi) return;
  window.clearTimeout(pewaktuNotifikasi);
  notifikasi.textContent = pesan;
  notifikasi.hidden = false;
  /* Paksa reflow agar transisi masuk berjalan. */
  void notifikasi.offsetWidth;
  notifikasi.classList.add("notifikasi--tampil");
  pewaktuNotifikasi = window.setTimeout(sembunyikanNotifikasi, 5600);
}

dokumen.querySelectorAll('[data-demo="true"]').forEach((tombol) => {
  tombol.addEventListener("click", () => {
    tampilkanNotifikasi(PESAN_DEMO);
  });
});

/* -------------------------------------------------------------------------
   4. Header saat digulir + penanda bagian aktif
   ------------------------------------------------------------------------- */

const tautanNav = navUtama
  ? Array.from(navUtama.querySelectorAll('a[href^="#"]'))
  : [];

const bagianNav = tautanNav
  .map((tautan) => {
    const id = tautan.getAttribute("href").slice(1);
    const bagian = id ? dokumen.getElementById(id) : null;
    return bagian ? { tautan, bagian } : null;
  })
  .filter(Boolean);

let gulirMenunggu = false;

function perbaruiSaatGulir() {
  gulirMenunggu = false;

  if (header) {
    header.classList.toggle("situs-header--tergulir", window.scrollY > 6);
  }

  if (bagianNav.length === 0) return;

  const posisi = window.scrollY + 130;
  let aktif = null;

  for (const item of bagianNav) {
    const atas = item.bagian.getBoundingClientRect().top + window.scrollY;
    if (atas <= posisi) aktif = item;
  }

  /* Jika sudah di dasar halaman, aktifkan bagian terakhir. */
  if (window.innerHeight + window.scrollY >= dokumen.documentElement.scrollHeight - 4) {
    aktif = bagianNav[bagianNav.length - 1];
  }

  for (const item of bagianNav) {
    if (item === aktif) {
      item.tautan.setAttribute("aria-current", "location");
    } else {
      item.tautan.removeAttribute("aria-current");
    }
  }
}

function jadwalkanGulir() {
  if (gulirMenunggu) return;
  gulirMenunggu = true;
  window.requestAnimationFrame(perbaruiSaatGulir);
}

window.addEventListener("scroll", jadwalkanGulir, { passive: true });
window.addEventListener("resize", jadwalkanGulir, { passive: true });
perbaruiSaatGulir();

/* -------------------------------------------------------------------------
   5. FAQ: satu panel terbuka agar halaman tetap ringkas
   ------------------------------------------------------------------------- */

const daftarFaq = Array.from(dokumen.querySelectorAll(".faq__item"));

daftarFaq.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    for (const lain of daftarFaq) {
      if (lain !== item && lain.open) lain.open = false;
    }
  });
});
