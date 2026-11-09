#!/usr/bin/env bash
# Memeriksa versi Node.js untuk AmanLaba.
# Syarat: Node.js >= 18.17 (disarankan 20 LTS, lihat .nvmrc).
set -euo pipefail

VERSI_MINIMUM="18.17"
VERSI_DISARANKAN="20 LTS"

gagal() {
  printf 'GAGAL: %s\n' "$1" >&2
  printf 'AmanLaba membutuhkan Node.js >= %s (%s disarankan).\n' \
    "$VERSI_MINIMUM" "$VERSI_DISARANKAN" >&2
  printf 'Pasang Node.js versi yang sesuai, misalnya dengan nvm:\n' >&2
  printf '  nvm install && nvm use   # membaca .nvmrc\n' >&2
  exit 1
}

if ! command -v node >/dev/null 2>&1; then
  gagal "Node.js tidak ditemukan di PATH."
fi

VERSI_NODE="$(node -p 'process.versions.node' 2>/dev/null || true)"
if [ -z "$VERSI_NODE" ]; then
  gagal "Tidak dapat membaca versi Node.js yang terpasang."
fi

if ! node -e '
  const [mayor, minor] = process.versions.node.split(".").map(Number);
  const cukup = mayor > 18 || (mayor === 18 && minor >= 17);
  process.exit(cukup ? 0 : 1);
' >/dev/null 2>&1; then
  gagal "Versi Node.js terdeteksi v${VERSI_NODE}, terlalu lama."
fi

printf 'OK: Node.js v%s memenuhi syarat (>= %s).\n' "$VERSI_NODE" "$VERSI_MINIMUM"
exit 0
