# Rencana Agent Runtime (`AGENT`)

> **Plan ID:** `AGENT`  
> **Depends on:** `ARCH` ([plan-architecture.md](plan-architecture.md))  
> **Unlocks:** path LLM produk; cutover UI 2 runtime (butuh `MCP` untuk tools)  
> **Related:** `MCP` ([plan-mcp.md](plan-mcp.md)) · `JOB` · `ROADMAP` ([plan-roadmap.md](plan-roadmap.md))

Dokumen ini adalah **keputusan target** untuk lapisan LLM/agent di Automation Worker: hilangkan model “3 bridge setara”, ganti menjadi **2 agent runtime** — **Cursor** dan **OpenAI-compatible** (via [knitto-agent](https://github.com/knittotextile/knitto-agent)).

Terkait: `ARCH`, `MCP` (`browser_*` / `mobile_*`), as-is [architecture.md](../architecture.md), [hybrid.md](../hybrid.md).

> **As-is:** tiga `BridgeRunner` — Gemini native, Cursor SDK, 9Router OpenAI-loop.  
> **Target:** dua runtime produk; orchestrator multi-TC **tetap satu**.
> **Urutan kerja:** [plan-roadmap.md](plan-roadmap.md) wave W5 (paralel dengan `MCP` OK setelah `ARCH`).
---

## 1. Ringkasan eksekutif

Produk tidak lagi menampilkan Gemini / Cursor / 9Router sebagai tiga “bridge” setara.

| UI (pilihan agent) | Implementasi | MCP tools |
|---|---|---|
| **Cursor** | `@cursor/sdk` | **stdio** (seperti sekarang) |
| **OpenAI-compatible** | `@knittotextile/knitto-agent-core` + `@knittotextile/knitto-agent-providers` | **in-process** — wrap katalog `browser_*` / `mobile_*` |

- **9Router** = preset `baseUrl` (+ key/model) di OpenAI-compatible, bukan runtime sendiri.  
- **Gemini native di UI** = **drop**; jika masih dipakai model Gemini → lewat provider knitto-agent (`gemini` / OpenRouter), bukan bridge ketiga.  
- **Orchestrator** (`runMultiTestCaseJob`, queue, handoff, segment) **tidak diganti** — hanya adapter di bawahnya.

```text
UI: Cursor | OpenAI-compatible (baseUrl, apiKey, model)
        │
        ▼
Worker: JobQueue + test-case orchestrator
        ├─ Cursor runtime     → SDK + MCP stdio
        └─ OpenAI runtime     → knitto-agent Agent.run + MCP tools in-process
```

---

## 2. Keputusan final

| Keputusan | Ya / Tidak | Keterangan |
|---|---|---|
| Hanya **2** pilihan agent di UI | **Ya** | `Cursor` \| `OpenAI-compatible` |
| Gemini sebagai bridge/UI terpisah | **Tidak** | Drop dari UI |
| 9Router sebagai bridge/UI terpisah | **Tidak** | Masuk OpenAI-compatible (baseUrl preset) |
| OpenAI-compatible = knitto-agent | **Ya** | core `Agent` + providers `resolveModel` |
| Cursor tetap `@cursor/sdk` | **Ya** | Jalur khusus; bukan lewat knitto-agent |
| MCP OpenAI path = wrap `browser_*`/`mobile_*` in-process | **Ya** | Selaras path OpenAI-compatible; parity dengan stdio Cursor — lihat `MCP` |
| MCP Cursor = stdio | **Ya** | Tidak diubah konsepnya |
| Orchestrator multi-TC diganti knitto-agent Session/subagent | **Tidak** | Orchestrator QA tetap di Worker |
| Istilah produk “bridge” (3 buah) | **Tidak** | Ganti ke **agent** / **runtime** |
| Akses package `@knittotextile/*` | **Ya** | GitHub Packages + auth `gh` / `NODE_AUTH_TOKEN` |

### Istilah

| Nama | Bukan | Arti |
|---|---|---|
| **Agent runtime** | “Bridge Gemini/9Router” | Cursor atau OpenAI-compatible |
| **OpenAI-compatible** | Hanya OpenAI.com | Endpoint chat/tools bergaya OpenAI (`baseURL` + key + model), termasuk 9Router/OpenRouter/Ollama/dll. |
| **Orchestrator** | Agent LLM | Control plane multi-TC di Worker |

---

## 3. As-is → target (pemetaan)

| As-is | Target |
|---|---|
| `GeminiBridgeService` + `@google/genai` | Hapus dari UI; opsional model via knitto-agent `provider: "gemini"` atau OpenRouter |
| `NinerouterBridgeService` + `openai-agent.ts` | Diganti **OpenAI-compatible** runtime (knitto-agent); 9Router = preset env/UI |
| `CursorBridgeService` + `@cursor/sdk` | Tetap **Cursor** runtime (rename istilah bridge → agent) |
| `BridgeRegistryService` (3 bridge) | Registry **2 runtime** (atau config map `cursor` \| `openai`) |
| Settings “Bridge credentials” | “Agent credentials” — Cursor key \| OpenAI baseUrl/key/model |

---

## 4. OpenAI-compatible + knitto-agent

### 4.0 Split stack (as-is)

| Use case | HTTP client |
|---|---|
| Mission plan, prompt shortcut generate, model catalog | Official **`openai` npm SDK** (`chat.completions`, `models.list`) — selaras dokumentasi LiteLLM |
| Job automation (MCP + multi-step) | `knitto-agent-core` + `@ai-sdk/openai` `.chat()` via `resolveOpenaiChatModel` |

Satu-turn **tidak** lewat knitto-agent-providers; job runtime tetap knitto-agent.

### 4.1 Package

| Package | Peran |
|---|---|
| `@knittotextile/knitto-agent-core` | `Agent`, events (`tool.start` / `text.delta` / `done`), `mcpServers` / `tools`, middleware |
| `@knittotextile/knitto-agent-providers` | `resolveModel({ provider, model, apiKey, baseURL })` — `openai` \| `gemini` \| `openrouter` \| `ollama` |

Registry publish: `https://npm.pkg.github.com/` (scoped `@knittotextile`).

### 4.2 Model resolution (produk)

Untuk UI **OpenAI-compatible**, default pemakaian:

```ts
resolveModel({
  provider: "openai",
  model: userSelectedModel,
  apiKey: userOrEnvKey,
  baseURL: userOrEnvBaseUrl, // wajib untuk 9Router / proxy internal
});
```

- `provider: "openai"` + `baseURL` memakai `compatibility: "compatible"` di providers (sudah ada di knitto-agent).  
- Preset contoh: Base URL 9Router dari env (`NINEROUTER_BASE_URL` atau nama baru `OPENAI_COMPAT_BASE_URL`).  
- Gemini/OpenRouter/Ollama = konfigurasi lanjutan / env, **bukan** tab UI ketiga.

### 4.3 Tools MCP

| Mode | Cara |
|---|---|
| **In-process (prefer Worker)** | `connectAutomationMcp` (atau setara setelah rename `browser_*`) → map ke AI SDK `ToolSet` → `new Agent({ tools })` |
| **Stdio (opsional)** | knitto-agent `mcpServers: { browser: { type: "stdio", ... } }` — berguna jika ingin parity dengan Cursor; path utama produk tetap in-process agar session Playwright/Appium satu proses dengan Worker |

Progress ke UI: map event knitto-agent (`tool.start`, `tool.done`, `text.delta`, `done`) → payload `agent_job` WS yang sudah ada.

### 4.4 Contoh bentuk runner (konseptual)

```ts
const model = resolveModel({
  provider: "openai",
  model,
  apiKey,
  baseURL,
});

const agent = new Agent({
  name: "qa-automation",
  model,
  tools: mcpToolSetFromInProcessClient(mcpClient), // browser_* + mobile_* sesuai job
});

for await (const event of agent.run([], promptText)) {
  // emit agent_job progress / tool name / terminal
}
```

Multi-TC: orchestrator memanggil runner **per TC** (sama pola `TestCaseAgentRunner` hari ini); ganti isi runner Gemini/9Router menjadi knitto-agent.

---

## 5. Cursor runtime

- Tetap `@cursor/sdk` + MCP **stdio** + cleanup `cursor-subprocess`.  
- Credentials: Cursor API key + model catalog seperti sekarang.  
- Tidak digabung ke knitto-agent (protokol & transport beda).  
- Orchestrator tetap inject `createCursorTestCaseRunner`-setara.

---

## 6. UI & kontrak

| Elemen | Target |
|---|---|
| Picker agent | `Cursor` \| `OpenAI-compatible` |
| Form Cursor | API key, model |
| Form OpenAI-compatible | **Base URL**, API key, model (opsional daftar model dari endpoint `/models` jika ada) |
| Preset | Tombol/isi cepat “9Router” mengisi Base URL dari env |
| WS / job message | Field runtime id: `cursor` \| `openai` (ganti / alias `bridgeId` lama dengan migrasi kompatibel singkat) |

---

## 7. Relasi orchestrator & MCP

| Lapisan | Tetap / berubah |
|---|---|
| `JobQueue` | Tetap (boleh per-runtime concurrency) |
| `test-case-orchestrator` | Tetap (segment, handoff, fail-skip) |
| `prompt-builder` / hybrid | Tetap |
| `multi-test-*.ts` | Disederhanakan: `multi-test-cursor` + `multi-test-openai` (hapus gemini/ninerouter terpisah) |
| Katalog tool | Ikuti [plan-mcp.md](plan-mcp.md) — `browser_*` / `mobile_*`; Playwright tetap |

---

## 8. Auth & install package

1. `.npmrc` (dev/CI): `@knittotextile:registry=https://npm.pkg.github.com`  
2. Token: `NODE_AUTH_TOKEN` / `GH_TOKEN` dari `gh auth token` (scope `repo` / `read:packages` sesuai kebijakan org).  
3. Dependensi Worker: `@knittotextile/knitto-agent-core`, `@knittotextile/knitto-agent-providers`.  
4. Repo private: clone/inspect via `gh` (sudah diverifikasi akun org).

---

## 9. Non-goals

- Tidak mempertahankan 3 bridge di UI.  
- Tidak mengganti orchestrator QA dengan Session/subagent knitto-agent sebagai control plane multi-TC.  
- Tidak memaksa Cursor lewat knitto-agent.  
- Tidak bahas ganti engine browser di dokumen ini (lihat plan-mcp: Playwright).  
- Tidak menjadikan API Data tempat jalan agent.

---

## 10. Fase migrasi

Dependensi: `ARCH` dulu; paralel dengan `MCP` dual-register. Indeks: [plan-roadmap.md](plan-roadmap.md).

| Fase | Hasil | Selesai jika |
|---|---|---|
| **0. Align** | Dokumen ini disetujui | Istilah runtime Cursor / OpenAI-compatible dipakai |
| **1. Package wiring** | `.npmrc` + install knitto-agent di Worker | `import { Agent }` typecheck |
| **2. OpenAI runtime MVP** | Ganti path 9Router → knitto-agent + in-process MCP | Job single-TC OpenAI-compatible jalan |
| **3. Multi-TC** | `TestCaseAgentRunner` OpenAI via knitto-agent | Hybrid/multi-TC + segment/handoff OK |
| **4. UI cutover** | Hanya 2 pilihan agent; preset 9Router baseUrl | Tidak ada tab Gemini/9Router bridge |
| **5. Hapus Gemini bridge** | Hapus service/runner Gemini native dari tree (atau tinggal dead code dibuang) | Tidak ada `GEMINI_API_KEY` wajib di UI bridge |
| **6. Rename protokol** | `bridgeId` → `agentRuntime` (alias sementara OK) | FE/BE docs selaras |
| **7. Docs** | Update features/api/architecture as-is setelah cutover | Konsisten dengan plan |

---

## 11. Keputusan ringkas

| Pertanyaan | Jawaban |
|---|---|
| Berapa agent di UI? | **2** — Cursor \| OpenAI-compatible |
| Gemini bridge UI? | **Drop** |
| 9Router? | **Preset Base URL** di OpenAI-compatible |
| Library OpenAI path? | **knitto-agent** (core + providers) |
| MCP OpenAI path? | In-process wrap `browser_*` / `mobile_*` |
| MCP Cursor? | Stdio |
| Orchestrator? | **Tetap** di Worker |
| Package registry? | GitHub Packages `@knittotextile` + auth `gh` |
