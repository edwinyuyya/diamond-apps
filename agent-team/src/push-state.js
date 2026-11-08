#!/usr/bin/env node
// Kirim status run ke dashboard di hosting: PUSH_TOKEN=... node src/push-state.js <workspace> <url> [detik]
import path from "node:path";
import { createState } from "./state.js";

const ws = path.resolve(process.argv[2] ?? ".");
const url = process.argv[3];
const every = Number(process.argv[4] ?? 5) * 1000;
const token = process.env.PUSH_TOKEN;
if (!url || !token) { console.error("Pakai: PUSH_TOKEN=... node src/push-state.js <workspace> <url-push> [detik]"); process.exit(1); }
const state = createState(ws);
let ok = 0, gagal = 0, last = "";
async function kirim() {
  try {
    const r = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(state()) });
    if (r.ok) ok++; else { gagal++; last = `HTTP ${r.status}`; }
  } catch (e) { gagal++; last = String(e.message ?? e); }
  if ((ok + gagal) % 12 === 1) console.log(`[push] terkirim=${ok} gagal=${gagal}${last ? " terakhir=" + last : ""}`);
}
await kirim();
setInterval(kirim, every);
