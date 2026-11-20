/* Car Wash Express | Detailing
   v7: navigation network-first, bypass browser HTTP cache, and offline fallback.
   Application records live in localStorage and are never altered here.
*/
const CACHE_NAME = 'cwe-detailing-v7-nueva-orden';
const SHELL = [
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];
const BASE_URL = new URL(self.registration.scope);
const INDEX_URL = new URL('./index.html', BASE_URL).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Get a fresh copy when this version is installed. Do not seed the
    // offline cache from an older HTTP-cache response.
    const results = await Promise.all(SHELL.map(async file => {
      const url = new URL(file, BASE_URL).href;
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) await cache.put(url, response.clone());
        return response.ok;
      } catch (_) {
        return false;
      }
    }));
    // Leave the former worker in control if a fresh HTML shell cannot be
    // downloaded. This avoids replacing a working offline installation.
    if (!results[0]) throw new Error('No se pudo descargar index.html actualizado');
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('cwe-detailing-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Do not intercept third-party resources or other GitHub Pages sites.
  if (url.origin !== BASE_URL.origin || !url.pathname.startsWith(BASE_URL.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Always request the newest site, even when Chrome's HTTP cache has
    // an older index.html. Keep the last successful copy for offline use.
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response.ok && response.type !== 'opaque') {
        // Query parameters used to force refresh should not create multiple
        // stale versions of the same page in the cache.
        const cacheKey = request.mode === 'navigate' ? INDEX_URL : url.href;
        event.waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
      }
      return response;
    } catch (_) {
      if (request.mode === 'navigate') {
        return (await cache.match(INDEX_URL)) ||
               new Response('Sin conexión. Vuelve a intentarlo cuando tengas Internet.',
                 { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      return (await cache.match(request, { ignoreSearch: true })) || Response.error();
    }
  })());
});
