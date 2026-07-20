# Frontend

Frontend utama: `apps/frontend` — scaffold dari [knitto-react-template](https://github.com/knittotextile/knitto-react-template) (React 18, Redux Toolkit + RTK Query, react-router, `@knittotextile/react-ui`, sidebar).

App lama (pembanding selama migrasi): `apps/frontend-legacy` (`pnpm dev:frontend-legacy`).

## Routes

| Path | Halaman |
|------|---------|
| `/login` | Login API Data |
| `/` | Automation (chat + WS) |
| `/history`, `/history/:runId` | Run history |
| `/settings` | Connection & agents |
| `/settings/memory` | App memory |
| `/settings/shortcuts` | Prompt shortcuts |
| `/files` | File manager |

## Dev

```bash
# pastikan NODE_AUTH_TOKEN untuk @knittotextile/react-ui (GitHub Packages)
pnpm dev   # FE :3000 + BE :3080
```

Checklist paritas: [frontend-migration-checklist.md](./frontend-migration-checklist.md).
Plan: `.claude/plan/frontend-migration-knitto-template.md`.

## Catatan migrasi (status)

- Fase 0–2: selesai (legacy rename, template scaffold, WS provider, login API-Data, slices).
- Fase 3–6: MVP di-port (chat, settings, history, files); beberapa stub tersisa (media library penuh, createAgentRun penuh ke API Data di chat path, RTK Query per domain masih campuran hooks fetch).
- Fase 7: legacy belum dihapus; vitest smoke & format:all menyusul setelah smoke E2E.
