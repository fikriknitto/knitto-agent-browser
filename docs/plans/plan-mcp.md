# Rencana MCP Target — `browser_*` / `mobile_*` (`MCP`)

> **Plan ID:** `MCP`  
> **Depends on:** `ARCH` ([plan-architecture.md](plan-architecture.md))  
> **Unlocks:** tools untuk `AGENT`; memory tool storage → `API-DATA` setelah migrasi  
> **Related:** `AGENT` ([plan-agent-runtime.md](plan-agent-runtime.md)) · `MEDIA` · `ROADMAP` ([plan-roadmap.md](plan-roadmap.md))

Dokumen ini adalah **keputusan target** untuk katalog MCP: naming setara per platform, update katalog tool, engine **Playwright**, dan strategi hemat token.

As-is: [mcp.md](../mcp.md), [architecture.md](../architecture.md).  
Deploy: `ARCH`. Agent yang memanggil tools: `AGENT`.

> **Fase dokumen:** keputusan naming/katalog + token. Kode belum diganti di sini.  
> **Urutan:** [plan-roadmap.md](plan-roadmap.md) W5 (paralel `AGENT` OK).

---

## 1. Ringkasan eksekutif

MCP = cara AI agent di **Automation Worker** memanggil tangan otomasi. Ada **dua server setara**:

| Server | Prefix tool target | Engine |
|---|---|---|
| Browser | **`browser_*`** | **Playwright** (`recordVideo` + ffmpeg) |
| Mobile | **`mobile_*`** | Appium (tetap) |

Fokus plan ini:

1. Hapus prefix **`automation_*`** (ambigu, tidak setara dengan `mobile_*`) → **`browser_*`**.
2. **Update tool**: parity stdio/in-process, deskripsi lebih ketat, default snapshot hemat token.
3. **Hemat token**: snapshot terbatas, assert, cap tool calls, jangan gelembungkan katalog.

Katalog tetap **custom QA** (assert, memory, segment multi-TC) — tidak diganti katalog generik lebar.

---

## 2. Keputusan naming & engine

| Keputusan | Ya / Tidak | Keterangan |
|---|---|---|
| Prefix browser = **`browser_*`** | **Ya** | Setara platform dengan mobile |
| Prefix mobile = **`mobile_*`** | **Ya** | Tetap |
| Prefix **`automation_*`** di target | **Tidak** | Ambigu; diganti `browser_*` |
| Engine browser = **Playwright** | **Ya** | Session, locator, recording di Worker |
| Gelembungkan katalog (tabs, network dump, PDF, `evaluate` bebas, vision default) | **Tidak** | Boros schema + output; di luar kontrak QA inti |
| Folder kode `src/automation/` wajib rename bersamaan | **Tidak** (fase belakangan) | Yang wajib dulu: **nama tool** yang dilihat agent |

### Istilah

| Nama | Arti |
|---|---|
| **Browser MCP** | Server tool `browser_*` |
| **Mobile MCP** | Server tool `mobile_*` |
| **Engine** | Playwright (browser) / Appium (mobile) di Worker |

---

## 3. Katalog target

### 3.1 Browser — `browser_*` (20 tool)

| Tool target | Fungsi ringkas |
|---|---|
| `browser_get_app_memory` | Baca memory web |
| `browser_update_app_memory` | Tulis/update memory (prefer upsert section) |
| `browser_navigate` | Buka URL |
| `browser_get_page_snapshot` | Snapshot a11y + ref (`e12`, …) |
| `browser_click` | Klik via semantic locator / ref |
| `browser_click_at` | Klik koordinat (x, y) |
| `browser_fill` | Isi input |
| `browser_assert_text` | Assert teks (contains / exact / regex) |
| `browser_assert_visible` | Assert elemen terlihat |
| `browser_take_screenshot` | Screenshot PNG (evidence) |
| `browser_scroll` | Scroll halaman / ke elemen |
| `browser_press_key` | Kirim key |
| `browser_hover` | Hover |
| `browser_select_option` | Pilih opsi select/combo |
| `browser_wait_for` | Tunggu locator / teks / timeout |
| `browser_go_back` | History back |
| `browser_go_forward` | History forward |
| `browser_upload_file` | Upload file ke input |
| `browser_close_browser` | Tutup sesi browser |
| `browser_stop_test_case_segment` | Stop segmen video multi-TC |

Locator: ref snapshot, `role`+`name`, label/placeholder/teks — pola sama as-is.

### 3.2 Mobile — `mobile_*` (16 tool, nama tidak berubah)

| Tool | Fungsi ringkas |
|---|---|
| `mobile_launch_app` | Launch / activate app |
| `mobile_get_screen_snapshot` | Snapshot UI + ref |
| `mobile_tap` | Tap via locator / ref |
| `mobile_tap_at` | Tap koordinat |
| `mobile_scroll` | Scroll / swipe |
| `mobile_input_text` | Isi input |
| `mobile_take_screenshot` | Screenshot PNG |
| `mobile_upload_file` | Push file + set path input |
| `mobile_get_app_memory` | Baca memory mobile |
| `mobile_update_app_memory` | Update memory mobile |
| `mobile_press_key` | BACK, HOME, ENTER, TAB, DEL, MENU |
| `mobile_assert_visible` | Assert terlihat |
| `mobile_wait_for` | Tunggu kondisi |
| `mobile_close_app` | Terminate app; session hidup |
| `mobile_close_session` | Tutup Appium + release pool |
| `mobile_stop_test_case_segment` | Stop segmen video multi-TC |

Close single-TC: `mobile_close_app` → `mobile_close_session`. Multi-TC: orchestrator yang menutup — lihat [hybrid.md](../hybrid.md).

### 3.3 Banding setara (setelah rename)

| Area | Browser | Mobile |
|---|---|---|
| Buka konteks | `browser_navigate` | `mobile_launch_app` |
| Snapshot | `browser_get_page_snapshot` | `mobile_get_screen_snapshot` |
| Interaksi | click / fill / select / hover | tap / input_text / scroll |
| Assert | text + visible | visible |
| History | `browser_go_back` / `go_forward` | `mobile_press_key` BACK |
| Tutup | `browser_close_browser` | `close_app` lalu `close_session` |
| Segment | `browser_stop_test_case_segment` | `mobile_stop_test_case_segment` |
| Memory | `browser_*_app_memory` | `mobile_*_app_memory` |

Hybrid: agent memakai **kedua** set sesuai platform TC — tetap dua server MCP, bukan satu server gabungan.

---

## 4. Mapping as-is → target

| As-is (`automation_*`) | Target (`browser_*`) |
|---|---|
| `automation_get_app_memory` | `browser_get_app_memory` |
| `automation_update_app_memory` | `browser_update_app_memory` |
| `automation_navigate` | `browser_navigate` |
| `automation_get_page_snapshot` | `browser_get_page_snapshot` |
| `automation_click` | `browser_click` |
| `automation_click_at` | `browser_click_at` |
| `automation_fill` | `browser_fill` |
| `automation_assert_text` | `browser_assert_text` |
| `automation_assert_visible` | `browser_assert_visible` |
| `automation_take_screenshot` | `browser_take_screenshot` |
| `automation_scroll` | `browser_scroll` |
| `automation_press_key` | `browser_press_key` |
| `automation_hover` | `browser_hover` |
| `automation_select_option` | `browser_select_option` |
| `automation_wait_for` | `browser_wait_for` |
| `automation_go_back` | `browser_go_back` |
| `automation_go_forward` | `browser_go_forward` |
| `automation_upload_file` | `browser_upload_file` |
| `automation_close_browser` | `browser_close_browser` |
| `automation_stop_test_case_segment` | `browser_stop_test_case_segment` |

`mobile_*`: **identity mapping** (nama sama).

---

## 5. Engine & update tool

### 5.1 Engine (tetap)

| Lapisan | Keputusan |
|---|---|
| Browser | **Playwright** di `platforms/browser/driver/*` |
| Video | Playwright `recordVideo` (+ ffmpeg 1.5×) — single `recording.mp4` per job/mission (bukan per-TC) |
| Mobile | Appium — tidak berubah di plan ini |
| Nama tool ke agent | **`browser_*`** / **`mobile_*`** setelah cutover |

### 5.2 Update katalog tool (verdict)

| Item | Target |
|---|---|
| Rename publik | `automation_*` → `browser_*`; `mobile_*` tetap |
| Parity transport | **Stdio (Cursor) dan in-process (OpenAI-compatible / knitto-agent)** mendaftarkan **set tool yang sama** — hilangkan drift (contoh as-is: `stop_test_case_segment` kadang hilang di in-process) |
| Deskripsi tool | Pendek, eksplisit **kapan dipakai / kapan jangan** (hemat token schema + kurangi call salah) |
| Default snapshot browser | `interactiveOnly=true`, `maxDepth=6`, `maxElements=200` (selaras schema as-is) — enforce di handler & dokumentasikan di prompt bridge |
| Screenshot | Hanya evidence / visual proof — **bukan** pengganti snapshot untuk “mengerti UI” |
| Tool QA wajib | `assert_*`, `*_app_memory`, `*_stop_test_case_segment`, upload terikat storage/job |
| Jangan tambah default | Tool generik lebar (manajemen tab massal, dump network, PDF, eksekusi JS bebas, vision sebagai default “lihat halaman”) |
| Memory | Agent: baca/update **section relevan**; persist ke **API Data** setelah migrasi data ([plan-architecture.md](plan-architecture.md)) |

Filosofi interaksi tetap: **snapshot → ref / locator semantik → aksi** (bukan CSS selector sebagai jalur utama).

---

## 6. Strategi hemat token

Token terbesar biasanya dari **isi snapshot + history percakapan + jumlah tool call**, lalu **screenshot/vision**, lalu **definisi schema tool**.

### 6.1 Sumber biaya

| Sumber | Dampak | Mitigasi |
|---|---|---|
| Hasil `*_get_*_snapshot` | Sangat besar tiap step | Default ketat; jangan minta tree penuh tanpa perlu |
| Screenshot ke model (vision) | Sangat besar | Jangan pakai untuk reasoning rutin |
| Banyak tool call / retry | Sangat besar | Assert + `wait_for` + cap concurrent tools |
| Definisi 20+16 tool | Sedang (tiap request tool-enabled) | Deskripsi pendek; jangan tambah tool spekulatif |
| Memory dump penuh | Besar | Section / upsert; batasi ukuran yang di-inject ke prompt |

### 6.2 Aturan operasional (agent / prompt / bridge)

1. **Lihat UI** → `browser_get_page_snapshot` / `mobile_get_screen_snapshot` dulu.  
2. **Jangan spam** `*_take_screenshot` untuk “cek keadaan”.  
3. Selesai cek kondisi → **`assert_*`** (sering lebih murah daripada 2–3 round trip snapshot).  
4. Hormati **`KNITTO_BRIDGE_MAX_TOOL_CALLS`** dan timeout job.  
5. Hybrid: **muat / expose hanya server tool yang dibutuhkan platform TC** bila memungkinkan (browser-only job tidak perlu katalog mobile penuh di context, dan sebaliknya).  
6. Prompt bridge: sebutkan default snapshot dan larangan close di multi-TC (orchestrator yang menutup).

### 6.3 Metrik sukses (kualitatif)

- Rata-rata **jumlah tool call** per job turun atau stabil tanpa naik flop.  
- Ukuran payload snapshot tipikal tidak membengkak (hormati `maxElements`).  
- Tidak ada drift “tool ada di stdio tapi tidak di in-process”.

---

## 7. Kepemilikan vs arsitektur

Selaras `ARCH` ([plan-architecture.md](plan-architecture.md)):

| Concern | Di mana |
|---|---|
| Eksekusi MCP / Playwright / Appium | **Automation Worker** (mesin QA) |
| Persist memory / evidence / shortcuts | **API Data** — `API-DATA` + `MEDIA` |
| Tool `*_get/update_app_memory` | Tetap di MCP (API agent); **storage** di API Data setelah migrasi |
| Start Appium / browser | **Knitto QA Client** (`ELECTRON`) menghidupkan runtime; tool menutup sesi lewat `browser_close_*` / `mobile_close_*` |
| Upload file dari library | Resolve `mediaId` → temp — lihat `MEDIA` |

API Data **tidak** menjalankan MCP tools.

---

## 8. Non-goals

- Tidak mempertahankan `automation_*` sebagai nama publik target.  
- Tidak menggelembungkan katalog dengan tool generik di luar kebutuhan QA inti.  
- Tidak menggabungkan browser+mobile jadi satu prefix.  
- Tidak memindahkan driver ke API Data.  
- Tidak menganggap rename folder `automation/` wajib di fase naming tool pertama.  
- Tidak menulis ulang [mcp.md](../mcp.md) sampai cutover kode.

---

## 9. Fase migrasi

Indeks: [plan-roadmap.md](plan-roadmap.md). Coupling: dual-register sebelum cutover `AGENT` prompt.

| Fase | Hasil | Selesai jika |
|---|---|---|
| **0. Align** | Dokumen ini disetujui | Istilah `browser_*` / `mobile_*` + Playwright dipakai seragam |
| **1. Dual-register (singkat)** | Alias `automation_*` → handler sama dengan `browser_*` | Job lama & baru jalan |
| **2. Cutover agent** | Prompt/bridge/docs internal hanya `browser_*` | Tidak ada tool call `automation_*` di job baru |
| **3. Hapus alias** | Hanya `browser_*` + `mobile_*` di stdio + in-process | Drift nama hilang |
| **4. Docs as-is** | Update [mcp.md](../mcp.md), [architecture.md](../architecture.md), [browser.md](../browser.md) | Docs = target naming |
| **5. Harden token & katalog** | Default snapshot di-enforce; deskripsi tool diperketat; parity stdio/in-process; prompt bridge diselaraskan | Metrik §6.3 terpenuhi secara kasar |

In-process vs stdio harus ikut rename di fase 1–3.

---

## 10. Keputusan ringkas

| Pertanyaan | Jawaban |
|---|---|
| Prefix browser target? | **`browser_*`** |
| Prefix mobile target? | **`mobile_*`** |
| `automation_*`? | **Dihapus** (ambigu, tidak setara) |
| Engine browser? | **Playwright** |
| Update tool inti? | Rename + parity transport + deskripsi ketat + default snapshot hemat |
| Hemat token utama? | Snapshot terbatas + assert + jangan spam screenshot + cap tool calls + katalog lean |
| As-is dibaca di mana? | [mcp.md](../mcp.md) sampai cutover |
| Di mana tool jalan? | **Worker** ([plan-architecture.md](plan-architecture.md)) |
