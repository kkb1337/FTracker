// [FIX] PWA cache version is unified with index.html and manifest.json.
const CACHE_VERSION = 'ftracker-v1.3.14-no-auto-first-set';
const CACHE_NAME = CACHE_VERSION;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

function sameOrigin(request){
  try { return new URL(request.url).origin === self.location.origin; }
  catch (_) { return false; }
}

function isNavigation(request){
  return request.mode === 'navigate' || request.destination === 'document';
}

function isStaticAsset(request){
  const d = request.destination;
  if (['style','script','font','image','manifest'].includes(d)) return true;
  try {
    return /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|gif|webp|svg|ico|json)$/i.test(new URL(request.url).pathname);
  } catch (_) { return false; }
}

async function putInCache(cache, request, response){
  if (response && (response.ok || response.type === 'opaque')) {
    await cache.put(request, response.clone());
  }
}

async function appShellFallback(cache){
  return (await cache.match('./index.html')) ||
         (await cache.match('./')) ||
         Response.error();
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache the complete local application shell before activating this worker.
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Keep previous caches until the new shell is confirmed installed; install is transactional.
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !sameOrigin(request)) return;

  if (isNavigation(request)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      // Offline reliability first: once installed, the PWA shell always comes from cache.
      const cached = await cache.match('./index.html') || await cache.match('./');
      if (cached) {
        // Refresh in background when online without delaying startup.
        event.waitUntil(fetch(request).then(r => putInCache(cache, request, r)).catch(() => {}));
        return cached;
      }
      try {
        const network = await fetch(request);
        await putInCache(cache, request, network);
        return network;
      } catch (_) {
        return appShellFallback(cache);
      }
    })());
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const network = await fetch(request);
        await putInCache(cache, request, network);
        return network;
      } catch (_) {
        return Response.error();
      }
    })());
  }
});
