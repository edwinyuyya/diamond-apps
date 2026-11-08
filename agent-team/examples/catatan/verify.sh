#!/usr/bin/env bash
#
# verify.sh — verifikasi end-to-end Catatan2 (CONTRACT.md §9.2).
#
# Langkah: install dependency (bila perlu) → npm test → smoke test HTTP nyata
# di PORT (default 3000) dengan DATA_FILE sementara → bersihkan server → VERIFY OK.
#
# Skrip idempoten dan non-interaktif: aman dijalankan berulang, tidak menyentuh
# data/notes.json, dan selalu mematikan server lewat trap.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3000}"
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || (( PORT < 1 || PORT > 65535 )); then
  PORT=3000
fi
BASE_URL="http://127.0.0.1:${PORT}"

TMP_DIR=""
SERVER_PID=""

log() {
  printf '\n==> %s\n' "$*"
}

fail() {
  printf '\nVERIFY GAGAL: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM

  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi

  if [[ -n "${TMP_DIR:-}" ]]; then
    rm -rf "$TMP_DIR"
  fi

  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

expect_status() {
  local expected="$1"
  local actual="$2"
  local desc="$3"
  local body="${4:-}"

  if [[ "$actual" != "$expected" ]]; then
    if [[ -n "$body" && -f "$body" ]]; then
      printf '\n--- body response ---\n' >&2
      cat "$body" >&2 || true
      printf '\n' >&2
    fi
    fail "${desc}: status ${actual:-<kosong>}, diharapkan ${expected}"
  fi
}

# check_json <file> <deskripsi> <script-node> [arg...]
# Script menerima path file sebagai process.argv[1] dan arg tambahan sesudahnya;
# lempar Error bila pemeriksaan gagal.
check_json() {
  local file="$1"
  local desc="$2"
  local script="$3"
  shift 3

  if ! node -e "$script" "$file" "$@"; then
    printf '\n--- body response ---\n' >&2
    cat "$file" >&2 || true
    printf '\n' >&2
    fail "Pemeriksaan JSON gagal: ${desc}"
  fi
}

# ---------------------------------------------------------------------------
# 1. Dependency
# ---------------------------------------------------------------------------
if [[ ! -d node_modules ]]; then
  log "npm install (node_modules belum ada)"
  if ! npm install --no-audit --no-fund; then
    fail "npm install gagal"
  fi
else
  log "node_modules sudah ada — lewati npm install"
fi

# ---------------------------------------------------------------------------
# 2. Test otomatis
# ---------------------------------------------------------------------------
log "npm test"
if ! npm test; then
  fail "npm test gagal"
fi

# ---------------------------------------------------------------------------
# 3. Smoke test HTTP nyata
# ---------------------------------------------------------------------------
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/catatan2-verify.XXXXXX")"
export DATA_FILE="$TMP_DIR/notes.json"
export PORT

log "Menjalankan server: PORT=${PORT}, DATA_FILE=${DATA_FILE}"
node server/index.js >"$TMP_DIR/server.log" 2>&1 &
SERVER_PID=$!

SERVER_READY=0
# Tunggu maksimal 10 detik (20 x 0.5 dtk) sesuai CONTRACT.md §9.2.
for _ in $(seq 1 20); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    printf '\n--- log server ---\n' >&2
    cat "$TMP_DIR/server.log" >&2 || true
    fail "server berhenti sebelum siap (kemungkinan port ${PORT} sudah dipakai)"
  fi

  HEALTH_CODE="$(curl -sS -o "$TMP_DIR/health.json" -w '%{http_code}' \
    "${BASE_URL}/api/health" 2>/dev/null || true)"
  if [[ "$HEALTH_CODE" == "200" ]]; then
    SERVER_READY=1
    break
  fi
  sleep 0.5
done

if [[ "$SERVER_READY" != "1" ]]; then
  printf '\n--- log server ---\n' >&2
  cat "$TMP_DIR/server.log" >&2 || true
  fail "server tidak siap di ${BASE_URL}/api/health dalam 10 detik"
fi

log "Server siap — GET /api/health"
expect_status 200 "$HEALTH_CODE" "GET /api/health" "$TMP_DIR/health.json"
check_json "$TMP_DIR/health.json" "GET /api/health harus {status:'ok'}" '
const health = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
if (!health || health.status !== "ok") throw new Error("status bukan ok");
'

log "POST /api/notes"
POST_CODE="$(curl -sS -o "$TMP_DIR/post.json" -w '%{http_code}' \
  -X POST -H 'Content-Type: application/json' \
  --data '{"title":"Catatan verify","content":"isi verify"}' \
  "${BASE_URL}/api/notes")" || fail "POST /api/notes gagal (koneksi)"
expect_status 201 "$POST_CODE" "POST /api/notes" "$TMP_DIR/post.json"
check_json "$TMP_DIR/post.json" "POST harus mengembalikan Note lengkap" '
const note = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
if (!note || typeof note.id !== "string" || note.id.length === 0) throw new Error("id tidak ada");
if (note.title !== "Catatan verify") throw new Error("title salah: " + note.title);
if (note.content !== "isi verify") throw new Error("content salah: " + note.content);
if (note.createdAt !== note.updatedAt) throw new Error("createdAt != updatedAt");
if (Number.isNaN(Date.parse(note.createdAt))) throw new Error("createdAt bukan ISO valid");
'

NOTE_ID="$(node -e '
const note = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
process.stdout.write(note.id || "");
' "$TMP_DIR/post.json")" || fail "gagal membaca id dari response POST"
[[ -n "$NOTE_ID" ]] || fail "id catatan dari POST kosong"

log "GET /api/notes (daftar berisi catatan baru)"
LIST_CODE="$(curl -sS -o "$TMP_DIR/list.json" -w '%{http_code}' \
  "${BASE_URL}/api/notes")" || fail "GET /api/notes gagal (koneksi)"
expect_status 200 "$LIST_CODE" "GET /api/notes" "$TMP_DIR/list.json"
check_json "$TMP_DIR/list.json" "daftar harus berisi tepat catatan yang baru dibuat" '
const expectedId = process.argv[2];
const list = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
if (!Array.isArray(list)) throw new Error("response bukan array");
if (list.length !== 1) throw new Error("jumlah catatan " + list.length + ", diharapkan 1");
if (list[0].id !== expectedId) throw new Error("id tidak cocok");
' "$NOTE_ID"

log "PUT /api/notes/${NOTE_ID}"
PUT_CODE="$(curl -sS -o "$TMP_DIR/put.json" -w '%{http_code}' \
  -X PUT -H 'Content-Type: application/json' \
  --data '{"title":"Catatan verify diubah"}' \
  "${BASE_URL}/api/notes/${NOTE_ID}")" || fail "PUT /api/notes/:id gagal (koneksi)"
expect_status 200 "$PUT_CODE" "PUT /api/notes/:id" "$TMP_DIR/put.json"
check_json "$TMP_DIR/put.json" "PUT harus mengubah title dan mempertahankan content" '
const expectedId = process.argv[2];
const note = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
if (!note || note.id !== expectedId) throw new Error("id berubah/tidak cocok");
if (note.title !== "Catatan verify diubah") throw new Error("title tidak berubah");
if (note.content !== "isi verify") throw new Error("content ikut berubah");
' "$NOTE_ID"

log "GET / (halaman utama)"
INDEX_CODE="$(curl -sS -o "$TMP_DIR/index.html" -w '%{http_code}' \
  "${BASE_URL}/")" || fail "GET / gagal (koneksi)"
expect_status 200 "$INDEX_CODE" "GET /" "$TMP_DIR/index.html"
if ! grep -q 'id="note-form"' "$TMP_DIR/index.html"; then
  fail "halaman utama tidak memuat form #note-form"
fi

log "DELETE /api/notes/${NOTE_ID}"
DELETE_CODE="$(curl -sS -o "$TMP_DIR/delete.body" -w '%{http_code}' \
  -X DELETE "${BASE_URL}/api/notes/${NOTE_ID}")" || fail "DELETE /api/notes/:id gagal (koneksi)"
expect_status 204 "$DELETE_CODE" "DELETE /api/notes/:id" "$TMP_DIR/delete.body"
if [[ -s "$TMP_DIR/delete.body" ]]; then
  fail "DELETE 204 harus tanpa body, tetapi body tidak kosong"
fi

log "GET /api/notes/:id setelah dihapus → 404"
MISSING_CODE="$(curl -sS -o "$TMP_DIR/missing.json" -w '%{http_code}' \
  "${BASE_URL}/api/notes/${NOTE_ID}")" || fail "GET catatan terhapus gagal (koneksi)"
expect_status 404 "$MISSING_CODE" "GET catatan terhapus" "$TMP_DIR/missing.json"
check_json "$TMP_DIR/missing.json" "404 harus memakai envelope NOT_FOUND" '
const body = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
if (!body || !body.error) throw new Error("envelope error tidak ada");
if (body.error.code !== "NOT_FOUND") throw new Error("code salah: " + body.error.code);
if (body.error.message !== "Catatan tidak ditemukan") throw new Error("message salah");
'

log "GET /api/tidak-dikenal → 404"
UNKNOWN_CODE="$(curl -sS -o "$TMP_DIR/unknown.json" -w '%{http_code}' \
  "${BASE_URL}/api/tidak-dikenal")" || fail "GET endpoint tak dikenal gagal (koneksi)"
expect_status 404 "$UNKNOWN_CODE" "GET endpoint API tak dikenal" "$TMP_DIR/unknown.json"
check_json "$TMP_DIR/unknown.json" "endpoint tak dikenal harus NOT_FOUND" '
const body = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
if (!body || !body.error) throw new Error("envelope error tidak ada");
if (body.error.code !== "NOT_FOUND") throw new Error("code salah: " + body.error.code);
if (body.error.message !== "Endpoint tidak ditemukan") throw new Error("message salah");
'

# ---------------------------------------------------------------------------
# 4. Bersihkan dan selesai
# ---------------------------------------------------------------------------
log "Menghentikan server"
kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""

printf '\nVERIFY OK\n'
