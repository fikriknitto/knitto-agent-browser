# Plan Auth & akses (`AUTH`)

> **Plan ID:** `AUTH`  
> **Depends on:** `ARCH` ([plan-architecture.md](plan-architecture.md))  
> **Unlocks:** write aman `API-DATA` / `MEDIA`; secrets Client; fondasi `JOB`  
> **Related:** `ELECTRON`, `ROADMAP` ([plan-roadmap.md](plan-roadmap.md))

Siapa boleh panggil API agent, bagaimana Worker authenticate, dan di mana secret disimpan.

---

## 1. Keputusan MVP

| Keputusan | MVP | Nanti |
|---|---|---|
| FE / Client → API Data | Bearer **JWT user** (`POST /auth/login` existing) | — |
| Worker → API Data | **Forward JWT user** dari job context | Service token / mTLS |
| Scope write | Hanya tabel `agent_*` + objek MinIO bucket media | RBAC halus |
| Katalog tester | Read dengan JWT yang sama | — |

---

## 2. ACL (target minimal)

| Resource | Aturan usulan |
|---|---|
| `agent_runs` | User harus punya akses `project_id` / suite terkait (sama kebijakan katalog bila ada) |
| `agent_media` | List/upload dalam project (atau workspace) user; jangan serve lintas project tanpa authz |
| Memory / shortcuts | Per user atau per project — **open**; default usulan: per scope app + visible di project |

Detail mapping role tester existing: selaraskan dengan API Data yang sudah ada; jangan invent role baru di MVP kecuali perlu.

---

## 3. Secrets

| Secret | Di mana (target) |
|---|---|
| JWT session | FE/Electron renderer+safe storage sesuai pola app |
| Cursor API key | Settings UI → simpan lokal terenkripsi (Electron safeStorage) atau env Worker di mesin QA |
| OpenAI-compatible provider credential | **Diperbarui 2026-07-22:** disimpan server-side di API Data (`ai_provider_credentials`, terenkripsi AES-256-GCM at-rest), scoped per `user_id` dari JWT, supaya tidak hilang saat cache di-clear / Worker restart. Live agent tetap menerima credential lewat WS `bridge_credentials` seperti sebelumnya — API Data hanya jadi sumber kebenaran yang persisten, bukan pengganti jalur runtime WS. |
| MinIO keys | **Hanya di API Data** (server); Worker/FE tidak pegang key MinIO mentah — upload lewat API Data |
| `NODE_AUTH_TOKEN` (knitto-agent packages) | Dev/CI mesin teknis, bukan QA end-user |

---

## 4. Worker tanpa UI (headless)

Jika job dipicu tanpa FE (nanti): butuh **service account** — di luar MVP; catat sebagai unlock setelah JWT path stabil.

---

## 5. Fase

| Fase | Selesai jika |
|---|---|
| 1. JWT end-to-end | FE + Worker upload/run dengan token user |
| 2. Tolak unauthenticated | 401 pada `/agent/*` |
| 3. ACL project | User A tidak baca run project B (smoke) |
| 4. Service token | Opsional automation CI |

---

## 6. Open questions

1. Service token vs tetap JWT-only untuk Worker production?  
2. Memory/shortcuts: privat per user atau shared project?  
3. Presigned MinIO URL: TTL berapa; boleh share link keluar?

---

## 7. Non-goals

- OAuth social login baru.  
- Menaruh MinIO secret di Client.  
- Device farm IAM.
