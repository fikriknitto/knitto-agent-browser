# Knitto Agent Automation

---

## Pendahuluan

Dokumen ini mendefinisikan fitur utama **Knitto Agent Automation**. Setiap fitur mencakup deskripsi, user story, kebutuhan fungsional, dan catatan teknis. Menjadi kontrak antara kebutuhan QA dan implementasi.

---

## Tujuan Dokumen

- Definisi fitur yang jelas sebelum / saat implementasi
- Dasar estimasi dan prioritisasi
- Referensi untuk QA membuat test case manual / regresi

---

## Ruang Lingkup

1. [Web UI & koneksi](#1-web-ui--koneksi)
2. [AI bridges](#2-ai-bridges)
3. [Browser automation](#3-browser-automation)
4. [Mobile automation](#4-mobile-automation)
5. [Hybrid multi test case](#5-hybrid-multi-test-case)
6. [Prompt shortcuts](#6-prompt-shortcuts)
7. [Agent memory](#7-agent-memory)
8. [Evidence (screenshot & video)](#8-evidence-screenshot--video)
9. [File manager & lampiran](#9-file-manager--lampiran)
10. [Docker deployment](#10-docker-deployment)

---



## 1. Web UI & koneksi


### Deskripsi

UI React untuk menghubungkan ke backend, mengelola credentials, menulis prompt, dan memantau hasil job (chat, screenshot, video).

### User Story

- **Sebagai** QA, **saya ingin** connect ke backend lalu kirim prompt, **sehingga** saya bisa menjalankan automation tanpa CLI.



### Kebutuhan fungsional

- Panel host / port / channel + Connect
- Simpan credentials bridge
- Pilih platform Browser / Mobile / Hybrid
- Streaming progress via WebSocket
- Tampilkan artefact media per job / per TC



### Catatan teknis

Frontend: `apps/frontend`. Proxy Vite `/api` + `/ws` ke backend. Docker: nginx same-origin.

---



## 2. AI bridges



### Deskripsi

Tiga channel agent: **Gemini**, **Cursor**, **9Router**, masing-masing memanggil tool automation (browser/mobile MCP).

### User Story

- **Sebagai** tim, **saya ingin** memilih bridge sesuai ketersediaan API key / kebijakan, **sehingga** automation tetap jalan.



### Kebutuhan fungsional

- List bridges + models via API
- Credentials dari UI atau env
- Batas concurrent job / timeout / max tool calls (env)



### Catatan teknis

Cursor memakai MCP **stdio subprocess**; Gemini/9Router **in-process**. Lihat [mcp.md](mcp.md).

---



## 3. Browser automation



### Deskripsi

Otomasi Chromium via Playwright dengan locator semantik (snapshot ref, role+name, teks).

### User Story

- **Sebagai** QA CMS, **saya ingin** agent mengklik tombol berdasarkan nama yang terlihat, **sehingga** selector CSS rapuh tidak wajib.



### Kebutuhan fungsional

- Navigate, snapshot, click, fill, scroll, upload, assert, wait
- Memory web + close browser di akhir (single-TC) / orchestrator (multi-TC)
- Video + screenshot



### Catatan teknis

[browser.md](browser.md).

---



## 4. Mobile automation



### Deskripsi

Otomasi Android via Appium UiAutomator2 + ADB: launch app, tap, scroll, snapshot, upload, force-stop.

### User Story

- **Sebagai** QA mobile, **saya ingin** pilih device + package di UI lalu jalankan prompt, **sehingga** tidak perlu menulis script Appium manual.



### Kebutuhan fungsional

- SSE daftar device; paket per UDID
- Device pool (Auto / pinned UDID)
- Appium host global atau Docker service
- Memory di `memory/mobile/`



### Catatan teknis

[mobile.md](mobile.md), [docker.md](docker.md).

---



## 5. Hybrid multi test case



### Deskripsi

Satu prompt berisi beberapa `## Test Case N` lintas browser dan/atau mobile. Orchestrator menjalankan berurutan; 1 TC = 1 video; handoff antar TC.

### User Story

- **Sebagai** QA, **saya ingin** satu prompt: ambil order di CMS lalu verifikasi di app, **sehingga** alur end-to-end terdokumentasi satu kali jalan.



### Kebutuhan fungsional

- Max 5 TC; max 5 shortcut per TC
- Platform resolve + `App:` / package fallback
- `[HANDOFF] KEY=value`
- Close guard — platform ditutup sekali di akhir job
- UI: stack hasil per TC



### Catatan teknis

[hybrid.md](hybrid.md) — termasuk [contoh prompt multi-TC](hybrid.md#7-contoh-prompt).

---



## 6. Prompt shortcuts



### Deskripsi

Template Markdown di `prompt-shortcuts/` dengan label, platform, URL/appPackage, variabel `{nama}`.

### Kebutuhan fungsional

- List via `/api/shortcuts`
- Inject ke prompt TC / composer
- Bind-mount ke Docker (`./prompt-shortcuts`)

---



## 7. Agent memory



### Deskripsi

Pengetahuan navigasi / locator hints per app ID. Browser: `memory/`; mobile: `memory/mobile/`.

**Dual format (FLOW-REPLAY):** section memory bisa berisi catatan QA (markdown) + blok ` ```playbook ` (JSON eksekusi). Jika precondition cocok, orchestrator replay tool MCP tanpa loop LLM; jika beda, agent explore ulang. Lihat [plans/plan-flow-replay.md](plans/plan-flow-replay.md).

### Kebutuhan fungsional

- Get / update via tools
- Prefer `upsert_section` + `sectionKey` (body section diganti; mode `append` sudah dihapus)
- Upsert hanya mempertahankan section `## [key]`; heading lama tanpa key dibuang saat rewrite (anti-duplikat)
- Browser appId dari URL: hostname; bila host IPv4 + port → `192.168.20.27:5420` (file `192.168.20.27-5420.md`); prompt job menyuntikkan appId ini agar agent tidak invent nama produk
- Mobile appId = `appPackage` → `memory/mobile/{package}.md`
- Editable di Settings → Memory (UI)

---



## 8. Evidence (screenshot & video)



### Deskripsi

Bukti visual disimpan di `screenshoot/agents/{jobId}/`.


| Mode       | File                                        |
| ---------- | ------------------------------------------- |
| Single job | `recording.mp4` + PNG                       |
| Multi-TC   | `tc-01.mp4`, `tc-02.mp4`, … + `tc-01-*.png` |


Matikan: `AUTOMATION_RECORD_VIDEO=false` / `MOBILE_RECORD_VIDEO=false`.

---



## 9. File manager & lampiran



### Deskripsi

Manajemen file lokal di `storage/` untuk lampiran prompt (maks. 4).

### Kebutuhan fungsional

- Upload, folder, rename, delete, preview
- Path relatif dikirim ke agent (`automation_upload_file` / mobile upload)

---



## 10. Docker deployment



### Deskripsi

Compose: Appium + backend + frontend. Emulator tetap di host.

### Kebutuhan fungsional

- Health dependency Appium → backend → frontend
- Dual ADB path (`ADB_CONNECT_TARGETS` vs `ADB_SERVER_SOCKET`)
- Persist storage/screenshoot (volume); memory & shortcuts (bind)



### Catatan teknis

[docker.md](docker.md).