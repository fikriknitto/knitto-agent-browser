# Checklist verifikasi frontend (paritas migrasi knitto-react-template)

Sumber: `.claude/plan/frontend-migration-knitto-template.md` §6.

Gunakan untuk membandingkan `apps/frontend-legacy` vs `apps/frontend` baru.

## App lama (baseline)

- [ ] Login API-Data → masuk; tanpa token → layar login
- [ ] Connect WS, pilih agent/model/platform (browser & mobile)
- [ ] Prompt + shortcut + attachment → run job browser → chat live, progress, evidence
- [ ] Multi test-case → stack hasil per-TC
- [ ] Settings modal: connection, credentials, App Memory CRUD, Prompt Shortcuts
- [ ] Run History modal: list + detail + evidence
- [ ] File manager / media library dari prompt editor
- [ ] Mobile: device list (butuh Appium)

## 1. App baru (target — isi setelah tiap fase)

1. Login API-Data → masuk; tanpa token → redirect `/login` — **Fase 2**
2. Connect WS, pilih bridge/model/strategy/platform (browser & mobile) — **MVP Fase 3–4** (mobile device list masih stub)
3. Prompt + shortcut + attachment → run → chat live — **MVP Fase 3** (createAgentRun / library attach masih partial)
4. Navigasi ke `/history` & `/settings` saat job berjalan → WS tidak putus — **Fase 2 provider** (perlu smoke manual)
5. `/history`: list + detail `/history/:runId` — **MVP Fase 5**
6. `/settings`: connection, credentials, App Memory, Prompt Shortcuts — **MVP Fase 4**
7. `/files`: browse/upload — **MVP Fase 6** (UI simplified)
8. Mobile: device list + run singkat — **belum** (stub)
9. Sidebar collapse, dark mode, judul header — **Fase 1 layout template**
10. `pnpm build` + test + lint — **typecheck hijau; test/lint penuh di Fase 7**
