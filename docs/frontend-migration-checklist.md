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

## App baru (target)

1. Login API-Data → masuk; tanpa token → redirect `/login` — **done**
2. Connect WS, pilih bridge/model/strategy/platform (browser & mobile) — **done** (perlu smoke manual)
3. Prompt + shortcut + attachment → run → chat live — **done** (`createAgentRun` + media library)
4. Navigasi ke `/history` & `/settings` saat job berjalan → WS tidak putus — **provider siap** (perlu smoke manual)
5. `/history`: list + detail `/history/:runId` — **done**
6. `/settings`: connection, credentials, App Memory, Prompt Shortcuts — **done**
7. `/files`: browse/upload — **done** (UI simplified vs legacy grid)
8. Mobile: device list + packages SSE — **done** (run E2E butuh Appium)
9. Sidebar collapse, dark mode, judul header — **done**
10. `pnpm build` + test + lint — **typecheck + unit smoke**; hapus `frontend-legacy` **setelah** checklist E2E di atas lulus
