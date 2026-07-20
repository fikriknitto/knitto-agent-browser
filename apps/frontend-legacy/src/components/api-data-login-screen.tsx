import { useState, type FormEvent } from "react";
import {
  getApiDataBaseUrl,
  getStoredApiDataUsername,
  loginApiData,
} from "../lib/api/api-data-runs-api";
import { Button, Input, Label } from "./ui";

type ApiDataLoginScreenProps = {
  onLoggedIn: (username: string) => void;
};

export function ApiDataLoginScreen({ onLoggedIn }: ApiDataLoginScreenProps) {
  const [username, setUsername] = useState(getStoredApiDataUsername);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Username dan password wajib");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await loginApiData(username.trim(), password);
      onLoggedIn(result.user.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-slate-100">Knitto Automation</h1>
          <p className="mt-2 text-sm text-slate-400">
            Login ke Knitto Api Automation QA Data untuk menjalankan agent job.
          </p>
          <p className="mt-1 text-xs text-slate-600">{getApiDataBaseUrl()}</p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-xl border border-white/10 bg-[#161616] p-6 shadow-lg"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="api-data-username">Username</Label>
              <Input
                id="api-data-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="api-data-password">Password</Label>
              <Input
                id="api-data-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={busy}
              />
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Logging in…" : "Login"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
