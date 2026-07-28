# Frontend

Frontend utama: `apps/frontend` — scaffold dari [knitto-react-template](https://github.com/knittotextile/knitto-react-template) (React 18, Redux Toolkit + RTK Query, react-router, `@knittotextile/react-ui`, sidebar).

App lama (pembanding selama migrasi): `apps/frontend-legacy` — `pnpm dev:frontend-legacy` di **:3001**.
`pnpm dev` hanya menjalankan FE template + backend (bukan legacy), agar tidak bentrok port.

## Routes

| Path | Halaman |
|------|---------|
| `/login` | Login API Data |
| `/` | Automation (chat + WS) |
| `/history`, `/history/:runId` | Run history |
| `/settings` | Connection & agents |
| `/settings/memory` | App memory |
| `/settings/shortcuts` | Prompt shortcuts |
| `/files` | Media library (API Data / MinIO) |

## Dev

```bash
# pastikan NODE_AUTH_TOKEN untuk @knittotextile/react-ui (GitHub Packages)
pnpm dev   # FE :3000 + BE :3080
```

Checklist paritas: [frontend-migration-checklist.md](./frontend-migration-checklist.md).
Plan: `.claude/plan/frontend-migration-knitto-template.md`.

## Catatan migrasi (status)

- Fase 0–6: selesai (legacy di `apps/frontend-legacy`, template + chat/settings/history/files).
- Stub kritis ditutup: `createAgentRun` API Data, media library modal + API, mobile devices SSE + packages.
- `/files` SoT = API Data `/agent/media` (MinIO); Worker `/api/file-manager` debug-only.
- Fase 7: **legacy belum dihapus** sampai checklist E2E §6 lulus manual; vitest unit (happy-dom) + `connectionSlice` smoke hijau; RTK Query per domain masih campuran fetch hooks.
