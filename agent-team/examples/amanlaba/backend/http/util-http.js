/**
 * Utilitas HTTP bersama: envelope JSON, pembacaan body, dan galat berkode.
 */

export const BATAS_BODY = 128 * 1024;

/**
 * Membuat Error HTTP berkode.
 *
 * @param {string} kode
 * @param {number} status
 * @param {string} pesan
 * @param {unknown} [detail]
 * @returns {Error & {kode:string, status:number, detail?:unknown}}
 */
export function buatGalatHttp(kode, status, pesan, detail) {
  const error = new Error(pesan);
  error.kode = kode;
  error.status = status;
  if (detail !== undefined) error.detail = detail;
  return error;
}

/**
 * Mengirim respons JSON dengan header standar.
 *
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} muatan
 * @param {Record<string,string>} [headerTambahan]
 */
export function kirimJson(res, status, muatan, headerTambahan = {}) {
  const isi = JSON.stringify(muatan);
  const buffer = Buffer.from(isi, "utf8");
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": buffer.length,
    "X-Content-Type-Options": "nosniff",
    ...headerTambahan,
  });
  res.end(buffer);
}

/**
 * Mengirim envelope sukses { data }.
 *
 * @param {import('node:http').ServerResponse} res
 * @param {unknown} data
 * @param {number} [status]
 */
export function kirimData(res, data, status = 200) {
  kirimJson(res, status, { data });
}

/**
 * Mengirim envelope galat { error: { kode, pesan, detail? } }.
 *
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {string} kode
 * @param {string} pesan
 * @param {unknown} [detail]
 * @param {Record<string,string>} [headerTambahan]
 */
export function kirimGalat(
  res,
  status,
  kode,
  pesan,
  detail,
  headerTambahan = {},
) {
  const error = { kode, pesan };
  if (detail !== undefined) error.detail = detail;
  kirimJson(res, status, { error }, headerTambahan);
}

/**
 * Membaca body JSON dengan batas ukuran.
 * Menolak dengan Error berkode TERLALU_BESAR / JSON_TIDAK_VALID.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {number} [batas]
 * @returns {Promise<unknown>}
 */
export function bacaBodyJson(req, batas = BATAS_BODY) {
  return new Promise((resolve, reject) => {
    const panjangHeader = Number(req.headers["content-length"]);
    if (Number.isFinite(panjangHeader) && panjangHeader > batas) {
      req.resume();
      reject(
        buatGalatHttp(
          "TERLALU_BESAR",
          413,
          "Body permintaan melebihi batas 128 KB.",
        ),
      );
      return;
    }

    const potongan = [];
    let total = 0;
    let berhenti = false;

    const gagal = (error) => {
      if (berhenti) return;
      berhenti = true;
      reject(error);
    };

    req.on("data", (chunk) => {
      if (berhenti) return;
      total += chunk.length;
      if (total > batas) {
        potongan.length = 0;
        gagal(
          buatGalatHttp(
            "TERLALU_BESAR",
            413,
            "Body permintaan melebihi batas 128 KB.",
          ),
        );
        return;
      }
      potongan.push(chunk);
    });

    req.on("error", () => {
      gagal(
        buatGalatHttp(
          "JSON_TIDAK_VALID",
          400,
          "Body permintaan tidak dapat dibaca.",
        ),
      );
    });

    req.on("end", () => {
      if (berhenti) return;
      const teks = Buffer.concat(potongan).toString("utf8").trim();
      if (teks === "") {
        gagal(
          buatGalatHttp(
            "JSON_TIDAK_VALID",
            400,
            "Body harus berisi JSON yang valid.",
          ),
        );
        return;
      }
      try {
        resolve(JSON.parse(teks));
      } catch {
        gagal(
          buatGalatHttp(
            "JSON_TIDAK_VALID",
            400,
            "Body bukan JSON yang valid.",
          ),
        );
      }
    });
  });
}
