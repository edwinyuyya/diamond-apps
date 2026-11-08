#!/usr/bin/env bash
#
# verify.sh — verifikasi end-to-end AmanLaba.
#
# Langkah: cek Node, install dependency (no-op, nol dependency), build (tidak
# ada), jalankan seluruh test, nyalakan server sementara di port 3456, tunggu
# /api/health siap, lalu smoke test halaman dan API. Server selalu dimatikan
# lewat trap EXIT. Skrip idempoten dan non-interaktif.
#
set -euo pipefail

AKAR_PROYEK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AKAR_PROYEK"

PORT_UJI="${PORT_UJI:-3456}"
HOST_UJI="${HOST_UJI:-127.0.0.1}"
BASE="http://${HOST_UJI}:${PORT_UJI}"

LOG_SERVER="$(mktemp "${TMPDIR:-/tmp}/amanlaba-verify-XXXXXX.log")"
SERVER_PID=""

info() {
  printf '\n== %s ==\n' "$*"
}

gagal() {
  printf '\nGAGAL: %s\n' "$*" >&2
  exit 1
}

bersihkan() {
  local kode=$?
  if [ -n "${SERVER_PID}" ] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    for _ in $(seq 1 40); do
      kill -0 "${SERVER_PID}" 2>/dev/null || break
      sleep 0.05
    done
    kill -9 "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  rm -f "${LOG_SERVER}"
  exit "${kode}"
}

trap bersihkan EXIT
trap 'exit 130' INT TERM

info "Langkah 1/6: memeriksa perkakas dan versi Node"
command -v node >/dev/null 2>&1 || gagal "Node.js tidak ditemukan di PATH."
command -v npm >/dev/null 2>&1 || gagal "npm tidak ditemukan di PATH."
command -v curl >/dev/null 2>&1 || gagal "curl tidak ditemukan di PATH."

NODE_VERSI="$(node -p 'process.versions.node')"
if ! node -e '
  const [mayor, minor] = process.versions.node.split(".").map(Number);
  process.exit(mayor > 18 || (mayor === 18 && minor >= 17) ? 0 : 1);
'; then
  gagal "Node.js ${NODE_VERSI} terlalu lama; dibutuhkan >= 18.17."
fi
echo "  Node v${NODE_VERSI} OK"

info "Langkah 2/6: dependency"
# Nol dependency: npm install aman dijalankan dan tidak membuat lockfile/node_modules.
npm install --no-audit --no-fund --package-lock=false --ignore-scripts
echo "  0 dependency — tidak ada paket yang perlu dipasang."

info "Langkah 3/6: build"
SCRIPT_BUILD="$(node -p "require('./package.json').scripts?.build || ''")"
if [ -n "${SCRIPT_BUILD}" ]; then
  npm run build
else
  echo "  Tidak ada script build — aset statis disajikan apa adanya."
fi

info "Langkah 4/6: menjalankan seluruh test (npm test)"
npm test

info "Langkah 5/6: menyalakan server sementara di ${BASE}"
if curl -s -o /dev/null --max-time 1 "${BASE}/api/health" 2>/dev/null; then
  gagal "Port ${PORT_UJI} sudah dipakai proses lain."
fi

NODE_ENV=test PORT="${PORT_UJI}" HOST="${HOST_UJI}" \
  node backend/server.js >"${LOG_SERVER}" 2>&1 &
SERVER_PID=$!

SIAP=0
for _ in $(seq 1 60); do
  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    printf '\nLog server:\n' >&2
    sed -n '1,60p' "${LOG_SERVER}" >&2 || true
    gagal "Server berhenti sebelum /api/health siap."
  fi
  if curl -fsS --max-time 1 "${BASE}/api/health" >/dev/null 2>&1; then
    SIAP=1
    break
  fi
  sleep 0.5
done

if [ "${SIAP}" -ne 1 ]; then
  printf '\nLog server:\n' >&2
  sed -n '1,60p' "${LOG_SERVER}" >&2 || true
  gagal "Server tidak siap dalam 30 detik."
fi
echo "  Server siap (pid ${SERVER_PID})."

info "Langkah 6/6: smoke test dengan curl"
cek_status() {
  local jalur="$1"
  local harapan="${2:-200}"
  local kode
  kode="$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' "${BASE}${jalur}")" ||
    gagal "curl gagal untuk ${jalur}."
  if [ "${kode}" != "${harapan}" ]; then
    gagal "GET ${jalur} mengembalikan ${kode}, diharapkan ${harapan}."
  fi
  echo "  OK ${kode} GET ${jalur}"
}

cek_kandungan() {
  local jalur="$1"
  local teks="$2"
  local isi
  isi="$(curl -fsS --max-time 5 "${BASE}${jalur}")" ||
    gagal "curl gagal untuk ${jalur}."
  case "${isi}" in
    *"${teks}"*) echo "  OK ${jalur} memuat \"${teks}\"" ;;
    *) gagal "GET ${jalur} tidak memuat \"${teks}\"." ;;
  esac
}

cek_status "/"
cek_status "/app"
cek_status "/laporan"
cek_status "/api/template"
cek_status "/api/health"

cek_kandungan "/" "Jangan tebak harga jual. Simulasikan risikonya."
cek_kandungan "/app" 'id="tombol-hitung"'
cek_kandungan "/laporan" 'id="laporan"'

curl -fsS --max-time 5 "${BASE}/api/health" | node -e '
  const fs = require("fs");
  const { data } = JSON.parse(fs.readFileSync(0, "utf8"));
  if (!data || data.status !== "ok") {
    console.error("status health bukan ok");
    process.exit(1);
  }
' || gagal "Respons /api/health tidak valid."
echo "  OK /api/health status=ok"

curl -fsS --max-time 5 "${BASE}/api/template" | node -e '
  const fs = require("fs");
  const { data } = JSON.parse(fs.readFileSync(0, "utf8"));
  const ids = Array.isArray(data) ? data.map((t) => t.id).join(",") : "";
  if (ids !== "warung-makan,kafe,toko-online,jasa-freelance") {
    console.error("template tidak sesuai kontrak: " + ids);
    process.exit(1);
  }
' || gagal "Respons /api/template tidak sesuai kontrak."
echo "  OK /api/template memuat 4 template sesuai urutan"

printf '\nSemua langkah verifikasi lulus.\n'
printf 'VERIFIKASI LULUS\n'
exit 0
