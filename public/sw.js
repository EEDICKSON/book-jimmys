// public/sw.js
// Service Worker for Book Jimmy's PWA
// Handles caching for offline support and fast loading

const CACHE_NAME = "bookjimmys-v1";

// Pages to cache immediately on install
const STATIC_CACHE = [
  "/",
  "/play",
  "/leaderboard",
  "/daily",
  "/profile",
  "/hall-of-fame",
  "/manifest.json",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── INSTALL ───────────────────────────────────────────────
// Cache static pages when the service worker first installs
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE).catch(() => {
        // Some pages may not be available — that is fine
      });
    }),
  );
  self.skipWaiting();
});

// ── ACTIVATE ──────────────────────────────────────────────
// Clean up old caches when a new service worker activates
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────────────
// Network first for API calls — always fresh data
// Cache first for static assets — fast loading
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go to network for API routes — never cache quiz data
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(JSON.stringify({ error: "You appear to be offline" }), {
            headers: { "Content-Type": "application/json" },
            status: 503,
          }),
      ),
    );
    return;
  }

  // For pages and assets — try network first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        // Network failed — try cache
        caches.match(request).then(
          (cached) =>
            cached ||
            // Nothing in cache either — show offline page
            caches.match("/").then(
              (home) =>
                home ||
                new Response("You are offline. Please check your connection.", {
                  status: 503,
                  headers: { "Content-Type": "text/plain" },
                }),
            ),
        ),
      ),
  );
});
