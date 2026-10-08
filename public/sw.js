// Minimal service worker: enough for installability. Data is private and always
// live from the server, so nothing is cached in Phase 1 (no offline mode yet).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
