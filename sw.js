const CACHE_VERSION = 'ftracker-v1.0.20';
const CACHE_NAME = CACHE_VERSION;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const STATIC_DESTINATIONS = new Set([
  'style',
  'script',
  'font',
  'image',
  'manifest'
]);

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isExerciseRemoteMedia(request) {
  try { const origin = new URL(request.url).origin; return origin === 'https://upload.wikimedia.org' || origin === 'https://exercise-dataset.com'; }
  catch (_) { return false; }
}

function isNavigation(request) {
  return request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.headers.get('accept')?.includes('text/html');
}

function isStatic(request) {
  if (STATIC_DESTINATIONS.has(request.destination)) return true;
  const url = new URL(request.url);
  return /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|gif|webp|svg|ico|json)$/i.test(url.pathname);
}

async function putInCache(request, response) {
  if (!response || (!response.ok && response.type !== 'opaque')) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      await putInCache(request, response);
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkUpdate = fetch(request, { cache: 'no-cache' })
    .then(response => {
      if (response.ok || response.type === 'opaque') {
        return cache.put(request, response.clone()).then(() => response);
      }
      return response;
    })
    .catch(() => null);

  return cached || await networkUpdate || Response.error();
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  if (isExerciseRemoteMedia(request)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (!isSameOrigin(request)) return;

  if (isNavigation(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStatic(request)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
