/**
 * Ekstensi Panel Pelanggan AI — STUB.
 *
 * Status: belum-diimplementasikan.
 * Modul ini tidak diimpor oleh server.js dan tidak memiliki endpoint.
 * Antarmuka disediakan agar fitur masa depan dapat ditambahkan tanpa
 * mengubah mesin simulasi inti maupun kontrak API yang sudah ada.
 */

export const NAMA = "panel-pelanggan-ai";
export const VERSI = "0.0.0";
export const STATUS = "belum-diimplementasikan";

const PESAN_BELUM = "Panel Pelanggan AI belum diimplementasikan.";

function galatBelumDiimplementasikan() {
  const error = new Error(PESAN_BELUM);
  error.kode = "E_BELUM_DIIMPLEMENTASIKAN";
  return error;
}

/**
 * Membuat objek panel. Saat ini objek hanya membawa metadata status dan
 * method yang selalu menolak.
 *
 * @param {object} [konfigurasi]
 * @returns {{
 *   nama:string, versi:string, status:string,
 *   nilaiHarga:(payload?:object) => Promise<never>
 * }}
 */
export function buatPanelPelangganAi(konfigurasi = {}) {
  void konfigurasi;

  return {
    nama: NAMA,
    versi: VERSI,
    status: STATUS,
    async nilaiHarga(payload) {
      void payload;
      throw galatBelumDiimplementasikan();
    },
  };
}
