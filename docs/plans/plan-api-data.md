# Plan API Data — tabel & endpoint agent (`API-DATA`)

> **Plan ID:** `API-DATA`  
> **Depends on:** `ARCH` ([plan-architecture.md](plan-architecture.md))  
> **Unlocks:** `MEDIA`, `JOB`; memory/shortcuts API; **history list runs (TODO W4)**  
> **Related:** `AUTH`, `ROADMAP` ([plan-roadmap.md](plan-roadmap.md))

Kontrak **endpoint + skema baru untuk agent** di `knitto-api-automation-qa` sebagai API Data.

Konsumen: Knitto QA Client / FE + Automation Worker.  
Envelope `{ message?, result }`, auth: lihat `AUTH`.

> Belum implementasi. Detail media MinIO → **`MEDIA`**. Korelasi job → **`JOB`**.

---

## 0. Prinsip pemisahan data

| Domain | Tabel / API | Pemakaian agent |
|---|---|---|
| **Katalog tester** | Existing + GET | **Read-only** |
| **Run / hasil** | `agent_runs`, `agent_run_cases`, … | Write + read |
| **Media library** | Lihat **`MEDIA`** | Upload MinIO; run mereferensi `media_id` |
| **Memory / shortcuts** | `agent_app_memory`, `agent_prompt_shortcuts` | Write + read |

**Jangan** menulis `test_queues` / `test_results` / `test_case_results` / `test_step_results` / `test_logs` / **`test_objects`**.

```text
GET katalog existing  ──► Worker/FE (prompting)
POST/PATCH agent_*    ──► run + hasil (+ memory)
MEDIA                 ──► file MinIO + tautan
```

---

## 1. Katalog existing (read-only)

| Method | Path |
|---|---|
| POST | `/auth/login` |
| GET | `/project/`, `/project/:id` |
| GET | `/test-suites/?projectId=…`, `/test-suites/:id` |
| GET | `/test-case/:id`, `/test-case/:testCaseId/test-steps` |
| GET | `/test-suites-item/last-queue/:testSuiteId` — **bukan** queue agent |

---

## 2. Gelombang API + tabel (milik dokumen ini)

| Gelombang | Fokus | Tabel |
|---|---|---|
| **G1** | Lifecycle run | `agent_runs` |
| **G1b** | History list (TODO **W4**) | baca `agent_runs` |
| **G2** | Hasil per TC + log | `agent_run_cases`, `agent_run_logs` |
| **G3** | Media | → **`MEDIA`** (`agent_media*`, `agent_run_media`) |
| **G4** | Memory + shortcuts | `agent_app_memory`, `agent_prompt_shortcuts` |

Device list tetap di Worker.

---

## 3. Tabel (G1–G2, G4)

### 3.1 `agent_runs`

| Kolom | Catatan |
|---|---|
| `id` | PK = `runId` |
| `agent_job_id` | VARCHAR UNIQUE — lihat `JOB` |
| `test_suite_id` | INT NULL — ad-hoc vs suite: `JOB` |
| `project_id` | INT NULL |
| `status` | `QUEUED` \| `RUNNING` \| `FINISHED` \| `CANCELLED` \| `ERROR` |
| `outcome` | `PASSED` \| `FAILED` \| `PARTIAL` (setelah FINISHED) |
| `agent_runtime` | `cursor` \| `openai` |
| `triggered_by` | user id |
| `worker_host` / `platform` / `summary` / `error` / `meta_json` | |
| `started_at` / `finished_at` / `created_at` / `updated_at` | |

### 3.2 `agent_run_cases`

| Kolom | Catatan |
|---|---|
| `agent_run_id`, `test_case_id`, `case_order`, `title` | |
| `status` | `PASSED` \| `ERROR` \| `SKIPPED` \| `RUNNING` |
| `summary`, `error`, `handoff_json`, `duration_ms`, timestamps | |

Unique (`agent_run_id`, `case_order`).

### 3.3 `agent_run_logs` (opsional)

`level`, `message`, `logged_at`, FK run/case.

### 3.4 Media

Skema lengkap → [plan-media.md](plan-media.md) (`MEDIA`).

### 3.5 Memory / shortcuts (G4)

- Memory: `scope` (`browser`\|`mobile`), `app_id`, `content`, unique (`scope`, `app_id`).  
- Shortcuts: label, body, url/package, variables_json — setara `prompt-shortcuts/*.md`.

---

## 4. API G1 — runs

Prefix: `/agent/runs`.

| Method | Path |
|---|---|
| POST | `/agent/runs` — body: `agentJobId`, `testSuiteId?`, `testCaseIds?`, `agentRuntime?` |
| GET | `/agent/runs` — **list/history** (paginate + filter status/tanggal/`agentJobId`) — TODO **W4** / G1b |
| GET | `/agent/runs/:runId` |
| GET | `/agent/runs/by-agent-job/:agentJobId` |
| PATCH | `/agent/runs/:runId` — status/outcome/summary |

Insert **hanya** `agent_runs` — bukan `test_queues`. Urutan vs WS: **`JOB`**. History UI + dual media picker: **TODO W4**.

---

## 5. API G2 — cases / results / logs

| Method | Path |
|---|---|
| POST | `/agent/runs/:runId/cases` — upsert items |
| GET | `/agent/runs/:runId/results` — + media tertaut (`MEDIA`) |
| POST | `/agent/runs/:runId/logs` | |

`test_step_results` legacy **tidak** diisi agent (default).

---

## 6. API G3 — media

→ [plan-media.md](plan-media.md).

---

## 7. API G4 — memory & shortcuts

| Method | Path |
|---|---|
| GET/PUT/DELETE | `/agent/app-memory` (+ `?scope=browser\|mobile`) |
| CRUD | `/agent/prompt-shortcuts` |

**Done path (W5):** FE Settings + Worker/MCP memakai JWT ke endpoint di atas. Disk `memory/` / `prompt-shortcuts/` bukan SoT; optional import: `scripts/migrate-memory-shortcuts-to-api-data.ts`.

---

## 8. Auth

→ [plan-auth.md](plan-auth.md). Ringkas: JWT user; Worker forward JWT MVP.

---

## 8b. API G5 — missions (Scope B)

→ [plan-mission.md](plan-mission.md) (`MISSION`).

Tabel: `agent_missions`, `agent_mission_items`.  
Prefix: `/agent/missions` (CRUD + ready + approve atomic → create `agent_runs`).

---

## 9. Alur MVP

Lihat juga `JOB` + `MEDIA` + `MISSION`:

```text
# Path Mission (Scope B — default produk)
FE: POST /agent/missions → DRAFT → items → ready → approve → runId
FE: WS user_prompt (agentJobId, runId, missionId)
Worker: validate APPROVED → media + cases + PATCH run
FE: GET results

# Legacy create-run langsung (masih dipakai Worker tools / ops; UI produk lewat Mission)
FE: POST /agent/runs → runId
FE: WS user_prompt (agentJobId)
```

---

## 10. Non-goals

- Mutasi tabel queue/result/object legacy.  
- Blob di kolom result.  
- Device registry di API Data.  
- Progress live via API (tetap WS Worker).

---

## 11. Open questions (pemilik `API-DATA`)

1. Prefix tabel: `agent_` vs `kaa_`? → **Locked:** `agent_`  
2. FE tester lama merge `agent_runs` atau UI agent terpisah dulu? → **Locked:** UI agent terpisah dulu  
3. Ad-hoc tanpa suite — keputusan bersama `JOB` → **Locked:** diizinkan  

(Bucket → `MEDIA`: `automation-qa`. Retention → **D2 / 30 hari**. Auth MVP → JWT user.)

---

## 12. Urutan implementasi (dalam plan ini)

1. Migrasi `agent_runs` / `agent_run_cases` (+ logs).  
2. API G1–G2.  
3. Serahkan G3 ke implementasi `MEDIA`.  
4. **G1b** list/history `GET /agent/runs` + FE history / picker “Dari run” (TODO **W4**).  
5. G4 memory + shortcuts + migrasi disk.
