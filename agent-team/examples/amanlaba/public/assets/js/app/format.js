// Format angka, uang, persen, dan tanggal untuk seluruh aplikasi AmanLaba.
// Semua format mengikuti locale Indonesia dan tidak memakai library eksternal.

const pemformatRupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const pemformatPersen = new Intl.NumberFormat("id-ID", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const pemformatTanggal = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
});

const pemformatTanggalWaktu = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeStyle: "short",
});

const pemformatSatuDesimal = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

const pemformatDuaDesimal = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

const pemformatBulat = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

function angkaValid(nilai) {
  return typeof nilai === "number" && Number.isFinite(nilai);
}

/** Uang penuh: Rp15.000. Nilai tidak valid menjadi "—". */
export function formatRupiah(nilai) {
  if (!angkaValid(nilai)) return "—";
  return pemformatRupiah.format(nilai);
}

/** Persen satu desimal: 18,0%. */
export function formatPersen(nilai) {
  if (!angkaValid(nilai)) return "—";
  return pemformatPersen.format(nilai);
}

/** Tanggal panjang: 8 November 2026. */
export function formatTanggal(iso) {
  const tanggal = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(tanggal.getTime())) return "—";
  return pemformatTanggal.format(tanggal);
}

/** Tanggal dan jam: 8 November 2026 pukul 17.00. */
export function formatTanggalWaktu(iso) {
  const tanggal = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(tanggal.getTime())) return "—";
  return pemformatTanggalWaktu.format(tanggal);
}

/** Uang ringkas untuk sumbu grafik: Rp1,2 jt, Rp450 rb, Rp1,2 M. */
export function formatRupiahRingkas(nilai) {
  if (!angkaValid(nilai)) return "—";
  const tanda = nilai < 0 ? "-" : "";
  const absolut = Math.abs(nilai);

  if (absolut >= 1e12) {
    return `${tanda}Rp${pemformatSatuDesimal.format(absolut / 1e12)} T`;
  }
  if (absolut >= 1e9) {
    return `${tanda}Rp${pemformatSatuDesimal.format(absolut / 1e9)} M`;
  }
  if (absolut >= 1e6) {
    return `${tanda}Rp${pemformatSatuDesimal.format(absolut / 1e6)} jt`;
  }
  if (absolut >= 1e3) {
    return `${tanda}Rp${pemformatSatuDesimal.format(absolut / 1e3)} rb`;
  }
  return formatRupiah(nilai);
}

/** Angka ringkas tanpa "Rp", untuk label jumlah pada grafik: 1,2 rb. */
export function formatAngkaRingkas(nilai) {
  if (!angkaValid(nilai)) return "—";
  const tanda = nilai < 0 ? "-" : "";
  const absolut = Math.abs(nilai);

  if (absolut >= 1e12) return `${tanda}${pemformatSatuDesimal.format(absolut / 1e12)} T`;
  if (absolut >= 1e9) return `${tanda}${pemformatSatuDesimal.format(absolut / 1e9)} M`;
  if (absolut >= 1e6) return `${tanda}${pemformatSatuDesimal.format(absolut / 1e6)} jt`;
  if (absolut >= 1e3) return `${tanda}${pemformatSatuDesimal.format(absolut / 1e3)} rb`;
  return pemformatBulat.format(nilai);
}

/** Angka umum (unit, permintaan) dengan maksimal dua desimal. */
export function formatAngka(nilai) {
  if (!angkaValid(nilai)) return "—";
  return pemformatDuaDesimal.format(nilai);
}

/** Jumlah unit dengan satuan: 471 unit. */
export function formatUnit(nilai) {
  if (!angkaValid(nilai)) return "—";
  return `${pemformatBulat.format(nilai)} unit`;
}

/** Proporsi 0..1 menjadi persen; nilai null/undefined menjadi "—". */
export function formatProporsi(nilai) {
  return formatPersen(nilai);
}
