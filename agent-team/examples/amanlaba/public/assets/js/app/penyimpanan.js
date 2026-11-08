// Penyimpanan skenario di localStorage. Server tetap stateless.
// Kontrak: key amanlaba:skenario:v1, maksimal 50 entri, terbaru di indeks 0.

export const KUNCI = "amanlaba:skenario:v1";
export const MAKS_SKENARIO = 50;

export const PESAN_PENYIMPANAN_TIDAK_TERSEDIA =
  "Penyimpanan lokal tidak tersedia. Skenario tidak dapat disimpan.";

const PESAN_DATA_RUSAK =
  "Data skenario tersimpan tidak dapat dibaca. Daftar ditampilkan kosong; data lama " +
  "tidak akan ditimpa sampai kamu menyimpan skenario baru.";

const PESAN_SEBAGIAN_RUSAK =
  "Sebagian data skenario tersimpan rusak dan tidak ditampilkan.";

function penyimpanan() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Memastikan localStorage dapat ditulis (bukan sekadar ada). */
export function cekPenyimpanan() {
  const ls = penyimpanan();
  if (!ls) return false;
  try {
    const uji = `${KUNCI}:uji`;
    ls.setItem(uji, "1");
    ls.removeItem(uji);
    return true;
  } catch {
    return false;
  }
}

function entriValid(entri) {
  return Boolean(
    entri &&
      typeof entri === "object" &&
      typeof entri.id === "string" &&
      entri.id.length > 0 &&
      entri.skenario &&
      typeof entri.skenario === "object",
  );
}

/**
 * Membaca daftar skenario tersimpan.
 * Tidak pernah menulis ke localStorage.
 * @returns {{tersedia:boolean, daftar:Array, peringatan:string|null}}
 */
export function bacaDaftar() {
  const ls = penyimpanan();
  if (!ls) {
    return {
      tersedia: false,
      daftar: [],
      peringatan: PESAN_PENYIMPANAN_TIDAK_TERSEDIA,
    };
  }

  let mentah;
  try {
    mentah = ls.getItem(KUNCI);
  } catch {
    return {
      tersedia: false,
      daftar: [],
      peringatan: PESAN_PENYIMPANAN_TIDAK_TERSEDIA,
    };
  }

  if (mentah === null || mentah === "") {
    return { tersedia: true, daftar: [], peringatan: null };
  }

  let data;
  try {
    data = JSON.parse(mentah);
  } catch {
    return { tersedia: true, daftar: [], peringatan: PESAN_DATA_RUSAK };
  }

  if (!Array.isArray(data)) {
    return { tersedia: true, daftar: [], peringatan: PESAN_DATA_RUSAK };
  }

  const daftar = data.filter(entriValid).slice(0, MAKS_SKENARIO);
  const peringatan = daftar.length !== data.length ? PESAN_SEBAGIAN_RUSAK : null;

  return { tersedia: true, daftar, peringatan };
}

function tulisDaftar(daftar) {
  const ls = penyimpanan();
  if (!ls) {
    return { ok: false, pesan: PESAN_PENYIMPANAN_TIDAK_TERSEDIA };
  }
  try {
    ls.setItem(KUNCI, JSON.stringify(daftar));
    return { ok: true, pesan: null };
  } catch {
    return { ok: false, pesan: PESAN_PENYIMPANAN_TIDAK_TERSEDIA };
  }
}

export function buatId() {
  return `sk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Menambah skenario baru (indeks 0) atau memperbarui entri dengan id aktif.
 * @param {Array} daftar daftar saat ini
 * @param {string|null} idAktif
 * @param {string} nama nama efektif (sudah default bila kosong)
 * @param {object} skenario
 * @param {object} opsi
 * @returns {{ok:boolean, daftar:Array, entri?:object, pesan?:string|null}}
 */
export function simpanSkenario(daftar, idAktif, nama, skenario, opsi) {
  const sekarang = new Date().toISOString();
  const opsiSimpan = {
    iterasi: opsi?.iterasi,
    seed: opsi?.seed,
    sapuanHarga: opsi?.sapuanHarga ?? null,
  };

  // Omongkan nama efektif ke dalam skenario agar laporan konsisten.
  const skenarioSimpan = {
    ...skenario,
    nama,
  };

  const indeksAktif = idAktif
    ? daftar.findIndex((entri) => entri.id === idAktif)
    : -1;

  let daftarBaru;
  let entri;

  if (indeksAktif >= 0) {
    const lama = daftar[indeksAktif];
    entri = {
      ...lama,
      nama,
      diperbaruiPada: sekarang,
      skenario: skenarioSimpan,
      opsi: opsiSimpan,
    };
    daftarBaru = [entri, ...daftar.filter((_, i) => i !== indeksAktif)];
  } else {
    if (daftar.length >= MAKS_SKENARIO) {
      return {
        ok: false,
        daftar,
        pesan: "Batas 50 skenario tercapai. Hapus salah satu skenario.",
      };
    }
    entri = {
      id: buatId(),
      nama,
      dibuatPada: sekarang,
      diperbaruiPada: sekarang,
      skenario: skenarioSimpan,
      opsi: opsiSimpan,
    };
    daftarBaru = [entri, ...daftar].slice(0, MAKS_SKENARIO);
  }

  const hasilTulis = tulisDaftar(daftarBaru);
  if (!hasilTulis.ok) {
    return { ok: false, daftar, pesan: hasilTulis.pesan };
  }
  return { ok: true, daftar: daftarBaru, entri, pesan: null };
}

/**
 * Menghapus entri berdasarkan id.
 * @returns {{ok:boolean, daftar:Array, pesan?:string|null}}
 */
export function hapusSkenario(daftar, id) {
  const daftarBaru = daftar.filter((entri) => entri.id !== id);
  if (daftarBaru.length === daftar.length) {
    return { ok: false, daftar, pesan: "Skenario tidak ditemukan." };
  }
  const hasilTulis = tulisDaftar(daftarBaru);
  if (!hasilTulis.ok) {
    return { ok: false, daftar, pesan: hasilTulis.pesan };
  }
  return { ok: true, daftar: daftarBaru, pesan: null };
}

/** Mencari entri berdasarkan id. */
export function cariSkenario(daftar, id) {
  if (!id) return null;
  return daftar.find((entri) => entri.id === id) ?? null;
}
