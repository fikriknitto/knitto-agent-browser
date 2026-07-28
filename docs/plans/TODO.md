# TODO pengerjaan — Knitto Agent Automation (target)

Checklist implementasi mengikuti [plan-roadmap.md](plan-roadmap.md).  
Centang `- [x]` saat selesai. Jangan loncat wave tanpa prasyarat kecuali paralel yang diizinkan (catatan di wave).

**Repo terkait**

| Role | Repo / path |
|---|---|
| Worker + FE monolit (as-is) | `knitto-agent-automation` |
| API Data | `knitto-tester/knitto-api-automation-qa` |
| Agent lib | `@knittotextile/knitto-agent-*` (GitHub Packages) |

**Default / locked keputusan** (W0 — [plan-roadmap.md](plan-roadmap.md) §5)

- [x] Ad-hoc tanpa suite → **diizinkan** (`test_suite_id` NULL)
- [x] Prefix tabel → **`agent_`**
- [x] Bucket MinIO → **satu** `automation-qa` + prefix path
- [x] Retention orphan → **D2** auto-hapus setelah **30 hari**
- [x] UI agent runs → **terpisah** dulu (bukan merge tester lama)
- [x] Worker auth MVP → **forward JWT user**

---

## W0 — Align dokumen ✅

Plan: `ROADMAP` + `ARCH`

- [x] Plan terpecah + Plan ID + dependensi
- [x] Indeks `docs/README.md` mengarah ke roadmap
- [x] Stakeholder setuju istilah produk:
  - **Knitto Api Automation QA Data**
  - **Knitto Automation QA Worker**
  - **Knitto Automation QA Client**
- [x] Urutan wave W0→W8 disetujui (Electron **W8 BLOCKED** / planning only; History runs = **W4**)
- [x] Kunci keputusan A–F (termasuk D2 = orphan 30 hari)

**Selesai jika:** ✅ istilah + wave + keputusan terkunci.---

## W1 — Auth MVP + API Data runs/cases ✅

Plan: `AUTH` + `API-DATA` G1–G2  
Prasyarat: W0

### API Data (`knitto-api-automation-qa`)

- [x] Migrasi DB: `agent_runs`
- [x] Migrasi DB: `agent_run_cases`
- [x] Migrasi DB: `agent_run_logs`
- [x] `POST /agent/runs`
- [x] `GET /agent/runs/:runId`
- [x] `GET /agent/runs/by-agent-job/:agentJobId`
- [x] `PATCH /agent/runs/:runId`
- [x] `POST /agent/runs/:runId/cases`
- [x] `GET /agent/runs/:runId/results` (tanpa media dulu OK)
- [x] `POST /agent/runs/:runId/logs`
- [x] Guard: **tidak** menulis `test_queues` / `test_results` / `test_objects`
- [x] Auth: `/agent/*` wajib Bearer JWT (401 tanpa token)

### Smoke

- [x] Login (`admin` / `dmain`) → create run → cases → patch FINISHED → results + by-job → 401 tanpa token
- [x] Smoke logs: `POST .../logs` + muncul di `GET .../results`
**Selesai jika:** ✅ API runs/cases hidup di API Data dengan JWT.

---

## W2 — Job lifecycle (korelasi FE ↔ Worker ↔ BE)

Plan: `JOB`  
Prasyarat: W1

### Kontrak alur

- [x] FE generate `agentJobId` dulu
- [x] FE `POST /agent/runs` **sebelum** (atau sebelum commit) WS `user_prompt`
- [x] Payload WS membawa `agentJobId` (+ `runId` bila ada)
- [x] Worker `PATCH` status run (RUNNING / FINISHED / ERROR)
- [x] Worker `POST` cases hasil orchestrator
- [x] Cancel UI → Worker stop → `PATCH CANCELLED`
- [x] Policy stale `RUNNING` (TTL / mark ERROR) terdokumentasi di kode atau `JOB`

### FE monolit (interim)

- [x] Wire create run ke API Data (env base URL API Data)
- [x] **Login screen** API Data saja (gate sebelum chat; bukan form di Settings) + JWT di localStorage
- [x] Tampilkan `runId` / status dari API Data setelah job (minimal)

**Selesai jika:** happy path tanpa race; cancel mengubah status di BE.

---

## W3 — Media library (MinIO)

Plan: `MEDIA`  
Prasyarat: W1 + auth upload

### API Data + MinIO

- [x] Config MinIO (env) + bucket **`automation-qa`** (+ prefix path)
- [x] Migrasi: `agent_media_folders` (opsional), `agent_media`, `agent_run_media`
- [x] `POST /agent/media/upload`
- [x] `GET /agent/media`, `GET /agent/media/:mediaId`
- [x] `GET /agent/media/:mediaId/content` dan/atau `/url` (presigned)
- [x] `DELETE /agent/media/:mediaId`
- [x] Folder CRUD (jika dipakai FE) — belakangan
- [x] `POST /agent/runs/:runId/media` (tautan)
- [x] Results API sertakan media tertaut

### Worker

- [x] Setelah capture screenshot/video → upload → tautkan run/case (terminal job hook)
- [x] Retry singkat bila MinIO/API gagal (log; tidak gagalkan run)

### FE

- [x] Preview image/video dari URL API Data (presigned results; fallback disk Worker)
- [x] media folder UI pakai `/agent/media` (+ lampiran `mediaId`, Worker download temp)
- [x] Pisah Media library vs run evidence di Client (naming, filter `source`, `RunEvidenceItem`)
- [x] Job retention D2: orphan > 30 hari → hapus DB + objek MinIO (`POST /agent/media/purge-orphans` + script)

**Selesai jika:** satu job menghasilkan media di MinIO + terlihat dari results API.  
(Retention cron boleh menyusul di akhir W3 / W7.)

---

## W4 — History `agent_runs` + Media library dual picker

Plan: `API-DATA` (list/history) + `MEDIA` (picker) + `JOB`  
Prasyarat: W2 + W3

### API Data

- [x] `GET /agent/runs` — list/paginate/filter (status, tanggal, `agentJobId`); JWT
- [x] Results detail tetap `GET /agent/runs/:runId/results` (cases + `media[]` + `caseOrder`)

### FE — Run history

- [x] Panel/halaman **Run history** (UI agent terpisah): list → detail
- [x] Hydrate TC stack + evidence dari Results (screenshot/video per TC via `caseOrder`)
- [x] Deep-link dari chat job selesai ke entry `runId` yang sama

### FE — Media library picker

- [x] Tab/mode **Uploaded**: folders + `source=upload_ui|attachment` (seperti sekarang)
- [x] Tab/mode **Dari run**: pilih run history → list evidence tertaut → attach **`mediaId` yang sama** (tanpa copy MinIO)
- [x] Jangan dump semua `worker_evidence` ke root library tanpa konteks run

**Selesai jika:** user bisa buka history run + evidence; lampiran prompt bisa dari upload **atau** evidence run lama.

---

## W5 — Memory & prompt shortcuts ke API Data

Plan: `API-DATA` G4  
Prasyarat: W1 (W2/W3 sebaiknya sudah jalan)

- [x] Migrasi: `agent_app_memory`, `agent_prompt_shortcuts`
- [x] API `GET/PUT /agent/app-memory`
- [x] CRUD `/agent/prompt-shortcuts`
- [x] Worker: fetch memory/shortcuts dari BE sebelum/saat job
- [x] MCP `*_update_app_memory` → persist BE (bukan hanya disk monolit)
- [x] Skrip/import sekali: file `memory/` + `prompt-shortcuts/` → DB (opsional)
- [x] FE settings baca/tulis API Data

**Selesai jika:** disk monolit bukan sumber kebenaran untuk memory/shortcuts.

---

## W6 — Agent runtime + MCP (boleh paralel)

Plan: `AGENT` + `MCP`  
Prasyarat: `ARCH` (disarankan setelah W2 agar job+BE sudah berguna)

### `AGENT`

- [x] `.npmrc` + auth GitHub Packages `@knittotextile`
- [x] Install `knitto-agent-core` + `knitto-agent-providers` di Worker
- [x] OpenAI-compatible runtime (ganti path 9Router) + in-process MCP
- [x] Multi-TC runner OpenAI via knitto-agent
- [x] UI: hanya **Cursor** | **OpenAI-compatible** (+ preset baseUrl)
- [x] Hapus / nonaktifkan Gemini bridge UI
- [x] Rename protokol `bridgeId` → `agentRuntime` (alias sementara OK)

### `MCP`

- [x] Dual-register: `automation_*` alias = `browser_*` *(dilanjut cutover langsung ke `browser_*` saja)*
- [x] Cutover prompt/docs internal ke `browser_*`
- [x] Parity stdio (Cursor) ↔ in-process (OpenAI) — tool set sama
- [x] Enforce default snapshot hemat token
- [x] Hapus alias `automation_*`
- [x] Update `docs/mcp.md` + architecture as-is setelah cutover

**Selesai jika:** ✅ 2 pilihan agent di UI; tool call baru memakai `browser_*` / `mobile_*`.

---

## W7 — Harden Worker ✅

Prasyarat: W2–W6 (minimal W2+W3)

- [x] Retry upload media + buffer lokal bila BE/MinIO down
- [x] 1 Worker per host; tolak/antre job kedua dengan pesan jelas
- [x] Device/browser lock jelas di log + UI
- [x] Cleanup proses (browser, Appium session, cursor-subprocess) setelah cancel/error
- [x] Structured log dengan `runId` + `agentJobId`
- [x] Smoke checklist: Cursor single-TC, OpenAI multi-TC, media, cancel

**Selesai jika:** ✅ gagal parsial tidak meninggalkan zombie process; upload recoverable.

### Smoke checklist (W7)

1. Cursor single-TC (browser) → selesai; evidence di Results (atau flush setelah MinIO down)
2. OpenAI-compatible multi-TC → cases + media tertaut
3. API/MinIO down saat terminal → run tetap terminal + `[mediaPending]`; flusher unggah saat endpoint hidup (Worker process sama)
4. Cancel mid-job → tidak ada browser/Appium/device lock tersisa; BE `CANCELLED`
5. Job kedua (Cursor lalu OpenAI) saat job 1 running → antri (`Menunggu slot Worker…`); setelah selesai, job 2 jalan
6. Log stderr memuat `job=` (+ `run=`) pada event kunci; `GET /api/health` menampilkan `hostJob` + `browserLock`

---

## W9 — Mission flow (Scope B)

Plan: `MISSION` ([plan-mission.md](plan-mission.md))  
Prasyarat: W1–W2 (runs + JWT); FE config sidebar (Scope A) sudah ada

### API Data (`knitto-api-automation-qa`)

- [x] Migrasi: `agent_missions`, `agent_mission_items`
- [x] CRUD `/agent/missions` + `PUT …/items` + `ready` + `approve` (atomic → `agent_runs`) + `cancel` + `seed-from-suite`

### Worker + FE (`knitto-agent-automation`)

- [x] Zod `missionId` di `user_prompt`
- [x] FE: Susun / Ready / Approve (bukan Send = run)
- [x] Worker: tolak enqueue jika mission bukan `APPROVED`
- [x] Map mission items → `testCases` / cases
- [x] B2: `POST /api/missions/plan` LLM (provider/model Config) → todos; Re-plan di board

### Smoke

- [x] Draft → edit todos → approve → `agent_runs` + WS job *(kode siap; apply migrasi `20260720_create_agent_missions.sql` + restart API Data untuk E2E live)*
- [x] Tanpa approve: tidak ada job / create run dari composer
- [x] Config A (provider/model/templates) ikut snapshot mission
- [x] Susun mission memanggil LLM plan (bukan seed kasar intent)

**Selesai jika:** UI produk hanya run lewat Mission approve; todos dari LLM; API Data SoT draft.

---

## W8 — Knitto QA Client (Electron) — BLOCKED (planning only)

Plan: `ELECTRON`  
Prasyarat: Worker + data path stabil (**W2–W7**)

> **Status: BLOCKED.** Jangan mulai implementasi shell/installer. Hanya boleh update dokumen planning (`plan-electron.md`) sampai W7 selesai.

- [ ] Electron shell: Start/Stop Worker + cek/spawn Appium
- [ ] Status Siap / Belum siap + wizard emulator
- [ ] UI renderer = FE produk
- [ ] Secrets: safeStorage untuk API keys (`AUTH`)
- [ ] Installer Windows (+ signing / allowlist IT)
- [ ] Version check Client ↔ Worker ↔ BE API
- [ ] (Ideal) auto-update channel internal

**Selesai jika:** QA non-teknis install → Start → jalan tanpa Docker/CLI.  
**(Belum dikerjakan — wave blocked.)**

---

## FLOW-REPLAY — Playbook memory (post token-opt)

Plan: [plan-flow-replay.md](plan-flow-replay.md) · Depends: `MCP`, `AGENT`

- [x] Dokumentasi arsitektur + cross-links
- [x] Schema `@knitto/shared` (`flow-playbook.ts`)
- [x] Parser / loader / matcher / replay runner (`core/flow-replay/`)
- [x] Hook orchestrator
- [x] Auto-record playbook (OpenAI in-process MCP path)
- [x] Unit tests parse / match / replay / variables
- [ ] Manual QA: mission browser + mobile, verifikasi fast path + fallback

**Selesai jika:** replay match → TC selesai tanpa agent loop; mismatch → agent penuh; tests hijau.

---

## Di luar scope (jangan masuk sprint ini)

- Device farm sebagai path utama
- Tulis legacy `test_queues` / `test_results` / `test_objects`
- Relay tool_call server → client
- Merge wajib UI agent ke FE tester lama (kecuali keputusan berubah)
- Implementasi Electron sebelum W7 selesai
- Dump semua `worker_evidence` ke root Media library tanpa pilih run

---

## Cara pakai

1. Kerjakan **satu wave** sampai “Selesai jika”.  
2. Update centang di file ini (PR docs OK).  
3. Rujuk detail kontrak di plan ID terkait, bukan mengarang endpoint baru di luar plan.  
4. Setelah open decision berubah: update ROADMAP §5 + baris default di atas file ini.
