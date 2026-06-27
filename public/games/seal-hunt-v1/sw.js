// sw.js – minimal static cache, scoped to /games/seal-hunt-v1/.
// Paths are RELATIVE (resolve against the SW scope), so they work under the subpath.
const CACHE = 'seal-hunt-static-v2';
const ASSETS = [
  './', './index.html', './style.css',
  './game.js', './i18n.js', './core/balance.js', './core/input.js',
  './entities/seal.js', './entities/prey.js', './render/scenery.js',
  './favicon.svg', './manifest.webmanifest'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch', e=>{
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then(r => r || fetch(request))
  );
});
