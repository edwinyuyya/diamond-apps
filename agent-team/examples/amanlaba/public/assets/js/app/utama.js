// Titik masuk aplikasi /app: memuat template, mengelola form, memanggil API,
// merender hasil, dan menghubungkan penyimpanan lokal.

import {
  bacaForm,
  bersihkanGalat,
  isiForm,
  pasangPerubahan,
  tampilkanGalat,
} from "./form.js";
import {
  renderHasil,
  tandaiUsang,
  tampilkanPanelKosong,
} from "./hasil.js";
import { formatAngka, formatTanggal } from "./format.js";
import {
  PESAN_PENYIMPANAN_TIDAK_TERSEDIA,
  bacaDaftar,
  cariSkenario,
  cekPenyimpanan,
  hapusSkenario,
  simpanSkenario,
} from "./penyimpanan.js";

const ID_TEMPLATE_AWAL = "warung-makan";
const BATAS_WAKTU_API_MS = 30000;

const state = {
  templates: [],
  daftar: [],
  idAktif: null,
  sapuanHarga: null,
  penyimpananTersedia: true,
  peringatanPenyimpanan: null,
  hasilAda: false,
  sedangMenghitung: false,
  nomorPermintaan: 0,
  controller: null,
  berubahSelamaHitung: false,
};

let timerToast = null;

function el(id) {
  return document.getElementById(id);
}

function tampilkanToast(pesan, jenis = "info") {
  const toast = el("notifikasi");
  if (!toast) return;
  if (timerToast) clearTimeout(timerToast);
  toast.hidden = false;
  toast.dataset.jenis = jenis;
  toast.textContent = pesan;
  timerToast = setTimeout(() => {
    toast.hidden = true;
    toast.textContent = "";
    timerToast = null;
  }, 5000);
}

function setStatus(teks) {
  const status = el("status-hitung");
  if (status) status.textContent = teks;
}

function setMemuat(aktif) {
  const tombol = el("tombol-hitung");
  if (!tombol) return;
  tombol.disabled = aktif;
  tombol.textContent = aktif ? "Menghitung…" : "Hitung Risiko";
  if (aktif) {
    tombol.setAttribute("aria-busy", "true");
  } else {
    tombol.removeAttribute("aria-busy");
  }
}

class GalatApi extends Error {
  constructor(pesan, { kode, detail, status } = {}) {
    super(pesan);
    this.name = "GalatApi";
    this.kode = kode || null;
    this.detail = Array.isArray(detail) ? detail : [];
    this.status = status || null;
  }
}

async function ambilTemplate() {
  const controller = new AbortController();
  const batas = setTimeout(() => controller.abort(), 15000);
  try {
    const respons = await fetch("/api/template", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!respons.ok) {
      throw new Error(`Template tidak dapat dimuat (status ${respons.status}).`);
    }
    const isi = await respons.json();
    if (!Array.isArray(isi?.data)) {
      throw new Error("Bentuk data template tidak sesuai.");
    }
    return isi.data;
  } finally {
    clearTimeout(batas);
  }
}

async function panggilSimulasi(skenario, opsi, signal) {
  let respons;
  try {
    respons = await fetch("/api/simulasi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ skenario, opsi }),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new GalatApi(
      "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.",
    );
  }

  let isi = null;
  try {
    isi = await respons.json();
  } catch {
    isi = null;
  }

  if (!respons.ok) {
    const galat = isi?.error;
    throw new GalatApi(
      galat?.pesan || `Server mengembalikan status ${respons.status}.`,
      {
        kode: galat?.kode,
        detail: galat?.detail,
        status: respons.status,
      },
    );
  }

  if (!isi || !isi.data) {
    throw new GalatApi(
      "Respons server tidak sesuai. Coba lagi beberapa saat lagi.",
    );
  }

  return isi.data;
}

/* --------------------------------------------------------------------------
 * Template
 * ------------------------------------------------------------------------ */

function renderTemplateMemuat() {
  const wadah = el("daftar-template");
  if (!wadah) return;
  wadah.replaceChildren();
  const p = document.createElement("p");
  p.className = "app-memuat";
  p.textContent = "Memuat template…";
  wadah.append(p);
}

function renderTemplateGalat() {
  const wadah = el("daftar-template");
  if (!wadah) return;
  wadah.replaceChildren();

  const p = document.createElement("p");
  p.className = "app-galat-inline";
  p.textContent =
    "Template tidak dapat dimuat. Periksa koneksi ke server, lalu coba lagi.";

  const tombol = document.createElement("button");
  tombol.type = "button";
  tombol.className = "tombol tombol--garis app-tombol-ulang";
  tombol.dataset.aksi = "ulang-template";
  tombol.textContent = "Coba Lagi";

  wadah.append(p, tombol);
}

function renderTemplates() {
  const wadah = el("daftar-template");
  if (!wadah) return;
  wadah.replaceChildren();

  if (state.templates.length === 0) {
    const p = document.createElement("p");
    p.className = "app-kosong-kecil";
    p.textContent = "Belum ada template yang tersedia.";
    wadah.append(p);
    return;
  }

  for (const template of state.templates) {
    const tombol = document.createElement("button");
    tombol.type = "button";
    tombol.className = "app-template";
    tombol.dataset.templateId = template.id;
    tombol.setAttribute(
      "aria-label",
      `Muat template ${template.nama}${template.deskripsi ? `. ${template.deskripsi}` : ""}`,
    );

    const emoji = document.createElement("span");
    emoji.className = "app-template__emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = template.emoji || "📊";

    const isi = document.createElement("span");
    isi.className = "app-template__isi";

    const nama = document.createElement("span");
    nama.className = "app-template__nama";
    nama.textContent = template.nama || template.id;

    const deskripsi = document.createElement("span");
    deskripsi.className = "app-template__deskripsi";
    deskripsi.textContent = template.deskripsi || "";

    isi.append(nama, deskripsi);
    tombol.append(emoji, isi);
    wadah.append(tombol);
  }
}

async function ulangTemplate() {
  renderTemplateMemuat();
  try {
    state.templates = await ambilTemplate();
    renderTemplates();
    tampilkanToast("Template berhasil dimuat.");
  } catch {
    renderTemplateGalat();
    tampilkanToast("Template masih tidak dapat dimuat.", "error");
  }
}

function terapkanTemplate(template) {
  if (!template?.skenario) {
    tampilkanToast("Template tidak lengkap sehingga tidak dapat dimuat.", "error");
    return;
  }
  isiForm(template.skenario, template.opsi || {});
  state.idAktif = null;
  state.sapuanHarga = template.opsi?.sapuanHarga ?? null;
  perbaruiTautanLaporan();
  renderDaftarSkenario();
  if (state.hasilAda) tandaiUsang(true);
  tampilkanToast(`Template ${template.nama || template.id} dimuat.`);
  hitungRisiko({ otomatis: true });
}

/* --------------------------------------------------------------------------
 * Skenario tersimpan
 * ------------------------------------------------------------------------ */

function setPeringatanPenyimpanan(pesan) {
  const wadah = el("peringatan-penyimpanan");
  if (!wadah) return;
  if (pesan) {
    wadah.textContent = pesan;
    wadah.hidden = false;
  } else {
    wadah.textContent = "";
    wadah.hidden = true;
  }
}

function perbaruiTombolSimpan() {
  const tombol = el("tombol-simpan");
  if (!tombol) return;
  tombol.disabled = !state.penyimpananTersedia;
  tombol.classList.toggle("nonaktif", !state.penyimpananTersedia);
  if (state.penyimpananTersedia) {
    tombol.removeAttribute("title");
  } else {
    tombol.title = PESAN_PENYIMPANAN_TIDAK_TERSEDIA;
  }
}

function perbaruiTautanLaporan() {
  const tautan = el("tautan-laporan");
  if (!tautan) return;
  const entri = cariSkenario(state.daftar, state.idAktif);
  if (entri) {
    tautan.href = `/laporan?id=${encodeURIComponent(entri.id)}`;
    tautan.classList.remove("nonaktif");
    tautan.setAttribute("aria-disabled", "false");
    tautan.tabIndex = 0;
    tautan.title = "Buka laporan untuk skenario tersimpan ini.";
  } else {
    tautan.removeAttribute("href");
    tautan.classList.add("nonaktif");
    tautan.setAttribute("aria-disabled", "true");
    tautan.tabIndex = -1;
    tautan.title = "Simpan skenario terlebih dahulu untuk membuat laporan.";
  }
}

function renderDaftarSkenario() {
  const wadah = el("daftar-skenario");
  const jumlah = el("jumlah-skenario");
  if (jumlah) jumlah.textContent = String(state.daftar.length);
  if (!wadah) return;

  wadah.replaceChildren();

  setPeringatanPenyimpanan(
    state.penyimpananTersedia ? state.peringatanPenyimpanan : PESAN_PENYIMPANAN_TIDAK_TERSEDIA,
  );
  perbaruiTombolSimpan();

  if (!state.penyimpananTersedia) {
    const p = document.createElement("p");
    p.className = "app-kosong-kecil";
    p.textContent = PESAN_PENYIMPANAN_TIDAK_TERSEDIA;
    wadah.append(p);
    return;
  }

  if (state.daftar.length === 0) {
    const p = document.createElement("p");
    p.className = "app-kosong-kecil";
    p.textContent =
      "Belum ada skenario tersimpan. Simulasikan lalu tekan Simpan Skenario.";
    wadah.append(p);
    return;
  }

  const daftar = document.createElement("ul");
  daftar.className = "app-skenario-daftar";

  for (const entri of state.daftar) {
    const item = document.createElement("li");
    item.className = "app-skenario-item";

    const info = document.createElement("div");
    info.className = "app-skenario-item__info";

    const nama = document.createElement("p");
    nama.className = "app-skenario-item__nama";
    nama.textContent = entri.nama || entri.skenario?.nama || "Skenario Tanpa Nama";

    const meta = document.createElement("p");
    meta.className = "app-skenario-item__meta";
    const tanggal = entri.diperbaruiPada || entri.dibuatPada;
    meta.textContent = tanggal
      ? `Diperbarui ${formatTanggal(tanggal)}`
      : "Tanggal tidak tersedia";

    info.append(nama, meta);

    if (state.idAktif === entri.id) {
      const badge = document.createElement("span");
      badge.className = "badge badge--aman app-skenario-item__badge";
      badge.textContent = "Aktif";
      info.append(badge);
    }

    const aksi = document.createElement("div");
    aksi.className = "app-skenario-item__aksi";

    const muat = document.createElement("button");
    muat.type = "button";
    muat.className = "tombol tombol--halus app-tombol-kecil";
    muat.dataset.aksi = "muat";
    muat.dataset.id = entri.id;
    muat.setAttribute("aria-label", `Muat skenario ${entri.nama || entri.id}`);
    muat.textContent = "Muat";

    const hapus = document.createElement("button");
    hapus.type = "button";
    hapus.className = "tombol tombol--bahaya app-tombol-kecil";
    hapus.dataset.aksi = "hapus";
    hapus.dataset.id = entri.id;
    hapus.setAttribute("aria-label", `Hapus skenario ${entri.nama || entri.id}`);
    hapus.textContent = "Hapus";

    aksi.append(muat, hapus);
    item.append(info, aksi);
    daftar.append(item);
  }

  wadah.append(daftar);
}

function muatSkenario(id) {
  const entri = cariSkenario(state.daftar, id);
  if (!entri) {
    tampilkanToast("Skenario tidak ditemukan di penyimpanan lokal.", "error");
    return;
  }
  isiForm(entri.skenario, entri.opsi || {});
  state.idAktif = entri.id;
  state.sapuanHarga = entri.opsi?.sapuanHarga ?? null;
  perbaruiTautanLaporan();
  renderDaftarSkenario();
  if (state.hasilAda) tandaiUsang(true);
  tampilkanToast(`Skenario "${entri.nama || "Tanpa Nama"}" dimuat.`);
  hitungRisiko({ otomatis: true });
}

function hapusSkenarioTersimpan(id) {
  const entri = cariSkenario(state.daftar, id);
  if (!entri) {
    tampilkanToast("Skenario tidak ditemukan.", "error");
    return;
  }

  const yakin = window.confirm(
    `Hapus skenario "${entri.nama || "Tanpa Nama"}"? Tindakan ini tidak dapat dibatalkan.`,
  );
  if (!yakin) return;

  const hasil = hapusSkenario(state.daftar, id);
  if (!hasil.ok) {
    tampilkanToast(hasil.pesan || "Skenario gagal dihapus.", "error");
    if (hasil.pesan === PESAN_PENYIMPANAN_TIDAK_TERSEDIA) {
      state.penyimpananTersedia = false;
      renderDaftarSkenario();
    }
    return;
  }

  state.daftar = hasil.daftar;
  if (state.idAktif === id) {
    state.idAktif = null;
    state.sapuanHarga = null;
  }
  perbaruiTautanLaporan();
  renderDaftarSkenario();
  tampilkanToast("Skenario dihapus.");
}

function simpanSkenarioAktif() {
  if (!state.penyimpananTersedia) {
    setPeringatanPenyimpanan(PESAN_PENYIMPANAN_TIDAK_TERSEDIA);
    tampilkanToast(PESAN_PENYIMPANAN_TIDAK_TERSEDIA, "error");
    return;
  }

  const baca = bacaForm({ sapuanHarga: state.sapuanHarga });
  if (!baca.valid) {
    tampilkanGalat("Periksa input sebelum menyimpan skenario.", baca.galat);
    setStatus("Periksa input yang ditandai sebelum menyimpan.");
    return;
  }

  const namaInput = el("nama-skenario");
  const namaMentah = namaInput?.value.trim() ?? "";
  const nama = namaMentah || "Skenario Tanpa Nama";

  const hasil = simpanSkenario(
    state.daftar,
    state.idAktif,
    nama,
    baca.skenario,
    { ...baca.opsi, sapuanHarga: state.sapuanHarga },
  );

  if (!hasil.ok) {
    tampilkanToast(hasil.pesan || "Skenario gagal disimpan.", "error");
    if (hasil.pesan === PESAN_PENYIMPANAN_TIDAK_TERSEDIA) {
      state.penyimpananTersedia = false;
      setPeringatanPenyimpanan(PESAN_PENYIMPANAN_TIDAK_TERSEDIA);
      renderDaftarSkenario();
    }
    return;
  }

  state.daftar = hasil.daftar;
  state.idAktif = hasil.entri.id;
  state.peringatanPenyimpanan = null;
  if (!namaMentah && namaInput) namaInput.value = nama;

  perbaruiTautanLaporan();
  renderDaftarSkenario();
  setStatus("Skenario disimpan di browser ini.");
  tampilkanToast(
    namaMentah ? "Skenario disimpan." : "Skenario disimpan sebagai “Skenario Tanpa Nama”.",
  );
}

/* --------------------------------------------------------------------------
 * Simulasi
 * ------------------------------------------------------------------------ */

async function hitungRisiko({ otomatis = false } = {}) {
  const baca = bacaForm({ sapuanHarga: state.sapuanHarga });

  if (!baca.valid) {
    tampilkanGalat("Periksa input berikut sebelum menghitung.", baca.galat);
    setStatus("Periksa input yang ditandai.");
    if (!otomatis) {
      tampilkanToast("Input belum valid. Periksa kolom yang ditandai.", "error");
    }
    return;
  }

  bersihkanGalat();

  const nomor = ++state.nomorPermintaan;
  if (state.controller) {
    state.controller.abort();
  }
  const controller = new AbortController();
  state.controller = controller;
  state.sedangMenghitung = true;
  state.berubahSelamaHitung = false;

  setMemuat(true);
  setStatus(
    `Menghitung ${formatAngka(baca.opsi.iterasi)} simulasi dengan seed ${baca.opsi.seed}…`,
  );
  if (state.hasilAda) tandaiUsang(true);

  let batasWaktu = false;
  const timer = setTimeout(() => {
    batasWaktu = true;
    controller.abort();
  }, BATAS_WAKTU_API_MS);

  try {
    const data = await panggilSimulasi(baca.skenario, baca.opsi, controller.signal);
    if (nomor !== state.nomorPermintaan) return;

    state.hasilAda = true;
    renderHasil(data, { skenario: baca.skenario });
    if (state.berubahSelamaHitung) tandaiUsang(true);

    setStatus(
      `Selesai: ${formatAngka(data.meta?.iterasi)} simulasi, seed ${data.meta?.seed}.`,
    );
  } catch (error) {
    if (nomor !== state.nomorPermintaan) return;
    if (error?.name === "AbortError" && !batasWaktu) {
      // Permintaan lain sudah menggantikan permintaan ini.
      return;
    }

    let pesan = error?.message || "Perhitungan gagal. Coba lagi.";
    if (batasWaktu) {
      pesan = "Perhitungan melebihi 30 detik. Coba lagi dengan iterasi lebih kecil.";
    }
    if (error instanceof GalatApi) {
      tampilkanGalat(pesan, error.detail);
    } else {
      tampilkanGalat(pesan);
    }

    setStatus("Perhitungan gagal. Perbaiki kendala lalu coba lagi.");
    if (state.hasilAda) tandaiUsang(true);
    tampilkanToast("Perhitungan gagal.", "error");
  } finally {
    clearTimeout(timer);
    if (nomor === state.nomorPermintaan) {
      state.sedangMenghitung = false;
      state.controller = null;
      setMemuat(false);
    }
  }
}

/* --------------------------------------------------------------------------
 * Inisialisasi dan event
 * ------------------------------------------------------------------------ */

function acakSeed() {
  const input = el("seed");
  if (!input) return;

  let nilai = 0;
  try {
    const acak = new Uint32Array(1);
    globalThis.crypto.getRandomValues(acak);
    nilai = acak[0] % 2147483648;
  } catch {
    nilai = Math.floor(Math.random() * 2147483648);
  }

  input.value = String(nilai);
  input.removeAttribute("aria-invalid");
  if (state.hasilAda) tandaiUsang(true);
  setStatus(`Seed diacak menjadi ${nilai}. Tekan Hitung Risiko untuk memperbarui hasil.`);
}

function pasangEvent() {
  const form = el("form-skenario");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    hitungRisiko();
  });

  pasangPerubahan(() => {
    if (state.sedangMenghitung) state.berubahSelamaHitung = true;
    if (state.hasilAda) tandaiUsang(true);
  });

  el("tombol-acak-seed")?.addEventListener("click", acakSeed);
  el("tombol-simpan")?.addEventListener("click", simpanSkenarioAktif);

  el("daftar-template")?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const ulang = target.closest("[data-aksi='ulang-template']");
    if (ulang) {
      ulangTemplate();
      return;
    }

    const tombol = target.closest("[data-template-id]");
    if (!tombol) return;
    const id = tombol.getAttribute("data-template-id");
    const template = state.templates.find((butir) => butir.id === id);
    if (!template) {
      tampilkanToast("Template tidak ditemukan.", "error");
      return;
    }
    terapkanTemplate(template);
  });

  el("daftar-skenario")?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const tombol = target.closest("button[data-aksi]");
    if (!tombol) return;
    const id = tombol.getAttribute("data-id");
    const aksi = tombol.getAttribute("data-aksi");
    if (aksi === "muat") muatSkenario(id);
    if (aksi === "hapus") hapusSkenarioTersimpan(id);
  });

  el("tautan-laporan")?.addEventListener("click", (event) => {
    const tautan = event.currentTarget;
    if (tautan.getAttribute("aria-disabled") === "true" || !tautan.getAttribute("href")) {
      event.preventDefault();
      tampilkanToast("Simpan skenario terlebih dahulu untuk membuat laporan.", "error");
    }
  });
}

function terapkanDataPenyimpanan(simpanan, bisaTulis) {
  state.penyimpananTersedia = Boolean(simpanan?.tersedia && bisaTulis);
  state.daftar = Array.isArray(simpanan?.daftar) ? simpanan.daftar : [];
  state.peringatanPenyimpanan = simpanan?.peringatan || null;
  if (!state.penyimpananTersedia) {
    state.peringatanPenyimpanan = PESAN_PENYIMPANAN_TIDAK_TERSEDIA;
  }
  renderDaftarSkenario();
  if (!state.penyimpananTersedia) {
    tampilkanToast(PESAN_PENYIMPANAN_TIDAK_TERSEDIA, "error");
  } else if (state.peringatanPenyimpanan) {
    tampilkanToast(state.peringatanPenyimpanan, "error");
  }
}

async function mulai() {
  tampilkanPanelKosong();
  renderTemplateMemuat();
  setStatus("Menyiapkan template…");

  // Fetch template dimulai lebih dulu; localStorage dibaca sementara request berjalan.
  const janjiTemplate = ambilTemplate();
  const simpanan = bacaDaftar();
  const bisaTulis = cekPenyimpanan();
  terapkanDataPenyimpanan(simpanan, bisaTulis);

  pasangEvent();

  let templates = [];
  try {
    templates = await janjiTemplate;
    state.templates = templates;
    renderTemplates();
  } catch {
    state.templates = [];
    renderTemplateGalat();
  }

  const templateAwal =
    templates.find((template) => template.id === ID_TEMPLATE_AWAL) ||
    templates[0] ||
    null;

  if (templateAwal?.skenario) {
    isiForm(templateAwal.skenario, templateAwal.opsi || {});
    state.sapuanHarga = templateAwal.opsi?.sapuanHarga ?? null;
  } else {
    // Form sudah berisi nilai awal Warung Makan di HTML.
    state.sapuanHarga = null;
    if (templates.length > 0) {
      setStatus("Template Warung Makan tidak ditemukan; memakai nilai awal.");
    }
  }

  state.idAktif = null;
  perbaruiTautanLaporan();
  renderDaftarSkenario();

  await hitungRisiko({ otomatis: true });
}

mulai().catch(() => {
  // Kegagalan tak terduga saat menyiapkan halaman tidak boleh membuat UI diam.
  const pesan = "Aplikasi gagal disiapkan. Muat ulang halaman lalu coba lagi.";
  setStatus("Gagal menyiapkan aplikasi.");
  tampilkanGalat(pesan);
  tampilkanToast(pesan, "error");
  setMemuat(false);
});
