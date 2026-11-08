#!/usr/bin/env node
// Dashboard live: node src/dashboard.js <workspace> [port]
// Membaca plan.json + .team/logs/*.jsonl + .team/verify-*.log, tanpa dependency.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ws = path.resolve(process.argv[2] ?? ".");
const port = Number(process.argv[3] ?? 4000);
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };

function agentState(file) {
  const raw = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
  const st = { name: path.basename(file, ".jsonl"), status: "running", tools: 0, cost: 0, turns: 0, last: "", recent: [], mtime: fs.statSync(file).mtimeMs, startedAt: fs.statSync(file).birthtimeMs };
  for (const l of raw) {
    let m; try { m = JSON.parse(l); } catch { continue; }
    if (m.type === "assistant") for (const b of m.message?.content ?? []) {
      if (b.type === "tool_use") {
        st.tools++;
        const i = b.input ?? {};
        st.last = `${b.name} ${i.file_path ?? i.command?.slice(0, 70) ?? i.pattern ?? ""}`.trim();
        st.recent.push(st.last);
      }
    } else if (m.type === "result") {
      st.status = m.subtype === "success" ? "done" : "failed";
      st.cost = m.total_cost_usd ?? 0; st.turns = m.num_turns ?? 0; st.durationMs = m.duration_ms;
    }
  }
  st.recent = st.recent.slice(-6);
  return st;
}

function state() {
  const plan = readJson(path.join(ws, "plan.json"), null);
  const logDir = path.join(ws, ".team", "logs");
  const agents = fs.existsSync(logDir)
    ? fs.readdirSync(logDir).filter((f) => f.endsWith(".jsonl")).map((f) => agentState(path.join(logDir, f)))
    : [];
  const teamDir = path.join(ws, ".team");
  const verifies = fs.existsSync(teamDir)
    ? fs.readdirSync(teamDir).filter((f) => /^verify-\d+\.log$/.test(f)).sort().map((f) => {
        const t = fs.readFileSync(path.join(teamDir, f), "utf8");
        return { file: f, tail: t.slice(-600), ok: /ALL (TESTS )?PASS|✅|passed/i.test(t) && !/fail|error/i.test(t.slice(-400)) };
      })
    : [];
  let commits = [];
  try { commits = execFileSync("git", ["log", "--pretty=%h|%s"], { cwd: ws }).toString().trim().split("\n").map((l) => l.split("|")); } catch {}
  const files = ["SPEC.md", "CONTRACT.md", "plan.json", "verify.sh", "REPORT.md"].map((f) => ({ f, ok: fs.existsSync(path.join(ws, f)) }));
  const byName = Object.fromEntries(agents.map((a) => [a.name, a]));
  const tasks = (plan?.tasks ?? []).map((t) => ({ ...t, agent: byName[`${t.id}-${t.role}`] ?? null }));
  const debuggers = agents.filter((a) => a.name.startsWith("debugger"));
  const reviewer = byName["reviewer"] ?? null;
  const verifyDone = verifies.length > 0;
  const allDone = reviewer?.status === "done";
  const phase = !plan ? 1 : reviewer ? 4 : (verifyDone || debuggers.length || byName["qa-fix0"]) ? 3 : 2;
  return {
    ws, now: Date.now(), phase, allDone, plan: plan && { stack: plan.stack }, architect: byName["architect"] ?? null,
    tasks, debuggers, reviewer, verifies, commits, files, cost: agents.reduce((s, a) => s + a.cost, 0),
  };
}

const HTML = fs.readFileSync(new URL("./dashboard.html", import.meta.url), "utf8");
http.createServer((req, res) => {
  if (req.url.includes("api/state")) {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    try { res.end(JSON.stringify(state())); } catch (e) { res.end(JSON.stringify({ error: String(e) })); }
  } else { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(HTML); }
}).listen(port, () => console.log(`Dashboard: http://localhost:${port}  (workspace: ${ws})`));
