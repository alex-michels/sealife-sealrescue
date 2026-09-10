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

The **11 v2 assets total 867,870 bytes**; the combined 21 v1/v2 images total **1,549,098 bytes**.
The selected final prompts and source identifiers are in [prompts-v2.json](prompts-v2.json).
No third-party reference photography is distributed.

## Composition and loading

`render/expedition.js` loads same-origin versioned assets and keeps the procedural ocean
as a fallback. Missing or slow background artwork cannot prevent practice: image loading has a six-second
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

## Surface hazards and predators (v3; hulls superseded by v4)

Eighteen alpha-preserving WebP files (398,174 bytes) replace the
procedural bear/leopard placeholders and add five distinct vessel/motor designs. Each
vessel has a separate body/shaft and face-on propeller. The coastal industrial motor,
fictional antique Atlantis mechanism, improvised tropical canoe motor, Arctic icebreaker
and Antarctic research vessel have individual generated designs. These are game concepts,
not engineering diagrams or a claim that ancient ships had motor propellers.

Polar bear and leopard seal have four registered swimming frames each. Bears face left
and paddle their front paws beneath the torso. Leopard seals have a long head, open jaws,
visible canines and long foreflippers, distinct from the playable Weddell seal. The supplied
leopard photograph was used as an image-generation reference, not redistributed.

Exact prompts, original generation identifiers and frame registration are in
[prompts-v3.json](prompts-v3.json). Built-in image_gen was used for all seven source assets.
The delivery pipeline crops/registers the parts, preserves alpha and exports WebP at
quality 86–88, alpha quality 100. Rotor exports are padded around the hub to 256×256;
animal frames are 384×220. Runtime canvas composition makes eight rotor frames, so the
moving Phaser sprite itself never rotates. A steady ring outlines the swept danger disc.

Critical hazard images load before the chapter starts (8-second deadline, deduplicated
requests). Failure returns to the menu with Retry, rather than playing with invisible
hazards. Decorative scenery still has its procedural fallback. Scene shutdown releases
the composed hazard textures. Reduced motion fixes both rotor and swim animation at frame
zero while preserving the visible danger ring, course movement and collision rules.


## Full submerged hulls and regional fauna (v4)

33 new alpha-preserving WebPs total 794,798 bytes. Five 1024×683 lower hulls
replace the v3 stern fragments in runtime and offline cache. Their complete submerged
length is shown; any structure above water is clipped at the surface. V3 256×256 rotating
propellers remain separate; only the outlined disc is collidable. Eight composed frames
use 800×220 canvases and a registered propeller centre (100,162), avoiding moving rotated
Phaser quads. Culling includes the full trailing hull width.

Four sharks (porbeagle, white, Galapagos, tiger), two orca appearances (northern/general,
Antarctic Type B1-inspired) and the Atlantis grey-seal juvenile each have four 400×280
frames. All were generated with the built-in image_gen tool. Exact final prompts, source
identifiers, frame shifts and file names are in [prompts-v4.json](prompts-v4.json).
Original 2×2 atlases use 768×512 cells. Alpha bounds (>2) are copied with the recorded
padding and registration shifts into transparent 800×560 canvases, then downsampled 2×.
Exports use WebP quality 88 (hulls 87), alpha quality 100. No source photograph is shipped.
Rejected opaque/checkerboard outputs and the incorrectly marked first porbeagle are unused.

The owner's grey-seal photographs informed the plump juvenile proportions, spotted coat,
short foreflippers and visible small tail between the hindflippers. The final alpha atlas
was regenerated from that visual description. The same contained frame appears on the map;
async painting is guarded against a later course selection. Animal hit circles are fully
inside the opaque body on all frames, with species-specific registered origins in core/fauna.js.

On mobile, Phaser proportionally scales the same fixed 960×540 field and WebP textures.
There is no alternate lower-resolution mobile download. Only the selected chapter's critical
art is decoded for Play (deduplicated 8-second requests); failures return a retryable error.
GPU textures are released on chapter shutdown; decoded sprite files form a finite cache.
AI provenance remains visible in the RU/EN menu.

## Weddell pup and corrected atlas extraction (v5)

The Antarctic player and cover now use four new 400×280 true-alpha WebPs of a Weddell
seal pup (80,016 bytes), generated with built-in image_gen from the owner's visual
references. Rounded head, neck folds, grey/cream coat, two webbed hind feet and a short
central tail distinguish it from the adult leopard-seal hazards. Upright near/far paddles
change their projected breadth during the illustrated lateral stroke. The three procedural
player models use corresponding eight-frame paddle geometry; Atlantis retains its grey juvenile.

Two frames each of the v4 northern orca and Galapagos shark accidentally included a small
part of the left neighbour's tail during atlas slicing. Their v5 exports inset the right
column by 12 (orca) or 22 (shark) source pixels before compositing, without painting, masking, shifting or
cropping the intended animal. Frames 0 and 2 are byte-identical copies; frames 1 and 3
are re-extracted from the original generated RGBA atlases. The four other predator atlases
passed the same complete-alpha scan. The browser regression now detects detached opaque
fragments larger than two pixels, beyond checking only transparent corners.

All 12 v5 files total 178,954 bytes. Exact prompts, source filenames, frame
registration, extraction insets and export filenames: [prompts-v5.json](prompts-v5.json).
The Weddell atlas uses the same 2×2 / 800×560 registration and 400×280 WebP quality 88,
alpha quality 100 pipeline as v4. Mobile downloads the same files and scales them
proportionally; no separate resolution variant. Menu loads are guarded against stale
course selection, critical Play loads remain retryable, reduced motion fixes frame zero,
and the versioned offline cache uses the new files.
