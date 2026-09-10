# Seal Run image performance review — 2026-09-10

## Decision

Keep realistic animals, vessels and environments as WebP delivery assets. Do not redraw them
as SVG solely for speed. SVG remains appropriate for simple UI icons and editable source
shapes, but Phaser's SVG loader creates a bitmap texture: at equal raster dimensions it does
not remove the texture's pixel-memory or per-frame rendering costs. See [Phaser's texture
guide](https://docs.phaser.io/phaser/concepts/textures) and [SVG loader](https://docs.phaser.io/api-documentation/class/loader-filetypes-svgfile), checked 2026-09-10.

For this project, realistic fur, mottling and shaded anatomy are suited to the existing raster
art. A detailed vector reconstruction would require a visual redesign or many paths; wrapping
a raster in SVG would retain the bitmap. Neither is a demonstrated performance improvement.
Confidence: high for the rasterization pipeline; medium for the asset-specific redesign tradeoff.

## Measurement and limits

Inventory of the current v5 working tree (based on fafec0ad), using desktop Chromium WebGL
and five consecutive PlayScene replacements in one Phaser.Game. TextureManager source sizes
were enumerated after each first rendered frame. Bytes below are width × height × 4, an RGBA8
base-level estimate. They are **not measured VRAM allocations or total browser memory**, and
exclude possible mipmaps, render targets, driver overhead and browser-side decoded/canvas copies.
No phone or embedded-browser frame-time benchmark was performed. FPS improvements are not claimed.

The offline manifest lists **71 WebP files, 2,651,654 bytes** (2.65 MB decimal) for all five
courses, including menu plates and scenery. They are not all needed to render a single course.
The service worker warms the complete game cache; critical Play decoding is course-specific.

| Consecutive chapter | Texture-source entries | RGBA8 base estimate (MiB) |
| --- | ---: | ---: |
| Coastal | 53 | 29.09 |
| Atlantis | 67 | 33.56 |
| Hawaii | 71 | 33.66 |
| Arctic | 77 | 34.19 |
| Antarctic | 94 | 39.52 |

Examples make the download/runtime distinction clear:

- The four Weddell-pup WebPs total 80,016 bytes on disk, but four 400×280 textures occupy
  1.71 MiB at RGBA8 base level. SVG rasterized at 400×280 would have the same pixel budget.
- The Antarctic 2172×724 panorama is 114,418 bytes on disk and about 6.00 MiB decoded RGBA8.
- Nets and plastic already come from one-time Canvas drawing, then cached Phaser textures:
  320×400 and 280×240, together about 0.74 MiB. They are not redrawn procedurally each frame.

## Priorities before changing formats

1. **Stop creating unused legacy textures.** The old seal pair, generic predators/rock,
   three background layers and foam consume 8.19 MiB at base level, although the expedition
   uses replacement art. Split the common fish/net/plastic/cap textures from obsolete art.
   Keep genuine fallbacks lazy. Source: render/art.js buildTextures, called by
   render/expedition.js buildExpeditionTextures.
2. **Release or avoid unused procedural player frames.** Eight 360×192 frames per biome
   remain in the shared TextureManager after chapter replacement. After five biomes they
   total 10.55 MiB; in the final generated-pup chapter none is used. Generated Atlantis and
   Antarctic players do not need those eight procedural game frames created at all. The menu
   fallback can still draw directly to its own canvas. This is bounded accumulation across
   the five known biomes, not an unlimited leak on every restart.
3. **Separate hull from rotor animation.** Eight 800×220 composites duplicate the whole
   submerged hull, consuming 5.37 MiB per active chapter. A single hull plus eight small
   precomposed rotor frames would use roughly 0.91 MiB at 88×88 rotor size: about 4.46 MiB
   less, before padding. Keep both Phaser sprites axis-aligned and share the current
   collision origin; do not reintroduce the moving/rotating-quad bug. This estimate is a
   proposed implementation budget, not a measured saving yet.
4. **Share the leopard atlas between hazard sizes.** Normal and large leopards currently
   register duplicate 384×220 frame canvases; display scaling could share the same four
   frames, avoiding about 1.29 MiB in Antarctica.
5. **Then evaluate packed, trimmed WebP atlases and device-aware resolution.** Preserve
   origins, extrude frame borders and test filtering so neighbouring frames cannot bleed.
   Atlas packing can reduce requests and texture switches, but does not itself reduce pixel
   memory if packing wastes space. Evaluate with draw-call/frame-time profiles rather than
   assuming one texture per sprite implies one draw call. Load only habitat props needed by
   the current chapter; consider smaller mobile panorama exports if measured pressure remains.

[MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
support eager resource release, explicit per-pixel budgets and batching/atlasing. These
recommendations address concrete allocations found here, while their FPS impact still needs
measurement on target hardware. First apply resource lifecycle and duplication fixes; compare
cold/warm loading and p50/p95 frame time on a representative phone and the embedded browser.

## Related correctness fix

The intermittent marks ahead of Galapagos sharks and northern orcas came from source-atlas
slicing: a neighbouring pose's tail extended into the next cell. They were not a reason to
replace WebP with SVG. V5 extraction insets and full-alpha connected-component regressions fix
that issue; see the [asset manifest](../public/games/seal-run-v1/assets/prompts-v5.json).
