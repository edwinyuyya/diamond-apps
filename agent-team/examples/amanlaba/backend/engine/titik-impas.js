/**
 * Titik impas berdasarkan nilai mode skenario.
 *
 * Modul murni.
 */

/**
 * Menghitung titik impas unit dan pendapatan dari nilai mode.
 *
 * @param {{
 *   hargaJual:{min:number,mode:number,max:number},
 *   biayaTetap:{min:number,mode:number,max:number},
 *   biayaVariabel:{min:number,mode:number,max:number}
 * }} skenario
 * @returns {{
 *   valid:boolean, unit:number|null, pendapatan:number|null,
 *   hargaAcuan:number, biayaVariabelAcuan:number, biayaTetapAcuan:number,
 *   marginPerUnit:number, catatan:string|null
 * }}
 */
export function hitungTitikImpas(skenario) {
  const harga = skenario.hargaJual.mode;
  const variabel = skenario.biayaVariabel.mode;
  const tetap = skenario.biayaTetap.mode;
  const margin = harga - variabel;

  if (margin <= 0) {
    return {
      valid: false,
      unit: null,
      pendapatan: null,
      hargaAcuan: harga,
      biayaVariabelAcuan: variabel,
      biayaTetapAcuan: tetap,
      marginPerUnit: margin,
      catatan:
        "Harga jual harus lebih besar dari biaya variabel per unit agar titik impas dapat dihitung.",
    };
  }

  const unit = Math.ceil(tetap / margin);
  return {
    valid: true,
    unit,
    pendapatan: unit * harga,
    hargaAcuan: harga,
    biayaVariabelAcuan: variabel,
    biayaTetapAcuan: tetap,
    marginPerUnit: margin,
    catatan: null,
  };
}
