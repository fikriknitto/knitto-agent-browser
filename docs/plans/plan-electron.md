# Plan Electron — Knitto QA Client (`ELECTRON`)

> **Plan ID:** `ELECTRON`  
> **Depends on:** `ARCH` ([plan-architecture.md](plan-architecture.md)), `JOB`, `AUTH`, `MEDIA`, Worker stabil (`AGENT` + `MCP`), harden Worker — lihat wave **W2–W7**  
> **Unlocks:** distribusi QA non-teknis (installer + Start/Stop)  
> **Related:** `ROADMAP` ([plan-roadmap.md](plan-roadmap.md)), [TODO.md](TODO.md) **W8**  
> **Status wave:** **BLOCKED (W8 — planning only).** Jangan mulai shell/installer sampai W7 selesai. Hanya update dokumen planning diizinkan.

Keputusan produk “pakai Electron” ada di `ARCH` §4.  
Dokumen ini = **rencana teknis packaging** — dikerjakan **setelah** Worker + data path + harden stabil (`ARCH` / `ROADMAP` non-goal: jangan bundling dulu).

---

## 1. Lingkup

| Termasuk | Tidak (di plan lain) |
|---|---|
| Installer Windows, Start/Stop, health UI | Topologi BE/Worker (`ARCH`) |
| Spawn/cek Appium + Worker | Katalog MCP (`MCP`) |
| Auto-update, signing, antivirus allowlist | Isi agent runtime (`AGENT`) |
| Safe storage secrets | Kontrak API (`AUTH`, `API-DATA`) |

---

## 2. Tanggung jawab proses

| Proses | Dihidupkan oleh |
|---|---|
| Electron main + renderer (UI) | User buka app |
| Automation Worker | Tombol **Start** |
| Appium | Start (spawn/cek) |
| Emulator (BlueStacks dll.) | IT / user; Client hanya wizard status |

---

## 3. Versioning

| Artefak | Aturan |
|---|---|
| Client semver | Tampil di About |
| Worker semver | Bundle atau side-by-side; Client cek min version |
| API Data | Client/Worker tolak major incompatible (header/version endpoint opsional) |

Matrix smoke: Client N ↔ Worker N ↔ API M — dikunci di checklist release.

---

## 4. Packaging (draft teknis)

1. Electron builder (Windows NSIS/MSI).  
2. Code signing + instruksi IT allowlist.  
3. Bundle atau installer-chain: Node Worker build, Appium runtime, ffmpeg bila perlu video.  
4. **Jangan** bundle BlueStacks (lisensi/ukuran) — golden image IT.  
5. Channel update: internal URL / GitHub Releases private.

---

## 5. Fase

| Fase | Selesai jika |
|---|---|
| 0. Prasyarat | **W2–W7** selesai (Job E2E + media + history W4 + memory/agent/harden); Worker non-Electron |
| 1. Shell Start/Stop | Worker+Appium hidup dari main process |
| 2. UI cutover | Renderer = FE produk (bukan dev `pnpm` wajib) |
| 3. Installer signed | QA install tanpa CLI |
| 4. Auto-update | Patch Worker/Client tanpa reinstall penuh (ideal) |

---

## 6. Non-goals

- Mengganti Appium dengan “murni Electron”.  
- Device farm.  
- Menjalankan Playwright di tab Chromium biasa.  
- Memulai implementasi sebelum wave **W8** di-unblock (setelah W7).
