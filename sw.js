const CACHE_VERSION = 'ftracker-v1.2.5-pwa-import-hotfix';
const CACHE_NAME = CACHE_VERSION;
const APP_SHELL = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
const STATIC_DESTINATIONS = new Set(['style','script','font','image','manifest']);
function sameOrigin(r){try{return new URL(r.url).origin===self.location.origin}catch(e){return false}}
function navigation(r){return r.mode==='navigate'||r.destination==='document'||r.headers.get('accept')?.includes('text/html')}
function staticAsset(r){if(STATIC_DESTINATIONS.has(r.destination))return true;try{return /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|gif|webp|svg|ico|json)$/i.test(new URL(r.url).pathname)}catch(e){return false}}
function remoteMedia(r){try{const o=new URL(r.url).origin;return o==='https://upload.wikimedia.org'||o==='https://exercise-dataset.com'}catch(e){return false}}
async function cachePut(req,res){if(!res||(!res.ok&&res.type!=='opaque'))return;const c=await caches.open(CACHE_NAME);await c.put(req,res.clone())}
async function cacheFirst(req){const c=await caches.open(CACHE_NAME);const hit=await c.match(req);if(hit)return hit;try{const res=await fetch(req);await cachePut(req,res);return res}catch(e){return Response.error()}}
async function navigationNetworkFirst(req){const c=await caches.open(CACHE_NAME);try{const r=await fetch(req,{cache:'no-cache'});if(r.ok) await cachePut(req,r.clone());return r}catch(e){const hit=await c.match(req)||await c.match('./index.html');return hit||Response.error()}}
async function mediaSWR(req){const c=await caches.open(CACHE_NAME),hit=await c.match(req);const update=fetch(req,{cache:'no-cache'}).then(r=>{if(r.ok||r.type==='opaque')return c.put(req,r.clone()).then(()=>r);return r}).catch(()=>null);return hit||await update||Response.error()}
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||!sameOrigin(r))return;if(remoteMedia(r)){e.respondWith(mediaSWR(r));return}if(navigation(r)){e.respondWith(navigationNetworkFirst(r));return}if(staticAsset(r)){e.respondWith(cacheFirst(r));}});
