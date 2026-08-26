// FTracker Service Worker
// Minimal reliable worker: no stale HTML/CSS cache.
// Keeps PWA installation valid without forcing old layouts.

const SW_VERSION = "ftracker-sw-v2-unified-layout";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim()
  );
});

self.addEventListener("fetch", (event) => {
  // Network-first behaviour.
  // No aggressive cache so PWA does not keep old layout files.
});
