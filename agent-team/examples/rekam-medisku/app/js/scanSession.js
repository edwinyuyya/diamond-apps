// Rekam Medisku — sesi draf pindai, HANYA di memori.
// Tidak boleh memakai localStorage/sessionStorage/IndexedDB; tidak menulis state
// dan tidak mencatat teks/foto ke console.

let draft = null;
const listeners = new Set();

function notify() {
  for (const listener of Array.from(listeners)) {
    try {
      listener(draft);
    } catch {
      // Error listener tidak boleh mengganggu alur pindai.
    }
  }
}

/** Simpan satu draf (menimpa draf sebelumnya). */
export function setScanDraft(nextDraft) {
  draft = nextDraft && typeof nextDraft === 'object' ? nextDraft : null;
  notify();
  return draft;
}

/** Draf aktif atau null. */
export function getScanDraft() {
  return draft;
}

/** Hapus draf aktif (saat batal/simpan). */
export function clearScanDraft() {
  const hadDraft = draft !== null;
  draft = null;
  if (hadDraft) notify();
}

/** Berlangganan perubahan draf. Mengembalikan fungsi unsubscribe. */
export function subscribeScanDraft(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('Listener harus berupa fungsi.');
  }
  listeners.add(listener);
  let active = true;
  return function unsubscribe() {
    if (!active) return;
    active = false;
    listeners.delete(listener);
  };
}
