/**
 * Rute API JSON: health, template, simulasi, harga.
 */

import {
  VERSI_MESIN,
  daftarTemplate,
  jalankanSimulasi,
  sapuanHarga,
  normalisasiOpsi,
  validasiSkenario,
  validasiOpsi,
} from "../engine/index.js";
import {
  bacaBodyJson,
  buatGalatHttp,
  kirimData,
  kirimGalat,
} from "./util-http.js";

const NAMA_APLIKASI = "AmanLaba";
const VERSI_APLIKASI = "1.0.0";

/**
 * Membaca dan memvalidasi body { skenario, opsi? }.
 *
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<{skenario:object, opsi:object}>}
 */
async function bacaPermintaanSimulasi(req) {
  const body = await bacaBodyJson(req);

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw buatGalatHttp("VALIDASI_GAGAL", 400, "Input tidak valid.", [
      { field: "skenario", pesan: "skenario wajib diisi." },
    ]);
  }

  const skenario = body.skenario;
  const opsi =
    body.opsi === undefined || body.opsi === null ? {} : body.opsi;

  const hasilSkenario = validasiSkenario(skenario);
  const hasilOpsi = validasiOpsi(opsi);
  const galat = [...hasilSkenario.galat, ...hasilOpsi.galat];

  if (galat.length > 0) {
    throw buatGalatHttp("VALIDASI_GAGAL", 400, "Input tidak valid.", galat);
  }

  return { skenario, opsi };
}

const RUTE = {
  "/api/health": {
    metode: "GET",
    tangani(req, res) {
      kirimData(res, {
        status: "ok",
        nama: NAMA_APLIKASI,
        versi: VERSI_APLIKASI,
        waktu: new Date().toISOString(),
      });
    },
  },

  "/api/template": {
    metode: "GET",
    tangani(req, res) {
      kirimData(res, daftarTemplate());
    },
  },

  "/api/simulasi": {
    metode: "POST",
    async tangani(req, res) {
      const { skenario, opsi } = await bacaPermintaanSimulasi(req);
      const data = jalankanSimulasi(skenario, opsi);
      kirimData(res, data);
    },
  },

  "/api/harga": {
    metode: "POST",
    async tangani(req, res) {
      const { skenario, opsi } = await bacaPermintaanSimulasi(req);
      const opsiNormal = normalisasiOpsi(opsi, skenario);

      const mulai = Date.now();
      const hasil = sapuanHarga(skenario, {
        iterasi: opsiNormal.iterasi,
        seed: opsiNormal.seed,
        sapuanHarga: opsiNormal.sapuanHarga,
      });

      kirimData(res, {
        sapuan: hasil.sapuan,
        terbaik: hasil.terbaik,
        teraman: hasil.teraman,
        meta: {
          iterasi: 1500,
          seed: opsiNormal.seed,
          versiMesin: VERSI_MESIN,
          sapuanHarga: opsiNormal.sapuanHarga,
          durasiMs: Date.now() - mulai,
          dihitungPada: new Date().toISOString(),
        },
      });
    },
  },
};

/**
 * Menangani seluruh rute /api/*. Selalu mengirim respons.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} urlObj
 * @returns {Promise<void>}
 */
export async function tanganiApi(req, res, urlObj) {
  const rute = RUTE[urlObj.pathname];

  if (!rute) {
    kirimGalat(res, 404, "TIDAK_DITEMUKAN", "Rute API tidak ditemukan.");
    return;
  }

  if (req.method !== rute.metode) {
    kirimGalat(
      res,
      405,
      "METODE_TIDAK_DIIZINKAN",
      `Gunakan ${rute.metode} untuk endpoint ini.`,
      undefined,
      { Allow: rute.metode },
    );
    return;
  }

  try {
    await rute.tangani(req, res);
  } catch (error) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (error && error.kode && error.status) {
      if (error.kode === "VALIDASI_GAGAL") {
        kirimGalat(
          res,
          400,
          "VALIDASI_GAGAL",
          "Input tidak valid.",
          error.detail ?? [],
        );
      } else {
        kirimGalat(
          res,
          error.status,
          error.kode,
          error.pesan ?? "Permintaan tidak dapat diproses.",
          error.detail,
        );
      }
      return;
    }
    // Kesalahan tak terduga: jangan bocorkan stack trace ke klien.
    kirimGalat(res, 500, "INTERNAL", "Terjadi kesalahan pada server.");
  }
}
