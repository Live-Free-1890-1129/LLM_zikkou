const CACHE = 'browser-llm-v2';
const STATIC_ASSETS = ['/', '/index.html', '/sw.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ← CDN(別オリジン)は触らない

  event.respondWith((async () => {
    try {
      const net = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, net.clone());
      return net;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') return caches.match('/index.html');
      throw new Error('offline and not cached');
    }
  })());
});
