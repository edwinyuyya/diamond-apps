#!/usr/bin/env bash
# verify.sh — verifikasi lengkap Rekam Medisku (t16 QA).
#
# Langkah: cek vendor OCR, jalankan seluruh test, start server sementara,
# tunggu /health, smoke test HTTP, lalu matikan server lewat trap EXIT.
# Idempoten, non-interaktif, hanya memakai localhost (tanpa jaringan eksternal).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PORT="${VERIFY_PORT:-3210}"
HOST="127.0.0.1"
BASE_URL="http://${HOST}:${PORT}"
VENDOR_MANIFEST="public/vendor/manifest.json"

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
# 0. Vendor OCR
# ---------------------------------------------------------------------------
step "Langkah 0/4: memeriksa aset vendor OCR"

if [ ! -f "$VENDOR_MANIFEST" ] && [ -d node_modules ] && command -v npm >/dev/null 2>&1; then
  echo "Vendor OCR belum ada; menjalankan npm run vendor:ocr ..."
  npm run vendor:ocr || fail "npm run vendor:ocr gagal."
fi

if [ ! -f "$VENDOR_MANIFEST" ]; then
  echo "Jalankan npm install && npm run vendor:ocr" >&2
  fail "public/vendor/manifest.json tidak ditemukan."
fi

node --input-type=module -e '
  import { readFile, stat } from "node:fs/promises";
  import path from "node:path";

  const vendorDir = path.resolve("public/vendor");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(vendorDir, "manifest.json"), "utf8"));
  } catch (error) {
    console.error("manifest.json tidak valid:", error.message);
    process.exit(1);
  }
  if (!manifest.entry || typeof manifest.entry !== "object") {
    console.error("manifest.json tidak memuat entry.");
    process.exit(1);
  }
  for (const key of ["module", "worker"]) {
    const value = manifest.entry[key];
    if (typeof value !== "string" || value.length === 0) {
      console.error(`manifest.entry.${key} tidak ada.`);
      process.exit(1);
    }
    const relative = value.replace(/^\/vendor\//, "");
    try {
      await stat(path.join(vendorDir, relative));
    } catch {
      console.error(`Berkas entry ${key} tidak ada: ${relative}`);
      process.exit(1);
    }
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    console.error("manifest.files kosong.");
    process.exit(1);
  }
' || fail "Aset vendor OCR tidak lengkap. Jalankan npm install && npm run vendor:ocr."

echo "Vendor OCR lengkap: $VENDOR_MANIFEST"

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

# Vendor manifest
expect_status 200 /vendor/manifest.json
expect_content_type "application/json" /vendor/manifest.json
node -e '
  const fs = require("node:fs");
  const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (!manifest.entry || typeof manifest.entry !== "object") process.exit(1);
' "$BODY_FILE" || fail "/vendor/manifest.json tidak memuat entry."
echo "  OK  /vendor/manifest.json memuat entry"

# Berkas .wasm pertama dan MIME-nya
WASM_PATH="$(node --input-type=module -e '
  import { readFile } from "node:fs/promises";
  const manifest = JSON.parse(await readFile("public/vendor/manifest.json", "utf8"));
  const wasm = (manifest.files || []).map((file) => file.path).find((p) => p.endsWith(".wasm"));
  if (!wasm) {
    console.error("Tidak ada berkas .wasm di manifest vendor.");
    process.exit(1);
  }
  process.stdout.write(wasm);
')" || fail "Vendor OCR tidak lengkap: tidak ada berkas .wasm di manifest."

expect_status 200 "/vendor/${WASM_PATH}"
expect_content_type "application/wasm" "/vendor/${WASM_PATH}"
[ "$(curl -sS --max-time 5 -o /dev/null -w '%{content_type}' "${BASE_URL}/vendor/${WASM_PATH}")" = "application/wasm" ] \
  || fail "/vendor/${WASM_PATH}: content-type bukan application/wasm."
echo "  OK  /vendor/${WASM_PATH} → application/wasm"

# 404 dan 405
expect_status 404 /tidak-ada
expect_body_contains "404 Tidak ditemukan" /tidak-ada
echo "  OK  /tidak-ada → 404"

STATUS_405="$(curl -sS --max-time 5 -o "$BODY_FILE" -w '%{http_code}' -X POST "${BASE_URL}/health")" \
  || fail "POST /health gagal dijalankan."
[ "$STATUS_405" = "405" ] || fail "POST /health: status ${STATUS_405}, diharapkan 405."
grep -Fq "405 Metode tidak diizinkan" "$BODY_FILE" || fail "POST /health: body 405 tidak sesuai."
echo "  OK  POST /health → 405"

# Traversal pada root dan vendor
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
