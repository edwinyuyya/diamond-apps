/**
 * Analisis sensitivitas tornado P10/P90.
 *
 * Modul murni.
 */

import { kuantilTriangular, faktorPermintaanHarga } from "./distribusi.js";

const URUTAN_FAKTOR = [
  { kunci: "hargaJual", label: "Harga Jual" },
  { kunci: "biayaTetap", label: "Biaya Tetap" },
  { kunci: "biayaVariabel", label: "Biaya Variabel" },
  { kunci: "permintaan", label: "Permintaan" },
];

function hitungLaba(nilai, hargaJual) {
  const faktor = faktorPermintaanHarga(nilai.hargaJual, hargaJual);
  return (nilai.hargaJual - nilai.biayaVariabel) * nilai.permintaan * faktor - nilai.biayaTetap;
}

/**
 * Menghitung sensitivitas laba terhadap empat faktor.
 * Faktor lain dipegang pada nilai mode; faktor yang diuji digerakkan P10/P90.
 *
 * @param {object} skenario
 * @returns {Array<{
 *   kunci:string, label:string, nilaiRendah:number, nilaiTinggi:number,
 *   labaRendah:number, labaTinggi:number, delta:number, dampak:number
 * }>}
 */
export function analisisSensitivitas(skenario) {
  const mode = {
    hargaJual: skenario.hargaJual.mode,
    biayaTetap: skenario.biayaTetap.mode,
    biayaVariabel: skenario.biayaVariabel.mode,
    permintaan: skenario.permintaan.mode,
  };

  const hasil = URUTAN_FAKTOR.map((faktor, urutan) => {
    const distribusi = skenario[faktor.kunci];
    const nilaiRendah = kuantilTriangular(0.1, distribusi);
    const nilaiTinggi = kuantilTriangular(0.9, distribusi);

    const labaRendah = hitungLaba(
      { ...mode, [faktor.kunci]: nilaiRendah },
      skenario.hargaJual,
    );
    const labaTinggi = hitungLaba(
      { ...mode, [faktor.kunci]: nilaiTinggi },
      skenario.hargaJual,
    );

    const delta = labaTinggi - labaRendah;

    return {
      kunci: faktor.kunci,
      label: faktor.label,
      nilaiRendah,
      nilaiTinggi,
      labaRendah,
      labaTinggi,
      delta,
      dampak: Math.abs(delta),
      urutan,
    };
  });

  hasil.sort((a, b) => b.dampak - a.dampak || a.urutan - b.urutan);

  return hasil.map(({ urutan, ...sisa }) => sisa);
}
