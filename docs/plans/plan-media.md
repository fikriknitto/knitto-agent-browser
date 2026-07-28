# Plan Media — library MinIO (`MEDIA`)

> **Plan ID:** `MEDIA`  
> **Depends on:** `API-DATA` ([plan-api-data.md](plan-api-data.md)), `AUTH` ([plan-auth.md](plan-auth.md))  
> **Unlocks:** persist evidence, FE media folder cutover, tautan run di `JOB`  
> **Related:** `ARCH`, `ROADMAP` ([plan-roadmap.md](plan-roadmap.md))

Media = **aset file** (foto/video/lampiran), bukan row result. Storage fisik = **MinIO**; DB = metadata + key.  
Result TC tetap di `agent_run_cases` (`API-DATA`). Run hanya **mereferensi** `media_id`.

---

## 1. Keputusan

| Keputusan | Ya / Tidak |
|---|---|
| Blob di MinIO, metadata di DB | **Ya** |
| Library seperti media folder FE (bukan hanya “evidence di result”) | **Ya** |
| Tulis ke `test_objects` / `screenshot_path` legacy | **Tidak** |
| Duplikasi file saat kaitkan ke run | **Tidak** — hanya row tautan |

---

## 2. Tabel

### `agent_media_folders` (opsional)

| Kolom | Catatan |
|---|---|
| `id` | PK |
| `parent_id` | NULL = root |
| `name` | |
| `path` | unik logis, mis. `attachments/login` |
| `created_by` / `created_at` | |

### `agent_media`

| Kolom | Catatan |
|---|---|
| `id` | PK / UUID = `mediaId` |
| `folder_id` | NULL atau FK |
| `name` | tampilan |
| `kind` | `image` \| `video` \| `file` \| `other` |
| `content_type` | |
| `bytes` | |
| `checksum` | opsional |
| `bucket` | MinIO |
| `object_key` | sumber kebenaran lokasi |
| `source` | `upload_ui` \| `worker_evidence` \| `attachment` |
| `created_by` / `created_at` | |

Unique (`bucket`, `object_key`).

### `agent_run_media`

| Kolom | Catatan |
|---|---|
| `id` | PK |
| `agent_run_id` | FK |
| `agent_run_case_id` | NULL = per TC |
| `media_id` | FK → `agent_media` |
| `role` | `screenshot` \| `video` \| `attachment` \| `other` |
| `case_order` | denorm opsional |
| `created_at` | |

---

## 3. API (ringkas)

| Method | Path | Fungsi |
|---|---|---|
| GET/POST/PATCH/DELETE | `/agent/media/folders…` | Tree folder |
| POST | `/agent/media/upload` | Multipart → MinIO + row |
| GET | `/agent/media` | List/filter |
| GET | `/agent/media/:mediaId` | Metadata |
| GET | `/agent/media/:mediaId/content` | Proxy stream |
| GET | `/agent/media/:mediaId/url` | Presigned TTL pendek |
| DELETE | `/agent/media/:mediaId` | DB + objek MinIO |
| POST | `/agent/runs/:runId/media` | Tautkan `mediaId` + role |

Detail envelope & contoh JSON: selaras `API-DATA`; auth: `AUTH`.

---

## 4. Lifecycle operasional (gap yang ditutup di sini)

```text
Capture / upload UI
  → temp lokal (Worker) atau multipart FE
  → POST /agent/media/upload → mediaId
  → (opsional) POST /agent/runs/:runId/media
  → serve via content/url
```

| Topik | Aturan target |
|---|---|
| Kapan upload Worker | Setelah segment video/screenshot siap (per TC), bukan menunggu seluruh suite selesai |
| MinIO down | Retry dengan backoff; buffer lokal job dir; status run boleh FINISHED + flag `mediaPending` di meta (opsional) |
| MCP `*_upload_file` | Prefer unduh/resolve dari `mediaId` ke path temp job; jangan andalkan path disk monolit FE |
| Prompt attachment | FE kirim `mediaId[]`, bukan path `storage/` |
| Prefix object key | Usulan: `library/{folderPath}/…` vs `runs/{runId}/tc-{n}/…` |

---

## 5. Open questions (pemilik `MEDIA`)

1. Bucket → **Locked:** satu `automation-qa` + prefix.  
2. Retention → **Locked D2:** cron hapus orphan setelah **30 hari** (media tanpa tautan `agent_run_media` dan tidak di folder library aktif — detail job di implementasi W3+).  
3. Quota ukuran per project/user? (masih open, bukan blocker W0)

---

## 6. Fase

| Fase | Selesai jika |
|---|---|
| 1. Bucket + tabel + upload/list | File muncul di MinIO + `agent_media` |
| 2. Tautan run | Results API mengembalikan media |
| 3. FE media folder | UI pakai `/agent/media`, bukan disk `storage/` sebagai SoT — **done** (`/files` + modal lampiran → `FileManagerPanel` / `useMediaLibrary`; Worker `/api/file-manager` debug-only) |
| 3b. Dual picker (W4) | Media library: tab **Uploaded** \| **Dari run** (evidence via konteks run → attach `mediaId` sama; tanpa dump root) |
| 4. Harden | Retry + MCP attachment via `mediaId` |
| 5. Retention D2 | Job periodik: orphan > 30 hari → hapus DB + MinIO |

Migrasi massal isi Worker `storage/` lama → library MinIO = skrip opsional (`scripts/migrate-storage-to-library.ts`), bukan blocker upload baru.

**FE domain (library vs evidence):** Client memisahkan *Media library* (`api-data-library-api`, filter `source=upload_ui|attachment`) dari *run evidence* (`buildRunEvidence` / Results `media[]`). Evidence tidak masuk root list library; attach dari history = **W4** lewat picker “Dari run”.

---

## 7. Non-goals

- Menyimpan blob di kolom result.  
- Device farm storage.  
- Mengganti engine recording (tetap Playwright `recordVideo` + ffmpeg di Worker — lihat `MCP` / as-is).
