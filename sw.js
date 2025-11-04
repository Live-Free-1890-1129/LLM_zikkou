// sw.js — 同一オリジンのみをキャッシュ
const CACHE = 'browser-llm-v2';
const STATIC_ASSETS = ['/', '/index.html', '/sw.js']; // 必要に応じて追加

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

  // ✅ 重要：CDNなど、別オリジンのリソースは SW で扱わない（WebLLM のモデル取得を邪魔しない）
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // ルート配布物：ネット優先→成功時はキャッシュ更新→失敗時はキャッシュ
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
