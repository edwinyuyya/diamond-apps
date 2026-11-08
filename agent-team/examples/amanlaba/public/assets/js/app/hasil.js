// Merender seluruh hasil simulasi ke panel kanan.

import {
  formatAngka,
  formatPersen,
  formatRupiah,
  formatTanggalWaktu,
  formatUnit,
} from "./format.js";
import { gambarHarga, gambarHistogram, gambarTornado } from "./grafik.js";

function el(id) {
  return document.getElementById(id);
}

function setTeks(id, teks) {
  const node = el(id);
  if (node) node.textContent = teks;
}

function setNilai(id, nilai, teks) {
  const node = el(id);
  if (!node) return;
  node.textContent = teks;
  node.classList.toggle(
    "app-nilai--negatif",
    typeof nilai === "number" && Number.isFinite(nilai) && nilai < 0,
  );
}

function isiTabel(idTbody, baris, jumlahKolom) {
  const tbody = el(idTbody);
  if (!tbody) return;
  tbody.replaceChildren();

  if (!Array.isArray(baris) || baris.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = jumlahKolom;
    td.textContent = "Belum ada data.";
    tr.append(td);
    tbody.append(tr);
    return;
  }

  for (const isiBaris of baris) {
    const tr = document.createElement("tr");
    for (const isi of isiBaris) {
      const td = document.createElement("td");
      td.textContent = isi;
      tr.append(td);
    }
    tbody.append(tr);
  }
}

function isiTabelHistogram(histogram) {
  const bin = Array.isArray(histogram?.bin) ? histogram.bin : [];
  isiTabel(
    "tabel-histogram",
    bin.map((butir) => [
      `${formatRupiah(butir.mulai)} – ${formatRupiah(butir.akhir)}`,
      formatAngka(butir.jumlah),
      formatPersen(butir.proporsi),
    ]),
    3,
  );
}

function isiTabelTornado(sensitivitas) {
  const daftar = Array.isArray(sensitivitas) ? sensitivitas : [];
  isiTabel(
    "tabel-tornado",
    daftar.map((butir) => [
      butir.label || butir.kunci || "—",
      formatRupiah(butir.labaRendah),
      formatRupiah(butir.labaTinggi),
      formatRupiah(butir.dampak),
    ]),
    4,
  );
}

function isiTabelHarga(harga) {
  const sapuan = Array.isArray(harga?.sapuan) ? harga.sapuan : [];
  isiTabel(
    "tabel-harga",
    sapuan.map((butir) => [
      formatRupiah(butir.harga),
      formatRupiah(butir.labaRataRata),
      formatRupiah(butir.labaP5),
      formatRupiah(butir.labaP50),
      formatPersen(butir.peluangRugi),
    ]),
    5,
  );
}

function renderTitikImpas(titikImpas) {
  const valid = Boolean(titikImpas?.valid);
  if (valid) {
    setNilai("nilai-impas-unit", null, formatUnit(titikImpas.unit));
    setNilai(
      "nilai-impas-pendapatan",
      null,
      formatRupiah(titikImpas.pendapatan),
    );
    const bagian = [
      "Dihitung dari nilai paling mungkin (mode) tiap variabel.",
    ];
    if (Number.isFinite(titikImpas.marginPerUnit)) {
      bagian.push(
        `Margin kontribusi ${formatRupiah(titikImpas.marginPerUnit)} per unit.`,
      );
    }
    if (Number.isFinite(titikImpas.hargaAcuan)) {
      bagian.push(`Harga acuan ${formatRupiah(titikImpas.hargaAcuan)}.`);
    }
    setTeks("catatan-impas", bagian.join(" "));
  } else {
    setNilai("nilai-impas-unit", null, "Tidak tersedia");
    setNilai("nilai-impas-pendapatan", null, "Tidak tersedia");
    setTeks(
      "catatan-impas",
      titikImpas?.catatan ||
        "Titik impas tidak dapat dihitung karena harga jual tidak lebih besar dari biaya variabel per unit.",
    );
  }
}

function renderRekomendasi(harga) {
  const terbaik = harga?.terbaik;
  const teraman = harga?.teraman;

  if (terbaik && Number.isFinite(terbaik.harga)) {
    setNilai("label-harga-terbaik", terbaik.harga, formatRupiah(terbaik.harga));
    const alasan = terbaik.alasan || "Laba rata-rata tertinggi dari sapuan harga.";
    setTeks(
      "alasan-harga-terbaik",
      `${alasan} Peluang rugi ${formatPersen(terbaik.peluangRugi)}; laba rata-rata ${formatRupiah(terbaik.labaRataRata)} per bulan.`,
    );
  } else {
    setNilai("label-harga-terbaik", null, "—");
    setTeks("alasan-harga-terbaik", "Rekomendasi belum tersedia.");
  }

  if (teraman && Number.isFinite(teraman.harga)) {
    setNilai("label-harga-teraman", teraman.harga, formatRupiah(teraman.harga));
    const alasan = teraman.alasan || "Peluang rugi terendah dari sapuan harga.";
    setTeks(
      "alasan-harga-teraman",
      `${alasan} Peluang rugi ${formatPersen(teraman.peluangRugi)}; laba rata-rata ${formatRupiah(teraman.labaRataRata)} per bulan.`,
    );
  } else {
    setNilai("label-harga-teraman", null, "—");
    setTeks("alasan-harga-teraman", "Rekomendasi belum tersedia.");
  }
}

function hitungHargaImpas(skenario) {
  if (!skenario) return null;
  const harga = skenario.hargaJual?.mode;
  const tetap = skenario.biayaTetap?.mode;
  const variabel = skenario.biayaVariabel?.mode;
  const permintaan = skenario.permintaan?.mode;
  if (
    !Number.isFinite(tetap) ||
    !Number.isFinite(variabel) ||
    !Number.isFinite(permintaan)
  ) {
    return null;
  }
  if (!Number.isFinite(harga)) return null;
  return variabel + tetap / Math.max(permintaan, 1);
}

/**
 * Menampilkan data hasil simulasi.
 * @param {object} data isi response `data` dari POST /api/simulasi
 * @param {{skenario?:object}} konteks
 */
export function renderHasil(data, konteks = {}) {
  if (!data || !data.ringkasan) {
    throw new Error("Hasil simulasi tidak lengkap. Coba jalankan ulang.");
  }

  const ringkasan = data.ringkasan;
  const meta = data.meta || {};

  setNilai("nilai-peluang-rugi", null, formatPersen(ringkasan.peluangRugi));
  setNilai("nilai-peluang-untung", null, formatPersen(ringkasan.peluangUntung));

  setNilai("nilai-p5", ringkasan.labaP5, formatRupiah(ringkasan.labaP5));
  setNilai("nilai-p50", ringkasan.labaP50, formatRupiah(ringkasan.labaP50));
  setNilai("nilai-p95", ringkasan.labaP95, formatRupiah(ringkasan.labaP95));
  setNilai(
    "nilai-rata-rata",
    ringkasan.labaRataRata,
    formatRupiah(ringkasan.labaRataRata),
  );
  setNilai("nilai-min", ringkasan.labaMin, formatRupiah(ringkasan.labaMin));
  setNilai("nilai-maks", ringkasan.labaMax, formatRupiah(ringkasan.labaMax));
  setNilai(
    "nilai-deviasi",
    null,
    formatRupiah(ringkasan.standarDeviasi),
  );

  renderTitikImpas(data.titikImpas);
  renderRekomendasi(data.harga);

  isiTabelHistogram(data.histogram);
  isiTabelTornado(data.sensitivitas);
  isiTabelHarga(data.harga);

  gambarHistogram(el("grafik-histogram"), data);
  gambarTornado(el("grafik-tornado"), data.sensitivitas);
  gambarHarga(el("grafik-harga"), data.harga, {
    hargaImpas: hitungHargaImpas(konteks.skenario),
  });

  setTeks(
    "meta-hasil",
    `${formatAngka(meta.iterasi)} simulasi · seed ${meta.seed} · mesin ${meta.versiMesin || "1.0.0"} · dihitung ${formatTanggalWaktu(meta.dihitungPada)}`,
  );
  setTeks("badge-simulasi", `${formatAngka(meta.iterasi)} simulasi`);
  setTeks("indikator-simulasi", `${formatAngka(meta.iterasi)} simulasi`);

  const panel = el("panel-hasil");
  const kosong = el("panel-kosong");
  if (kosong) kosong.hidden = true;
  if (panel) panel.hidden = false;

  tandaiUsang(false);
}

/** Menandai hasil lama sebagai belum dihitung ulang. */
export function tandaiUsang(aktif) {
  const panel = el("panel-hasil");
  const status = el("status-basi");
  if (status) status.hidden = !aktif;
  if (panel) panel.classList.toggle("app-hasil--usang", Boolean(aktif));
}

/** Menampilkan panel kosong (dipakai sebelum hasil pertama). */
export function tampilkanPanelKosong() {
  const panel = el("panel-hasil");
  const kosong = el("panel-kosong");
  if (panel) panel.hidden = true;
  if (kosong) kosong.hidden = false;
}
