/* Build replaces this configuration with a release-specific, same-origin asset list. */
const CONFIG = /* BUILD_CONFIG */ {};
const CACHE = CONFIG.cache;
const ROUTES = new Set(CONFIG.routes);
const ASSETS = new Set(CONFIG.assets);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch("/", {
        credentials: "same-origin",
        cache: "reload",
      });
      // A private host can return its sign-in page. Only cache our actual app shell.
      if (
        !response.ok ||
        response.redirected ||
        !(await response.clone().text()).includes(
          'name="application-name" content="BudgetFlow"',
        )
      )
        throw new Error("App shell unavailable");
      await cache.addAll(CONFIG.assets);
      await cache.put("/", response);
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("budgetflow-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (request.mode === "navigate" && ROUTES.has(path)) {
    event.respondWith(
      (async () => {
        try {
          // Preserve server login/access responses. Fall back only when the network fails.
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match("/")) || Response.error();
        }
      })(),
    );
  } else if (ASSETS.has(url.pathname) && !url.search) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(url.pathname)) || fetch(request);
      })(),
    );
  }
});
