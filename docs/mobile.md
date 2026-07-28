# Otomasi Mobile (Android)

---

## Pendahuluan

Dokumen ini menjelaskan otomasi **Android** via Appium UiAutomator2, WebdriverIO client di backend, ADB device pool, dan rekaman layar.

---

## Tujuan Dokumen

- Menjelaskan session Appium dan capabilities
- Memisahkan jalur ADB untuk UI vs Appium (terutama Docker)
- Acuan menambah tool `mobile_*`

---

## Ruang Lingkup

Mencakup: capabilities, session, device pool, tools, recording, host vs Docker Appium.

Tidak mencakup Compose detail (`docker.md`) atau hybrid (`hybrid.md`).

---

## 1. Komponen

| Komponen | Path |
|----------|------|
| Session / caps | `platforms/mobile/driver/` |
| Tools | `platforms/mobile/tools/` |
| Cleanup ADB/state | `mobile-session-cleanup.ts` |
| MCP stdio | `mobile-automation/mcp-stdio-server.ts` |

---

## 2. Capabilities ringkas

Dari `buildAndroidCapabilities`:

- `platformName: Android`, `automationName: UiAutomator2`
- `appPackage` (+ opsional `appActivity`)
- `noReset: true`, `autoGrantPermissions: true`
- `udid` dari pool / config

**Catatan:** membuat session Appium dengan `appPackage` biasanya **meluncurkan app** (autoLaunch default).

---

## 3. Host setup

Appium **tidak** di-bundle di monorepo. Di host:

```bash
npm i -g appium@3.1.0
appium driver install uiautomator2@4.2.3
# set ANDROID_HOME (User env) — terminal yang sudah terbuka sebelum setx tidak otomatis dapat nilai baru.
# Dari repo: pnpm appium  (script set ANDROID_HOME lalu start Appium)
# Atau manual: export ANDROID_HOME / ANDROID_SDK_ROOT lalu appium ...
appium --address 127.0.0.1 --port 4723 --relaxed-security --allow-insecure adb_shell
```

Backend: `APPIUM_SERVER_URL=http://127.0.0.1:4723`.

BlueStacks (Windows): `pnpm instances:up` / scripts di `scripts/bluestacks/`.

---

## 4. Device pool & UI

- `GET /api/mobile/devices` + SSE `/stream`
- Package list per UDID
- Pool acquire/release per `jobId`
- **Health check saat acquire**: sebelum device diserahkan ke job, `device-pool.ts` reservasi dulu (`markBusy`, sinkron — tidak ada race antar job) lalu ping `adb shell echo ok` (`pingDevice`, timeout 5s terpisah dari timeout ADB umum 30s). Device yang muncul "device" di `adb devices` tapi tidak merespons shell (gejala umum BlueStacks) di-reject, bukan diserahkan ke job lalu baru ketahuan rusak setelah sesi jalan.

---

## 5. Tools utama

Daftar lengkap terdaftar di MCP: [mcp.md §3](mcp.md#3-mobile-mcp--tools-terdaftar).

Ringkas: `mobile_launch_app`, snapshot, tap, scroll, input, screenshot, upload, assert, wait, memory, `mobile_close_app` (terminateApp), `mobile_close_session` (deleteSession + release).

**Flow replay:** playbook mobile di memory section (`platform: "mobile"`, precondition `package` / `activityIncludes`). Lihat [plans/plan-flow-replay.md](plans/plan-flow-replay.md).

Urutan single-TC: **close_app → close_session**.

---

## 6. Recording

Appium `startRecordingScreen` / `stopRecordingScreen` → `recording.mp4` atau segment `tc-XX.mp4`.

Flag: `MOBILE_RECORD_VIDEO` (default true).

---

## 7. Cleanup Cursor (tanpa relaunch)

End-of-job cleanup spawn MCP dengan `FORCE_CLOSE=1` **dan** `MOBILE_MULTI_TC=1` agar close guard terbuka tetapi **early `createSession` di-skip**. App di-force-stop lewat state/ADB tanpa membuat session Appium baru yang akan me-launch `appPackage` lagi.

Detail: [mcp.md](mcp.md) § Cursor stdio.

---

## 8. Stabilitas & recovery (BlueStacks)

BlueStacks lebih rapuh untuk UiAutomator2 dibanding AVD/device fisik (bukan target resmi Appium). Tiga lapis mitigasi di `driver/session.ts`:

| Gejala | Mitigasi |
|--------|----------|
| Device ADB "offline" (`state: offline`) saat `createSession` | `tryRecoverOfflineDevice`: `adb kill-server` → `start-server` → `reconnect offline`, plus `disconnect`/`connect` eksplisit untuk udid `host:port` (BlueStacks) |
| UiAutomator2 instrumentation crash di tengah sesi (`instrumentation process is not running`, dll.) | `withInstrumentationRecovery`: setiap tool call (tap, snapshot, scroll, input, screenshot, launch, wait) lewat wrapper ini — kalau errornya cocok pola crash, sesi Appium di-buang & dibuat ulang di device yang sama (device **tidak** dilepas ke pool), lalu operasi di-retry sekali |
| Device "device" di ADB tapi shell tidak merespons (lihat troubleshooting.md) | Health check `pingDevice` di device pool (§4) — device di-reject sebelum diserahkan ke job, bukan gagal di tengah sesi |

Semua jalur ini logging ke `[mobile-session]` / `[device-pool]` (level `warn` saat recovery terpicu). Cek log itu dulu sebelum menyimpulkan bug baru.

Capability tambahan di `capabilities.ts` untuk kurangi kemungkinan crash: `uiautomator2ServerLaunchTimeout`/`uiautomator2ServerInstallTimeout` (60s), `adbExecTimeout` (60s), `disableWindowAnimation: true`.

**Bukan bug kode — cek dulu manual kalau masih gagal setelah restart backend:**
- Setting **Android Debug Bridge** di dalam Android BlueStacks bisa ter-reset setelah update BlueStacks (device terlihat "device" tapi semua `adb shell` gagal `error: closed`) — restart adb server **tidak** memperbaiki ini, harus toggle manual di Settings Android-nya.
- RAM sistem — BlueStacks + Appium + `pnpm dev` + Cursor SDK job bisa memicu OOM diam-diam (proses mati tanpa error di log) di mesin dengan RAM terbatas; pastikan beberapa GB free sebelum test mobile.
