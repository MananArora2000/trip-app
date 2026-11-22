// Our trips service worker: app shell cache-first (refreshed in background), encrypted docs (d/*.webp = AES-GCM ciphertext, not real images) cache-first forever.
const CACHE = 'trip-868be404b1';
const DOCS = 'trip-docs-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
// cache:'reload' so a new version never picks up a stale copy from the browser's HTTP cache (GitHub Pages sends max-age=600)
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== DOCS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/d/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(DOCS).then(x => x.put(req, c)); } return r; })));
    return;
  }
  const key = req.mode === 'navigate' ? 'index.html' : req;
  e.respondWith(caches.match(key, {ignoreSearch: true}).then(hit => {
    const net = fetch(req.mode === 'navigate' ? 'index.html' : req.url, {cache: 'no-cache'}).then(r => { if (r.ok && r.type === 'basic') { const c = r.clone(); caches.open(CACHE).then(x => x.put(key, c)); } return r; })
      .catch(() => hit || new Response('Offline', {status: 503}));
    return hit || net;
  }));
});
