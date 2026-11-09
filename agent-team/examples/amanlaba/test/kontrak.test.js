/**
 * Test kontrak: stub Panel Pelanggan AI, versi mesin, dan nol dependency.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  NAMA,
  VERSI,
  STATUS,
  buatPanelPelangganAi,
} from "../backend/extensions/panel-pelanggan-ai/index.js";
import { VERSI_MESIN } from "../backend/engine/index.js";

const AKAR_PROYEK = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("modul stub Panel Pelanggan AI mengekspor metadata yang benar", () => {
  assert.equal(NAMA, "panel-pelanggan-ai");
  assert.equal(VERSI, "0.0.0");
  assert.equal(STATUS, "belum-diimplementasikan");
  assert.equal(typeof buatPanelPelangganAi, "function");
});

test("buatPanelPelangganAi() mengembalikan objek berstatus belum-diimplementasikan", () => {
  const panel = buatPanelPelangganAi();

  assert.equal(panel.nama, "panel-pelanggan-ai");
  assert.equal(panel.versi, "0.0.0");
  assert.equal(panel.status, "belum-diimplementasikan");
  assert.equal(typeof panel.nilaiHarga, "function");
});

test("nilaiHarga() menolak dengan kode E_BELUM_DIIMPLEMENTASIKAN", async () => {
  const panel = buatPanelPelangganAi();

  await assert.rejects(
    () => panel.nilaiHarga({ harga: 15000 }),
    (error) => {
      assert.equal(error.kode, "E_BELUM_DIIMPLEMENTASIKAN");
      assert.match(error.message, /belum diimplementasikan/i);
      return true;
    },
  );
});

test("nilaiHarga() tetap menolak untuk payload kosong", async () => {
  await assert.rejects(
    () => buatPanelPelangganAi({}).nilaiHarga(),
    (error) => error.kode === "E_BELUM_DIIMPLEMENTASIKAN",
  );
});

test("versi mesin adalah 1.0.0", () => {
  assert.equal(VERSI_MESIN, "1.0.0");
});

test("package.json nol dependency dan memakai ESM", async () => {
  const teks = await fs.readFile(path.join(AKAR_PROYEK, "package.json"), "utf8");
  const paket = JSON.parse(teks);

  assert.equal(paket.type, "module");
  assert.deepEqual(paket.dependencies ?? {}, {});
  assert.deepEqual(paket.devDependencies ?? {}, {});
  assert.equal((paket.dependencies && Object.keys(paket.dependencies).length) || 0, 0);
  assert.equal(
    (paket.devDependencies && Object.keys(paket.devDependencies).length) || 0,
    0,
  );
});

test("server tidak mengimpor ekstensi Panel Pelanggan AI selama masih stub", async () => {
  const teks = await fs.readFile(
    path.join(AKAR_PROYEK, "backend", "server.js"),
    "utf8",
  );
  assert.ok(
    !teks.includes("panel-pelanggan-ai"),
    "server.js tidak boleh mengimpor ekstensi yang belum diimplementasikan",
  );
});
