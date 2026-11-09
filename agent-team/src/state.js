// Pengumpul status run (dipakai server dashboard lokal dan pengirim ke hosting).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function createState(ws) {
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const readText = (f, d = "") => { try { return fs.readFileSync(f, "utf8"); } catch { return d; } };
const rel = (f) => { const r = path.relative(ws, f); return r.startsWith("..") ? f : r; };

function agentState(file) {
  const raw = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
  const stat = fs.statSync(file);
  const st = {
    name: path.basename(file, ".jsonl"), status: "running", tools: 0, cost: 0, turns: 0, last: "", lastTs: null,
    events: [], files: [], summary: "", mtime: stat.mtimeMs, startedAt: stat.birthtimeMs, durationMs: null,
  };
  const files = new Set();
  for (const l of raw) {
    let m; try { m = JSON.parse(l); } catch { continue; }
    if (m.type === "assistant") for (const b of m.message?.content ?? []) {
      if (b.type === "tool_use") {
        st.tools++;
        const i = b.input ?? {};
        const target = i.file_path ? rel(i.file_path) : (i.command?.replace(/\s+/g, " ").slice(0, 90) ?? i.pattern ?? "");
        st.last = `${b.name} ${target}`.trim();
        st.lastTs = m._ts ?? null;
        st.events.push({ kind: b.name, text: target, ts: m._ts ?? null });
        if (["Write", "Edit", "NotebookEdit"].includes(b.name) && i.file_path) files.add(rel(i.file_path));
      }
    } else if (m.type === "result") {
      st.status = m.subtype === "success" ? "done" : "failed";
      st.cost = m.total_cost_usd ?? 0; st.turns = m.num_turns ?? 0; st.durationMs = m.duration_ms ?? null;
      st.summary = String(m.result ?? m.subtype ?? "").slice(0, 1400);
    }
  }
  st.files = [...files];
  st.events = st.events.slice(-14);
  return st;
}

function state() {
  const plan = readJson(path.join(ws, "plan.json"), null);
  const teamDir = path.join(ws, ".team");
  const logDir = path.join(teamDir, "logs");
  const agents = fs.existsSync(logDir)
    ? fs.readdirSync(logDir).filter((f) => f.endsWith(".jsonl")).map((f) => agentState(path.join(logDir, f)))
    : [];
  const verifies = fs.existsSync(teamDir)
    ? fs.readdirSync(teamDir).filter((f) => /^verify-\d+\.log$/.test(f)).sort().map((f) => {
        const t = readText(path.join(teamDir, f));
        return { file: f, tail: t.slice(-900), ok: /VERIFY OK|ALL (TESTS )?PASS|✅/i.test(t) };
      })
    : [];
  let commits = [];
  try { commits = execFileSync("git", ["log", "--pretty=%h|%s"], { cwd: ws }).toString().trim().split("\n").map((l) => l.split("|")); } catch {}
  const files = ["SPEC.md", "CONTRACT.md", "plan.json", "verify.sh", "REPORT.md"].map((f) => ({ f, ok: fs.existsSync(path.join(ws, f)) }));
  const byName = Object.fromEntries(agents.map((a) => [a.name, a]));
  const doneMarks = new Set(readJson(path.join(teamDir, "done.json"), []));
  const tasks = (plan?.tasks ?? []).map((t) => {
    let agent = byName[`${t.id}-${t.role}`] ?? null;
    // Tugas yang ditandai selesai (done.json) tapi lognya tertimpa/tidak lengkap: tampilkan sebagai selesai.
    if (doneMarks.has(t.id) && (!agent || agent.status !== "done")) {
      agent = { ...(agent ?? { name: `${t.id}-${t.role}`, tools: 0, cost: 0, turns: 0, events: [], files: [], last: "", mtime: 0, startedAt: Date.now() }),
        status: "done", summary: (agent?.summary || "Selesai pada penjalanan sebelumnya (log asli tertimpa saat resume; berkas hasil kerja tetap ada)."), restored: true };
    }
    return { id: t.id, role: t.role, title: t.title, description: t.description, owns: t.owns ?? [], dependsOn: t.dependsOn ?? [], agent };
  });
  const debuggers = agents.filter((a) => a.name.startsWith("debugger") || a.name.startsWith("qa-fix"));
  const reviewer = byName["reviewer"] ?? null;
  const architect = byName["architect"] ?? null;
  const phase = !plan ? 1 : reviewer ? 4 : (verifies.length || debuggers.length) ? 3 : 2;
  const allDone = reviewer?.status === "done";
  const startedAt = agents.length ? Math.min(...agents.map((a) => a.startedAt)) : null;
  const endedAt = allDone ? reviewer.mtime : null;
  const idea = readText(path.join(teamDir, "idea.txt")).trim();
  const specTitle = (readText(path.join(ws, "SPEC.md")).match(/^#\s+(.+)$/m) ?? [])[1] ?? "";
  // linimasa global: dari event bertimestamp; jika log lama tanpa ts, pakai aksi terakhir tiap agent
  const stamped = agents.flatMap((a) => a.events.filter((e) => e.ts).map((e) => ({ agent: a.name, ...e })));
  const feed = stamped.length
    ? stamped.sort((x, y) => y.ts - x.ts).slice(0, 18)
    : agents.slice().sort((x, y) => y.mtime - x.mtime).slice(0, 12).map((a) => ({ agent: a.name, kind: a.last.split(" ")[0], text: a.last.split(" ").slice(1).join(" "), ts: a.mtime }));
  const producedFiles = {};
  for (const a of agents) for (const f of a.files) producedFiles[f] = a.name;
  return {
    ws, now: Date.now(), phase, allDone, startedAt, endedAt, idea, specTitle, stack: plan?.stack ?? "",
    architect, tasks, debuggers, reviewer, verifies, commits, files, feed, producedFiles,
    cost: agents.reduce((s, a) => s + a.cost, 0),
    totalActions: agents.reduce((s, a) => s + a.tools, 0),
  };
}

  return state;
}
