# agent-team — tim AI multi-agent pembuat aplikasi

Dari satu prompt → aplikasi jalan + test lulus, tanpa campur tangan manusia.

## Alur

```
prompt ─▶ [architect] ─▶ SPEC.md + CONTRACT.md + plan.json
                              │
              gelombang paralel (sesuai dependsOn, maks --parallel)
        ┌───────────┬─────────┴──┬───────────┐
   [backend]   [frontend]   [database]   [devops]   ← tiap agent hanya boleh menulis di "owns"-nya
        └───────────┴─────────┬──┴───────────┘
                           [qa]  → test + verify.sh
                              │
              loop: bash verify.sh ──gagal──▶ [debugger] ─┐
                              ▲───────────────────────────┘  (maks --max-fix)
                              │ lulus
                          [reviewer] → REPORT.md
```

Kunci agar benar-benar otonom dan tidak saling merusak:

1. **Kontrak dulu** — `CONTRACT.md` memungkinkan frontend & backend dikerjakan bersamaan.
2. **Kepemilikan file ditegakkan hook** (`PreToolUse`), bukan sekadar prompt → tidak ada konflik tulis paralel.
3. **Verifikasi deterministik** — orkestrator sendiri yang menjalankan `verify.sh` (install → build → test →
   start app → smoke test curl). Agent tidak bisa mengklaim "sudah jalan" tanpa bukti.
4. **Debugger dilarang melemahkan test**; tiap fase di-commit git di workspace sehingga bisa di-rollback.

## Pakai

```bash
cd agent-team && npm install
```

```bash
ANTHROPIC_API_KEY=sk-ant-... node src/run.js "Aplikasi todo dengan login, REST API, dan UI web"
```

Opsi: `--out dir` · `--parallel 4` · `--max-fix 5` · `--budget 5` (USD per agent) · `--model <id>`

Hasil ada di `projects/<nama>/` (SPEC, kode, `verify.sh`, `REPORT.md`, log per agent di `.team/logs/`).

## Peringatan

Agent berjalan dengan `bypassPermissions` (bebas menjalankan shell). **Jalankan hanya di container/VM/sandbox**,
bukan di mesin yang berisi data penting. Tetapkan `--budget` agar biaya terkendali.

## Menambah agent

Tambahkan peran di `src/agents.js` (mis. `security`, `designer`, `docs`); arsitek otomatis bisa memakainya jika
namanya ditambahkan ke daftar role di prompt arsitek dan ke validasi di `src/run.js`.
