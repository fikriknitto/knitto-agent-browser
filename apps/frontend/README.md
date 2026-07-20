<div align="center">
	<img src="https://s3.knitto.co.id/web/knitto.png" width="150"/>
	<h1>Template React Knitto Website</h1>
	<div>Boilerplate frontend Knitto menggunakan React, TypeScript, Vite, Tailwind CSS v4, Redux Toolkit, dan <code>@knittotextile/react-ui</code>.</div>
</div>

# Struktur Projek

```
/ root directory
├─ config                         # Konfigurasi deploy & plugin Vite
├─ public
│  ├─ fonts                       # Font aplikasi
│  └─ svg                         # Asset SVG di luar src
├─ src
│  ├─ assets
│  ├─ components                  # Komponen shared (layout, ui lokal)
│  ├─ lib                         # utils, hooks, variabels
│  ├─ pages                       # Halaman & sub-halaman (React Router)
│  ├─ redux                       # RTK Query, slice, store
│  ├─ styles                      # main.css, font custom
│  ├─ test                        # Setup test, mocks, integration/unit
│  └─ types
├─ tailwind                       # Plugin Tailwind khusus (modal, dll.)
└─ .env.example                   # Contoh environment variable
```

**Keterangan**

- Nama file/folder: **kebab-case**
- Variabel: **camelCase**; konstanta global: **UPPER_CASE**
- Komponen UI utama dari **`@knittotextile/react-ui`** — komponen di `src/components/ui/` hanya untuk yang belum / belum dipindah ke lib
- Aktifkan ESLint & Prettier di IDE

# Requirements (Tech Stack)

| Teknologi | Keterangan |
|-----------|------------|
| [React 18](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Vite](https://vitejs.dev/) | Build & dev server |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling |
| [Redux Toolkit](https://redux-toolkit.js.org/) + RTK Query | State & data fetching |
| [React Router DOM](https://reactrouter.com/) | Routing |
| [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | Form & validasi |
| [@knittotextile/react-ui](https://github.com/knittotextile/knitto-desgin-system/pkgs/npm/react-ui) | Design system (private) |
| [Vitest](https://vitest.dev/) + Playwright | Testing (browser mode) |
| [PNPM](https://pnpm.io/) | Package manager |

**Versi minimum:** Node.js >= 24 · pnpm >= 10.34.1

### Setup toolchain

```sh
corepack enable
corepack use pnpm@10.34.1
pnpm install
```

Gunakan `.nvmrc` jika memakai nvm: `nvm use`

### Registry NPM GitHub (Knitto UI)

Library `@knittotextile/react-ui` bersifat private. Ikuti panduan: [Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

---

# Dokumentasi & Referensi

### Design system (`@knittotextile/react-ui`)

Komponen berikut **sudah dari lib**, tidak lagi di-maintain lokal di template:

- `Button`, `Typography`, `Select`, `DatePicker`, `Pagination`
- `KnittoTable`, `BigCalendar`
- `KnittoProvider`, `ThemeToggle`

Import contoh:

```tsx
import { Button, KnittoTable, Typography, KnittoProvider } from '@knittotextile/react-ui';
import '@knittotextile/react-ui/styles';
```

### Dokumentasi komponen lib (Storybook / docs server)

Setelah menjalankan project, buka **Example → Dashboard**. Di bagian atas ada kartu **Dokumentasi Komponen** dengan tombol ke:

`http://192.168.20.15:11111/`

*(URL internal dokumentasi komponen yang sudah dikomponenkan di lib.)*

### Halaman contoh di template

| Area | Path |
|------|------|
| Dashboard navigasi | `/example/dashboard` |
| Contoh komponen lib | `/example/komponen/*` (table, button, selection, …) |
| Template login | `/login`, `/login-cabang`, `/login-chatbot` |
| Template master & detail | `/example/master-and-detail` |

### Komponen UI lokal (`src/components/ui/`)

Masih di template (belum / belum sepenuhnya di lib): `modal`, `toast`, `input`, `card`, `layout/sidebar`, dll. Lihat folder `src/components/` untuk detail.

### Testing

Panduan lengkap menulis & menjalankan test: **[src/test/README.md](./src/test/README.md)**

---

# Knitto UI & Dark Mode

Setup inti di template:

1. **Styles lib** di `src/styles/main.css`:

   ```css
   @import 'tailwindcss';
   @import '@knittotextile/react-ui/styles';
   ```

2. **`KnittoProvider`** di `src/main.tsx` (`defaultTheme="system"`).

3. **Anti-FOUC** — script blocking di `index.html` membaca `localStorage` key `knitto-theme` sebelum React mount.

4. **Theme toggle** di navbar (`ThemeToggle` dari lib) pada layout example.

---

# Environment Variable

Salin `.env.example` ke `.env`:

```sh
cp .env.example .env
```

| Variable | Keterangan |
|----------|------------|
| `VITE_APP_NAME` | Nama aplikasi (judul login, dll.) |
| `VITE_BASE_API_URL` | Base URL API |
| `VITE_ENVIRONTMENT` | `DEVELOPMENT` / `PRODUCTION` |
| `VITE_DOCUMENTATION_URL` | Base URL dokumentasi KNUI (footer komponen example) |
| `VITE_USE_MOCK_API` | `true` → MSW aktif di development |

Nilai dibaca lewat `window.__ENV__` (lihat `src/lib/variables/env.ts` dan `config/generate-env-plugin.ts`).

---

# Scripts

```sh
pnpm dev              # Development server
pnpm build            # Production build
pnpm preview          # Preview build
pnpm lint             # ESLint
pnpm format:all       # Prettier
pnpm test             # Vitest (watch)
pnpm test:coverage    # Vitest sekali jalan + coverage
```

### Testing (singkat)

```sh
pnpm exec playwright install chromium   # sekali, untuk browser test
pnpm test
```

Detail: [src/test/README.md](./src/test/README.md)

---

# Cara Menjalankan Project (Development)

```sh
corepack enable
corepack use pnpm@10.34.1
pnpm install
pnpm dev
```

Environment di-load dari `.env` pada root. Setelah mengubah `.env`, restart dev server.

Dengan `VITE_USE_MOCK_API=true`, API login di-mock oleh MSW (lihat `src/test/mocks/`).

---

# Penggunaan `entrypoint.sh` (Deployment)

Untuk deployment (Docker), environment variable digenerate ke `generated-env.js` saat container start.

Contoh (`config/entrypoint.sh`):

```sh
#!/bin/sh

cat <<EOF >/usr/share/nginx/html/generated-env.js
window.__ENV__ = {
  VITE_APP_NAME:"${VITE_APP_NAME}",
  VITE_BASE_API_URL:"${VITE_BASE_API_URL}",
  VITE_ENVIRONTMENT:"${VITE_ENVIRONTMENT}",
  VITE_DOCUMENTATION_URL:"${VITE_DOCUMENTATION_URL}",
};
EOF

exec "$@"
```

**Langkah:**

1. Set env di container/server (`VITE_APP_NAME`, `VITE_BASE_API_URL`, dll.).
2. Saat container jalan, script menulis `generated-env.js` di direktori static web.
3. Aplikasi memuat file tersebut otomatis (plugin `config/generate-env-plugin.ts` pada build).

Pada **development**, cukup file `.env` — tidak perlu `entrypoint.sh`.

---

# Docker

Build image (butuh `GITHUB_TOKEN` untuk registry `@knittotextile`):

```sh
docker build -t template . --build-arg GITHUB_TOKEN=your_github_token
```

Atau Docker Compose:

```sh
export GITHUB_TOKEN=your_github_token
docker compose up --build -d
```

Aplikasi tersedia di `http://localhost:3000`.
