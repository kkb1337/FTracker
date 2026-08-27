const CACHE_VERSION = 'ftracker-v1.0.5-final';
const CACHE_NAME = CACHE_VERSION;
const APP_SHELL = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
const STATIC_DESTINATIONS = new Set(['style','script','font','image','manifest']);
const isSameOrigin=r=>new URL(r.url).origin===self.location.origin;
const isNavigation=r=>r.mode==='navigate'||r.destination==='document'||r.headers.get('accept')?.includes('text/html');
const isStatic=r=>STATIC_DESTINATIONS.has(r.destination)||/\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|gif|webp|svg|ico|json)$/i.test(new URL(r.url).pathname);
async function precache(){const c=await caches.open(CACHE_NAME); await Promise.all(APP_SHELL.map(async u=>{try{await c.add(u)}catch(e){console.warn('precache failed',u,e)}}));}
async function navigation(request){try{const r=await fetch(request,{cache:'no-store'}); if(r.ok){const c=await caches.open(CACHE_NAME); c.put('./index.html',r.clone()).catch(()=>{});} return r;}catch(e){return (await caches.match('./index.html'))||(await caches.match('./'))||new Response('<h1>Offline</h1><p>Приложение ещё не было сохранено для офлайн-режима.</p>',{headers:{'Content-Type':'text/html;charset=utf-8'},status:503});}}
async function stale(request){const c=await caches.open(CACHE_NAME), cached=await c.match(request); const update=fetch(request,{cache:'no-cache'}).then(r=>{if(r.ok||r.type==='opaque')c.put(request,r.clone()).catch(()=>{});return r}).catch(()=>null); return cached||await update||Response.error();}
self.addEventListener('install',e=>e.waitUntil(precache()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||!isSameOrigin(r))return;if(isNavigation(r)){e.respondWith(navigation(r));return;}if(isStatic(r))e.respondWith(stale(r));});
