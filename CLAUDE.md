# CLAUDE.md

Panduan cepat untuk AI agent yang bekerja di repo ini. Dokumentasi lengkap ada di [docs/README.md](docs/README.md) — baca itu dulu untuk konteks arsitektur/fitur sebelum mengubah kode. File ini isinya hal-hal operasional yang **tidak** kelihatan cuma dari baca kode, biar tidak perlu re-discover lewat trial-and-error.

## Ringkasan

Monorepo Turborepo + pnpm: React frontend (`apps/frontend`, knitto-react-template) + Express backend, otomasi browser (Playwright) dan Android (Appium) via AI agent (Cursor/OpenAI-compatible) + MCP tools. Detail: [docs/system.md](docs/system.md). App FE lama sementara di `apps/frontend-legacy` — lihat [docs/frontend.md](docs/frontend.md).

## Menjalankan & memverifikasi

- `pnpm dev` menjalankan frontend (`:3000`) + backend (`:3080`) — **tidak** menyalakan Appium atau emulator.
- Mobile automation butuh Appium terpisah (`appium --address 127.0.0.1 --port 4723 --relaxed-security --allow-insecure adb_shell`) dan device/emulator yang sudah `adb connect`-ed. Lihat [docs/mobile.md](docs/mobile.md).
- **Jangan asumsikan `adb devices` yang menampilkan "device" berarti device benar-benar sehat** — device bisa listed tapi menolak `adb shell` (lihat gotcha BlueStacks di bawah). Verifikasi dengan `adb shell echo ok`.
- Sebelum menjalankan test mobile end-to-end (BlueStacks + Appium + `pnpm dev` + job Cursor bersamaan), cek RAM bebas (`Get-CimInstance Win32_OperatingSystem` di PowerShell) — idealnya beberapa GB free. Kombinasi ini bisa memicu OOM yang mematikan proses **tanpa error di log**.
- Backend log dari `pnpm dev` yang di-redirect ke file lewat shell tool sering **buffered** (tidak real-time) — jangan andalkan `tail` file log untuk memantau progres job yang sedang berjalan; cek status lewat UI atau `curl :3080/api/health`.

## Gotcha BlueStacks (Windows)

BlueStacks bukan target resmi UiAutomator2 — lebih rapuh dari AVD/device fisik. Kalau otomasi mobile gagal aneh setelah update BlueStacks atau device terlihat "device" di `adb devices` tapi semua `adb shell` gagal (`error: closed`):

1. **Bukan bug kode.** Ini biasanya setting **Android Debug Bridge** di dalam Settings Android BlueStacks (bukan setting BlueStacks itu sendiri) yang ter-reset. Restart adb server tidak memperbaiki ini — harus toggle manual di dalam UI Android-nya.
2. Backend punya recovery otomatis untuk instrumentation crash & device offline (`apps/backend/src/platforms/mobile/driver/session.ts`, `device-pool.ts`) — cek log `[mobile-session]` / `[device-pool]` dulu sebelum menyimpulkan ada bug baru.
3. Kalau job mobile via Cursor gagal dengan pesan "MCP server `mobile` tidak ada" / "`mcp_auth` ditolak" — itu **hampir selalu** gejala device/ADB putus di tengah run, bukan masalah konfigurasi Cursor SDK.

Detail lengkap & tabel gejala: [docs/mobile.md](docs/mobile.md) §8 "Stabilitas & recovery", [docs/troubleshooting.md](docs/troubleshooting.md).

## Konvensi kode

Ikuti [README root § Prinsip Pengembangan](README.md#prinsip-pengembangan): shared contracts di `@knitto/shared`, automation lewat MCP tools berschema (bukan script ad-hoc), isolasi platform browser/mobile, evidence (screenshot+video) default-on. Tidak ada test suite penuh — hanya unit test bertarget di area rapuh (segment/cleanup/reconnect state, lihat `**/*.test.ts`); jalankan `pnpm --filter @knitto/backend test` setelah mengubah area itu.

## Sebelum melapor "berhasil" pada perubahan mobile automation

Jalankan end-to-end lewat UI sungguhan (bukan cuma typecheck/build) kalau perubahan menyentuh `platforms/mobile/`. Typecheck yang hijau tidak menjamin device/Appium/BlueStacks-nya bekerja — banyak kegagalan di area ini murni infrastruktur (BlueStacks/ADB/RAM), bukan kena dari test otomatis.
