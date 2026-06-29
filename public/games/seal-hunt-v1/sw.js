// sw.js — network-first cache, scoped to /games/seal-hunt-v1/.
//
// Strategy: try the network first and refresh the cache on every successful GET, so
// players ALWAYS get the latest build when online; fall back to cache only when offline.
// (Cache-first previously pinned stale art/code until the cache name changed.)
// skipWaiting + clients.claim make a new SW take control immediately on reload.
const CACHE = 'seal-hunt-static-v6';
const ASSETS = [
  './', './index.html', './style.css',
  './game.js', './i18n.js', './core/balance.js', './core/input.js', './core/theme.js', './core/leaderboard.js', './core/alias.js',
  './entities/seal.js', './entities/prey.js', './render/scenery.js',
  './favicon.svg', './manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin pass through
  // Не кэшируем API лидерборда/токенов (play-token, сабмиты, чтение доски) — только статику игры.
  // На standalone-домене (sealthehunter.online) scope SW = '/', поэтому фильтр по пути обязателен.
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(
    fetch(request)
      .then((res) => {
        // refresh the cache with the fresh copy (clone before the body is consumed)
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request)) // offline → serve last-known copy
  );
});
