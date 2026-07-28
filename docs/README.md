# Dokumentasi Knitto Agent Automation

Ringkasan isi folder `docs/` — indeks untuk arsitektur, fitur, operasional, dan referensi teknis.

Proyek: monorepo **Turborepo + pnpm** (React UI + Express backend) untuk otomasi **browser** (Playwright) dan **Android** (Appium) lewat AI agent + **MCP tools**.

Panduan setup & menjalankan aplikasi: [README root](../README.md).

---

## Jalur baca

| Fokus | Urutan |
|-------|--------|
| **Peta plan & dependensi** | [plans/plan-roadmap.md](plans/plan-roadmap.md) ← mulai di sini |
| **TODO pengerjaan** | [plans/TODO.md](plans/TODO.md) — checklist per wave |
| Arsitektur target | [plans/plan-architecture.md](plans/plan-architecture.md) → [architecture.md](architecture.md) (as-is) |
| API Data + media + job + mission + auth | [plans/plan-api-data.md](plans/plan-api-data.md) → [plans/plan-media.md](plans/plan-media.md) → [plans/plan-job-lifecycle.md](plans/plan-job-lifecycle.md) → [plans/plan-mission.md](plans/plan-mission.md) → [plans/plan-auth.md](plans/plan-auth.md) |
| Agent runtime | [plans/plan-agent-runtime.md](plans/plan-agent-runtime.md) |
| MCP target (`browser_*` / `mobile_*`) | [plans/plan-mcp.md](plans/plan-mcp.md) → [mcp.md](mcp.md) (as-is) |
| Electron Client (nanti) | [plans/plan-electron.md](plans/plan-electron.md) |
| Arsitektur & fitur as-is | [system.md](system.md) → [features.md](features.md) → [browser.md](browser.md) / [mobile.md](mobile.md) |
| Hybrid multi-TC & contoh prompt | [features.md](features.md) → [hybrid.md](hybrid.md) |
| Deploy & env | [docker.md](docker.md) → [environment.md](environment.md) → [troubleshooting.md](troubleshooting.md) |
| Token / memory replay | [plans/plan-flow-replay.md](plans/plan-flow-replay.md) |
| REST, WS & MCP | [api.md](api.md) → [mcp.md](mcp.md) |

---

## Indeks dokumen

### Plans (target) — lihat [plans/plan-roadmap.md](plans/plan-roadmap.md)

| Plan ID | Dokumen | Isi singkat |
|---------|---------|-------------|
| `ROADMAP` | [plans/plan-roadmap.md](plans/plan-roadmap.md) | Nama plan, graf dependensi, urutan wave |
| — | [plans/TODO.md](plans/TODO.md) | Checklist pengerjaan W0–W8 (Electron W8 blocked) |
| `ARCH` | [plans/plan-architecture.md](plans/plan-architecture.md) | 1 API Data + Worker + Client Electron |
| `API-DATA` | [plans/plan-api-data.md](plans/plan-api-data.md) | `agent_runs` / cases / memory API |
| `MEDIA` | [plans/plan-media.md](plans/plan-media.md) | MinIO library + tautan run |
| `JOB` | [plans/plan-job-lifecycle.md](plans/plan-job-lifecycle.md) | `agentJobId` ↔ `runId`, cancel |
| `MISSION` | [plans/plan-mission.md](plans/plan-mission.md) | Draft → todos → approve → run (Scope B) |
| `AUTH` | [plans/plan-auth.md](plans/plan-auth.md) | JWT, ACL, secrets |
| `AGENT` | [plans/plan-agent-runtime.md](plans/plan-agent-runtime.md) | Cursor \| OpenAI-compatible |
| `MCP` | [plans/plan-mcp.md](plans/plan-mcp.md) | `browser_*` / `mobile_*`, token |
| `FLOW-REPLAY` | [plans/plan-flow-replay.md](plans/plan-flow-replay.md) | Memory playbook + MCP replay (hemat token) |
| `ELECTRON` | [plans/plan-electron.md](plans/plan-electron.md) | Installer / Start-Stop (setelah Worker stabil) |

### Inti produk & arsitektur (as-is)

| Dokumen | Isi singkat |
|---------|-------------|
| [architecture.md](architecture.md) | **As-is:** peta service monolit, FE/BE, katalog MCP, alur job |
| [system.md](system.md) | High-level architecture, monorepo, alur single-job & hybrid multi-TC, persistence, prinsip desain |
| [features.md](features.md) | Kontrak fitur: UI, agent, browser/mobile, hybrid, shortcuts, memory, evidence, file manager, Docker |
| [hybrid.md](hybrid.md) | Orchestrator multi-TC, handoff, segment video, format baris TC, **contoh prompt** |
| [browser.md](browser.md) | Lifecycle Playwright, semantic locator, recording, memory browser, cleanup |
| [mobile.md](mobile.md) | Appium/ADB, device pool, tools mobile, recording, cleanup tanpa relaunch, stabilitas & recovery BlueStacks |

### Protokol & integrasi

| Dokumen | Isi singkat |
|---------|-------------|
| [mcp.md](mcp.md) | **As-is:** entry MCP, daftar `automation_*` / `mobile_*`, in-process vs stdio |
| [api.md](api.md) | REST endpoints + WebSocket hub (`user_prompt`, events job) |

### Operasional

| Dokumen | Isi singkat |
|---------|-------------|
| [docker.md](docker.md) | Compose services, dual ADB, volume/mount, checklist emulator → Appium |
| [environment.md](environment.md) | Variabel `.env` backend, frontend, dan Docker |
| [troubleshooting.md](troubleshooting.md) | Gejala umum & solusi |

---

## Peta konsep cepat

```text
UI (React / nanti Electron) ──WS──► Automation Worker
                                     ├── Agent runtime (Cursor | OpenAI)
                                     ├── Orchestrator (hybrid multi-TC)
                                     └── MCP browser_* / mobile_*
                                          ├── Playwright
                                          └── Appium
UI / Worker ──REST──► API Data (agent_* + MinIO media)
```

- **1 job single platform** → satu agent run + video/screenshot
- **Hybrid multi-TC** → beberapa `## Test Case N`; 1 TC = 1 video; handoff `[HANDOFF] KEY=value`
- **Memory / shortcuts / media** → target di API Data (+ MinIO); as-is masih disk monolit

---

## Konvensi dokumen

Tiap file domain biasanya punya: **Pendahuluan → Tujuan → Ruang Lingkup → bagian teknis**.

Plan di `plans/` wajib header: **Plan ID / Depends on / Unlocks**.

Saat menambah fitur besar: update [features.md](features.md), lalu dokumen domain terkait, dan tautkan dari tabel di atas + [plan-roadmap.md](plans/plan-roadmap.md) bila plan baru.
