export const MODAL_FORM_SUBMIT_WORKFLOW = `
Modal form submit workflow (when user asks to save, create, or submit a form in a modal/popup):
1. automation_get_page_snapshot inside the open modal after all fields are filled — do NOT reuse refs from list/page context or stale memory
2. Find the submit button: role=button with name Simpan, Save, or Submit (case-insensitive); avoid Batal, Cancel, Tutup, Close, X, Delete, Hapus
3. If the submit button is off-screen, automation_scroll with locator set to the modal container (not full-page scroll)
4. automation_click the submit button; automation_wait_for (network_idle or success text/locator)
5. Verify data was saved (automation_assert_text / list snapshot) — the modal may close only after a successful submit
6. Do NOT dismiss the modal with Escape, X, Batal/Cancel, or backdrop click when the task is to save or fill the form
`;

export const MODAL_DISMISS_WORKFLOW = `
Modal dismiss workflow (only when the user explicitly asks to cancel or close without saving):
1. automation_get_page_snapshot — confirm the modal is open
2. Close in this order (never use Escape — it is blocked by the tool):
   - Batal / Cancel: automation_click { role: "button", name: "Batal" } or "Cancel"
   - Close / X / Tutup: automation_click the close button (often Icon button in the modal header)
   - Backdrop click: automation_click_at at coordinates outside the modal dialog bbox (e.g. dimmed area to the left of bbox.x, mid viewport y — must not overlap the modal bbox)
3. automation_get_page_snapshot again to confirm the modal is gone
4. Do NOT use automation_press_key with Escape
`;
