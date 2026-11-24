import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function worker() {
  const handlers = new Map<string, (event: any) => void>();
  const records = new Map<string, Response>();
  const cache = {
    addAll: vi.fn(async () => {}),
    put: vi.fn(async (key: string, response: Response) => {
      records.set(key, response);
    }),
    match: vi.fn(async (key: string) => records.get(key)),
  };
  const fetch = vi.fn(
    async (_input: unknown) =>
      new Response('<meta name="application-name" content="BudgetFlow" />'),
  );
  const config = {
    cache: "budgetflow-test",
    routes: ["/", "/budget", "/income", "/expenses", "/savings", "/profile"],
    assets: ["/assets/app.js"],
  };
  const code = readFileSync(
    new URL("./service-worker.js", import.meta.url),
    "utf8",
  ).replace("/* BUILD_CONFIG */ {}", JSON.stringify(config));
  runInNewContext(code, {
    self: {
      addEventListener: (name: string, handler: any) =>
        handlers.set(name, handler),
      location: { origin: "https://budgetflow.example" },
      clients: { claim: vi.fn() },
      skipWaiting: vi.fn(),
    },
    caches: { open: async () => cache, keys: async () => [], delete: vi.fn() },
    fetch,
    Response,
    URL,
    Set,
  });
  const install = async () => {
    let pending: Promise<unknown> | undefined;
    handlers.get("install")!({
      waitUntil: (promise: Promise<unknown>) => {
        pending = promise;
      },
    });
    await pending;
  };
  const request = (path: string, method = "GET", mode = "navigate") => {
    let pending: Promise<Response> | undefined;
    handlers.get("fetch")!({
      request: {
        url: path.startsWith("http")
          ? path
          : "https://budgetflow.example" + path,
        method,
        mode,
      },
      respondWith: (promise: Promise<Response>) => {
        pending = promise;
      },
    });
    return pending;
  };
  return { fetch, cache, records, install, request };
}
describe("PWA shell caching and clean navigation", () => {
  it("caches the app after an authenticated successful shell load", async () => {
    const w = worker();
    await w.install();
    expect(w.records.has("/")).toBe(true);
    expect(w.cache.addAll).toHaveBeenCalledWith(["/assets/app.js"]);
  });
  it("never installs a sign-in page as the offline app", async () => {
    const w = worker();
    w.fetch.mockResolvedValue(new Response("Sign in required"));
    await expect(w.install()).rejects.toThrow("App shell unavailable");
    expect(w.records.size).toBe(0);
    expect(w.cache.addAll).not.toHaveBeenCalled();
  });
  it("opens a known clean route from its cached shell only when the network fails", async () => {
    const w = worker();
    await w.install();
    w.fetch.mockRejectedValue(new Error("Offline"));
    const response = await w.request("/expenses");
    expect(response?.status).toBe(200);
    expect(await response?.text()).toContain('content="BudgetFlow"');
  });
  it("preserves access denial even when an offline shell is available", async () => {
    const w = worker();
    await w.install();
    w.fetch.mockResolvedValue(
      new Response("Sign in required", { status: 401 }),
    );
    const response = await w.request("/income");
    expect(response?.status).toBe(401);
  });
  it("does not intercept auth routes, APIs, mutations, or external requests", () => {
    const w = worker();
    for (const path of [
      "/signin-with-chatgpt",
      "/api/profile",
      "https://elsewhere.example/income",
    ])
      expect(w.request(path)).toBeUndefined();
    expect(w.request("/income", "POST")).toBeUndefined();
  });
});
