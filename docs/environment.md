# Environment Variables

---

## Pendahuluan

Referensi variabel lingkungan untuk **lokal** (`apps/backend/.env`, `apps/frontend/.env`) dan **Docker** (`docker.env` + root `.env`).

---

## Tujuan Dokumen

- Satu tempat untuk tabel env lengkap (README hanya menampilkan inti)
- Membedakan default lokal vs Docker

---

## Ruang Lingkup

Mencakup variabel yang dikonfigurasi tim. Path otomatis (`memory/`, `screenshoot/`, entry MCP source) tidak wajib di-set.

---

## 1. Backend (`apps/backend/.env`)

Salin dari `apps/backend/.env.example`.

| Variabel | Deskripsi | Default |
|----------|-----------|---------|
| `BACKEND_HOST` | Bind HTTP + WS | `0.0.0.0` |
| `BACKEND_PORT` | Port HTTP + WS | `3080` |
| `KNITTO_BRIDGE_MODEL` | Preferred default model id | `composer-2.5` |
| `KNITTO_BRIDGE_MAX_CONCURRENT` | Job paralel / channel | `1` |
| `KNITTO_BRIDGE_JOB_TIMEOUT_MS` | Timeout job (ms) | `600000` |
| `KNITTO_BRIDGE_MAX_TOOL_CALLS` | Maks tool call / job | `25` |
| `AUTOMATION_HEADLESS` | Headless browser | `false` (lokal) |
| `AUTOMATION_VIEWPORT_WIDTH` / `HEIGHT` | Viewport | `1366` / `768` |
| `AUTOMATION_SNAPSHOT_MAX_ELEMENTS` | Cap elemen `browser_get_page_snapshot` | `100` |
| `AUTOMATION_RECORD_VIDEO` | Rekam browser | `true` |
| `AUTOMATION_RECORD_FPS` | FPS rekaman (hint) | `25` |
| `AUTOMATION_VIDEO_SPEED` | Percepat playback finalize | `1.5` |
| `AUTOMATION_VIDEO_TRIM_IDLE` | Hapus frame diam (ffmpeg mpdecimate) | `true` |
| `AUTOMATION_FFMPEG_PATH` | Path ffmpeg (wajib untuk trim/speed) | PATH |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | Chromium custom (ex-`PUPPETEER_EXECUTABLE_PATH`) | Playwright bundle |
| `STORAGE_ROOT` | File manager root | `./storage` |
| `STORAGE_MAX_UPLOAD_BYTES` | Batas upload | `52428800` |
| `OPENAI_COMPAT_MAX_RETRIES` / `RETRY_DELAY_MS` | Retry OpenAI-compatible | `5` / `2000` |
| `KNITTO_MCP_LOG_LEVEL` | Log level | `info` |

Agent API keys (Cursor / OpenAI-compatible Base URL + key) **bukan** env — input di Web UI → localStorage → WebSocket.

Override jarang: `AUTOMATION_MCP_COMMAND`, `AUTOMATION_MCP_PATH`, `AUTOMATION_MEMORY_DIR`, `AUTOMATION_SCREENSHOT_DIR`, `AUTOMATION_SLOW_MO_MS`, `AUTOMATION_BROWSER_TIMEOUT_MS`, `AUTOMATION_UPLOAD_*`, `AUTOMATION_VIDEO_FILENAME`, `KNITTO_BRIDGE_CWD`.

### Mobile / Appium

| Variabel | Deskripsi | Default |
|----------|-----------|---------|
| `APPIUM_SERVER_URL` | URL Appium | lokal `http://127.0.0.1:4723` / Docker `http://appium:4723` |
| `ADB_SERVER_SOCKET` | ADB client → server (Docker backend) | `tcp:host.docker.internal:5037` |
| `ADB_CONNECT_TARGETS` | Target connect Appium container | `host.docker.internal:5555` (koma = multi) |
| `APPIUM_PORT` | Publish Appium (Compose root `.env`) | `4723` |
| `MOBILE_UDID` | UDID default | — |
| `MOBILE_DEVICE_UDIDS` | Allowlist pool | semua `adb devices` |
| `MOBILE_DEVICE_POOL_ENABLED` | Pool on/off | `true` |
| `MOBILE_DEVICE_ACQUIRE_TIMEOUT_MS` | Timeout acquire | `60000` |
| `MOBILE_IMPLICIT_WAIT_MS` | Implicit wait | `5000` |
| `MOBILE_SNAPSHOT_MAX_ELEMENTS` | Cap snapshot | `100` |
| `MOBILE_RECORD_VIDEO` | Rekam mobile | `true` |
| `MOBILE_RECORD_TIME_LIMIT_SEC` | Batas detik | `600` |
| `MOBILE_RECORD_FPS` / `BIT_RATE` | Kualitas | `20` / `4000000` |
| `MOBILE_VIDEO_FILENAME` | Nama file single | `recording.mp4` |
| `MOBILE_DEVICES_POLL_MS` | Poll SSE devices | `3000` |
| `MOBILE_PACKAGES_CACHE_TTL_MS` | Cache packages | `60000` |
| `MOBILE_MEMORY_DIR` | Memory mobile | `memory/mobile` |
| `MOBILE_UPLOAD_DIR` / `MAX_BYTES` | Upload device | `storage/mobile-uploads` / `52428800` |

---

## 2. Frontend (`apps/frontend/.env`)

| Variabel | Deskripsi | Default |
|----------|-----------|---------|
| `VITE_DEV_PORT` | Port Vite | `3000` |
| `VITE_BACKEND_HOST` / `PORT` | Proxy `/api` | `localhost` / `3080` |
| `VITE_WS_HOST` / `PORT` | Default panel koneksi | `localhost` / `3080` |
| `VITE_DEFAULT_CHANNEL` | Channel WS | `automation-default` |

Di Docker production, WS memakai same-origin nginx — `VITE_WS_*` tidak dipakai di browser.

---

## 3. Docker khusus

`docker.env` + root `.env`:

- MCP compiled: `AUTOMATION_MCP_COMMAND=node`, path `dist/…/mcp-stdio-server.js`
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`
- `AUTOMATION_HEADLESS=true`
- `APPIUM_SERVER_URL=http://appium:4723`
- Appium: `ADB_CONNECT_TARGETS` (bukan `ADB_SERVER_SOCKET` di dalam proses Appium)

Lihat [docker.md](docker.md).
