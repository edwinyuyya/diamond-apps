'use strict';

const express = require('express');

const VALIDATION_MESSAGE = 'Data catatan tidak valid';
const NOT_FOUND_MESSAGE = 'Catatan tidak ditemukan';
const TITLE_MAX = 200;
const CONTENT_MAX = 10000;

/**
 * Body dianggap objek JSON hanya jika bukan null dan bukan array.
 * Array, angka, string, dan boolean diperlakukan sebagai body tidak valid.
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validationResponse(details) {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: VALIDATION_MESSAGE,
      details,
    },
  };
}

function notFoundResponse() {
  return {
    error: {
      code: 'NOT_FOUND',
      message: NOT_FOUND_MESSAGE,
    },
  };
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Memvalidasi field `title` yang dikirim. Mengembalikan detail error atau null.
 * Aturan (§5.4): wajib, string, 1-200 karakter setelah trim.
 */
function validateTitle(title) {
  if (title === undefined || title === null || (typeof title === 'string' && title.trim().length === 0)) {
    return { field: 'title', message: 'Judul wajib diisi' };
  }
  if (typeof title !== 'string') {
    return { field: 'title', message: 'Judul harus berupa teks' };
  }
  if (title.trim().length > TITLE_MAX) {
    return { field: 'title', message: 'Judul maksimal 200 karakter' };
  }
  return null;
}

/**
 * Memvalidasi field `content` yang dikirim. Mengembalikan detail error atau null.
 * Aturan (§5.4): string, maksimal 10.000 karakter, tidak di-trim.
 */
function validateContent(content) {
  if (typeof content !== 'string') {
    return { field: 'content', message: 'Isi harus berupa teks' };
  }
  if (content.length > CONTENT_MAX) {
    return { field: 'content', message: 'Isi maksimal 10000 karakter' };
  }
  return null;
}

function createNotesRouter(store) {
  const router = express.Router();

  // GET /api/notes — daftar semua catatan, sudah terurut oleh store.
  router.get('/', async (req, res, next) => {
    try {
      const notes = await store.list();
      res.status(200).json(notes);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/notes — buat catatan baru.
  router.post('/', async (req, res, next) => {
    try {
      const body = req.body;
      if (!isPlainObject(body)) {
        return res.status(400).json(
          validationResponse([{ field: 'body', message: 'Body harus berupa objek JSON' }])
        );
      }

      const details = [];
      const titleError = validateTitle(body.title);
      if (titleError) details.push(titleError);

      let content;
      if (hasOwn(body, 'content') && body.content !== undefined) {
        content = body.content;
        const contentError = validateContent(content);
        if (contentError) details.push(contentError);
      }

      if (details.length > 0) {
        return res.status(400).json(validationResponse(details));
      }

      const note = await store.create(
        content === undefined ? { title: body.title } : { title: body.title, content }
      );
      res.status(201).json(note);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/notes/:id — satu catatan.
  router.get('/:id', async (req, res, next) => {
    try {
      const note = await store.get(req.params.id);
      if (note === null || note === undefined) {
        return res.status(404).json(notFoundResponse());
      }
      res.status(200).json(note);
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/notes/:id — ubah sebagian/seluruh field.
  router.put('/:id', async (req, res, next) => {
    try {
      const body = req.body;
      if (!isPlainObject(body)) {
        return res.status(400).json(
          validationResponse([{ field: 'body', message: 'Body harus berupa objek JSON' }])
        );
      }

      const hasTitle = hasOwn(body, 'title');
      const hasContent = hasOwn(body, 'content');

      if (!hasTitle && !hasContent) {
        return res.status(400).json(
          validationResponse([
            { field: 'body', message: 'Kirim minimal satu field: title atau content' },
          ])
        );
      }

      const details = [];
      const patch = {};

      if (hasTitle) {
        const titleError = validateTitle(body.title);
        if (titleError) {
          details.push(titleError);
        } else {
          patch.title = body.title;
        }
      }

      if (hasContent) {
        const contentError = validateContent(body.content);
        if (contentError) {
          details.push(contentError);
        } else {
          patch.content = body.content;
        }
      }

      if (details.length > 0) {
        return res.status(400).json(validationResponse(details));
      }

      const note = await store.update(req.params.id, patch);
      if (note === null || note === undefined) {
        return res.status(404).json(notFoundResponse());
      }
      res.status(200).json(note);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/notes/:id — hapus catatan.
  router.delete('/:id', async (req, res, next) => {
    try {
      const removed = await store.remove(req.params.id);
      if (!removed) {
        return res.status(404).json(notFoundResponse());
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createNotesRouter };
