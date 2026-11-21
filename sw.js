/* Offline cache for Process Observation. Bump VERSION whenever any file changes. */
const VERSION = '0.7.1';
const CACHE = 'procobs-' + VERSION;
const ASSETS = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('procobs-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Serve from cache first (works with no signal), refresh the cache in the background when online. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = isPage ? './' : req;
    const hit = await cache.match(key, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res && res.ok && !res.redirected) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(network); return hit; }
    const res = await network;
    return res || new Response('Offline and not cached yet. Open the app once while online.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  })());
});
