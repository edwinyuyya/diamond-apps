#!/usr/bin/env node
// Dashboard "kantor virtual": node src/dashboard.js <workspace> [port]
// Membaca plan.json + .team/logs/*.jsonl + .team/verify-*.log, tanpa dependency.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createState } from "./state.js";

const ws = path.resolve(process.argv[2] ?? ".");
const port = Number(process.argv[3] ?? 4000);
const state = createState(ws);

const HTML = fs.readFileSync(new URL("./dashboard.html", import.meta.url), "utf8");
http.createServer((req, res) => {
  if (req.url.includes("api/state")) {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    try { res.end(JSON.stringify(state())); } catch (e) { res.end(JSON.stringify({ error: String(e) })); }
  } else {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    let init = "null"; try { init = JSON.stringify(state()).replace(/</g, "\\u003c"); } catch {}
    res.end(HTML.replace("/*__INIT__*/null", init));
  }
}).listen(port, () => console.log(`Dashboard: http://localhost:${port}  (workspace: ${ws})`));
