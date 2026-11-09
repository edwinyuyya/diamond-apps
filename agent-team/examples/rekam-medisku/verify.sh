#!/usr/bin/env bash
# verify.sh — verifikasi lengkap Rekam Medisku (t16/t27, diperbarui t34).
#
# Langkah: cek aset vendor OCR + Whisper (12 berkas model q8, transformers,
# ONNX WASM), grep artefak ASR lama, jalankan seluruh test, start server
# sementara, tunggu /health, smoke test HTTP (termasuk MIME .wasm/.onnx),
# lalu matikan server lewat trap EXIT.
#
# Idempoten, non-interaktif, hanya localhost, tanpa jaringan eksternal.
# npm install & vendoring adalah persiapan terpisah (CONTRACT 14.2):
#   npm install && npm run vendor:ocr && npm run vendor:whisper
# Skrip ini TIDAK menjalankan vendoring/unduhan apa pun saat verifikasi.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PORT="${VERIFY_PORT:-3210}"
HOST="127.0.0.1"
BASE_URL="http://${HOST}:${PORT}"
VENDOR_HINT="Jalankan npm install && npm run vendor:ocr && npm run vendor:whisper"

SERVER_PID=""
SERVER_LOG=""
BODY_FILE=""
HEADER_FILE=""

cleanup() {
  if [ -n "${SERVER_PID}" ] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  rm -f "${SERVER_LOG:-}" "${BODY_FILE:-}" "${HEADER_FILE:-}"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

print_server_log() {
  if [ -n "${SERVER_LOG}" ] && [ -f "${SERVER_LOG}" ]; then
    echo "--- log server (ekor) ---" >&2
    tail -n 40 "${SERVER_LOG}" >&2 || true
    echo "-------------------------" >&2
  fi
}

fail() {
  echo "" >&2
  echo "GAGAL: $*" >&2
  print_server_log
  exit 1
}

step() {
  echo ""
  echo "==> $*"
}

# ---------------------------------------------------------------------------
# 0. Aset vendor OCR + Whisper + grep kebersihan
# ---------------------------------------------------------------------------
step "Langkah 0/4: memeriksa aset vendor OCR/Whisper dan artefak lama"

if [ ! -f public/vendor/manifest.json ] || [ ! -f public/vendor/suara/manifest.json ]; then
  echo "$VENDOR_HINT" >&2
  fail "Manifest vendor OCR/suara tidak ditemukan."
fi

node --input-type=module -e '
  import { readFile, readdir, stat } from "node:fs/promises";
  import path from "node:path";

  let gagal = false;
  const catat = (pesan) => { console.error(pesan); gagal = true; };

  const MODEL_FILES = [
    "config.json",
    "generation_config.json",
    "preprocessor_config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "vocab.json",
    "merges.txt",
    "normalizer.json",
    "added_tokens.json",
    "special_tokens_map.json",
    "onnx/encoder_model_quantized.onnx",
    "onnx/decoder_model_merged_quantized.onnx"
  ];
  const ONNX_BESAR = new Set([
    "onnx/encoder_model_quantized.onnx",
    "onnx/decoder_model_merged_quantized.onnx"
  ]);
  const SUARA_DIR = "public/vendor/suara";
  const MODEL_DIR = path.join(SUARA_DIR, "models/Xenova/whisper-base");

  async function bacaManifest(rel) {
    try {
      return JSON.parse(await readFile(rel, "utf8"));
    } catch (error) {
      catat(`${rel}: ${error.message}`);
      return null;
    }
  }

  async function infoBerkas(rel, label, { minBytes = 1 } = {}) {
    try {
      const info = await stat(rel);
      if (!info.isFile()) throw new Error("bukan berkas");
      if (info.size < minBytes) throw new Error(`ukurannya ${info.size} byte`);
      return info;
    } catch (error) {
      catat(`${label} tidak valid (${rel}): ${error.message}`);
      return null;
    }
  }

  async function cekEntry(baseDir, value, label, awalan = "/vendor/") {
    if (typeof value !== "string" || value.length === 0) {
      catat(`${label} tidak ada.`);
      return;
    }
    const relatif = value.startsWith(awalan) ? value.slice(awalan.length) : value;
    await infoBerkas(path.join(baseDir, relatif), label);
  }

  async function cekDir(baseDir, value, label, awalan = "/vendor/") {
    if (typeof value !== "string" || value.length === 0) {
      catat(`${label} tidak ada.`);
      return;
    }
    const relatif = value.startsWith(awalan) ? value.slice(awalan.length) : value;
    try {
      const info = await stat(path.join(baseDir, relatif));
      if (!info.isDirectory()) throw new Error("bukan direktori");
    } catch (error) {
      catat(`${label} tidak valid (${relatif}): ${error.message}`);
    }
  }

  async function cekFiles(baseDir, files, label) {
    if (!Array.isArray(files) || files.length === 0) {
      catat(`${label}: files kosong.`);
      return;
    }
    for (const file of files) {
      if (!file || typeof file.path !== "string" || !file.path) {
        catat(`${label}: entri files tanpa path.`);
        continue;
      }
      await infoBerkas(path.join(baseDir, file.path), `${label} files ${file.path}`);
    }
  }

  // --- OCR ---
  const ocr = await bacaManifest("public/vendor/manifest.json");
  if (ocr) {
    if (!ocr.entry || typeof ocr.entry !== "object") catat("OCR: manifest.entry tidak ada.");
    else for (const key of ["module", "worker"]) {
      await cekEntry("public/vendor", ocr.entry[key], `OCR entry.${key}`);
    }
    await cekFiles("public/vendor", ocr.files, "OCR");
  }

  // --- Whisper ---
  const suara = await bacaManifest(`${SUARA_DIR}/manifest.json`);
  if (suara) {
    if (suara.engine !== "whisper") {
      catat(`Suara: engine harus "whisper", ditemukan ${JSON.stringify(suara.engine)}.`);
    }
    if (!suara.model || suara.model.id !== "Xenova/whisper-base") {
      catat("Suara: model.id harus \"Xenova/whisper-base\".");
    }
    if (!suara.model || suara.model.quantization !== "q8") {
      catat("Suara: model.quantization harus \"q8\".");
    }
    if (suara.runtimeExternalRequests !== 0) {
      catat(`Suara: runtimeExternalRequests harus 0, ditemukan ${suara.runtimeExternalRequests}.`);
    }

    const entry = suara.entry || {};
    if (!entry || typeof entry !== "object") catat("Suara: manifest.entry tidak ada.");
    await cekEntry(SUARA_DIR, entry.module, "Suara entry.module", "/vendor/suara/");
    await cekDir(SUARA_DIR, entry.wasmPath, "Suara entry.wasmPath", "/vendor/suara/");
    await cekDir(SUARA_DIR, entry.modelPath, "Suara entry.modelPath", "/vendor/suara/");

    // Modul, WASM ONNX, dan .mjs wajib ada & non-kosong.
    await infoBerkas(`${SUARA_DIR}/transformers/transformers.min.js`, "transformers.min.js");
    await infoBerkas(
      `${SUARA_DIR}/onnx/ort-wasm-simd-threaded.wasm`,
      "ort-wasm-simd-threaded.wasm"
    );
    await infoBerkas(
      `${SUARA_DIR}/onnx/ort-wasm-simd-threaded.mjs`,
      "ort-wasm-simd-threaded.mjs"
    );

    // 12 berkas model wajib; kedua .onnx wajib > 1 MB.
    for (const relatif of MODEL_FILES) {
      await infoBerkas(
        path.join(MODEL_DIR, relatif),
        `Model ${relatif}`,
        { minBytes: ONNX_BESAR.has(relatif) ? 1024 * 1024 : 1 }
      );
    }

    // Isi folder suara hanya manifest.json + tiga direktori.
    try {
      const isi = await readdir(SUARA_DIR, { withFileTypes: true });
      const izin = new Set(["manifest.json", "transformers", "onnx", "models"]);
      for (const entri of isi) {
        if (!izin.has(entri.name)) {
          catat(`Suara: artefak asing "${entri.name}" di ${SUARA_DIR}.`);
        }
      }
      for (const wajib of ["transformers", "onnx", "models"]) {
        const ada = isi.find((entri) => entri.name === wajib && entri.isDirectory());
        if (!ada) catat(`Suara: direktori ${wajib} tidak ada.`);
      }
    } catch (error) {
      catat(`Suara: gagal membaca isi folder: ${error.message}`);
    }

    // Tidak boleh ada berkas 0 byte / placeholder.
    async function telusuri(dir) {
      const isi = await readdir(dir, { withFileTypes: true });
      for (const entri of isi) {
        const rel = path.join(dir, entri.name);
        if (entri.isDirectory()) {
          await telusuri(rel);
        } else {
          const info = await stat(rel);
          if (info.size === 0) catat(`Suara: berkas kosong ${rel}.`);
          if (/placeholder/i.test(entri.name)) catat(`Suara: berkas placeholder ${rel}.`);
        }
      }
    }
    try {
      await telusuri(SUARA_DIR);
    } catch (error) {
      catat(`Suara: gagal menelusuri folder: ${error.message}`);
    }

    const teksManifest = await readFile(`${SUARA_DIR}/manifest.json`, "utf8");
    if (/PLACEHOLDER/.test(teksManifest)) {
      catat("Suara: manifest masih memuat string PLACEHOLDER.");
    }
  }

  if (gagal) process.exit(1);
' || fail "Aset vendor tidak lengkap. ${VENDOR_HINT}"

echo "Vendor OCR lengkap: public/vendor/manifest.json"
echo "Vendor Whisper lengkap: manifest q8 + 12 berkas model + transformers + ONNX WASM"

# Grep statis: aplikasi/skrip tidak boleh menyebut mesin ASR lama atau
# perintah vendoring lama. Pola dipecah agar verify.sh sendiri tidak cocok.
POLA_LAMA="vos""k|vendor[:-]sua""ra|model-""id"
if grep -rniE "$POLA_LAMA" package.json scripts app README.md verify.sh >/dev/null 2>&1; then
  grep -rniE "$POLA_LAMA" package.json scripts app README.md verify.sh >&2 || true
  fail "Ditemukan nama mesin ASR lama / perintah vendoring lama."
fi
echo "Grep bersih: tidak ada artefak ASR lama di package.json/scripts/app/README/verify.sh"

# ---------------------------------------------------------------------------
# 1. Test
# ---------------------------------------------------------------------------
step "Langkah 1/4: menjalankan seluruh test (node --test tests/*.test.js)"
node --test tests/*.test.js || fail "Test gagal."

# ---------------------------------------------------------------------------
# 2. Start server
# ---------------------------------------------------------------------------
step "Langkah 2/4: menjalankan server di ${BASE_URL}"
SERVER_LOG="$(mktemp -t rawatku-server-XXXXXX.log)"
BODY_FILE="$(mktemp -t rawatku-body-XXXXXX)"
HEADER_FILE="$(mktemp -t rawatku-headers-XXXXXX)"

PORT="$PORT" HOST="$HOST" node server.js >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

# ---------------------------------------------------------------------------
# 3. Tunggu /health (maks. 30 detik)
# ---------------------------------------------------------------------------
step "Langkah 3/4: menunggu GET /health siap (maks. 30 detik)"
DEADLINE=$((SECONDS + 30))
READY=0
while [ "$SECONDS" -lt "$DEADLINE" ]; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    fail "Server berhenti sebelum siap."
  fi
  if curl -fsS --max-time 2 "${BASE_URL}/health" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.25
done
[ "$READY" -eq 1 ] || fail "Server tidak siap dalam 30 detik di ${BASE_URL}/health."
echo "Server siap."

# ---------------------------------------------------------------------------
# 4. Smoke test dengan curl
# ---------------------------------------------------------------------------
step "Langkah 4/4: smoke test HTTP"

http_get() {
  curl -sS --path-as-is --max-time 5 -D "$HEADER_FILE" -o "$BODY_FILE" -w '%{http_code}' "${BASE_URL}$1"
}

expect_status() {
  local expected="$1" path="$2" status
  status="$(http_get "$path")" || fail "GET ${path} gagal dijalankan."
  [ "$status" = "$expected" ] || fail "GET ${path}: status ${status}, diharapkan ${expected}."
  echo "  OK  GET ${path} → ${status}"
}

expect_body_contains() {
  local needle="$1" path="$2"
  grep -Fq -- "$needle" "$BODY_FILE" || fail "GET ${path}: body tidak memuat '${needle}'."
}

expect_content_type() {
  local pattern="$1" path="$2"
  grep -iq "^content-type:.*${pattern}" "$HEADER_FILE" \
    || fail "GET ${path}: content-type tidak cocok dengan '${pattern}'."
}

expect_content_type_exact() {
  local expected="$1" path="$2" tipe
  tipe="$(curl -sS --path-as-is --max-time 5 -o /dev/null -w '%{content_type}' "${BASE_URL}${path}")" \
    || fail "GET ${path} gagal dijalankan."
  [ "$tipe" = "$expected" ] || fail "GET ${path}: content-type '${tipe}', diharapkan '${expected}'."
}

# /health
expect_status 200 /health
expect_content_type "application/json" /health
node -e '
  const fs = require("node:fs");
  const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (body.status !== "ok" || body.app !== "rawatku" || body.version !== "1.1.0") {
    console.error("Body /health tidak sesuai:", body);
    process.exit(1);
  }
' "$BODY_FILE" || fail "/health: JSON status/app/version tidak sesuai."
echo "  OK  /health JSON {status:ok, app:rawatku, version:1.1.0}"

# Halaman utama
expect_status 200 /
expect_content_type "text/html" /
expect_body_contains "Rekam Medisku" /
echo "  OK  / memuat teks Rekam Medisku"

# JS & manifest PWA
expect_status 200 /js/app.js
expect_content_type "javascript" /js/app.js
echo "  OK  /js/app.js javascript"

expect_status 200 /manifest.webmanifest
expect_body_contains '"name"' /manifest.webmanifest
echo "  OK  /manifest.webmanifest memuat name"

# Manifest vendor OCR + .wasm pertama
expect_status 200 /vendor/manifest.json
expect_content_type "application/json" /vendor/manifest.json
node -e '
  const fs = require("node:fs");
  const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (!manifest.entry || typeof manifest.entry !== "object") process.exit(1);
' "$BODY_FILE" || fail "/vendor/manifest.json tidak memuat entry."
echo "  OK  /vendor/manifest.json memuat entry"

WASM_PATH="$(node --input-type=module -e '
  import { readFile } from "node:fs/promises";
  const manifest = JSON.parse(await readFile("public/vendor/manifest.json", "utf8"));
  const wasm = (manifest.files || []).map((file) => file.path).find((p) => p.endsWith(".wasm"));
  if (!wasm) {
    console.error("Tidak ada berkas .wasm di manifest vendor OCR.");
    process.exit(1);
  }
  process.stdout.write(wasm);
')" || fail "Vendor OCR tidak lengkap: tidak ada berkas .wasm di manifest."

expect_status 200 "/vendor/${WASM_PATH}"
expect_content_type_exact "application/wasm" "/vendor/${WASM_PATH}"
echo "  OK  /vendor/${WASM_PATH} → application/wasm"

# Manifest vendor Whisper
expect_status 200 /vendor/suara/manifest.json
expect_content_type "application/json" /vendor/suara/manifest.json
node -e '
  const fs = require("node:fs");
  const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const entry = manifest.entry || {};
  if (manifest.engine !== "whisper") {
    console.error("engine harus whisper:", manifest.engine);
    process.exit(1);
  }
  if (!manifest.model || manifest.model.id !== "Xenova/whisper-base") {
    console.error("model.id salah:", manifest.model);
    process.exit(1);
  }
  if (manifest.model.quantization !== "q8") {
    console.error("quantization harus q8:", manifest.model.quantization);
    process.exit(1);
  }
  if (manifest.runtimeExternalRequests !== 0) {
    console.error("runtimeExternalRequests harus 0:", manifest.runtimeExternalRequests);
    process.exit(1);
  }
  for (const key of ["module", "wasmPath", "modelPath"]) {
    if (typeof entry[key] !== "string" || entry[key].length === 0) {
      console.error(`entry.${key} tidak ada.`);
      process.exit(1);
    }
  }
' "$BODY_FILE" || fail "/vendor/suara/manifest.json: engine/model/entry/runtimeExternalRequests tidak sesuai."
echo "  OK  /vendor/suara/manifest.json engine=whisper, q8, runtimeExternalRequests=0"

# Modul + WASM + .mjs mesin suara
expect_status 200 /vendor/suara/transformers/transformers.min.js
expect_content_type "javascript" /vendor/suara/transformers/transformers.min.js
echo "  OK  transformers.min.js → javascript"

expect_status 200 /vendor/suara/onnx/ort-wasm-simd-threaded.wasm
expect_content_type_exact "application/wasm" /vendor/suara/onnx/ort-wasm-simd-threaded.wasm
echo "  OK  ort-wasm-simd-threaded.wasm → application/wasm"

expect_status 200 /vendor/suara/onnx/ort-wasm-simd-threaded.mjs
expect_content_type "javascript" /vendor/suara/onnx/ort-wasm-simd-threaded.mjs
echo "  OK  ort-wasm-simd-threaded.mjs → javascript"

# Model ONNX q8: MIME application/octet-stream.
for MODEL_ONNX in \
  /vendor/suara/models/Xenova/whisper-base/onnx/encoder_model_quantized.onnx \
  /vendor/suara/models/Xenova/whisper-base/onnx/decoder_model_merged_quantized.onnx; do
  expect_status 200 "$MODEL_ONNX"
  expect_content_type_exact "application/octet-stream" "$MODEL_ONNX"
  echo "  OK  ${MODEL_ONNX} → application/octet-stream"
done

# 404/405 dan path ASR lama tidak dilayani.
expect_status 404 /tidak-ada
expect_body_contains "404 Tidak ditemukan" /tidak-ada
echo "  OK  /tidak-ada → 404"

STATUS_405="$(curl -sS --max-time 5 -o "$BODY_FILE" -w '%{http_code}' -X POST "${BASE_URL}/health")" \
  || fail "POST /health gagal dijalankan."
[ "$STATUS_405" = "405" ] || fail "POST /health: status ${STATUS_405}, diharapkan 405."
grep -Fq "405 Metode tidak diizinkan" "$BODY_FILE" || fail "POST /health: body 405 tidak sesuai."
echo "  OK  POST /health → 405"

expect_status 404 /vendor/suara/unknown/berkas-lama.js
echo "  OK  /vendor/suara/unknown/berkas-lama.js → 404"

# Traversal pada root dan vendor.
for TRAVERSAL in "/../server.js" "/vendor/../server.js" "/vendor/%2e%2e%2f%2e%2e%2fserver.js"; do
  STATUS_TRAVERSAL="$(http_get "$TRAVERSAL")" || fail "GET ${TRAVERSAL} gagal dijalankan."
  [ "$STATUS_TRAVERSAL" = "404" ] || fail "GET ${TRAVERSAL}: status ${STATUS_TRAVERSAL}, diharapkan 404."
  grep -Fq "createServer" "$BODY_FILE" && fail "GET ${TRAVERSAL}: membocorkan isi server.js."
  echo "  OK  GET ${TRAVERSAL} → 404"
done

# ---------------------------------------------------------------------------
echo ""
echo "SEMUA VERIFIKASI LULUS"
exit 0
