const CACHE='cwe-detailing-v3';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('cwe-detailing-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(res=>{if(res.ok&&new URL(event.request.url).origin===self.location.origin){const clone=res.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone))}return res}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))))});
