const CACHE_VERSION = 'ftracker-v1.4.19-neutral-notifications';
const CACHE_NAME = CACHE_VERSION;
const APP_SHELL = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE_NAME);await c.addAll(APP_SHELL);await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await Promise.all((await caches.keys()).filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const r=event.request;if(r.method!=='GET')return;
 if(r.mode==='navigate'){
  event.respondWith((async()=>{const c=await caches.open(CACHE_NAME);try{const n=await fetch(r,{cache:'no-store'});if(n&&n.ok)c.put('./index.html',n.clone());return n;}catch(e){return (await c.match('./index.html'))||(await c.match('./'))||Response.error();}})());return;
 }
 event.respondWith((async()=>{const c=await caches.open(CACHE_NAME);const hit=await c.match(r);if(hit)return hit;try{const n=await fetch(r);if(n&&n.ok)c.put(r,n.clone());return n;}catch(e){return Response.error();}})());
});
