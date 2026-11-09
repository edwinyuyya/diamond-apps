// server.js — server statis Rawatku.
// Hanya menyajikan app/ di /, aset OCR di /vendor/, dan /health.
// Tidak ada endpoint data medis, tidak ada CORS, dan tidak ada log isi permintaan.

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const APP_NAME = 'rawatku';
const APP_VERSION = '1.1.0';
const HEALTH_BODY = JSON.stringify({ status: 'ok', app: APP_NAME, version: APP_VERSION });

const DEFAULT_ROOT_DIR = fileURLToPath(new URL('./app/', import.meta.url));
const DEFAULT_VENDOR_DIR = fileURLToPath(new URL('./public/vendor/', import.meta.url));

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.pdf', 'application/pdf'],
  ['.wasm', 'application/wasm'],
  ['.gz', 'application/gzip'],
  ['.traineddata', 'application/octet-stream'],
  ['.data', 'application/octet-stream']
]);

function contentTypeFor(filePath) {
  return MIME_TYPES.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
}

function sendText(req, res, status, message, extraHeaders = {}) {
  const body = Buffer.from(message, 'utf8');
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    ...extraHeaders
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(body);
}

function notFound(req, res) {
  sendText(req, res, 404, '404 Tidak ditemukan');
}

function methodNotAllowed(req, res) {
  sendText(req, res, 405, '405 Metode tidak diizinkan', { Allow: 'GET, HEAD' });
}

function sendHealth(req, res) {
  const body = Buffer.from(HEALTH_BODY, 'utf8');
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': body.length
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(body);
}

// Mengubah path permintaan menjadi berkas absolut di bawah root yang benar.
// Mengembalikan null untuk semua path yang ditolak (NUL, traversal, absolut,
// direktori, atau bentuk mencurigakan lain).
function resolveRequestPath(rawUrl, rootDir, vendorDir) {
  const rawPath = String(rawUrl || '/').split('?')[0].split('#')[0];

  let pathname;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  if (!pathname.startsWith('/')) return null;
  if (pathname.includes('\0')) return null;

  const isVendor =
    pathname === '/vendor' || pathname.startsWith('/vendor/');
  const root = isVendor ? vendorDir : rootDir;

  let relative = isVendor
    ? pathname.slice('/vendor/'.length)
    : pathname.slice(1);

  if (!isVendor && relative === '') relative = 'index.html';

  if (!relative) return null;
  if (relative.startsWith('/') || relative.startsWith('\\')) return null;
  if (path.isAbsolute(relative)) return null;
  if (relative.includes('\0')) return null;

  const segments = relative.split('/');
  for (const segment of segments) {
    if (
      segment === '' ||
      segment === '.' ||
      segment === '..' ||
      segment.includes('\\') ||
      segment.includes('\0')
    ) {
      return null;
    }
  }

  const rootPath = path.resolve(root);
  const filePath = path.resolve(rootPath, ...segments);
  if (filePath !== rootPath && !filePath.startsWith(rootPath + path.sep)) {
    return null;
  }

  return { filePath, isVendor };
}

async function serveFile(req, res, filePath, isVendor) {
  let info;
  try {
    info = await stat(filePath);
  } catch {
    notFound(req, res);
    return;
  }

  if (!info.isFile()) {
    notFound(req, res);
    return;
  }

  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': contentTypeFor(filePath),
    'Content-Length': info.size,
    'Cache-Control': isVendor
      ? 'public, max-age=31536000, immutable'
      : 'no-cache'
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on('error', () => {
    res.destroy();
  });
  stream.pipe(res);
}

async function handleRequest(req, res, rootDir, vendorDir) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    methodNotAllowed(req, res);
    return;
  }

  const rawPath = String(req.url || '/').split('?')[0].split('#')[0];
  let pathname;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    notFound(req, res);
    return;
  }

  if (pathname === '/health') {
    sendHealth(req, res);
    return;
  }

  const target = resolveRequestPath(req.url, rootDir, vendorDir);
  if (!target) {
    notFound(req, res);
    return;
  }

  await serveFile(req, res, target.filePath, target.isVendor);
}

export function createServer({ rootDir, vendorDir } = {}) {
  const resolvedRootDir = path.resolve(rootDir || DEFAULT_ROOT_DIR);
  const resolvedVendorDir = path.resolve(vendorDir || DEFAULT_VENDOR_DIR);

  return createHttpServer((req, res) => {
    handleRequest(req, res, resolvedRootDir, resolvedVendorDir).catch(() => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      notFound(req, res);
    });
  });
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) return 3000;
  return port;
}

function formatHost(host) {
  return host.includes(':') ? `[${host}]` : host;
}

function envValue(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export async function startServer({ port, host, vendorDir } = {}) {
  const listenPort = parsePort(port ?? envValue('PORT') ?? 3000);
  const listenHost = host ?? envValue('HOST') ?? '127.0.0.1';
  const resolvedVendorDir =
    vendorDir ?? envValue('VENDOR_DIR') ?? DEFAULT_VENDOR_DIR;

  const server = createServer({ vendorDir: resolvedVendorDir });

  await new Promise((resolve, reject) => {
    function onError(error) {
      server.removeListener('listening', onListening);
      if (error && error.code === 'EADDRINUSE') {
        error.message =
          `Port ${listenPort} pada ${listenHost} sudah digunakan. ` +
          'Hentikan proses lain atau jalankan dengan PORT lain.';
      }
      reject(error);
    }

    function onListening() {
      server.removeListener('error', onError);
      resolve();
    }

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(listenPort, listenHost);
  });

  const address = server.address();
  const actualPort =
    address && typeof address === 'object' ? address.port : listenPort;
  const url = `http://${formatHost(listenHost)}:${actualPort}`;

  console.log(`Rawatku berjalan di ${url}`);
  return { server, port: actualPort, host: listenHost, url };
}

const isMain =
  Boolean(process.argv[1]) &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  startServer()
    .then(({ server }) => {
      let closing = false;
      const shutdown = () => {
        if (closing) return;
        closing = true;
        server.close((error) => {
          if (error) {
            console.error('Gagal menutup server:', error.message);
            process.exit(1);
            return;
          }
          process.exit(0);
        });
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    })
    .catch((error) => {
      console.error(
        error?.code === 'EADDRINUSE'
          ? error.message
          : `Gagal menjalankan Rawatku: ${error?.message || error}`
      );
      process.exitCode = 1;
    });
}
