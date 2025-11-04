// sw.js
const CACHE = 'browser-llm-v1';
const STATIC_ASSETS = ['/', '/index.html']; // 必要に応じて追加

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

// モデル配布CDNはRange RequestやCORS対応済みの場合が多い。
// ここでは「ネット優先→失敗時キャッシュ」＋成功レスもキャッシュ更新。
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // POST/非GETは素通し
  if (req.method !== 'GET') return;

  // 画像やモデル分割(.bin/.wasm/.params.json等)も対象にする
  event.respondWith((async () => {
    try {
      const net = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, net.clone());
      return net;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      // 最終手段：トップへ
      if (req.mode === 'navigate') return caches.match('/index.html');
      throw new Error('offline and not cached');
    }
  })());
});
