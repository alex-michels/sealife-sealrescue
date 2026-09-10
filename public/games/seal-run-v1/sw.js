// SR-11: only this game's immutable assets. Never cache APIs, cookies or scores.
const VERSION = 'seal-run-expedition-packed-art-7'
const ROOT = new URL('./', self.location.href).pathname
const FILES = [
  'index.html',
  'core/fauna.js',
  'render/atlas-data.js',
  'assets/porbeagle-atlas-v6.webp',
  'assets/white-shark-atlas-v6.webp',
  'assets/galapagos-shark-atlas-v6.webp',
  'assets/tiger-shark-atlas-v6.webp',
  'assets/orca-northern-atlas-v6.webp',
  'assets/orca-antarctic-atlas-v6.webp',
  'assets/weddell-pup-atlas-v6.webp',
  'assets/grey-seal-atlas-v6.webp',
  'assets/polar-bear-atlas-v6.webp',
  'assets/leopard-seal-atlas-v6.webp',
  'assets/boat-coastal-v4-hull.webp',
  'assets/boat-coastal-v3-propeller.webp',
  'assets/boat-atlantis-v4-hull.webp',
  'assets/boat-atlantis-v3-propeller.webp',
  'assets/boat-tropical-v4-hull.webp',
  'assets/boat-tropical-v3-propeller.webp',
  'assets/boat-arctic-v4-hull.webp',
  'assets/boat-arctic-v3-propeller.webp',
  'assets/boat-antarctic-v4-hull.webp',
  'assets/boat-antarctic-v3-propeller.webp',
  'assets/coastal-panorama-mobile-v6.webp',
  'assets/atlantis-panorama-mobile-v6.webp',
  'assets/tropical-panorama-mobile-v6.webp',
  'assets/arctic-panorama-mobile-v6.webp',
  'assets/antarctic-panorama-mobile-v6.webp',
  'assets/scenery-kelp-v2.webp',
  'assets/scenery-boulders-v2.webp',
  'assets/scenery-arch-v2.webp',
  'assets/scenery-reef-v2.webp',
  'assets/scenery-sea-ice-v2.webp',
  'assets/scenery-glacier-v2.webp',
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
  'render/scenery.js',
  'render/hazards.js',
  'render/motion.js',
  'vendor/phaser.esm.js',
]
// Precache native-height panoramas; large desktop variants are cached on demand.
const OPTIONAL = ['coastal', 'atlantis', 'tropical', 'arctic', 'antarctic'].map(
  (b) => 'assets/' + b + '-panorama-v2.webp',
)
const ASSETS = new Set([...FILES, ...OPTIONAL].map((file) => ROOT + file))
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(FILES.map((file) => ROOT + file)))
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
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(url.pathname)
      if (hit) return hit
      try {
        const response = await fetch(event.request)
        if (response.ok) await cache.put(url.pathname, response.clone())
        return response
      } catch (error) {
        if (url.pathname.endsWith('-panorama-v2.webp')) {
          const compact = await cache.match(
            url.pathname.replace('-panorama-v2.webp', '-panorama-mobile-v6.webp'),
          )
          if (compact) return compact
        }
        throw error
      }
    }),
  )
})
