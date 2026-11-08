/**
 * Titik masuk publik mesin simulasi AmanLaba.
 *
 * Semua fungsi deterministik terhadap argumennya dan tanpa I/O.
 */

export { VERSI_MESIN, jalankanSimulasi } from "./simulasi.js";
export { buatRng } from "./rng.js";
export {
  ambilTriangular,
  kuantilTriangular,
  faktorPermintaanHarga,
} from "./distribusi.js";
export {
  persentil,
  hitungRingkasan,
  hitungHistogram,
} from "./statistik.js";
export {
  validasiSkenario,
  validasiOpsi,
  normalisasiOpsi,
  rentangSapuanOtomatis,
} from "./validasi.js";
export { hitungTitikImpas } from "./titik-impas.js";
export { analisisSensitivitas } from "./sensitivitas.js";
export { sapuanHarga } from "./sapuan-harga.js";
export { daftarTemplate } from "./template.js";
