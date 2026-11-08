import { query } from "@anthropic-ai/claude-agent-sdk";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Env untuk provider. DEEPSEEK_API_KEY → arahkan SDK ke endpoint kompatibel-Anthropic milik DeepSeek. */
export function providerEnv(model) {
  const env = { ...process.env };
  if (process.env.DEEPSEEK_API_KEY) {
    delete env.ANTHROPIC_API_KEY;
    env.ANTHROPIC_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/anthropic";
    env.ANTHROPIC_AUTH_TOKEN = process.env.DEEPSEEK_API_KEY;
    env.ANTHROPIC_MODEL = model;
    env.ANTHROPIC_SMALL_FAST_MODEL = model;
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = model;
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = model;
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = model;
    env.CLAUDE_CODE_SUBAGENT_MODEL = model;
    env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  }
  return env;
}

export const sh = (cmd, cwd, timeoutMs = 600_000) =>
  new Promise((resolve) => {
    const p = spawn("bash", ["-lc", cmd], { cwd });
    let out = "";
    const t = setTimeout(() => { out += "\n[TIMEOUT]"; p.kill("SIGKILL"); }, timeoutMs);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("close", (code) => { clearTimeout(t); resolve({ code, out }); });
  });

const COLORS = ["36", "33", "35", "32", "34", "31"];
let colorIdx = 0;
const colorOf = new Map();
export function log(name, msg) {
  if (!colorOf.has(name)) colorOf.set(name, COLORS[colorIdx++ % COLORS.length]);
  console.log(`\x1b[${colorOf.get(name)}m[${name}]\x1b[0m ${msg}`);
}

export function owns(file, ownList, cwd) {
  const rel = path.relative(cwd, path.resolve(cwd, file));
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  if (rel === "NOTES.md") return true;
  return ownList.some((o) => {
    const p = o.replace(/\/+$/, "");
    return rel === p || rel.startsWith(p + "/");
  });
}

/**
 * Jalankan satu agent sampai selesai. `owns` (opsional) = daftar path yang boleh ditulis;
 * ditegakkan lewat hook PreToolUse, bukan hanya lewat prompt.
 */
export async function runAgent({ name, role, task, cwd, model, owns: ownList, maxTurns = 60, budget = 5 }) {
  const logDir = path.join(cwd, ".team", "logs");
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = fs.createWriteStream(path.join(logDir, `${name}.jsonl`));

  const hooks = ownList
    ? {
        PreToolUse: [{
          matcher: "Write|Edit|NotebookEdit",
          hooks: [async (input) => {
            const f = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
            if (f && !owns(f, ownList, cwd)) {
              return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny",
                permissionDecisionReason: `Di luar wilayahmu. Path yang boleh: ${ownList.join(", ")}. Catat kebutuhan di NOTES.md.` } };
            }
            return {};
          }],
        }],
      }
    : undefined;

  log(name, `mulai (${role.description})`);
  let result = { ok: false, text: "", cost: 0 };
  try {
    for await (const msg of query({
      prompt: task,
      options: {
        cwd,
        model,
        env: providerEnv(model),
        systemPrompt: role.prompt,
        allowedTools: role.tools,
        // Default aman: hanya tool di allowedTools yang jalan, sisanya ditolak otomatis.
        // AGENT_TEAM_BYPASS=1 → lewati semua izin (HANYA di sandbox/container).
        permissionMode: process.env.AGENT_TEAM_BYPASS === "1" ? "bypassPermissions" : "dontAsk",
        allowDangerouslySkipPermissions: process.env.AGENT_TEAM_BYPASS === "1",
        settingSources: [],
        maxTurns,
        maxBudgetUsd: budget,
        hooks,
      },
    })) {
      logFile.write(JSON.stringify(msg) + "\n");
      if (msg.type === "assistant") {
        for (const b of msg.message.content ?? []) {
          if (b.type === "tool_use") {
            const i = b.input ?? {};
            log(name, `${b.name} ${i.file_path ?? i.command?.slice(0, 80) ?? i.pattern ?? ""}`);
          }
        }
      } else if (msg.type === "result") {
        result = { ok: msg.subtype === "success", text: msg.result ?? msg.subtype, cost: msg.total_cost_usd ?? 0 };
      }
    }
  } catch (e) {
    result.text = String(e?.message ?? e);
  }
  logFile.end();
  log(name, `${result.ok ? "selesai" : "GAGAL " + result.text.slice(0, 120)} ($${result.cost.toFixed(2)})`);
  return result;
}

/** Pool sederhana: jalankan fungsi async dengan batas konkurensi. */
export async function pool(items, limit, fn) {
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const n = i++; results[n] = await fn(items[n]); }
  }));
  return results;
}
