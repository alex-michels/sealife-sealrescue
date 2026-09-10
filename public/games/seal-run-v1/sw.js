// SR-11: only this game's immutable assets. Never cache APIs, cookies or scores.
const VERSION = 'seal-run-expedition-art-2'
const ROOT = new URL('./', self.location.href).pathname
const FILES = [
  'index.html',
  'assets/coastal-v1.webp',
  'assets/coastal-v1-thumb.webp',
  'assets/atlantis-v1.webp',
  'assets/atlantis-v1-thumb.webp',
  'assets/tropical-v1.webp',
  'assets/tropical-v1-thumb.webp',
  'assets/arctic-v1.webp',
  'assets/arctic-v1-thumb.webp',
  'assets/antarctic-v1.webp',
  'assets/antarctic-v1-thumb.webp',
  'style.css',
  'game.js',
  'boot.js',
  'i18n.js',
  'audio.js',
  'core/alias.js',
  'core/biomes.js',
  'core/balance.js',
  'core/course.js',
  'core/sim.js',
  'core/theme.js',
  'core/chunks/index.js',
  'core/chunks/coastal-01.js',
  'core/chunks/coastal-02.js',
  'core/chunks/coastal-03.js',
  'core/chunks/coastal-04.js',
  'core/chunks/coastal-05.js',
  'core/chunks/coastal-06.js',
  'core/chunks/coastal-07.js',
  'core/chunks/coastal-08.js',
  'core/chunks/coastal-09.js',
  'core/chunks/coastal-10.js',
  'core/chunks/coastal-11.js',
  'core/chunks/coastal-12.js',
  'core/chunks/coastal-13.js',
  'core/chunks/coastal-14.js',
  'core/chunks/coastal-15.js',
  'core/chunks/coastal-16.js',
  'core/chunks/coastal-17.js',
  'core/chunks/coastal-18.js',
  'core/chunks/biomes.js',
  'render/art.js',
  'render/expedition.js',
  'render/scene.js',
  'render/motion.js',
  'vendor/phaser.esm.js',
]
const ASSETS = new Set(FILES.map((file) => ROOT + file))
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll([...ASSETS]))
      .then(() => self.skipWaiting()),
  ),
)
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('seal-run-') && key !== VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !ASSETS.has(url.pathname)
  )
    return
  // Navigation is network-first so the standalone config always gets a fresh chance.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(ROOT + 'index.html')))
    return
  }
  event.respondWith(
    caches
      .open(VERSION)
      .then(async (cache) => (await cache.match(url.pathname)) || fetch(event.request)),
  )
})
