# Seal Run environment assets

Generated on 2026-09-10 with the **built-in imagegen tool**. These are AI-generated
illustrative environments, not location photographs. The game displays this provenance
in RU/EN on its map. No runtime generation or third-party image requests occur.

## Shipped layers

| File family | Environment | Role |
| --- | --- | --- |
| coastal-v1 | North Atlantic kelp and coastal rock | Coast cover, card, fallback water |
| atlantis-v1 | Fictional sunken stone city | Fantasy cover, card, fallback water |
| tropical-v1 | Hawaiian volcanic reef | Tropical cover, card, fallback water |
| arctic-v1 | Seasonal sea ice and low rocky seabed | Arctic cover, card, fallback water |
| antarctic-v1 | Deep blue water and glacial ice shelf | Antarctic cover, card, fallback water |

Every family has a 1536×1024 WebP and a 320×180 bottom-cropped `-thumb.webp`.
The ten v1 images total 681,228 bytes. Main encodes use Sharp WebP quality 78;
thumbnails quality 65. Both use effort 5. PNG generation originals remain in the local
imagegen output archive; only optimized delivery assets belong in this public directory.

Exact v1 generation prompts and tool provenance are in [prompts.json](prompts.json).
These describe each plate independently, reserving open central water for readable play.
The images are decorative, carry no factual labels, and include no animals or interfaces.

## Marathon scenery (v2)

Five new *-panorama-v2.webp plates are **2172×724 (3:1)**. At a logical height of
540, each spans 1620 units: the 960-unit viewport reveals its left edge at departure and
its right edge at 900 m. They do not loop. WebP quality 80, effort 5.

Six separate scenery-*-v2.webp cutouts provide kelp, boulders, a fictional stone arch,
a volcanic reef, seasonal sea ice and glacial ice. A generated transparent atlas was
exported into individual alpha-preserving WebPs (quality 82, alpha quality 100, effort 5).
Each object fits its cell; three-pixel padding remains around its visible alpha bounds.
Rejected atlas edits with a baked checkerboard were not shipped.

The **11 v2 assets total 867,870 bytes**; all 21 delivered images total **1,549,098 bytes**.
The selected final prompts and source identifiers are in [prompts-v2.json](prompts-v2.json).
No third-party reference photography is distributed.

## Composition and loading

`render/expedition.js` loads same-origin versioned assets and keeps the procedural ocean
as a fallback. Missing or slow artwork cannot prevent practice: image loading has a six-second
limit. The menu fetches the selected plate and small cards; subsequent chapters load their
plate before the scene is built. A download after Play caches all five for offline practice.

The cover character is a **separate contained canvas**. It is never baked into a crop-to-fill
background. It shares the animated game's phocid model: paired webbed hindflippers, a distinct
short tail, compact foreflippers with claws, small ear openings, whiskers and coat variants.
The location caption participates in the menu grid, above the route cards.

The menu uses the v1 plate. In play, render/scenery.js composes the distance-driven
panorama, three independent prop planes (16%, 40%, 72% of world speed), gentle scale-based
kelp sway, a Phaser TileSprite light pattern and a bounded ParticleEmitter (36 motes).
All decor sits behind gameplay. Pausing freezes it; reduced motion freezes scenery and
hides shimmer/particles. Generated decorative rocks are distinct from solid game terrain.
Collision geometry is independent of all background pictures.

Loading uses same-origin URLs, deduplicated requests and a six-second image timeout;
missing art falls back to procedural scenery. Chapter shutdown releases panorama/prop GPU
textures. Only two decoded panoramas are retained; tiny shimmer/mote textures are shared.
The service worker caches the complete versioned set, never APIs or scores.

## Extending the art set

Use versioned siblings for replacements and update the service-worker asset version/list.
Retain the exact prompt and inspect the result at both cover and gameplay sizes.

Further independent asset types: isolated ghost-net and plastic cutouts, or a dedicated cover illustration.
Keep collision edges readable, preserve actual alpha, and do not bake animals, text or HUD
into an environment plate. Any generated seal must be checked against the anatomy reference
and retain the visible tail between its hindflippers; an animation atlas needs consistent
anatomy and registration across every frame.
