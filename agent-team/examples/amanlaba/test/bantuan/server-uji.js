/**
 * Bantuan test: menjalankan server AmanLaba pada port ephemeral (0) agar test
 * tidak bergantung pada port 3000 dan tidak saling bentrok antar file test.
 */

import http from "node:http";

import { mulaiServer } from "../../backend/server.js";

/**
 * Menyalakan server uji pada port ephemeral.
 *
 * @returns {Promise<{
 *   server: import("node:http").Server,
 *   port: number,
 *   dasar: string,
 *   tutup: () => Promise<void>
 * }>}
 */
export async function buatServerUji() {
  const { server, port } = await mulaiServer({ port: 0, host: "127.0.0.1" });

  return {
    server,
    port,
    dasar: `http://127.0.0.1:${port}`,
    async tutup() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

/**
 * Mengambil JSON dari server uji tanpa melempar saat status non-2xx.
 *
 * @param {string} dasar base URL, mis. http://127.0.0.1:1234
 * @param {string} jalur
 * @param {RequestInit} [opsi]
 * @returns {Promise<{status:number, headers:Headers, teks:string, data:unknown}>}
 */
export async function ambilJson(dasar, jalur, opsi = {}) {
  const respons = await fetch(`${dasar}${jalur}`, opsi);
  const teks = await respons.text();

  let data = null;
  try {
    data = JSON.parse(teks);
  } catch {
    data = null;
  }

  return { status: respons.status, headers: respons.headers, teks, data };
}

/**
 * Mengirim permintaan HTTP mentah (tanpa normalisasi URL seperti pada fetch).
 * Dipakai untuk menguji path traversal.
 *
 * @param {number} port
 * @param {string} jalur path mentah, termasuk karakter traversal
 * @returns {Promise<{status:number, headers:import("node:http").IncomingHttpHeaders, teks:string}>}
 */
export function mintaMentah(port, jalur) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: jalur, method: "GET" },
      (res) => {
        const potongan = [];
        res.on("data", (bagian) => potongan.push(bagian));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            teks: Buffer.concat(potongan).toString("utf8"),
          });
        });
      },
    );

    req.on("error", reject);
    req.end();
  });
}
