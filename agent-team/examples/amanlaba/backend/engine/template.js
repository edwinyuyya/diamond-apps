/**
 * Empat template skenario bawaan.
 *
 * Data persis mengikuti CONTRACT.md bagian 7. daftarTemplate() mengembalikan
 * salinan baru agar pemanggil tidak dapat mengubah konstanta internal.
 */

const TEMPLATE = [
  {
    id: "warung-makan",
    nama: "Warung Makan",
    deskripsi: "Harga menu, bahan baku, dan jumlah porsi per bulan.",
    emoji: "🍜",
    skenario: {
      nama: "Warung Makan",
      mataUang: "IDR",
      hargaJual: { min: 12000, mode: 15000, max: 18000 },
      biayaTetap: { min: 3000000, mode: 4000000, max: 5500000 },
      biayaVariabel: { min: 5000, mode: 6500, max: 8000 },
      permintaan: { min: 300, mode: 600, max: 1000 },
    },
    opsi: { iterasi: 10000, seed: 12345 },
  },
  {
    id: "kafe",
    nama: "Kafe",
    deskripsi: "Harga minuman, biaya sewa tempat, dan kunjungan per bulan.",
    emoji: "☕",
    skenario: {
      nama: "Kafe",
      mataUang: "IDR",
      hargaJual: { min: 18000, mode: 25000, max: 32000 },
      biayaTetap: { min: 8000000, mode: 10000000, max: 13000000 },
      biayaVariabel: { min: 7000, mode: 9000, max: 12000 },
      permintaan: { min: 400, mode: 700, max: 1100 },
    },
    opsi: { iterasi: 10000, seed: 20250 },
  },
  {
    id: "toko-online",
    nama: "Toko Online",
    deskripsi: "Harga produk, biaya iklan, dan jumlah pesanan per bulan.",
    emoji: "🛍️",
    skenario: {
      nama: "Toko Online",
      mataUang: "IDR",
      hargaJual: { min: 75000, mode: 99000, max: 129000 },
      biayaTetap: { min: 2000000, mode: 3000000, max: 4500000 },
      biayaVariabel: { min: 40000, mode: 55000, max: 70000 },
      permintaan: { min: 150, mode: 350, max: 700 },
    },
    opsi: { iterasi: 10000, seed: 777 },
  },
  {
    id: "jasa-freelance",
    nama: "Jasa Freelance",
    deskripsi: "Tarif proyek, biaya operasional, dan jumlah proyek per bulan.",
    emoji: "💻",
    skenario: {
      nama: "Jasa Freelance",
      mataUang: "IDR",
      hargaJual: { min: 1500000, mode: 2500000, max: 4000000 },
      biayaTetap: { min: 1500000, mode: 2000000, max: 3000000 },
      biayaVariabel: { min: 100000, mode: 300000, max: 600000 },
      permintaan: { min: 2, mode: 4, max: 7 },
    },
    opsi: { iterasi: 10000, seed: 424242 },
  },
];

/**
 * Mengembalikan salinan empat template sesuai urutan kontrak.
 *
 * @returns {Array<object>}
 */
export function daftarTemplate() {
  return JSON.parse(JSON.stringify(TEMPLATE));
}
