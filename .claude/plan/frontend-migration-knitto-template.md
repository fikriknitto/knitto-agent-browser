# Plan Migrasi Frontend — Full Adoption knitto-react-template

Status: DRAFT — belum dieksekusi.
Strategi: **template menjadi fondasi frontend sepenuhnya** (standar perusahaan).
`apps/frontend` dibangun ulang dari https://github.com/knittotextile/knitto-react-template.git,
lalu seluruh fitur aplikasi existing di-port ke dalamnya mengikuti konvensi template.
Settings dan Run History pindah dari modal ke **sidebar** (halaman ber-route).

## 1. Prinsip

1. **Template adalah baseline, bukan referensi.** Struktur folder, konfigurasi (vite,
   eslint, prettier, vitest, husky), stack (React 18, Redux Toolkit + RTK Query,
   react-router + loadable, `@knittotextile/react-ui`, Tailwind 4), dan konvensi penamaan
   diambil dari template apa adanya. Kode lama yang tidak cocok konvensi → ditulis ulang
   mengikuti template, bukan sebaliknya.
2. **Tetap monorepo.** Frontend baru tetap `apps/frontend` dengan nama paket
   `@knitto/frontend`, anggota workspace pnpm/turbo, dan tetap memakai `@knitto/shared`
   untuk kontrak tipe dengan backend. Hanya ini penyimpangan yang diizinkan dari template
   (template aslinya repo standalone).
3. **Fitur tidak boleh hilang.** Semua kemampuan app sekarang (chat automation, WS bridge,
   evidence, app memory, prompt shortcuts, file manager, mobile devices, login API-Data)
   harus berfungsi di app baru sebelum app lama dihapus.

## 2. Konsekuensi full adoption (perubahan besar yang disetujui di depan)

| Area | Sekarang | Menjadi (standar template) |
|---|---|---|
| React | 19 | **18.3** (downgrade; tiptap v3, react-zoom-pan-pinch, react-markdown semuanya kompatibel 18) |
| Data fetching | react-query v5 + fetch manual di `lib/api/*` (10 file) | **RTK Query** — `redux/api/<domain>.ts` per domain, `_baseQuery.ts` diarahkan ke backend `:3080`; react-query DIHAPUS |
| State global | useState raksasa di App.tsx + prop drilling | **Redux Toolkit slices** (`layoutSlice`, `connectionSlice`, `automationSlice`) |
| Routing | tidak ada (satu halaman + modal) | react-router v6 + `@loadable/component` per halaman |
| UI kit | komponen custom + @base-ui/react + lucide | **`@knittotextile/react-ui`** untuk primitives (Button, ThemeToggle, dsb.); komponen custom hanya untuk yang tidak disediakan kit (chat, evidence viewer, tiptap editor) |
| Styling | Tailwind 4 custom | Tailwind 4 + token/tema template (`styles/`, navy/burnt-orange) |
| Testing | tidak ada | vitest + browser mode (pola `src/test/` template); minimal smoke untuk layout, routing, dan slice |
| Tooling | eslint minimal | eslint + prettier + husky + lint-staged persis template (husky di root monorepo sudah ada → hooks digabung, bukan didobel) |
| PWA | tidak ada | ikut template TAPI `registerSW` di-guard env dan **off secara default di dev** (cache SW mengganggu WS/backend lokal) |
| Auth | login API-Data custom (localStorage token) | pola halaman `pages/login` template, tapi **backend auth tetap API-Data** — token disimpan lewat `js-cookie` mengikuti pola `COOKIES_NAME`/`_baseQuery` template |

Yang TIDAK diambil dari template: `release-it` (versioning per-app tidak dipakai di monorepo),
halaman contoh (`pages/example`, `login-cabang`, `login-chatbot` — dihapus), mock API bawaan.

## 3. Struktur target `apps/frontend/src` (pola template)

```
src/
├── main.tsx                      # Provider Redux store + BrowserRouter (pola template)
├── App.tsx                       # Routes + loadable per page saja
├── assets/
├── components/
│   ├── layout/                   # dari template: header, sidebar/ (menu §4)
│   │   └── header.tsx            #   + indikator status WS/bridge, logout API-Data
│   ├── ui/                       # portal, icons (template) + primitives custom yang tersisa
│   ├── chat/                     # port: chat-main, job-progress, test-case-result-stack,
│   │   │                         #   markdown-preview, prompt-editor (tiptap), attachment chip
│   ├── evidence/                 # port: agent-screenshot, agent-videos, media viewer
│   └── ...                       # komponen lintas-halaman lain hasil port
├── pages/
│   ├── automation/               # halaman utama: chat + koneksi + platform selector
│   ├── history/                  # ⭐ ex run-history-modal → halaman; /history/:runId detail
│   ├── settings/                 # ⭐ ex settings-modal → /settings (connection & agents),
│   │   │                         #   /settings/memory, /settings/shortcuts
│   ├── file-manager/             # /files
│   └── login/                    # login API-Data dengan pola halaman login template
├── redux/
│   ├── store.ts
│   ├── layoutSlice.ts            # template (sidebar)
│   ├── connectionSlice.ts        # BARU: host/port/channel/bridge/model/platform (persist)
│   ├── automationSlice.ts        # BARU: chat lines, job aktif, run state
│   └── api/
│       ├── _baseQuery.ts         # template, baseUrl = backend :3080
│       ├── agentRuns.ts          # port lib/api/api-data-runs-api.ts
│       ├── appMemory.ts          # port app-memory-api + mobile-app-memory-api
│       ├── promptShortcuts.ts    # port prompt-shortcuts-api
│       ├── mobileDevices.ts      # port mobile-device-api
│       ├── fileManager.ts        # port file-manager-api + media/library api
│       └── config.ts             # port lib/api/config.ts
├── lib/
│   ├── ws/                       # AutomationWsClient (tetap; RTK tidak cocok untuk WS) —
│   │   │                         #   dibungkus provider di atas router agar tidak putus saat navigasi
│   ├── hooks/                    # pola template
│   ├── utils/                    # cn, file-utils, merge-agent-chat-line, parse-test-cases,
│   │   │                         #   prompt-compose, run-evidence, dst.
│   └── variables/                # env.ts, cookies, konstanta protocol
├── styles/                       # tema template
├── test/                         # units/, integrations/, mocks/ (pola template)
└── types/
```

## 4. Sidebar & header

```
Automation     → /               (default)
History        → /history
Settings       → /settings
  ├─ Connection & Agents  /settings
  ├─ App Memory           /settings/memory
  └─ Prompt Shortcuts     /settings/shortcuts
File Manager   → /files
```

Header (adaptasi header template): judul halaman aktif, ThemeToggle, badge status
WebSocket + bridge terpilih, tombol user/logout (hapus cookie token API-Data → /login).

## 5. Fase eksekusi

Verifikasi tiap fase: `pnpm --filter @knitto/frontend typecheck` (+ `lint`, `test` begitu
aktif), `pnpm dev`, smoke manual browser. Commit per fase. App lama tetap ada sampai
Fase 7 (dipindah ke `apps/frontend-legacy/` selama transisi, dihapus di akhir).

### Fase 0 — Persiapan (risiko: rendah)
- Commit clean state; dokumentasikan alur fungsional app lama (checklist verifikasi §6).
- Cek akses registry `@knittotextile/react-ui` dari `.npmrc` root; kalau butuh token, urus dulu.
- `git mv apps/frontend apps/frontend-legacy` + sesuaikan nama paketnya jadi
  `@knitto/frontend-legacy` (masih bisa dijalankan untuk pembanding).

### Fase 1 — Scaffold template ke workspace (risiko: sedang)
- Salin template → `apps/frontend` baru. Ubah: `name: @knitto/frontend`, versi node/pnpm
  mengikuti root, tambah dep `@knitto/shared: workspace:*`, port setting proxy/env dev
  (backend `:3080`) ke `vite.config` + `lib/variables/env.ts`.
- Integrasi turbo: script `dev/build/typecheck/lint/test` selaras `turbo.json`.
- Husky: gabungkan ke hooks root monorepo (jangan dua `.husky/`).
- Hapus halaman contoh; sisakan login + layout + satu halaman kosong `pages/automation`.
- Verifikasi: `pnpm dev` render layout sidebar template kosong; typecheck & lint hijau.

### Fase 2 — Fondasi runtime app (risiko: sedang)
- `connectionSlice` + persist (localStorage/cookies util template) menggantikan
  `PersistedState` di App.tsx lama.
- `lib/ws/` — port `ws-client.ts` + provider `AutomationWsProvider` di atas router
  (WS hidup lintas halaman). `automationSlice` menampung chat lines/job state yang
  sebelumnya useState di App.tsx.
- `_baseQuery.ts` diarahkan ke backend; login API-Data di `pages/login` (RTK mutation),
  token via js-cookie, route guard pola template.
- Verifikasi: login → connect WS → pesan sistem masuk (tanpa UI chat penuh, cukup log).

### Fase 3 — Halaman Automation (risiko: tinggi — jantung app)
- Port komponen chat: `chat-main`, `prompt-editor` (tiptap), `job-progress`,
  `test-case-result-stack`, `platform-selector`, `connection-panel`, attachment/media.
- Data dari `automationSlice` + WS provider; kirim run lewat RTK mutation (`agentRuns.ts`).
- Downgrade React ke 18.3 terjadi efektif di sini (deps di-port satu per satu; tiptap,
  react-markdown, react-zoom-pan-pinch versi kompatibel 18).
- Verifikasi: job browser end-to-end dari UI baru (prompt → run → chat update → evidence).

### Fase 4 — Settings di sidebar (risiko: sedang) ⭐
- Port isi `settings-modal.tsx` → `pages/settings/*` (3 sub-halaman §3); form pakai
  `react-hook-form` + `zod` (standar template, deps sudah ada) menggantikan state manual.
- App Memory & Prompt Shortcuts: hooks react-query lama → RTK Query (`appMemory.ts`,
  `promptShortcuts.ts`).
- Verifikasi: ubah koneksi/credentials → persist; CRUD memory & shortcuts.

### Fase 5 — History di sidebar (risiko: sedang) ⭐
- Port `run-history-modal.tsx` → `pages/history` + `/history/:runId`; data via
  `agentRuns.ts`; evidence viewer (screenshot zoom, video) dari `components/evidence/`.
- Verifikasi: run lama tampil, deep-link detail jalan, evidence terputar.

### Fase 6 — File Manager, mobile, sisa fitur (risiko: sedang)
- `/files` (ex components/file-manager + media library), `mobileDevices.ts` +
  ex `mobile-devices-context` (ganti ke RTK Query polling), api-data library/media.
- Verifikasi: upload/browse file; platform mobile menampilkan device list.

### Fase 7 — Cleanup & standar (risiko: rendah)
- Hapus `apps/frontend-legacy/`; hapus react-query & deps yang tak terpakai.
- `format:all` sekali (commit format terpisah); vitest smoke: layout, routing guard,
  connectionSlice persist, satu test integrasi halaman settings.
- Update `docs/frontend.md`, `docs/system.md`, README, `CLAUDE.md` (struktur & konvensi baru).

## 6. Checklist verifikasi akhir (fungsional paritas)

1. Login API-Data → masuk; tanpa token → redirect /login.
2. Connect WS, pilih bridge/model/strategy/platform (browser & mobile).
3. Prompt + shortcut + attachment → run job browser → chat live, job progress, evidence
   (screenshot + video) muncul; multi test-case menghasilkan stack hasil per-TC.
4. **Navigasi ke /history & /settings saat job berjalan → WS tidak putus, chat utuh saat kembali.**
5. /history: list + filter + detail `/history/:runId` + evidence player.
6. /settings: connection, credentials (Cursor/OpenAI/9Router), App Memory CRUD,
   Prompt Shortcuts CRUD + generate.
7. /files: browse/upload/hapus; media library terpakai dari prompt editor.
8. Mobile: device list, run job mobile singkat (butuh Appium+emulator, cek RAM dulu —
   aturan CLAUDE.md).
9. Sidebar collapse, dark mode, judul header per halaman.
10. `pnpm build` + `pnpm --filter @knitto/frontend test` + lint hijau; `pnpm dev` dari root
    tetap menjalankan FE+BE bersama.

## 7. Risiko utama

| Risiko | Mitigasi |
|---|---|
| Downgrade React 19→18 merusak komponen existing | Port per komponen di Fase 3–6 (bukan sekali jalan); legacy app tetap ada sebagai pembanding sampai Fase 7 |
| WS putus saat navigasi (SPA-isasi) | Provider WS di atas router (Fase 2); checklist #4 |
| Rewrite fetch→RTK Query mengubah perilaku error/caching | Port per domain per fase, uji CRUD tiap domain sebelum lanjut |
| Registry private `@knittotextile/*` | Dicek Fase 0 sebelum mulai |
| Scope besar (rewrite penuh) | Legacy dipertahankan berdampingan; tiap fase deliverable-nya app yang tetap jalan |
| PWA SW meng-cache API/asset dev | SW off di dev; di-enable terakhir setelah stabil |

## 8. Di luar scope

- Perubahan backend apa pun (kontrak API/WS tetap).
- Fitur baru di luar paritas + sidebar Settings/History.
- Release-it/versioning per app.
