// Membaca, mengisi, dan memvalidasi form skenario.
// Validasi klien dibuat konsisten dengan aturan CONTRACT.md bagian 4.

const BIDANG = [
  {
    kunci: "hargaJual",
    prefix: "harga",
    label: "Harga jual",
    hargaJual: true,
  },
  {
    kunci: "biayaTetap",
    prefix: "tetap",
    label: "Biaya tetap",
  },
  {
    kunci: "biayaVariabel",
    prefix: "variabel",
    label: "Biaya variabel",
  },
  {
    kunci: "permintaan",
    prefix: "permintaan",
    label: "Permintaan",
  },
];

const PETA_FIELD_KE_ID = {
  nama: "nama-skenario",
  "hargaJual.min": "harga-min",
  "hargaJual.mode": "harga-mode",
  "hargaJual.max": "harga-max",
  hargaJual: "harga-min",
  "biayaTetap.min": "tetap-min",
  "biayaTetap.mode": "tetap-mode",
  "biayaTetap.max": "tetap-max",
  biayaTetap: "tetap-min",
  "biayaVariabel.min": "variabel-min",
  "biayaVariabel.mode": "variabel-mode",
  "biayaVariabel.max": "variabel-max",
  biayaVariabel: "variabel-min",
  "permintaan.min": "permintaan-min",
  "permintaan.mode": "permintaan-mode",
  "permintaan.max": "permintaan-max",
  permintaan: "permintaan-min",
  "opsi.iterasi": "iterasi",
  iterasi: "iterasi",
  "opsi.seed": "seed",
  seed: "seed",
};

const LABEL_FIELD = {
  "hargaJual.min": "Harga jual minimum",
  "hargaJual.mode": "Harga jual paling mungkin",
  "hargaJual.max": "Harga jual maksimum",
  "biayaTetap.min": "Biaya tetap minimum",
  "biayaTetap.mode": "Biaya tetap paling mungkin",
  "biayaTetap.max": "Biaya tetap maksimum",
  "biayaVariabel.min": "Biaya variabel minimum",
  "biayaVariabel.mode": "Biaya variabel paling mungkin",
  "biayaVariabel.max": "Biaya variabel maksimum",
  "permintaan.min": "Permintaan minimum",
  "permintaan.mode": "Permintaan paling mungkin",
  "permintaan.max": "Permintaan maksimum",
  "opsi.iterasi": "Jumlah iterasi",
  "opsi.seed": "Seed",
  nama: "Nama skenario",
};

function el(id) {
  return document.getElementById(id);
}

function bacaAngka(idBidang, field, galat) {
  const input = el(idBidang);
  if (!input) {
    galat.push({ field, pesan: "Kolom tidak ditemukan." });
    return null;
  }
  const mentah = input.value.trim();
  if (mentah === "") {
    galat.push({ field, pesan: "Wajib diisi dengan angka." });
    return null;
  }
  const nilai = Number(mentah);
  if (!Number.isFinite(nilai)) {
    galat.push({ field, pesan: "Harus berupa angka yang valid." });
    return null;
  }
  if (nilai < 0) {
    galat.push({ field, pesan: "Tidak boleh bernilai negatif." });
    return null;
  }
  if (nilai > 1_000_000_000_000) {
    galat.push({ field, pesan: "Nilai terlalu besar (maksimum 1.000.000.000.000)." });
    return null;
  }
  return nilai;
}

function bacaDistribusi(bidang, galat) {
  const min = bacaAngka(
    `${bidang.prefix}-min`,
    `${bidang.kunci}.min`,
    galat,
  );
  const mode = bacaAngka(
    `${bidang.prefix}-mode`,
    `${bidang.kunci}.mode`,
    galat,
  );
  const max = bacaAngka(
    `${bidang.prefix}-max`,
    `${bidang.kunci}.max`,
    galat,
  );

  if (min !== null && mode !== null && min > mode) {
    galat.push({
      field: `${bidang.kunci}.min`,
      pesan: "Minimum tidak boleh lebih besar dari nilai paling mungkin.",
    });
  }
  if (mode !== null && max !== null && mode > max) {
    galat.push({
      field: `${bidang.kunci}.mode`,
      pesan: "Nilai paling mungkin tidak boleh lebih besar dari maksimum.",
    });
  }
  if (min !== null && max !== null && min > max) {
    galat.push({
      field: `${bidang.kunci}.min`,
      pesan: "Minimum tidak boleh lebih besar dari maksimum.",
    });
  }
  if (bidang.hargaJual && min !== null && min <= 0) {
    galat.push({
      field: "hargaJual.min",
      pesan: "Harga jual minimum harus lebih besar dari 0.",
    });
  }

  if (min === null || mode === null || max === null) return null;
  return { min, mode, max };
}

/**
 * Membaca seluruh form.
 * @param {{sapuanHarga?: {min:number,max:number,langkah:number}|null}} tambahan
 * @returns {{valid:boolean, galat:Array, skenario:object|null, opsi:object|null}}
 */
export function bacaForm(tambahan = {}) {
  const galat = [];

  const namaMentah = el("nama-skenario")?.value ?? "";
  const nama = namaMentah.trim();
  if (nama.length > 80) {
    galat.push({ field: "nama", pesan: "Nama skenario maksimum 80 karakter." });
  }

  const skenario = {
    nama: nama || "Skenario Tanpa Nama",
    mataUang: "IDR",
  };

  for (const bidang of BIDANG) {
    const distribusi = bacaDistribusi(bidang, galat);
    if (distribusi) skenario[bidang.kunci] = distribusi;
  }

  const iterasiMentah = el("iterasi")?.value.trim() ?? "";
  const seedMentah = el("seed")?.value.trim() ?? "";
  const iterasi = Number(iterasiMentah);
  const seed = Number(seedMentah);

  if (iterasiMentah === "" || !Number.isFinite(iterasi)) {
    galat.push({ field: "opsi.iterasi", pesan: "Wajib diisi dengan angka." });
  } else if (!Number.isInteger(iterasi) || iterasi < 1000 || iterasi > 50000) {
    galat.push({
      field: "opsi.iterasi",
      pesan: "Harus bilangan bulat antara 1.000 dan 50.000.",
    });
  }

  if (seedMentah === "" || !Number.isFinite(seed)) {
    galat.push({ field: "opsi.seed", pesan: "Wajib diisi dengan angka." });
  } else if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) {
    galat.push({
      field: "opsi.seed",
      pesan: "Harus bilangan bulat antara 0 dan 2.147.483.647.",
    });
  }

  const opsi = { iterasi, seed };
  const sapuan = tambahan?.sapuanHarga;
  if (
    sapuan &&
    Number.isFinite(sapuan.min) &&
    Number.isFinite(sapuan.max) &&
    Number.isFinite(sapuan.langkah) &&
    sapuan.min > 0 &&
    sapuan.max > sapuan.min &&
    Number.isInteger(sapuan.langkah) &&
    sapuan.langkah >= 5 &&
    sapuan.langkah <= 40
  ) {
    opsi.sapuanHarga = {
      min: sapuan.min,
      max: sapuan.max,
      langkah: sapuan.langkah,
    };
  }

  const valid = galat.length === 0;
  return {
    valid,
    galat,
    skenario: valid ? skenario : null,
    opsi: valid ? opsi : null,
  };
}

/** Mengisi form dari objek skenario dan opsi tanpa memicu event input. */
export function isiForm(skenario, opsi = {}) {
  if (!skenario || typeof skenario !== "object") return;

  const nama = el("nama-skenario");
  if (nama) nama.value = String(skenario.nama ?? "Skenario Tanpa Nama");

  for (const bidang of BIDANG) {
    const nilai = skenario[bidang.kunci];
    if (!nilai || typeof nilai !== "object") continue;
    for (const bagian of ["min", "mode", "max"]) {
      const input = el(`${bidang.prefix}-${bagian}`);
      if (input && Number.isFinite(nilai[bagian])) {
        input.value = String(nilai[bagian]);
      }
    }
  }

  if (opsi && Number.isInteger(opsi.iterasi)) {
    const input = el("iterasi");
    if (input) input.value = String(opsi.iterasi);
  }
  if (opsi && Number.isInteger(opsi.seed)) {
    const input = el("seed");
    if (input) input.value = String(opsi.seed);
  }

  bersihkanGalat();
}

/** Menghapus semua tanda galat pada form. */
export function bersihkanGalat() {
  const wadah = el("galat");
  if (wadah) {
    wadah.hidden = true;
    const daftar = wadah.querySelector(".app-galat__daftar");
    if (daftar) daftar.replaceChildren();
  }
  for (const input of document.querySelectorAll("#form-skenario [aria-invalid='true']")) {
    input.removeAttribute("aria-invalid");
  }
}

function labelField(field) {
  if (!field) return "";
  return LABEL_FIELD[field] ?? field;
}

/**
 * Menampilkan pesan galat yang dapat dibaca.
 * @param {string} pesan
 * @param {Array<{field?:string,pesan?:string}>} detail
 */
export function tampilkanGalat(pesan, detail = []) {
  const wadah = el("galat");
  if (!wadah) return;

  for (const input of document.querySelectorAll("#form-skenario [aria-invalid='true']")) {
    input.removeAttribute("aria-invalid");
  }

  const daftar = wadah.querySelector(".app-galat__daftar");
  if (daftar) {
    daftar.replaceChildren();
    for (const butir of detail) {
      const li = document.createElement("li");
      const teks = butir?.pesan || "Nilai tidak valid.";
      li.textContent = butir?.field ? `${labelField(butir.field)}: ${teks}` : teks;
      daftar.append(li);
    }
  }

  const judul = wadah.querySelector(".app-galat__judul");
  if (judul) {
    judul.textContent = detail.length > 0
      ? "Input belum bisa diproses"
      : "Terjadi kendala";
  }

  const lama = wadah.querySelector(".app-galat__pesan");
  if (lama) lama.remove();

  let teksUtama = pesan;
  if (!teksUtama && detail.length > 0) {
    teksUtama = "Periksa kembali nilai yang ditandai.";
  }
  if (teksUtama) {
    const pengantar = document.createElement("p");
    pengantar.className = "app-galat__pesan";
    pengantar.textContent = teksUtama;
    if (judul && judul.parentNode === wadah) {
      judul.insertAdjacentElement("afterend", pengantar);
    } else {
      wadah.prepend(pengantar);
    }
  }

  wadah.hidden = false;

  let target = null;
  for (const butir of detail) {
    const id = PETA_FIELD_KE_ID[butir?.field];
    if (id) {
      const input = el(id);
      if (input) {
        input.setAttribute("aria-invalid", "true");
        if (!target) target = input;
      }
    }
  }
  if (target) {
    target.focus();
  }
}

/** Memasang pendengar perubahan nilai (bukan nama) untuk menandai hasil usang. */
export function pasangPerubahan(callback) {
  const form = el("form-skenario");
  if (!form) return;
  form.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches("input")) {
      target.removeAttribute("aria-invalid");
    }
    if (target.id === "nama-skenario") return;
    callback();
  });
}
