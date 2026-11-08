/**
 * Server HTTP AmanLaba.
 *
 * Tanpa framework dan tanpa dependency npm. Server tidak listen saat modul
 * diimpor; gunakan buatServer()/mulaiServer() atau jalankan langsung.
 */

import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { tanganiApi } from "./http/rute-api.js";
import { tanganiStatis } from "./http/rute-statis.js";
import { kirimGalat } from "./http/util-http.js";

const BERKAS_INI = fileURLToPath(import.meta.url);
const AKAR_PROYEK = path.resolve(path.dirname(BERKAS_INI), "..");
const DIREKTORI_PUBLIK_DEFAULT = path.join(AKAR_PROYEK, "public");

/**
 * Membuat http.Server tanpa memanggil listen.
 *
 * @param {{direktoriPublik?:string}} [opsi]
 * @returns {import('node:http').Server}
 */
export function buatServer(opsi = {}) {
  const direktoriPublik = opsi.direktoriPublik
    ? path.resolve(opsi.direktoriPublik)
    : DIREKTORI_PUBLIK_DEFAULT;

  return http.createServer(async (req, res) => {
    try {
      // Base tetap: hanya pathname yang dipakai, header Host tidak dipercaya.
      const urlObj = new URL(req.url || "/", "http://localhost");

      if (urlObj.pathname === "/api" || urlObj.pathname.startsWith("/api/")) {
        await tanganiApi(req, res, urlObj);
        return;
      }

      await tanganiStatis(req, res, urlObj, direktoriPublik);
    } catch {
      if (!res.headersSent) {
        kirimGalat(res, 500, "INTERNAL", "Terjadi kesalahan pada server.");
      } else {
        res.destroy();
      }
    }
  });
}

/**
 * Membuat server lalu listen.
 *
 * @param {{port?:number, host?:string, direktoriPublik?:string}} [opsi]
 * @returns {Promise<{server:import('node:http').Server, port:number, url:string}>}
 */
export async function mulaiServer(opsi = {}) {
  const port =
    opsi.port !== undefined
      ? opsi.port
      : process.env.PORT
        ? Number(process.env.PORT)
        : 3000;
  const host = opsi.host ?? (process.env.HOST || "0.0.0.0");

  const server = buatServer({ direktoriPublik: opsi.direktoriPublik });

  await new Promise((resolve, reject) => {
    const saatGalat = (error) => {
      server.off("listening", saatSiap);
      reject(error);
    };
    const saatSiap = () => {
      server.off("error", saatGalat);
      resolve();
    };
    server.once("error", saatGalat);
    server.once("listening", saatSiap);
    server.listen(port, host);
  });

  const alamat = server.address();
  const portAktual =
    alamat && typeof alamat === "object" ? alamat.port : Number(port);

  return {
    server,
    port: portAktual,
    url: `http://${host}:${portAktual}`,
  };
}

const DIJALANKAN_LANGSUNG =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === BERKAS_INI;

if (DIJALANKAN_LANGSUNG) {
  const { server, url } = await mulaiServer();

  if (process.env.NODE_ENV !== "test") {
    console.log(`AmanLaba berjalan di ${url}`);
  }

  const matikan = (sinyal) => {
    if (process.env.NODE_ENV !== "test") {
      console.log(`Menerima ${sinyal}. Menutup server...`);
    }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on("SIGINT", () => matikan("SIGINT"));
  process.on("SIGTERM", () => matikan("SIGTERM"));
}
