# Seal Run environment assets

Generated on 2026-09-10 with the **built-in imagegen tool**. These are AI-generated
illustrative environments, not location photographs. The game displays this provenance
in RU/EN on its map. No runtime generation or third-party image requests occur.

## Shipped layers

| File family | Environment | Role |
| --- | --- | --- |
| coastal-v1 | North Atlantic kelp and coastal rock | Coast cover, card, game water |
| atlantis-v1 | Fictional sunken stone city | Fantasy cover, card, game water |
| tropical-v1 | Hawaiian volcanic reef | Tropical cover, card, game water |
| arctic-v1 | Seasonal sea ice and low rocky seabed | Arctic cover, card, game water |
| antarctic-v1 | Deep blue water and glacial ice shelf | Antarctic cover, card, game water |

Every family has a 1536×1024 WebP and a 320×180 bottom-cropped `-thumb.webp`.
The ten delivered images total 681,228 bytes. Main encodes use Sharp WebP quality 78;
thumbnails quality 65. Both use effort 5. PNG generation originals remain in the local
imagegen output archive; only optimized delivery assets belong in this public directory.

Exact final generation prompts and tool provenance are in [prompts.json](prompts.json).
These describe each plate independently, reserving open central water for readable play.
The images are decorative, carry no factual labels, and include no animals or interfaces.

## Composition and loading

`render/expedition.js` loads same-origin versioned assets and keeps the procedural ocean
as a fallback. Missing or slow artwork cannot prevent practice: image loading has a six-second
limit. The menu fetches the selected plate and small cards; subsequent chapters load their
plate before the scene is built. A download after Play caches all five for offline practice.

The cover character is a **separate contained canvas**. It is never baked into a crop-to-fill
background. It shares the animated game's phocid model: paired webbed hindflippers, a distinct
short tail, compact foreflippers with claws, small ear openings, whiskers and coat variants.
The location caption participates in the menu grid, above the route cards.

Generated plates supply static realism; two sparse particle layers supply parallax.
The game's animals, fish, rocks, ice and debris remain individually drawn and pooled.
Collision geometry is independent of background pictures.

## Extending the art set

Use versioned siblings for replacements and update the service-worker asset version/list.
Retain the exact prompt and inspect the result at both cover and gameplay sizes.

Useful next independent asset types, if the art direction is expanded: transparent coastal
rock/ice silhouettes; isolated ghost-net and plastic cutouts; a dedicated cover illustration.
Keep collision edges readable, preserve actual alpha, and do not bake animals, text or HUD
into an environment plate. Any generated seal must be checked against the anatomy reference
and retain the visible tail between its hindflippers; an animation atlas needs consistent
anatomy and registration across every frame.
