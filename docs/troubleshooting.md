# Gejala & Solusi

---

## Pendahuluan

Katalog masalah umum saat development lokal dan Docker untuk Knitto Agent Automation.

---

## Tujuan Dokumen

- Mempercepat diagnosis QA/dev
- Menghindari duplikasi tabel panjang di README

---

## Ruang Lingkup

Gejala operasional. Jika app mobile masih relaunch setelah job: pastikan backend memuat patch cleanup `FORCE_CLOSE` + `MULTI_TC` (lihat [mcp.md](mcp.md) / [mobile.md](mobile.md)).

---

## Tabel

| Gejala | Penyebab umum | Solusi |
|--------|---------------|--------|
| `ECONNREFUSED` pada `/api/*` saat `pnpm dev` | Backend belum listen / port salah | Samakan port di `apps/backend` & `apps/frontend` `.env` |
| `PATCH`/`DELETE` file-manager **404** | Proses backend lama | Restart backend / `pnpm build:backend` |
| Video tidak muncul, refresh baru ada | ffmpeg masih menulis | Retry UI; restart backend jika versi lama |
| Video browser hitam penuh (Windows) | `AUTOMATION_HEADLESS=true` | Set `false`; pastikan navigate sebelum segment |
| Video TC kosong | Segment gagal / Cursor split-process | Cek log segment; `.segment-state.json`; navigate/launch dulu |
| Video corrupt | ffmpeg path salah | `ffmpeg -version`; set `AUTOMATION_FFMPEG_PATH` |
| Video mission terlalu panjang / banyak diam | Rekaman kontinu selama mission | `AUTOMATION_VIDEO_TRIM_IDLE=true` + ffmpeg (`mpdecimate`); speed default `1.5`. Browser **tidak** di-reload antar-TC (satu sesi sampai mission selesai) |
| Chrome tidak tertutup setelah stop/cancel | Cleanup gagal saat multi-TC | Stop via composer Cancel; cancel mission sekarang juga memanggil `cancelJob`; cek log `[test-case-cleanup]` |
| MP4 &lt; 10 KB | Rekaman gagal / frame hitam | headless=false atau pastikan activity visible |
| Platform tetap terbuka setelah multi-TC | Close guard / FORCE_CLOSE | Restart backend terbaru; cek log `test-case-cleanup` |
| App mobile tutup lalu buka lagi setelah job | Cleanup Cursor early `createSession` (versi lama) | Restart backend terbaru (MULTI_TC + FORCE_CLOSE di cleanup spawn); cek log `skip early createSession` |
| Dropdown opsi salah | Partial match | Perjelas exact option di shortcut |
| `EADDRINUSE` | Port terpakai | Kill proses di `BACKEND_PORT` |
| Docker: `backend unhealthy` | Build/env | `docker compose up -d --build`; `logs backend` |
| Docker: Chromium tak terlihat | Headless container | Normal — pakai screenshot/video UI |
| Docker: Appium error | Port / targets | `logs appium`; `curl :4723/status`; matikan Appium host |
| Docker: device UI kosong, Appium OK | ADB hanya localhost | `adb -a nodaemon server start`; cek `ADB_SERVER_SOCKET` |
| Docker: OpenAI-compatible/LiteLLM unreachable | URL dari container | Di Web UI pakai `http://host.docker.internal:<port>` (bukan localhost) |
| Mission plan / prompt generate gagal ke LiteLLM/9Router | Base URL salah atau model tidak ada di katalog | Mission plan memakai **official `openai` SDK** (`chat.completions`); Base URL: `http://host:port` **tanpa** `/v1`; pilih model dari dropdown provider yang sama |
| Dropdown model OpenAI-compatible kosong setelah simpan credential | Katalog `GET /models` gagal | Status credential: *"Katalog model gagal dimuat — cek Base URL"*; perbaiki endpoint lalu simpan ulang credential |
| Compose build pnpm gagal | Node/pnpm mismatch | Node **24.16.0** + pnpm **11.5.2** |
| Mobile: tidak ada device di UI | ADB kosong | `adb devices`; `pnpm connect:instances` |
| Mobile: Send disabled | Package/device kosong | Pilih package; hubungkan device |
| Mobile: Appium error (lokal) | Server / `ANDROID_HOME` | Appium global + `ANDROID_HOME`; atau `pnpm docker:appium` |
| Mobile: request lambat banyak tab | Poll ADB | Naikkan `MOBILE_DEVICES_POLL_MS` |
| Mobile: device "device" di `adb devices` tapi semua `adb shell` gagal (`error: closed`) | Setting **Android Debug Bridge** di dalam Android BlueStacks ter-reset (sering setelah update BlueStacks) | Buka Settings di dalam Android BlueStacks → Advanced/Developer options → aktifkan lagi **Android Debug Bridge**; restart adb server tidak cukup |
| Mobile: `mobile_launch_app`/tool lain gagal dengan pesan "instrumentation process is not running" atau UiAutomator2 crash di tengah sesi | UiAutomator2 crash — umum di BlueStacks, jarang di AVD/device fisik | Sejak backend versi terbaru: auto-recovery sekali (lihat log `[WARN][mobile-session] Instrumentation crash detected`); kalau masih gagal, pertimbangkan AVD/device fisik dibanding BlueStacks |
| Job mobile via Cursor selesai dengan hasil "MCP server `mobile` tidak ada" / "autentikasi (`mcp_auth`) ditolak" | **Bukan** masalah kredensial/config MCP — biasanya device/ADB putus di tengah run (cek `adb devices` selama job jalan) | Pastikan device tetap online & responsif sepanjang job; cek `docs/mobile.md` untuk health check device pool |
| Backend/frontend/BlueStacks mati mendadak tanpa error di log saat job mobile mulai jalan | RAM habis (OOM) — kombinasi BlueStacks + Appium + dev stack + Cursor SDK job cukup berat, ~4GB+ free RAM disarankan | Cek `Get-CimInstance Win32_OperatingSystem` (PowerShell) untuk free RAM sebelum test; tutup app lain yang tidak perlu |
| Token usage mission run sangat tinggi (ratusan ribu–juta) | History agent membawa payload besar: screenshot base64 di tool result, snapshot 200+ elemen menumpuk, multi-TC Cursor share history | Backend terbaru: `take_screenshot` hanya kirim `path` ke LLM (evidence tetap di disk/UI); default snapshot cap 100 (`AUTOMATION_SNAPSHOT_MAX_ELEMENTS` / `MOBILE_SNAPSHOT_MAX_ELEMENTS`); Cursor agent fresh per TC; default `KNITTO_BRIDGE_MAX_TOOL_CALLS=25`. Untuk TC kompleks naikkan limit via env |
| Flow replay tidak jalan / selalu full agent | Tidak ada blok ` ```playbook ` di memory section, atau precondition tidak cocok dengan snapshot | Pastikan section TC punya playbook JSON valid; jika UI beda, agent akan explore (expected). Auto-record OpenAI path: setelah agent sukses playbook ditulis ke memory |
