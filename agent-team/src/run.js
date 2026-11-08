#!/usr/bin/env node
// Orkestrator tim agent: prompt → spec → build paralel → verify → fix loop → review.
import fs from "node:fs";
import path from "node:path";
import { ROLES } from "./agents.js";
import { runAgent, sh, log, pool } from "./lib.js";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args.splice(i, 2)[1] : d; };
const out = flag("out", null);
const useDeepseek = !!process.env.DEEPSEEK_API_KEY;
const model = flag("model", useDeepseek ? "deepseek-chat" : undefined);
const parallel = Number(flag("parallel", 4));
const maxFix = Number(flag("max-fix", 5));
const budget = Number(flag("budget", 5)); // USD per agent
const resume = args.includes("--resume") && args.splice(args.indexOf("--resume"), 1).length > 0;
const idea = args.join(" ").trim();

if ((!idea && !resume) || (!useDeepseek && !process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_CODE_OAUTH_TOKEN)) {
  console.error(`Pakai:  DEEPSEEK_API_KEY=... node src/run.js [--out dir] [--parallel 4] [--max-fix 5] [--budget 5] [--model m] "ide aplikasi"`);
  process.exit(1);
}

const slug = idea.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30).replace(/^-|-$/g, "") || "app";
const ws = path.resolve(out ?? path.join("projects", `${slug}-${Date.now().toString(36)}`));
fs.mkdirSync(path.join(ws, ".team"), { recursive: true });
fs.writeFileSync(path.join(ws, ".gitignore"), "node_modules/\n.team/\n");
await sh("git init -q && git add -A && git -c user.name=team -c user.email=team@local commit -qm init", ws);
const checkpoint = (m) =>
  sh(`git add -A && git -c user.name=team -c user.email=team@local commit -qm ${JSON.stringify(m)} || true`, ws);
let total = 0;
const run = async (o) => { const r = await runAgent({ model, budget, cwd: ws, ...o }); total += r.cost; return r; };

console.log(`Workspace: ${ws}\n`);

// ── Fase 1: Arsitek ────────────────────────────────────────────────────────
log("team", "FASE 1 — perencanaan");
const planPath = path.join(ws, "plan.json");
let arch = { text: "" };
if (resume && fs.existsSync(planPath)) log("team", "resume: architect dilewati, memakai plan.json yang ada");
else arch = await run({
  name: "architect", role: ROLES.architect,
  task: `Ide user:\n\n${idea}\n\nBuat SPEC.md, CONTRACT.md, dan plan.json di workspace ini.`,
});
let plan;
try { plan = JSON.parse(fs.readFileSync(path.join(ws, "plan.json"), "utf8")); }
catch (e) { console.error("plan.json tidak valid:", e.message, "\n", arch.text); process.exit(2); }
const tasks = plan.tasks ?? [];
for (const t of tasks) {
  if (!ROLES[t.role] || ["architect", "debugger", "reviewer"].includes(t.role)) {
    console.error(`Role tidak dikenal di plan: ${t.role}`); process.exit(2);
  }
}
await checkpoint("plan");

// ── Fase 2: Eksekusi paralel per gelombang (topological) ───────────────────
log("team", `FASE 2 — implementasi ${tasks.length} tugas (maks ${parallel} paralel)`);
const doneBefore = (id, role) => {
  try {
    const lines = fs.readFileSync(path.join(ws, ".team", "logs", `${id}-${role}.jsonl`), "utf8").trim().split("\n");
    const last = JSON.parse(lines[lines.length - 1]);
    return last.type === "result" && last.subtype === "success";
  } catch { return false; }
};
const done = new Set(resume ? tasks.filter((t) => doneBefore(t.id, t.role)).map((t) => t.id) : []);
if (done.size) log("team", `resume: sudah selesai sebelumnya → ${[...done].join(", ")}`);
const started = new Set(done);
const failed = new Set();
const sem = { running: 0 };
// Penjadwal dinamis: tiap tugas mulai begitu dependensinya selesai (tanpa menunggu "gelombang").
await new Promise((resolve) => {
  const pump = () => {
    for (const t of tasks) {
      if (started.has(t.id) || sem.running >= parallel) continue;
      const deps = t.dependsOn ?? [];
      if (deps.some((d) => failed.has(d))) { started.add(t.id); failed.add(t.id); log("team", `${t.id} dilewati (dependensi gagal)`); continue; }
      if (!deps.every((d) => done.has(d))) continue;
      started.add(t.id); sem.running++;
      log("team", `mulai ${t.id}:${t.role}`);
      run({
        name: `${t.id}-${t.role}`, role: ROLES[t.role], owns: t.owns ?? [],
        task: `TUGAS ${t.id}: ${t.title}\n\n${t.description}\n\nOWNS (boleh ditulis): ${(t.owns ?? []).join(", ")}\nStack: ${plan.stack}${resume ? "\n\nCATATAN: run ini lanjutan; sebagian file mungkin sudah ada dari percobaan sebelumnya yang terputus. Periksa dulu, pertahankan yang benar, lanjutkan yang kurang — jangan mulai dari nol." : ""}`,
      }).then(async (r) => {
        (r.ok ? done : failed).add(t.id); sem.running--;
        await checkpoint(`task ${t.id}`);
        pump();
      });
    }
    if (done.size + failed.size >= tasks.length) resolve();
    else if (sem.running === 0 && !tasks.some((t) => !started.has(t.id) && (t.dependsOn ?? []).every((d) => done.has(d)))) resolve();
  };
  pump();
});

// ── Fase 3: Verifikasi + loop perbaikan ────────────────────────────────────
log("team", "FASE 3 — verifikasi (bash verify.sh) & perbaikan");
let passed = false;
for (let round = 0; round <= maxFix; round++) {
  if (!fs.existsSync(path.join(ws, "verify.sh"))) {
    log("team", "verify.sh belum ada → minta QA membuatnya");
    await run({ name: `qa-fix${round}`, role: ROLES.qa, task: "verify.sh belum ada. Buat sesuai instruksi peranmu." });
  }
  const v = await sh("bash verify.sh", ws, 900_000);
  fs.writeFileSync(path.join(ws, ".team", `verify-${round}.log`), v.out);
  if (v.code === 0) { passed = true; log("team", "✅ verify.sh LULUS"); break; }
  log("team", `❌ verify gagal (exit ${v.code}), putaran ${round + 1}/${maxFix}`);
  if (round === maxFix) break;
  await run({
    name: `debugger-${round + 1}`, role: ROLES.debugger,
    task: `verify.sh gagal (exit ${v.code}). Log (ekor):\n\n${v.out.slice(-8000)}\n\nPerbaiki sampai bash verify.sh lulus.`,
  });
  await checkpoint(`fix round ${round + 1}`);
}

// ── Fase 4: Review ─────────────────────────────────────────────────────────
log("team", "FASE 4 — review akhir");
await run({
  name: "reviewer", role: ROLES.reviewer, owns: ["REPORT.md"],
  task: `Hasil verify.sh: ${passed ? "LULUS" : "GAGAL"}. Tulis REPORT.md.`,
});
await checkpoint("report");

console.log(`\n${passed ? "✅ SELESAI" : "⚠️  BELUM LULUS"} — ${ws}\nTotal biaya: $${total.toFixed(2)}\nJalankan: cd ${ws} && bash verify.sh`);
process.exit(passed ? 0 : 3);
