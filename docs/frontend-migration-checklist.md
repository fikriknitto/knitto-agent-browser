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

## App baru (target — isi setelah tiap fase)

1. Login API-Data → masuk; tanpa token → redirect `/login`
2. Connect WS, pilih bridge/model/strategy/platform (browser & mobile)
3. Prompt + shortcut + attachment → run → chat live, progress, evidence; multi-TC stack
4. Navigasi ke `/history` & `/settings` saat job berjalan → WS tidak putus
5. `/history`: list + filter + detail `/history/:runId` + evidence player
6. `/settings`: connection, credentials, App Memory, Prompt Shortcuts
7. `/files`: browse/upload/hapus; media library dari prompt editor
8. Mobile: device list + run singkat
9. Sidebar collapse, dark mode, judul header per halaman
10. `pnpm build` + `pnpm --filter @knitto/frontend test` + lint hijau; `pnpm dev` FE+BE
