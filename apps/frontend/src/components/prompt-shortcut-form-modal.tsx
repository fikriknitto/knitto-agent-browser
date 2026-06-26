import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  createPromptShortcut,
  extractTemplatePlaceholders,
  generatePromptShortcutTemplate,
  type PromptShortcut,
  type PromptShortcutVariant,
  updatePromptShortcut,
} from "../lib/prompt-shortcuts";
import { modalBackdrop, modalHeader, modalTitle } from "../lib/ui";
import { Button, ButtonIcon, Input, Label, Select, Textarea } from "./ui";

type PromptShortcutFormModalProps = {
  mode: "create" | "edit";
  shortcut: PromptShortcut | null;
  open: boolean;
  busy: boolean;
  selectedBridgeId: string;
  selectedModel: string;
  canGenerate: boolean;
  onClose: () => void;
  onSaved: (shortcut: PromptShortcut) => void;
  onBusyChange: (busy: boolean) => void;
};

const VARIANTS: PromptShortcutVariant[] = ["blue", "green", "amber", "neutral"];

type DefaultsRow = { key: string; value: string };

function defaultsToRows(defaults: Record<string, string>): DefaultsRow[] {
  const entries = Object.entries(defaults);
  return entries.length ? entries.map(([key, value]) => ({ key, value })) : [{ key: "", value: "" }];
}

function rowsToDefaults(rows: DefaultsRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (key) result[key] = row.value;
  }
  return result;
}

export function PromptShortcutFormModal({
  mode,
  shortcut,
  open,
  busy,
  selectedBridgeId,
  selectedModel,
  canGenerate,
  onClose,
  onSaved,
  onBusyChange,
}: PromptShortcutFormModalProps) {
  const [label, setLabel] = useState("");
  const [variant, setVariant] = useState<PromptShortcutVariant>("neutral");
  const [template, setTemplate] = useState("");
  const [defaultsRows, setDefaultsRows] = useState<DefaultsRow[]>([{ key: "", value: "" }]);
  const [brief, setBrief] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && shortcut) {
      setLabel(shortcut.label);
      setVariant(shortcut.variant);
      setTemplate(shortcut.template);
      setDefaultsRows(defaultsToRows(shortcut.defaults));
    } else {
      setLabel("");
      setVariant("neutral");
      setTemplate("");
      setDefaultsRows([{ key: "", value: "" }]);
    }
    setBrief("");
    setError("");
  }, [open, mode, shortcut]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy && !generating) {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, busy, generating, onClose]);

  if (!open) return null;

  const handleGenerate = async () => {
    if (!canGenerate || !brief.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const result = await generatePromptShortcutTemplate({
        bridgeId: selectedBridgeId,
        model: selectedModel,
        brief: brief.trim(),
        label: label.trim() || undefined,
      });
      setTemplate(result.template);
      if (result.label && !label.trim()) setLabel(result.label);
      if (result.defaults && Object.keys(result.defaults).length) {
        setDefaultsRows(defaultsToRows(result.defaults));
      } else if (result.template) {
        setDefaultsRows(defaultsToRows(extractTemplatePlaceholders(result.template)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate prompt");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!label.trim() || !template.trim()) {
      setError("Label dan template wajib diisi");
      return;
    }

    onBusyChange(true);
    setError("");
    try {
      const payload = {
        label: label.trim(),
        variant,
        template: template.trim(),
        defaults: rowsToDefaults(defaultsRows),
      };

      const saved =
        mode === "create"
          ? await createPromptShortcut(payload)
          : await updatePromptShortcut(shortcut!.id, payload);

      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan prompt shortcut");
    } finally {
      onBusyChange(false);
    }
  };

  const updateDefaultRow = (index: number, field: "key" | "value", value: string) => {
    setDefaultsRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addDefaultRow = () => {
    setDefaultsRows((rows) => [...rows, { key: "", value: "" }]);
  };

  const removeDefaultRow = (index: number) => {
    setDefaultsRows((rows) => (rows.length <= 1 ? [{ key: "", value: "" }] : rows.filter((_, i) => i !== index)));
  };

  const isBusy = busy || generating;

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4" role="presentation">
      <div
        className={modalBackdrop}
        aria-label="Tutup"
        onClick={() => {
          if (!isBusy) onClose();
        }}
      />
      <div
        className="relative z-[1] flex max-h-[92vh] w-[min(96vw,720px)] flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(12,14,22,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-shortcut-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={`${modalHeader} shrink-0 border-b border-white/8 pb-3`}>
          <h2 id="prompt-shortcut-form-title" className={modalTitle}>
            {mode === "create" ? "Buat prompt shortcut" : "Edit prompt shortcut"}
          </h2>
          <ButtonIcon
            type="button"
            className="h-8 w-8 min-w-0 border-0 bg-transparent! text-xl text-slate-300 hover:bg-slate-600/85 hover:text-slate-50"
            aria-label="Tutup"
            disabled={isBusy}
            onClick={onClose}
          >
            <XIcon size={16} />
          </ButtonIcon>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Label>
              Label
              <Input
                value={label}
                disabled={isBusy}
                placeholder="Login CMS"
                onChange={(e) => setLabel(e.target.value)}
              />
            </Label>
            <Label>
              Variant
              <Select
                value={variant}
                disabled={isBusy}
                onChange={(e) => setVariant(e.target.value as PromptShortcutVariant)}
              >
                {VARIANTS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </Label>
          </div>

          {mode === "create" && (
            <div className="rounded-lg border border-white/8 bg-white/2 p-3">
              <Label>
                Deskripsi singkat (untuk AI)
                <Textarea
                  value={brief}
                  disabled={isBusy}
                  className="mt-1.5 min-h-20"
                  placeholder="Contoh: Login ke CMS — buka {url}, isi username/password, verifikasi dashboard"
                  onChange={(e) => setBrief(e.target.value)}
                />
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!canGenerate || !brief.trim() || generating}
                  onClick={() => void handleGenerate()}
                >
                  {generating ? "Generating…" : "Generate dengan AI"}
                </Button>
                {!canGenerate && (
                  <span className="text-xs text-slate-500">
                    Connect bridge dan pilih model di header chat
                  </span>
                )}
              </div>
            </div>
          )}

          <Label>
            Defaults
            <div className="mt-1.5 flex flex-col gap-2">
              {defaultsRows.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={row.key}
                    disabled={isBusy}
                    placeholder="url"
                    onChange={(e) => updateDefaultRow(index, "key", e.target.value.replace(/\s+/g, "_"))}
                  />
                  <Input
                    value={row.value}
                    disabled={isBusy}
                    placeholder="nilai default"
                    onChange={(e) => updateDefaultRow(index, "value", e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isBusy}
                    onClick={() => removeDefaultRow(index)}
                  >
                    −
                  </Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="ghost" disabled={isBusy} onClick={addDefaultRow}>
                + Tambah default
              </Button>
            </div>
          </Label>

          <Label>
            Template
            <Textarea
              value={template}
              disabled={isBusy}
              className="mt-1.5 min-h-56 font-mono text-xs"
              placeholder="1. Open {url}\n2. Enter {username}.\n..."
              onChange={(e) => setTemplate(e.target.value)}
            />
          </Label>

          {error && <p className="m-0 text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-white/8 pt-3">
            <Button type="button" size="sm" variant="ghost" disabled={isBusy} onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" size="sm" variant="primary" disabled={isBusy}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

type DeletePromptShortcutModalProps = {
  shortcut: PromptShortcut | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeletePromptShortcutModal({
  shortcut,
  busy,
  onClose,
  onConfirm,
}: DeletePromptShortcutModalProps) {
  useEffect(() => {
    if (!shortcut) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [shortcut, busy, onClose]);

  if (!shortcut) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4" role="presentation">
      <div
        className={modalBackdrop}
        aria-label="Tutup"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        className="relative z-[1] w-[min(92vw,420px)] overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(12,14,22,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-prompt-shortcut-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={`${modalHeader} border-b border-white/8 pb-3`}>
          <h2 id="delete-prompt-shortcut-title" className={modalTitle}>
            Hapus prompt shortcut
          </h2>
          <ButtonIcon
            type="button"
            className="h-8 w-8 min-w-0 border-0 bg-transparent! text-xl text-slate-300 hover:bg-slate-600/85 hover:text-slate-50"
            aria-label="Tutup"
            disabled={busy}
            onClick={onClose}
          >
            <XIcon size={16} />
          </ButtonIcon>
        </header>
        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="m-0 text-sm leading-relaxed text-slate-300">
            Hapus shortcut &quot;{shortcut.label}&quot; ({shortcut.id})? File markdown akan dihapus
            dari folder prompt-shortcuts.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onClose}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              className="bg-red-600 hover:bg-red-500"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? "Menghapus…" : "Hapus"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
