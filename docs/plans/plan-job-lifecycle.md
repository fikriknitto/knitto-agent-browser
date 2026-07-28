# Plan Job Lifecycle — `agentJobId` ↔ `runId` (`JOB`)

> **Plan ID:** `JOB`  
> **Depends on:** `API-DATA` ([plan-api-data.md](plan-api-data.md)), `AUTH` ([plan-auth.md](plan-auth.md))  
> **Unlocks:** wire Worker status tanpa race; cancel konsisten; fondasi `ELECTRON`  
> **Related:** `ARCH`, `MEDIA`, `AGENT`, `ROADMAP` ([plan-roadmap.md](plan-roadmap.md))

Menutup gap: **siapa create ID dulu**, state machine run, cancel, dan restart Worker mid-job.

---

## 1. Identitas

| ID | Siapa buat | Di mana hidup | Fungsi |
|---|---|---|---|
| `agentJobId` | **FE/Client** (atau Worker jika job lokal-only interim) | WS job + kolom `agent_runs.agent_job_id` | Korelasi stream progress / cancel di Worker |
| `runId` | **API Data** saat `POST /agent/runs` | PK `agent_runs` | Persistensi & query hasil jangka panjang |

Aturan: **satu** `agentJobId` ↔ **paling banyak satu** `runId` (unique di DB).

---

## 2. Urutan wajib (MVP)

**Path Mission (Scope B — default UI):** lihat [plan-mission.md](plan-mission.md). Create `agent_runs` terjadi di `POST /agent/missions/:id/approve`, bukan dari composer Send.

```text
# Mission approve → run (produk)
1. FE susun Mission (DRAFT → READY)
2. FE generate agentJobId
3. FE POST /agent/missions/:id/approve { agentJobId } → runId, mission APPROVED
4. FE WS user_prompt { agentJobId, runId, missionId, testCases? }
5. Worker validate mission APPROVED → eksekusi; progress WS agent_job
6. Worker upload media (MEDIA) + POST cases + PATCH run
7. FE GET /agent/runs/:runId/results

# Legacy / ops (tanpa Mission)
1. FE generate agentJobId
2. FE POST /agent/runs { agentJobId, testSuiteId?, … } → runId, status=RUNNING|QUEUED
3. FE WS user_prompt ke Worker { agentJobId, runId?, … }
…
```

| Jika… | Perilaku |
|---|---|
| POST run gagal | Jangan kirim WS job (atau kirim lalu Worker no-op + error UI) |
| WS sampai sebelum POST commit | Worker boleh `GET by-agent-job`; jika 404 → tunggu singkat / fail jelas |
| Worker restart mid-job | Run tetap `RUNNING` di BE; UI tampilkan stale. **Locked policy:** resume tidak didukung; mark `ERROR` dengan summary `stale_running` jika masih `RUNNING` setelah **TTL 6 jam** (`AGENT_RUN_STALE_MS`, default `21600000`). MVP tanpa cron — panggil manual / ops, atau optional Worker sweep untuk job yang Worker kenal. |
| Cancel dari UI | WS cancel → Worker stop → `PATCH` status `CANCELLED` |

---

## 3. State machine `agent_runs.status`

```text
QUEUED → RUNNING → FINISHED
                 → CANCELLED
                 → ERROR
```

| Status | `outcome` |
|---|---|
| `FINISHED` | `PASSED` \| `FAILED` \| `PARTIAL` (wajib diisi) |
| lainnya | `outcome` NULL |

Progress live **bukan** lewat polling BE setiap tick — tetap **WS Worker**. BE = snapshot durable.

---

## 4. Cancel

1. UI → Worker: cancel (`agentJobId`).  
2. Worker hentikan queue/agent; cleanup browser/session sesuai orchestrator.  
3. Worker → BE: `PATCH` `CANCELLED` (+ summary singkat).  
4. Media sudah ter-upload tetap ada; tautan `agent_run_media` boleh partial.

---

## 5. Ad-hoc vs suite

| Mode | `test_suite_id` | Catatan |
|---|---|---|
| Suite run | wajib / diisi | Compose dari katalog GET |
| Chat ad-hoc | NULL | **Open** — kunci produk; default rencana: **diizinkan** |

Keputusan akhir tulis di sini + `API-DATA` open questions → Locked.

---

## 6. Concurrency host

- **1 Automation Worker per mesin QA** (default).  
- Device/browser lock di Worker; job kedua mengantri atau ditolak dengan pesan jelas.  
- Dua Electron Client ke Worker yang sama: di luar MVP; dokumentasikan “satu UI aktif”.

---

## 7. Fase

| Fase | Selesai jika |
|---|---|
| 1. Create-before-WS | Tidak ada job tanpa `runId` di happy path |
| 2. Cancel E2E | Status BE = `CANCELLED` |
| 3. Stale RUNNING policy | TTL **6 jam** (`AGENT_RUN_STALE_MS`); mark ERROR `stale_running`; resume tidak didukung |

### Smoke checklist (W2)

1. FE tampil **login screen** API Data — login (`admin` / `dmain`) sebelum chat (bukan di Settings)  
2. Submit prompt ad-hoc → row `agent_runs` muncul sebelum/saat job; FE tampil `runId`  
3. Job selesai → cases + status `FINISHED` di BE  
4. Cancel mid-job → BE `CANCELLED`  
5. Logout di header / token kosong → kembali ke login (tidak ada WS job tanpa JWT)  
6. Tanpa token ke BE → 401 (W1)

---

## 8. Non-goals

- Orchestrator remote / relay tool.  
- Resume mid-TC setelah crash (boleh fase belakangan).  
- Menulis `test_queues` legacy.
