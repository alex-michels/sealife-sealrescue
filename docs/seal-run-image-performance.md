# Seal Run image performance review — 2026-09-10

> These SR-21 numbers describe the v6 delivery snapshot from 2026-09-10. SR-22 replaces only the grey/Weddell faces with v7 atlases; the chapter-lifecycle browser test still enforces the 20 MiB texture budget. See [current comfort review](seal-run-visual-comfort-review.md).

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

Baseline inventory of v5 commit e7d5e252, before SR-21 optimizations, using desktop Chromium WebGL
and five consecutive PlayScene replacements in one Phaser.Game. TextureManager source sizes
were enumerated after each first rendered frame. Bytes below are width × height × 4, an RGBA8
base-level estimate. They are **not measured VRAM allocations or total browser memory**, and
exclude possible mipmaps, render targets, driver overhead and browser-side decoded/canvas copies.
SR-21 adds a repeatable desktop/headless comparison below, including mobile viewport emulation.
No physical-phone benchmark was performed. FPS improvements are not inferred from memory savings.

The baseline offline manifest listed **71 WebP files, 2,651,654 bytes** (2.65 MB decimal) for all five
courses, including menu plates and scenery. They are not all needed to render a single course.
That baseline service worker warmed the complete game cache; critical Play decoding was course-specific.

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

## Implemented recommendations 1–4 (SR-21)

1. **Only allocate live common textures.** Removed creation of the old seal pair, generic
   predators/rock, three unused background layers and foam: 8.19 MiB of RGBA8 base allocations.
   Fish, nets, plastic and skerry caps remain shared. Actual scenery fallbacks are retained.
2. **Give chapter textures a bounded lifetime.** Procedural player frames and rocks are
   released on scene shutdown. Atlantis and Antarctica use generated heroes and skip the
   unused eight-frame procedural allocation entirely. Decoded image loaders retain only
   the current chapter/habitat, rather than every visited species and decoration. Revisit
   may require an image reload; the browser/offline cache supplies already fetched files.
3. **Compose each hull once.** One 800×220 hull and one 384×192 atlas of eight padded 96×96
   rotor frames replace eight full hull composites: 0.95 MiB instead of 5.37 MiB per chapter.
   Paired pooled sprites share the original propeller center and remain axis-aligned.
   Only the motor's collision disc damages the seal; full-length hull culling is retained.
4. **Use trimmed atlases and compact mobile panoramas.** Ten animal atlases replace forty
   separate runtime frame files. Two leopard sizes share one atlas. Cropping retains every
   nonzero-alpha pixel; two-pixel edge extrusion and Phaser source-size/trim metadata preserve
   registration, filtering and collision origins. Five 1620×540 panorama variants replace
   2172×724 sources when the viewport's shorter side is ≤600px at chapter load. Only that
   habitat's props load. Art dimensions do not swap during resize mid-run. Animals keep
   their source detail; no SVG conversion or creative regeneration was needed.

Reproduce asset delivery files with `node public/games/seal-run-v1/tools/pack-art.mjs`.
The ten WebP atlases total 652,308 bytes; the five compact panoramas total 496,574 bytes.
Original generated frames remain versioned as source assets, outside the runtime manifest.
The current precache contains **41 WebP files, 2,487,226 bytes** (2.49 MB); optional full-size
desktop panoramas add transfers only when requested. These counts exclude JS/HTML/CSS.
The service worker precaches compact panoramas and live atlases. Full desktop panoramas
are cached on demand, with compact fallback when offline before the full file was fetched.

[MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
support eager resource release, explicit per-pixel budgets and batching/atlasing. The changes below address the concrete allocations found here. Target-phone measurements
remain distinct from a desktop browser with a mobile viewport.

## Related correctness fix

The intermittent marks ahead of Galapagos sharks and northern orcas came from source-atlas
slicing: a neighbouring pose's tail extended into the next cell. They were not a reason to
replace WebP with SVG. V5 extraction insets and full-alpha connected-component regressions fix
that issue; see the [asset manifest](../public/games/seal-run-v1/assets/prompts-v5.json).

## SR-21 measured comparison

Raw samples and source dimensions: [performance results](seal-run-image-performance-results.json).
Reproduce against the baseline's public directory with
`node public/games/seal-run-v1/tools/profile-art.mjs <baseline-public-dir>`.
The same desktop Chromium WebGL engine runs six chapter replacements, a fixed seed and
middle-course starting position, with 10 warm-up and 60 measured frames per chapter.
Mobile means a 390×844 viewport on this computer, not a phone. Assets use a local no-store
HTTP server; these load timings do not model a cellular network. No browser page errors occurred.

| Chapter in sequence | Before MiB | After desktop MiB | After mobile viewport MiB | Source entries before → after |
| --- | ---: | ---: | ---: | ---: |
| coastal | 29.09 | 14.76 | 12.10 | 53 → 28 |
| atlantis | 33.56 | 14.09 | 11.43 | 67 → 22 |
| tropical | 33.66 | 14.82 | 12.16 | 71 → 28 |
| arctic | 34.19 | 14.21 | 11.55 | 77 → 28 |
| antarctic | 39.52 | 12.64 | 9.98 | 94 → 21 |
| coastal (return) | 38.41 | 14.76 | 12.10 | 89 → 28 |

Peak RGBA8 base texture-source budget drops **39.52 → 14.82 MiB (62.5%)** on desktop and
**39.52 → 12.16 MiB (69.2%)** with compact panoramas. The repeat Coastal visit has exactly
the same count/bytes as its first visit. These are allocation estimates, not total VRAM.

Initial Coastal image requests fall **21 → 8**. Later chapters use 5–6 image requests,
with 7 on return to Coastal instead of the baseline's 1: loader cleanup trades decoded
retention for reloads, which the normal browser/service-worker cache can serve.

The renderer remains at **3 p95 draw calls per sampled frame** both before and after.
Per-chapter p95 frame intervals are 139.4–152.8 ms before and 130.6–157.5 ms after on desktop;
mobile-viewport ranges are 136.4–149.9 and 139.2–157.8 ms. This headless environment is slow
and variable; this sample **does not demonstrate an FPS gain**. CPU render-submission timings,
scene creation and load timings are retained in the JSON and must not be confused with GPU
execution time. A target-phone sustained performance check remains a separate measurement.

Validation: all 18 static browser scenarios passed (one additional production-only redirect
case is skipped by the static harness). The new lifetime/20 MiB mobile-budget and offline
compact-fallback tests also passed after final fixture type cleanup. Existing complete-alpha,
hit-circle, animation, full-length hull, five-course sweep and re-entry checks remain active.
TypeScript passes; lint has zero errors and 16 pre-existing warnings.
