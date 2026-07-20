# Testing (Vitest Browser)

Dokumentasi cara menulis dan menjalankan test di **knitto-react-template**.

Project menggunakan **Vitest** mode **browser** (Playwright Chromium) dan helper **`vitest-browser-react`** untuk render komponen di lingkungan yang mendekati browser asli.

## Daftar isi

- [Ringkasan](#ringkasan)
- [Instalasi](#instalasi)
- [Menjalankan test](#menjalankan-test)
- [Struktur folder](#struktur-folder)
- [File penting](#file-penting)
- [Cakupan: apa yang ditest & tidak ditest](#cakupan-apa-yang-ditest--tidak-ditest)
- [Helper `renderWithProviders`](#helper-renderwithproviders)
- [1) Unit test (logic murni)](#1-unit-test-logic-murni)
- [2) Component test](#2-component-test)
- [3) Integration test](#3-integration-test)
- [4) Test state & hooks](#4-test-state--hooks)
- [Mock API (MSW)](#mock-api-msw)
- [Mock modul](#mock-modul)
- [Menambah test baru](#menambah-test-baru)
- [Catatan penting](#catatan-penting)

---

## Ringkasan

| Kategori           | Jumlah file | Lokasi                             |
| ------------------ | ----------- | ---------------------------------- |
| Integration        | 8           | `src/test/integrations/*.spec.tsx` |
| Unit               | 4           | `src/test/units/**`                |
| Template component | 1           | `src/test/templates/*.spec.tsx`    |
| Page (colocated)   | 2           | `src/pages/login/*.test.tsx`       |
| **Total**          | **15 file** |                                    |

### Daftar test saat ini

**Integration (`src/test/integrations/`)**

| File                              | Yang ditest                                                  |
| --------------------------------- | ------------------------------------------------------------ |
| `login.spec.tsx`                  | Login page: render, validasi, toast, navigate, MSW auth      |
| `login-cabang.spec.tsx`           | Template login cabang: render, validasi form                 |
| `login-chatbot.spec.tsx`          | Template login chatbot: render, toast success                |
| `template-master-detail.spec.tsx` | Template master & detail: layout, validasi, navigasi history |
| `template-history.spec.tsx`       | Template history: render filter & export                     |
| `dashboard.spec.tsx`              | Layout: toggle sidebar via hamburger                         |
| `sidebar.spec.tsx`                | Sidebar + Redux `toggleSidebar`                              |
| `modal.spec.tsx`                  | Modal lokal + hook `useModal`                                |

**Unit (`src/test/units/`)**

| File                                        | Yang ditest                          |
| ------------------------------------------- | ------------------------------------ |
| `global-state.test.ts`                      | Redux slice `layout`                 |
| `hooks.test.ts`                             | Hook `useModal`                      |
| `state.spec.tsx`                            | Contoh `useState` (hook + component) |
| `templates/use-response-data-query.test.ts` | `getResponseData` (data template)    |

**Template component (`src/test/templates/`)**

| File                     | Yang ditest                                    |
| ------------------------ | ---------------------------------------------- |
| `action-toggle.spec.tsx` | Menu aksi edit/hapus di template master-detail |

**Colocated di page (`src/pages/login/`)**

| File                    | Yang ditest                                                   |
| ----------------------- | ------------------------------------------------------------- |
| `login.test.tsx`        | Schema Zod + helper `getLoginResult` / `getLoginErrorMessage` |
| `login-cabang.test.tsx` | Schema Zod login cabang                                       |

---

## Instalasi

```sh
pnpm install
pnpm exec playwright install chromium
```

### Dependencies testing

Sudah tersedia di `package.json`:

- `vitest`
- `@vitest/browser`
- `@vitest/browser-playwright`
- `vitest-browser-react`
- `playwright`
- `msw`

---

## Menjalankan test

```sh
# Mode watch (default)
pnpm test

# Sekali jalan + coverage
pnpm test:coverage
```

### File atau filter tertentu

```sh
# Satu file
pnpm vitest run src/test/integrations/login.spec.tsx

# Pola nama file
pnpm test login.spec.tsx

# Judul test
pnpm vitest run -t "Login Integration Test"
```

---

## Struktur folder

```
src/test/
├── README.md                 # Dokumentasi ini
├── setup.ts                  # MSW + CSS global
├── test-utils.tsx            # renderWithProviders
├── mocks/
│   ├── browser.ts            # MSW worker
│   ├── handlers.ts           # Gabungan handler
│   └── handlers/
│       └── auth.handlers.ts  # Mock POST /auth/login
├── integrations/             # Page / layout / flow
├── units/                    # Logic, hooks, redux
└── templates/                # Komponen khusus template page

src/pages/login/
├── login.test.tsx            # Unit schema login utama
└── login-cabang.test.tsx     # Unit schema login cabang
```

---

## File penting

| File                      | Peran                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| `vite.config.ts`          | `test.browser.enabled`, Playwright, `setupFiles`, coverage            |
| `src/test/setup.ts`       | Load `main.css`, start/stop MSW (`onUnhandledRequest: 'error'`)       |
| `src/test/test-utils.tsx` | `renderWithProviders` — lihat [di bawah](#helper-renderwithproviders) |
| `src/test/mocks/*`        | Handler MSW untuk API mock                                            |

---

## Cakupan: apa yang ditest & tidak ditest

### Ditest di template ini

- **Halaman template & login** (form, validasi, toast, navigasi)
- **Layout aplikasi** (sidebar, header/dashboard)
- **Komponen UI lokal** yang masih di `src/components/` (modal, toast, action-toggle, dll.)
- **Logic murni**: Zod schema, helper, hook template (`getResponseData`), Redux slice

### Tidak ditest di template ini

Komponen dari **`@knittotextile/react-ui`** — testing menjadi tanggung jawab package lib:

- `Button`, `Typography`, `Select`, `DatePicker`, dll.
- `KnittoTable`, `Pagination`, `BigCalendar`
- `KnittoProvider`, `ThemeToggle`

Jangan buat ulang test komponen lib di template; cukup **smoke test** halaman yang memakainya (render + interaksi utama).

---

## Helper `renderWithProviders`

Gunakan saat komponen butuh konteks aplikasi:

```tsx
import { renderWithProviders } from '@/test/test-utils';

const screen = await renderWithProviders(<LoginPage />);
// dengan route awal:
const screen = await renderWithProviders(<Dashboard />, { initialEntries: ['/example/dashboard'] });
```

Provider yang dibungkus (urutan dalam):

1. `KnittoProvider` (`defaultTheme="light"`) — token & komponen lib
2. `Redux Provider` — store singleton `src/redux/store.ts`
3. `MemoryRouter` — routing
4. `ToastProvider` — toast lokal template

Jika **tidak** butuh provider di atas, pakai `render` langsung dari `vitest-browser-react`.

---

## 1) Unit test (logic murni)

Tanpa render UI. Cocok untuk: Zod schema, util, mapper, pure function.

**Contoh di repo:** `src/pages/login/login.test.tsx`, `src/pages/login/login-cabang.test.tsx`, `src/test/units/templates/use-response-data-query.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { formLoginSchema } from './hooks/hooks';

describe('Form Login Schema', () => {
  it('validasi sukses', () => {
    expect(formLoginSchema.parse({ username: 'admin', password: 'admin' })).toEqual({
      username: 'admin',
      password: 'admin',
    });
  });
});
```

Untuk logic template yang awalnya di hook React, ekspor fungsi pure (contoh: `getResponseData`) agar bisa ditest tanpa `renderHook`.

---

## 2) Component test

Test perilaku komponen **lokal** template secara terisolasi.

**Contoh di repo:** `src/test/templates/action-toggle.spec.tsx`

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import ActionToggle from '@/pages/example/templates/template-master-and-detail/components/action-toggle';

describe('ActionToggle', () => {
  it('memanggil onClick edit', async () => {
    const onClick = vi.fn();
    const screen = await renderWithProviders(<ActionToggle onClick={onClick} />);

    const toggle = screen.container.querySelector('.btn-action-toggle');
    toggle?.click();

    const editButton = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent?.trim() === 'Edit');
    editButton?.click();

    expect(onClick).toHaveBeenCalledWith('edit');
  });
});
```

**Tips:** komponen di dalam `Portal` kadang perlu `document.querySelector` atau `userEvent` dari `vitest/browser`, bukan hanya `screen.getByText().click()`.

---

## 3) Integration test

Test beberapa lapisan sekaligus: page + router + redux + MSW + toast/navigate.

**Contoh di repo:** semua file di `src/test/integrations/`

### Pola umum

```tsx
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { renderWithProviders } from '@/test/test-utils';
import LoginChatbotPage from '@/pages/login/login-chatbot';

describe('Login Chatbot', () => {
  it('menampilkan toast success saat LOG IN diklik', async () => {
    const screen = await renderWithProviders(<LoginChatbotPage />);

    await screen.getByRole('button', { name: 'LOG IN' }).click();

    await expect.element(screen.getByTestId('toast-success')).toBeInTheDocument();
    await expect.element(screen.getByText('Login berhasil')).toBeInTheDocument();
  });
});
```

### Prioritas test halaman template

1. **Smoke** — elemen kunci ter-render (judul, tombol, tabel/form)
2. **Validasi form** — submit kosong → pesan error Zod
3. **Interaksi ringan** — navigasi, toast, klik tombol utama
4. Hindari test mendalam fitur `KnittoTable` (virtualisasi, filter) — itu di lib

---

## 4) Test state & hooks

### Local state

**Contoh:** `src/test/units/state.spec.tsx` — pola `useState` via `renderHook` dan component.

### Global state (Redux)

**Unit reducer:** `src/test/units/global-state.test.ts`

**Integration + UI:** `src/test/integrations/sidebar.spec.tsx`

### Custom hooks

**Contoh:** `src/test/units/hooks.test.ts` — `useModal` dengan `renderHook` + `act`.

---

## Mock API (MSW)

Handler default: `src/test/mocks/handlers/auth.handlers.ts` (login `admin`/`admin` → success).

- Skenario normal: **tanpa** `server.use(...)` — pakai handler default.
- Override (network error, response khusus): `server.use(...)` di dalam `it`.

```tsx
import { server } from '@/test/mocks/browser';
import { http, HttpResponse } from 'msw';
import { env } from '@/lib/variables/env';

server.use(http.post(`${env.VITE_BASE_API_URL}/auth/login`, () => HttpResponse.error()));
```

MSW distart di `setup.ts` dengan `onUnhandledRequest: 'error'` — request API yang tidak di-mock akan **gagalkan** test.

---

## Mock modul

Kunci dependensi eksternal dengan `vi.mock`:

| Kebutuhan      | Contoh file                                         |
| -------------- | --------------------------------------------------- |
| `useNavigate`  | `login.spec.tsx`, `template-master-detail.spec.tsx` |
| `useUserLogin` | `dashboard.spec.tsx`                                |

```tsx
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  mockNavigate.mockClear();
});
```

---

## Menambah test baru

### Login / template page baru

1. **Unit schema** (jika pakai Zod): `src/pages/<nama>/hooks/*.ts` + `*.test.tsx` colocated
2. **Integration**: `src/test/integrations/<nama>.spec.tsx` dengan `renderWithProviders`

### Komponen khusus template

Letakkan di `src/test/templates/<nama>.spec.tsx` jika hanya dipakai template page.

### Checklist sebelum commit

- [ ] `pnpm vitest run` lulus
- [ ] Test yang ubah Redux store punya `beforeEach` reset (lihat `sidebar.spec.tsx`)
- [ ] Tidak menambah test untuk komponen `@knittotextile/react-ui` secara terisolasi
- [ ] MSW handler ditambah jika page memanggil API baru

---

## Catatan penting

### Singleton Redux store

`renderWithProviders` memakai store dari `src/redux/store.ts`. Jika test melakukan `dispatch`, reset state di `beforeEach`:

```tsx
import store from '@/redux/store';
import { toggleSidebar } from '@/redux/layoutSlice';

beforeEach(() => {
  if (store.getState().layout.isSidebarOpen) {
    store.dispatch(toggleSidebar());
  }
});
```

### Assertion di browser mode

Gunakan matcher dari `vitest-browser-react`:

```tsx
await expect.element(screen.getByText('...')).toBeInTheDocument();
await expect.poll(() => element.getAttribute('data-open')).toBe('true');
```

### Interaksi keyboard / form

```tsx
import { userEvent } from 'vitest/browser';

const user = userEvent.setup();
await user.type(screen.getByPlaceholder('Username'), 'admin');
```

### Coverage

```sh
pnpm test:coverage
```

Laporan HTML di folder `coverage/` setelah dijalankan.
