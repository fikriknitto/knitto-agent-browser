# Knitto Web App Memory

## Login Page
- **URL:** http://192.168.20.15:5588/login
- **Title:** Template Vite Preact Typescript Knitto

### Login Form Elements (stable locators)
| Element | Locator Strategy | Notes |
|---------|-----------------|-------|
| Username | `placeholder: "Username"` | inputType=text |
| Password | `placeholder: "Password"` | inputType=password |
| Login button | `role: button, name: "LOGIN"` | Full-width blue button |
| Password visibility toggle | `role: button, name: "Icon button"` near password field | Optional; bbox ~803,414 |

### Login Flow
1. Fill username and password via placeholder locators
2. Click LOGIN button
3. Toast notification appears briefly (close button: `name: "Tutup notifikasi"`)
4. URL may stay at `/login` briefly; session is established
5. Navigate to `/` or post-login redirect shows dashboard with **User** and **Log out** buttons in header

### Post-Login Indicators
- `role: button, name: "Log out"` visible in top-right header
- `role: button, name: "User"` visible in header
- Dashboard home at `http://192.168.20.15:5588/` with component example cards

### Valid Credentials (test)
- Username: `init`
- Password: `test`

### Header Elements (authenticated)
- Theme selector: `name: "Pilih tema tampilan (Ikuti sistem)"`
- Hamburger menu: `role: button, name: "Icon button"` top-left (bbox ~14,14)
- Sidebar search: `placeholder: "Cari menu"`

### Quirks
- Login success toast auto-dismisses quickly; text not always in page body for assert_text
- Verify login by checking Log out button on dashboard, not URL change alone

## Test Run — login.md (2026-06-24)

### Positive Test: Login with valid credentials — PASSED
- URL: http://192.168.20.15:5588/login
- Steps: fill Username (init), Password (test), click LOGIN
- Toast notification appeared (Tutup notifikasi button visible)
- URL stayed at /login briefly; session established
- Verified on dashboard (/): Log out + User buttons visible
- Locators used: placeholder Username/Password, role=button name=LOGIN

### Negative Test Cases (documented, not executed per rules)
| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| NEG-01 | Empty username | Leave Username blank, fill Password, click LOGIN | Error toast or validation; remain on login |
| NEG-02 | Empty password | Fill Username, leave Password blank, click LOGIN | Error toast or validation; remain on login |
| NEG-03 | Both fields empty | Click LOGIN without filling | Error toast or validation; remain on login |
| NEG-04 | Wrong username | Username: wronguser, Password: test | Login fails; error message |
| NEG-05 | Wrong password | Username: init, Password: wrongpass | Login fails; error message |
| NEG-06 | Wrong credentials | Both fields invalid | Login fails; error message |

### Positive Test Cases (documented)
| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| POS-01 | Valid login | init / test → LOGIN | Toast success; dashboard accessible with Log out |
| POS-02 | Password visibility toggle | Click Icon button near password field | Password text toggles visible/hidden |
| POS-03 | Enter key submit | Fill fields, press Enter in Password | Same as POS-01 |

### Assumptions
- Password visibility toggle (Icon button at bbox ~803,414) assumed to show/hide password; not verified this run
- Error messages appear as toast notifications (Tutup notifikasi close button pattern)
- No explicit form labels; placeholder text is the stable locator
- Login does not auto-redirect; manual navigation to / confirms session

## Test Run — terapkan file 1 / Login.md (2026-06-24)

### Applied: Login.md (file 1) — PASSED
- Executed positive login test per Login.md instructions
- URL: http://192.168.20.15:5588/login
- Credentials: init / test
- Locators: placeholder Username, placeholder Password, role=button name=LOGIN
- Post-login verification: Log out + User buttons visible on dashboard (/)
- Screenshots: login-form-filled.png, login-success-dashboard.png
- Note: No inputType=file found on login or dashboard; "terapkan file" interpreted as executing Login.md test scenario, not file upload

## Knitto Design System Docs (port 11111)

### Overview
- **URL:** http://192.168.20.15:11111/
- **Title:** intro | Knitto Design System
- **Type:** Docusaurus-style documentation site (not the login app on :5588)

### Header Elements
| Element | Locator | Notes |
|---------|---------|-------|
| Logo/brand | `role: link, name: "Design System"` | Top-left |
| Dokumentasi nav | `role: link, name: "Dokumentasi"` | Header nav |
| Changelog nav | `role: link, name: "Changelog"` | Header nav |
| Dark/light toggle | `role: button, name: "Ubah antara modus gelap dan modus terang (saat ini system mode)"` | Top-right |
| Search | `placeholder: "Search"` | Top-right |

### Sidebar Navigation
- Introduction, Changelog, Foundation (expandable), Components (expandable)
- No hamburger menu on desktop viewport — sidebar is always visible
- Right-side table of contents with anchor links (Isi dokumentasi, Foundation, Components, etc.)

### Page Content (Introduction)
- Main heading area with demo link to `192.168.20.15:5588`
- Long scrollable doc with sections: Foundation (Colors, Typography), Components (Button, Select, etc.), Instalasi, Setup, Penggunaan, Dark mode

### Quirks
- Page is very long; use `fullPage: true` for screenshots
- `networkidle2` wait works well for initial load
- Theme toggle button in header (not sidebar "Theme Toggle" component doc link)

## Test Run — TC02 Navigate to theme.md (2026-06-24)

### TC02 — Visit page + full screenshot — PASSED
- URL: http://192.168.20.15:11111/
- Steps: navigate → wait network_idle → full-page screenshot
- Verified: "Knitto Design System" text present; Design System link visible
- Screenshot: TC02-navigate-theme-fullpage.png
- Note: TC file content is visit+screenshot only (no theme navigation steps despite filename)

## Test Run — TC02 Navigate to theme toggle (2026-06-24)

### TC02 — Navigate to Theme Toggle component page — PASSED
- URL: http://192.168.20.15:11111/
- Steps: navigate → wait network_idle → click sidebar Components (expandable, ref e10 / role=button name=Components) → click Theme Toggle (ref e20 / role=link name=Theme Toggle) → full-page screenshot
- Result URL: http://192.168.20.15:11111/components/theme-toggle
- Page title: Theme Toggle | Knitto Design System
- Verified: "Theme Toggle" text present; Theme Toggle sidebar link visible and active
- Screenshot: TC02-theme-toggle-fullpage.png

### Sidebar Navigation Pattern (Design System docs)
- Components is expandable: click `role=button, name=Components` to reveal submenu items
- Theme Toggle submenu: `role=link, name=Theme Toggle` (indented under Components)
- No hamburger menu on desktop; left sidebar always visible
- First click on Components expands; second click would navigate — use single click to expand only

## Test Run — TC01–TC04 batch (2026-06-24)

### TC01 Login.md — PASSED
- URL: http://192.168.20.15:5588/login
- Credentials: init / test
- Locators: placeholder Username, placeholder Password, role=button name=LOGIN
- Verified: Log out + User buttons on dashboard (/)
- Screenshot: TC01-login-success-dashboard.png

### TC02 Navigate to theme toggle — PASSED
- URL: http://192.168.20.15:11111/
- Steps: Components (role=button) → Theme Toggle sidebar link (ref e20)
- Result URL: /components/theme-toggle
- Screenshot: TC02-theme-toggle-fullpage.png

### TC03 Navigate to toast — PASSED (with workaround)
- Start URL: http://192.168.20.15:11111/ss renders header-only (no sidebar)
- Workaround: clicked Dokumentasi to load docs layout, then Components → Toast
- Result URL: /components/toast
- Screenshot: TC03-toast-fullpage.png

### TC04 Navigate to table — PASSED
- URL: http://192.168.20.15:11111/
- Steps: Components → Table sidebar link (ref e19)
- Result URL: /components/table
- Screenshot: TC04-table-fullpage.png

### Quirk: /ss route
- http://192.168.20.15:11111/ss shows blank content (header only); use Dokumentasi link or navigate to / for sidebar nav

## Test Run — TC04 Navigate to table.md (2026-06-24, re-run)

### TC04 — Navigate to Table component page — PASSED
- URL start: http://192.168.20.15:11111/
- Steps: wait network_idle → click sidebar Components (ref e10 / role=button name=Components) → click Table (ref e19 / role=link name=Table) → full-page screenshot
- Result URL: http://192.168.20.15:11111/components/table
- Verified: "Table" text present on page
- Screenshot: TC04-table-fullpage.png
- Note: Components expand reveals submenu (Big Calendar, Button, Dropdown, Input Date & Time, Modal, Pagination, Radio, Select, Table, Theme Toggle, Toast)

## Test Run — TC02 Navigate to theme toggle.md (2026-06-24, re-run)

### TC02 — Navigate to Theme Toggle component page — PASSED
- URL start: http://192.168.20.15:11111/
- Steps: navigate → wait network_idle → click sidebar Components (ref e10 / role=button name=Components) → click Theme Toggle (ref e20 / role=link name=Theme Toggle) → full-page screenshot
- Result URL: http://192.168.20.15:11111/components/theme-toggle
- Page title: Theme Toggle | Knitto Design System
- Verified: automation_assert_text "Theme Toggle" present; automation_assert_visible link Theme Toggle in sidebar
- Screenshot: TC02-theme-toggle-fullpage.png
- Navigation succeeded on first click attempt (no retry needed)


## CMS Knitto (port 5420) — http://192.168.20.27:5420/

### Login Page
- **URL:** http://192.168.20.27:5420/
- **Title:** CMS Knitto

### Login Form Elements (stable locators)
| Element | Locator Strategy | Notes |
|---------|-----------------|-------|
| Username | `placeholder: "Username"` | inputType=text |
| Password | `placeholder: "Password"` | inputType=password |
| Login button | `role: button, name: "LOGIN"` | Full-width blue button |
| Password visibility toggle | `role: button, name: "Icon button"` near password field | bbox ~804,414 |

### Login Flow
1. Fill username and password via placeholder locators
2. Click LOGIN button
3. Auto-redirect to `/content-manager` on success
4. Post-login header shows username button (`name: "fikri"` or logged-in username) + `Log out` button

### Post-Login Indicators
- URL: `http://192.168.20.27:5420/content-manager`
- `role: button, name: "Log out"` visible in top-right header
- `role: button, name: "<username>"` visible in header (e.g. fikri)
- Content Manager page with banner list and "+ Tambah Banner Baru" button
- Hamburger menu: `role: button, name: "Icon button"` top-left (bbox ~14,14)
- Sidebar search: `placeholder: "Cari menu"`

### Valid Credentials (TC01)
- Username: `fikri`
- Password: `11221122`

### Quirks
- Unlike port 5588 app, login auto-redirects to `/content-manager` (no manual navigation needed)
- No toast notification observed on this instance; verify via URL change + header buttons

## Test Run — TC01 Login.md (2026-06-25)

### TC01 — Login with valid credentials — PASSED
- URL: http://192.168.20.27:5420/
- Credentials: fikri / 11221122
- Locators: placeholder Username, placeholder Password, role=button name=LOGIN
- Post-login: redirected to /content-manager; Log out + fikri buttons visible
- Screenshots: TC01-login-form-empty.png, TC01-login-form-filled.png, TC01-login-success-dashboard.png
- Note: No inputType=file on login page; "file 1" interpreted as executing TC01 - Login.md test scenario

### Positive Test Cases (documented)
| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| POS-01 | Valid login | fikri / 11221122 → LOGIN | Redirect to /content-manager; Log out + username visible |
| POS-02 | Password visibility toggle | Click Icon button near password field | Password text toggles visible/hidden |
| POS-03 | Enter key submit | Fill fields, press Enter in Password | Same as POS-01 |

### Negative Test Cases (documented, not executed per rules)
| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| NEG-01 | Empty username | Leave Username blank, fill Password, click LOGIN | Error message; remain on login |
| NEG-02 | Empty password | Fill Username, leave Password blank, click LOGIN | Error message; remain on login |
| NEG-03 | Both fields empty | Click LOGIN without filling | Error message; remain on login |
| NEG-04 | Wrong username | Invalid username + valid password | Login fails; error message |
| NEG-05 | Wrong password | Valid username + invalid password | Login fails; error message |
| NEG-06 | Wrong credentials | Both fields invalid | Login fails; error message |

### Assumptions
- Password visibility toggle (Icon button at bbox ~804,414) assumed to show/hide password; not verified this run
- Error messages likely appear as toast notifications (pattern from similar Knitto apps)
- No explicit form labels; placeholder text is the stable locator
- Username button in header displays logged-in user's name dynamically


## Test Run — TC03 Navigate to toast.md (2026-06-25)

### TC03 — Navigate to Toast component page — PASSED
- URL start: http://192.168.20.15:11111/
- Steps: navigate → wait network_idle → click sidebar Components (ref e10 / role=button name=Components) → click Toast (ref e21 / role=link name=Toast) → full-page screenshot
- Result URL: http://192.168.20.15:11111/components/toast
- Verified: automation_assert_text "Toast" present; automation_assert_visible link Toast in sidebar
- Screenshot: TC03-toast-fullpage.png
- Navigation succeeded on first click attempt (no retry needed)

## Test Run — TC01 Login.md CMS Knitto (2026-06-25, re-run)

### TC01 — Login with valid credentials — PASSED
- URL: http://192.168.20.27:5420/ (typo hhttp corrected)
- Credentials: fikri / 11221122
- Locators: placeholder Username, placeholder Password, role=button name=LOGIN
- Post-login: auto-redirect to /content-manager; Log out + fikri + Tambah Banner Baru buttons visible
- Screenshots: TC01-login-form-empty.png, TC01-login-form-filled.png, TC01-login-success-dashboard.png
- Note: No inputType=file on login page; file interpreted as executing TC01 - Login.md test scenario


## Test Run — TC02 Navigate to theme toggle.md (2026-06-25)

### TC02 — Navigate to Theme Toggle component page — PASSED
- URL start: http://192.168.20.15:11111/
- Steps: navigate → wait network_idle → click sidebar Components (ref e10 / role=button name=Components) → click Theme Toggle (ref e20 / role=link name=Theme Toggle) → full-page screenshot
- Result URL: http://192.168.20.15:11111/components/theme-toggle
- Page title: Theme Toggle | Knitto Design System
- Verified: automation_assert_text "Theme Toggle" present; automation_assert_visible link Theme Toggle in sidebar
- Screenshot: TC02-theme-toggle-fullpage.png
- Navigation succeeded on first click attempt (no retry needed)

## Test Run — TC03 Navigate to toast.md (2026-06-25, re-run)

### TC03 — Navigate to Toast component page — PASSED
- URL start: http://192.168.20.15:11111/
- Steps: navigate → wait network_idle → click sidebar Components (ref e10 / role=button name=Components) → click Toast (ref e21 / role=link name=Toast) → full-page screenshot
- Result URL: http://192.168.20.15:11111/components/toast
- Page title: Toast | Knitto Design System
- Verified: automation_assert_text "Toast" present; automation_assert_visible link Toast in sidebar
- Screenshot: TC03-toast-fullpage.png
- Navigation succeeded on first click attempt (no retry needed)

## Test Run — TC01 Login.md CMS Knitto (2026-06-26)

### TC01 — Login with valid credentials — PASSED
- URL: http://192.168.20.27:5420/ (typo hhttp corrected)
- Credentials: fikri / 11221122
- Locators: placeholder Username, placeholder Password, role=button name=LOGIN
- Post-login: auto-redirect to /content-manager; Log out + fikri + Tambah Banner Baru buttons visible
- Screenshots: TC01-login-form-empty.png, TC01-login-form-filled.png, TC01-login-success-dashboard.png
- Note: No inputType=file on login page; file interpreted as executing TC01 - Login.md test scenario

### Positive Test Cases (documented)
| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| POS-01 | Valid login | fikri / 11221122 → LOGIN | Redirect to /content-manager; Log out + username visible |
| POS-02 | Password visibility toggle | Click Icon button near password field | Password text toggles visible/hidden |
| POS-03 | Enter key submit | Fill fields, press Enter in Password | Same as POS-01 |

### Negative Test Cases (documented, not executed per rules)
| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| NEG-01 | Empty username | Leave Username blank, fill Password, click LOGIN | Error message; remain on login |
| NEG-02 | Empty password | Fill Username, leave Password blank, click LOGIN | Error message; remain on login |
| NEG-03 | Both fields empty | Click LOGIN without filling | Error message; remain on login |
| NEG-04 | Wrong username | Invalid username + valid password | Login fails; error message |
| NEG-05 | Wrong password | Valid username + invalid password | Login fails; error message |
| NEG-06 | Wrong credentials | Both fields invalid | Login fails; error message |

### Assumptions
- Password visibility toggle (Icon button at bbox ~804,414) assumed to show/hide password; not verified this run
- Error messages likely appear as toast notifications (pattern from similar Knitto apps)
- No explicit form labels; placeholder text is the stable locator
- Username button in header displays logged-in user's name dynamically
