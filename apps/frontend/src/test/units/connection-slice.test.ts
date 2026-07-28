import { describe, expect, it, beforeEach } from "vitest";
import reducer, {
  setHost,
  setWantConnected,
  setCursorKey,
  addOpenaiProvider,
  updateOpenaiProvider,
  migrateOpenaiProviders,
} from "@/redux/connectionSlice";

describe("connectionSlice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("updates host and persists wantConnected", () => {
    let state = reducer(undefined, { type: "@@init" });
    state = reducer(state, setHost("127.0.0.1"));
    expect(state.host).toBe("127.0.0.1");
    state = reducer(state, setWantConnected(true));
    expect(state.wantConnected).toBe(true);
    state = reducer(state, setCursorKey("sk-test"));
    expect(state.cursorKey).toBe("sk-test");
    const raw = localStorage.getItem("knitto-automation-web");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.host).toBe("127.0.0.1");
    expect(parsed.wantConnected).toBe(true);
  });

  it("migrates legacy openaiBaseUrl to openaiProviders", () => {
    const providers = migrateOpenaiProviders({
      openaiBaseUrl: "http://localhost:20128",
      openaiKey: "secret",
    });
    expect(providers).toHaveLength(1);
    expect(providers[0]?.baseUrl).toBe("http://localhost:20128");
    expect(providers[0]?.apiKey).toBe("secret");
    expect(providers[0]?.name).toBe("OpenAI-compatible");
  });

  it("adds and updates openai providers", () => {
    let state = reducer(undefined, { type: "@@init" });
    state = reducer(state, addOpenaiProvider());
    const id = state.openaiProviders[0]!.id;
    state = reducer(
      state,
      updateOpenaiProvider({
        id,
        patch: { name: "9Router", baseUrl: "http://localhost:20128" },
      })
    );
    expect(state.openaiProviders[0]).toMatchObject({
      id,
      name: "9Router",
      baseUrl: "http://localhost:20128",
    });
  });
});
