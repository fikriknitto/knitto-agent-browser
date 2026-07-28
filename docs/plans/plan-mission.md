# Plan Mission — draft → approve → run (`MISSION`)

> **Plan ID:** `MISSION`  
> **Depends on:** `API-DATA` ([plan-api-data.md](plan-api-data.md)), `JOB` ([plan-job-lifecycle.md](plan-job-lifecycle.md)), `AUTH` ([plan-auth.md](plan-auth.md))  
> **Unlocks:** FE Mission workspace (Scope B); gate Worker execute setelah approve  
> **Related:** `ARCH`, `MEDIA`, `AGENT`, `ROADMAP`

Gate automation: **susun Mission → todos/checkpoints → approve → baru agent run**.  
SoT draft/approve = **API Data** (`knitto-api-automation-qa`). Worker hanya eksekusi setelah Mission `APPROVED`.

---

## 1. Model produk

| Layer | Arti |
|---|---|
| **Project** | Katalog RO (`GET /project/`) |
| **Suite** | Katalog RO opsional — seed todos dari cases |
| **Mission** | Rencana eksekusi yang diedit manusia; SoT API Data |
| **Agent run** | 1 Mission approved → 1 `agent_runs` + 1 Worker job |

Ad-hoc “Send = run” diganti path Mission (MVP B1). Quick-run bypass **bukan** MVP.

```text
DRAFT → READY → APPROVED → (spawn run) Worker RUNNING…
              ↘ CANCELLED / ARCHIVED (sebelum approve)
```

**Tidak** menambah status `DRAFT` ke `agent_runs` — run hanya lahir saat approve.

---

## 2. Tabel

### `agent_missions`

| Kolom | Catatan |
|---|---|
| `id` | PK = `missionId` |
| `project_id` | INT NULL (MVP) |
| `test_suite_id` | INT NULL |
| `title` | VARCHAR |
| `intent_text` | TEXT |
| `status` | `DRAFT` \| `READY` \| `APPROVED` \| `CANCELLED` \| `ARCHIVED` |
| `agent_runtime` | `cursor` \| `openai` |
| `platform` | `browser` \| `mobile` \| `hybrid` |
| `model` | VARCHAR NULL |
| `mobile_config_json` | JSON NULL |
| `prompt_base_paths_json` | JSON array of shortcut paths |
| `attachment_media_ids_json` | JSON array of media ids |
| `run_id` | FK `agent_runs.id` NULL sampai approve |
| `agent_job_id` | VARCHAR NULL sampai approve |
| `triggered_by` | user id |
| `meta_json` | JSON NULL |
| `created_at` / `updated_at` | |

### `agent_mission_items`

| Kolom | Catatan |
|---|---|
| `id` | PK |
| `mission_id` | FK |
| `item_order` | INT (0-based) |
| `kind` | `todo` \| `checkpoint` |
| `title` | |
| `body` | instruksi untuk agent |
| `test_case_id` | INT NULL (seed katalog) |
| `requires_evidence` | BOOL (checkpoint) |
| `status` | `PENDING` (sampai run; hasil di `agent_run_cases`) |
| `created_at` / `updated_at` | |

Unique (`mission_id`, `item_order`).

---

## 3. API

Prefix: `/agent/missions` (Bearer JWT, sama `/agent/*`).

| Method | Path | Fungsi |
|---|---|---|
| `POST` | `/agent/missions` | Buat `DRAFT` |
| `GET` | `/agent/missions` | List (filter `status`, `projectId`) |
| `GET` | `/agent/missions/:id` | Detail + items |
| `PATCH` | `/agent/missions/:id` | Update intent/config selagi `DRAFT`\|`READY` |
| `PUT` | `/agent/missions/:id/items` | Replace ordered items |
| `POST` | `/agent/missions/:id/ready` | Validasi ≥1 item → `READY` |
| `POST` | `/agent/missions/:id/approve` | Atomic: create `agent_runs` → `APPROVED` + `{ mission, runId, agentJobId }` |
| `POST` | `/agent/missions/:id/cancel` | `CANCELLED` jika belum `APPROVED` |
| `POST` | `/agent/missions/:id/seed-from-suite` | Items dari katalog suite (RO) |

### Create body (ringkas)

```json
{
  "title": "Login smoke",
  "intentText": "…",
  "projectId": null,
  "testSuiteId": null,
  "agentRuntime": "cursor",
  "platform": "browser",
  "model": "auto",
  "mobileConfig": null,
  "promptBasePaths": ["prompt-shortcuts/login.md"],
  "attachmentMediaIds": [12]
}
```

### Approve body

```json
{ "agentJobId": "job-…" }
```

FE generate `agentJobId` (pola `JOB`). API Data create `agent_runs` dengan `agent_job_id` + link `run_id` ke mission.

### Approve response

```json
{
  "mission": { "missionId": 1, "status": "APPROVED", "…": "…" },
  "runId": 99,
  "agentJobId": "job-…"
}
```

---

## 4. Urutan eksekusi (setelah Mission)

```text
1. FE compose → POST /agent/missions (DRAFT)
2. FE edit items → PUT …/items; optional seed-from-suite
3. FE POST …/ready → READY
4. FE generate agentJobId
5. FE POST …/approve { agentJobId } → runId (atomic create agent_runs)
6. FE WS user_prompt { id: agentJobId, runId, missionId, testCases from items, … }
7. Worker validate mission APPROVED + runId match → enqueue
8. Worker cases/media/PATCH run (JOB + MEDIA as-is)
```

---

## 5. Generasi todos

| Gelombang | Perilaku |
|---|---|
| **B1** | Manual + seed suite + todo kasar dari prompt bases — **deprecated** sebagai path default |
| **B2 (default)** | Worker `POST /api/missions/plan` memanggil LLM (Cursor \| OpenAI sesuai Config) → `PUT …/items`; user review → ready → approve. Tombol **Re-plan** mengulang. |

Alur B2:

```text
FE Susun mission → POST /agent/missions DRAFT
FE → Worker POST /api/missions/plan { bridgeId, model, intentText, … }
Worker LLM (tanpa MCP) → { items[] }
FE → PUT /agent/missions/:id/items
```

---

## 6. Wire Worker / FE

- `user_prompt.missionId` (Zod shared) — wajib pada path Mission.
- Worker tolak enqueue jika mission bukan `APPROVED` atau `runId` tidak cocok.
- Map items → `testCases` (`TestCaseSpec`) pada approve/WS.

---

## 7. Non-goals (B1 legacy / di luar B2)

- Seed kasar intent/bases sebagai path default (diganti LLM plan).
- Status `DRAFT` pada `agent_runs`.
- Mission multi-run / resume.
- Quick-run bypass tanpa Mission.
- Tulis tabel tester legacy.
- LLM plan lewat JobQueue/MCP atau API Data secrets.

---

## 8. Fase implementasi

| Fase | Selesai jika |
|---|---|
| 1. Kontrak docs | Plan ini + taut `API-DATA` / `JOB` / `TODO` |
| 2. API Data | Migrasi + CRUD + ready + approve atomic |
| 3. Shared + FE client | Zod `missionId` + `api-data-missions-api` |
| 4. FE Mission UI | Susun / Ready / Approve (bukan Send langsung) |
| 5. Worker gate | Validate APPROVED; map items → cases |
| 6. Smoke B1 | Draft → approve → run; reject tanpa approve |
