/**
 * Validasi skenario dan opsi simulasi.
 *
 * Semua fungsi murni. Pesan galat berbahasa Indonesia dan setiap galat
 * membawa jalur field bertitik (mis. "permintaan.max").
 */

const DISTRIBUSI = ["hargaJual", "biayaTetap", "biayaVariabel", "permintaan"];
const BATAS_NILAI = 1_000_000_000_000;

function objek(nilai) {
  return typeof nilai === "object" && nilai !== null && !Array.isArray(nilai);
}

function angkaFinite(nilai) {
  return typeof nilai === "number" && Number.isFinite(nilai);
}

function galatValidasi(galat) {
  const error = new Error("Input tidak valid.");
  error.kode = "VALIDASI_GAGAL";
  error.status = 400;
  error.detail = galat;
  return error;
}

function periksaDistribusi(nama, distribusi, galat) {
  if (distribusi === undefined || distribusi === null) {
    galat.push({ field: nama, pesan: `${nama} wajib diisi.` });
    return;
  }
  if (!objek(distribusi)) {
    galat.push({
      field: nama,
      pesan: `${nama} harus berupa objek dengan min, mode, dan max.`,
    });
    return;
  }

  const nilai = { min: null, mode: null, max: null };
  for (const kunci of ["min", "mode", "max"]) {
    const v = distribusi[kunci];
    if (!angkaFinite(v)) {
      galat.push({
        field: `${nama}.${kunci}`,
        pesan: `${kunci} wajib berupa angka.`,
      });
    } else {
      nilai[kunci] = v;
    }
  }

  if (nilai.min !== null && nilai.min < 0) {
    galat.push({ field: `${nama}.min`, pesan: "min tidak boleh negatif." });
  }
  if (nilai.max !== null && nilai.max > BATAS_NILAI) {
    galat.push({
      field: `${nama}.max`,
      pesan: "max tidak boleh melebihi 1.000.000.000.000.",
    });
  }
  if (nilai.min !== null && nilai.mode !== null && nilai.min > nilai.mode) {
    galat.push({
      field: `${nama}.min`,
      pesan: "min harus lebih kecil atau sama dengan mode.",
    });
  }
  if (nilai.mode !== null && nilai.max !== null && nilai.mode > nilai.max) {
    galat.push({
      field: `${nama}.max`,
      pesan: "max harus lebih besar atau sama dengan mode.",
    });
  }
  if (nama === "hargaJual" && nilai.min !== null && nilai.min === 0) {
    galat.push({
      field: "hargaJual.min",
      pesan: "hargaJual.min harus lebih besar dari 0.",
    });
  }
}

/**
 * Memvalidasi skenario.
 *
 * @param {unknown} skenario
 * @returns {{valid:boolean, galat:Array<{field:string, pesan:string}>}}
 */
export function validasiSkenario(skenario) {
  const galat = [];

  if (!objek(skenario)) {
    galat.push({ field: "skenario", pesan: "skenario harus berupa objek." });
    return { valid: false, galat };
  }

  if (skenario.nama !== undefined) {
    if (typeof skenario.nama !== "string") {
      galat.push({ field: "nama", pesan: "nama harus berupa teks." });
    } else {
      const nama = skenario.nama.trim();
      if (nama.length < 1 || nama.length > 80) {
        galat.push({
          field: "nama",
          pesan: "nama harus 1–80 karakter setelah trim.",
        });
      }
    }
  }

  if (skenario.mataUang !== undefined && skenario.mataUang !== "IDR") {
    galat.push({
      field: "mataUang",
      pesan: 'mataUang hanya boleh "IDR".',
    });
  }

  for (const nama of DISTRIBUSI) {
    periksaDistribusi(nama, skenario[nama], galat);
  }

  return { valid: galat.length === 0, galat };
}

/**
 * Memvalidasi opsi simulasi.
 *
 * @param {unknown} opsi
 * @returns {{valid:boolean, galat:Array<{field:string, pesan:string}>}}
 */
export function validasiOpsi(opsi) {
  const galat = [];

  if (opsi === undefined || opsi === null) return { valid: true, galat };

  if (!objek(opsi)) {
    galat.push({ field: "opsi", pesan: "opsi harus berupa objek." });
    return { valid: false, galat };
  }

  if (opsi.iterasi !== undefined) {
    if (!Number.isInteger(opsi.iterasi) || opsi.iterasi < 1000 || opsi.iterasi > 50000) {
      galat.push({
        field: "opsi.iterasi",
        pesan: "iterasi harus berupa bilangan bulat antara 1000 dan 50000.",
      });
    }
  }

  if (opsi.seed !== undefined) {
    if (!Number.isInteger(opsi.seed) || opsi.seed < 0 || opsi.seed > 2147483647) {
      galat.push({
        field: "opsi.seed",
        pesan: "seed harus berupa bilangan bulat antara 0 dan 2147483647.",
      });
    }
  }

  const sapuan = opsi.sapuanHarga;
  if (sapuan !== undefined && sapuan !== null) {
    if (!objek(sapuan)) {
      galat.push({
        field: "opsi.sapuanHarga",
        pesan: "sapuanHarga harus berupa objek dengan min, max, dan langkah.",
      });
    } else if (
      sapuan.min === undefined ||
      sapuan.max === undefined ||
      sapuan.langkah === undefined
    ) {
      galat.push({
        field: "opsi.sapuanHarga",
        pesan: "sapuanHarga harus memiliki min, max, dan langkah sekaligus.",
      });
    } else {
      const minValid =
        angkaFinite(sapuan.min) && sapuan.min > 0 && sapuan.min <= BATAS_NILAI;
      const maxValid =
        angkaFinite(sapuan.max) && sapuan.max > 0 && sapuan.max <= BATAS_NILAI;

      if (!minValid) {
        galat.push({
          field: "opsi.sapuanHarga.min",
          pesan: "min harus berupa angka lebih besar dari 0.",
        });
      }
      if (!maxValid) {
        galat.push({
          field: "opsi.sapuanHarga.max",
          pesan: "max harus berupa angka lebih besar dari 0.",
        });
      }
      if (minValid && maxValid && sapuan.max <= sapuan.min) {
        galat.push({
          field: "opsi.sapuanHarga.max",
          pesan: "max harus lebih besar dari min.",
        });
      }
      if (
        !Number.isInteger(sapuan.langkah) ||
        sapuan.langkah < 5 ||
        sapuan.langkah > 40
      ) {
        galat.push({
          field: "opsi.sapuanHarga.langkah",
          pesan: "langkah harus berupa bilangan bulat antara 5 dan 40.",
        });
      }
    }
  }

  return { valid: galat.length === 0, galat };
}

/**
 * Menghitung rentang sapuan harga otomatis dari nilai mode skenario.
 *
 * @param {{
 *   hargaJual:{min:number,mode:number,max:number},
 *   biayaTetap:{mode:number},
 *   biayaVariabel:{mode:number},
 *   permintaan:{mode:number}
 * }} skenario
 * @returns {{min:number, max:number, langkah:number}}
 */
export function rentangSapuanOtomatis(skenario) {
  const hargaImpas =
    skenario.biayaVariabel.mode +
    skenario.biayaTetap.mode / Math.max(skenario.permintaan.mode, 1);

  const min = Math.max(
    1,
    Math.round(Math.min(skenario.hargaJual.min, hargaImpas * 0.8)),
  );
  const max = Math.max(
    Math.ceil(skenario.hargaJual.max),
    Math.ceil(hargaImpas * 1.6),
    min + 1000,
  );

  return { min, max, langkah: 21 };
}

// Skenario netral hanya dipakai bila normalisasiOpsi() dipanggil tanpa
// skenario dan tanpa sapuanHarga eksplisit. JalankanSimulasi dan sapuanHarga
// selalu menyertakan skenario, sehingga nilai ini tidak memengaruhi hasil nyata.
const SKENARIO_NETRAL = {
  hargaJual: { min: 0, mode: 0, max: 0 },
  biayaTetap: { mode: 0 },
  biayaVariabel: { mode: 0 },
  permintaan: { mode: 1 },
};

/**
 * Menormalkan opsi: mengisi default, memvalidasi, dan meresolusi sapuanHarga.
 * sapuanHarga selalu berupa objek { min, max, langkah }.
 * Melempar Error berkode VALIDASI_GAGAL bila opsi tidak valid.
 *
 * @param {object} [opsi]
 * @param {object} [skenario] dipakai untuk menghitung sapuan otomatis
 * @returns {{iterasi:number, seed:number, sapuanHarga:{min:number,max:number,langkah:number}}}
 */
export function normalisasiOpsi(opsi = {}, skenario = null) {
  const hasil = validasiOpsi(opsi);
  if (!hasil.valid) throw galatValidasi(hasil.galat);

  const sumber = opsi === undefined || opsi === null ? {} : opsi;
  const iterasi = sumber.iterasi === undefined ? 10000 : sumber.iterasi;
  const seed = sumber.seed === undefined ? 12345 : sumber.seed;

  let sapuanHarga;
  if (sumber.sapuanHarga !== undefined && sumber.sapuanHarga !== null) {
    sapuanHarga = {
      min: Math.round(sumber.sapuanHarga.min),
      max: Math.round(sumber.sapuanHarga.max),
      langkah: sumber.sapuanHarga.langkah,
    };
  } else {
    sapuanHarga = rentangSapuanOtomatis(
      skenario === null || skenario === undefined ? SKENARIO_NETRAL : skenario,
    );
  }

  return { iterasi, seed, sapuanHarga };
}

export { galatValidasi };
