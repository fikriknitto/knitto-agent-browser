# REST & WebSocket

---

## Pendahuluan

Dokumen ini merangkum permukaan HTTP dan WebSocket yang diekspos backend Knitto Agent Automation ke frontend (dan klien lain).

---

## Tujuan Dokumen

- Inventaris endpoint untuk integrasi UI
- Menunjuk path artefak agent (screenshot/video)

---

## Ruang Lingkup

Ringkasan API publik. Detail body/schema: Zod di `@knitto/shared` dan controller di `apps/backend/src/controllers`.

---

## 1. REST

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/bridges` | Daftar bridge + model |
| `GET` | `/api/shortcuts` | Prompt shortcuts |
| `GET` | `/api/config/public` | Konfigurasi publik |
| `GET` | `/api/file-manager/entries` | **Debug only** — list disk `storage/` (`?path=`) |
| `GET` | `/api/file-manager/files/serve` | **Debug only** — serve file (preview) |
| `GET` | `/api/file-manager/files/content` | **Debug only** — konten file (base64) |
| `POST` | `/api/file-manager/upload` | **Debug only** — upload |
| `POST` | `/api/file-manager/folders` | **Debug only** — buat folder |
| `PATCH` | `/api/file-manager/entries` | **Debug only** — rename `{ path, name }` |
| `DELETE` | `/api/file-manager/entries` | **Debug only** — hapus `{ path }` |

> Product media library: API Data `GET/POST /agent/media*`, `GET /agent/media/:id/url` (MinIO). FE `/files` dan modal lampiran memakai itu, bukan `/api/file-manager`.
| `GET` | `/api/agent-screenshots/:jobId/:filename` | Screenshot agent |
| `GET` | `/api/agent-videos/:jobId/:filename` | Video MP4 |
| `GET` | `/api/mobile/devices` | Snapshot device |
| `GET` | `/api/mobile/devices/stream` | SSE device updates |
| `GET` | `/api/mobile/devices/:udid/packages` | Packages terinstall |
| `GET` | `/api/mobile/devices/:udid/packages/:pkg/activity` | Launcher activity |

---

## 2. WebSocket

- URL lokal: `ws://<host>:<BACKEND_PORT>/ws`
- Docker UI: same-origin via nginx `/ws`
- Event tipikal: progress `agent_job` (`screenshots`, `videoUrl` / `testCaseResults`), bridge status, credentials request

---

## 3. Proxy

- Dev: Vite mem-proxy `/api` dan `/ws` ke backend
- Prod Docker: `docker/nginx.conf` mem-proxy ke service `backend`
