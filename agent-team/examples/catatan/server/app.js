'use strict';

const path = require('path');
const express = require('express');
const { createNotesRouter } = require('./routes/notes');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/**
 * Membuat Express app tanpa memanggil listen.
 * @param {{ store: object }} options store sesuai CONTRACT.md §4.
 * @returns {import('express').Express}
 */
function createApp({ store }) {
  if (!store || typeof store !== 'object') {
    throw new TypeError('createApp membutuhkan objek store');
  }

  const app = express();

  // Body JSON maksimal 100 KB. strict:false agar body primitif (angka, string,
  // boolean) tetap sampai ke handler dan bisa dipetakan ke VALIDATION_ERROR
  // sesuai tabel §5.4, bukan menjadi parse error.
  app.use(express.json({ limit: '100kb', strict: false }));

  // Health check.
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Router catatan di /api/notes.
  app.use('/api/notes', createNotesRouter(store));

  // Semua path /api lain yang tidak dikenali.
  app.use('/api', (req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint tidak ditemukan',
      },
    });
  });

  // File statis UI (GET / menyajikan public/index.html).
  app.use(express.static(PUBLIC_DIR));

  // Path non-API lain: 404 teks biasa, tanpa fallback SPA.
  app.use((req, res) => {
    res.status(404).type('text/plain').send('Not Found');
  });

  // Error middleware paling akhir. Tidak pernah membocorkan stack trace.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }

    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: {
          code: 'INVALID_JSON',
          message: 'Body request bukan JSON yang valid',
        },
      });
    }

    if (err && err.type === 'entity.too.large') {
      return res.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Body request terlalu besar',
        },
      });
    }

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server',
      },
    });
  });

  return app;
}

module.exports = { createApp };
