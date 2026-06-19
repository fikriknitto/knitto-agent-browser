# Knitto CMS (http://192.168.20.27:5420)

## Login Page
- URL: http://192.168.20.27:5420/
- Title: CMS Knitto
- Direct login page (no redirect needed)

## Login Form Elements
- Username input: placeholder "Username" (ref e1)
- Password input: placeholder "Password" (ref e2)
- LOGIN button: role=button, name "LOGIN" (ref e3)
- Password visibility toggle: Icon button (ref e4/e5) near password field

## Notes
- Page loads with networkidle2
- No hamburger menu on login page
- Channel: automation-default

## Test run (2026-06-19)
- Channel: automation-default
- Navigated to http://192.168.20.27:5420/ — title "CMS Knitto"
- Login page verified: Username (e1), Password (e2), LOGIN button (e3), password toggle icon (e4/e5)
- Screenshot saved: login-page.png
