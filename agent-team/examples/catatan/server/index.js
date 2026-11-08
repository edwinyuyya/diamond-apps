'use strict';

const path = require('path');
const { createStore } = require('./store');
const { createApp } = require('./app');

const DEFAULT_PORT = 3000;

/**
 * PORT valid adalah bilangan bulat 1-65535. Nilai kosong/bukan angka/
 * di luar rentang memakai default 3000 (CONTRACT.md §2).
 */
function resolvePort(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
    return DEFAULT_PORT;
  }
  const port = Number.parseInt(value.trim(), 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return DEFAULT_PORT;
  }
  return port;
}

/**
 * DATA_FILE default <root>/data/notes.json. Path relatif di-resolve terhadap
 * process.cwd(), path absolut dipakai apa adanya.
 */
function resolveDataFile(value) {
  if (typeof value === 'string' && value.trim() !== '') {
    return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
  }
  return path.resolve(__dirname, '..', 'data', 'notes.json');
}

function start() {
  const port = resolvePort(process.env.PORT);
  const filePath = resolveDataFile(process.env.DATA_FILE);
  const store = createStore({ filePath });
  const app = createApp({ store });

  return app.listen(port, () => {
    console.log(`Catatan2 berjalan di http://localhost:${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { start, resolvePort, resolveDataFile };
