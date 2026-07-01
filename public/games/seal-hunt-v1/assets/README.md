# Game image assets

## Static backdrop (optional)

One static image is painted **across the WHOLE viewport** (the play field AND the >2:1 / >1:2
border), so it reads as a single continuous scene. The game's **animated layer draws on top** and
both adds life *and* marks where play ends: **swaying kelp-walls** at the side edges, a **rippling
water surface + a small boat** at the top edge, and **seabed grass** at the bottom edge — plus soft
light shafts, bubbles and the field's swaying kelp. The art supplies the *static* rocks/corals; the
game supplies all motion. If these files are absent, the fully procedural scene renders unchanged.

Expected files (the loader tries AVIF → WebP → JPEG, first that loads wins):

```
assets/backdrop-landscape.{avif,webp,jpg}   landscape/square screens — author ULTRA-WIDE (~21:9)
assets/backdrop-portrait.{avif,webp,jpg}    portrait screens — author ULTRA-TALL (~9:21)
```

- **Author for the widest / tallest case** (ultra-wide ~21:9, ultra-tall ~9:21). One landscape
  image serves every landscape screen; one portrait image serves every portrait screen. It's
  **cover-fit**: landscape is **bottom-anchored** (seabed on the floor; open water cropped from the
  top on a 16:9 monitor → ~12% off the sides), portrait is **TOP-anchored** (the deep dark bottom is
  cropped on shorter phones; the lit top stays). Flip the anchor in `drawBackdropFullscreen` to taste.
- **Put corals/rocks across the full bottom width**, including the far left/right where the kelp-walls
  sit (ultra-wide) and a **deep, dark rocky bottom** (ultra-tall). No foreground kelp/seaweed and no
  creatures/boat — the game draws those, animated, on top.
- **Top edge ≈ `#3C7C97`, bottom edge ≈ `#0B2832`** (= the CSS page background) so it blends into the
  game gradient and the dark page.
- **Match the water palette** in `core/theme.js` (teal `water.surface` → `water.floor`, kelp greens).
- A **foggy / blurred** look is ideal: it compresses tiny and shows no artifacts when scaled.
- The image is decoded before first use → no half-loaded flash; the gradient shows until ready.

The committed files are **placeholders** (see `tools/make-placeholder-backdrop.mjs`). Replace them
with real art at the same names.

## Encoding (backdrop **and** covers)

`tools/encode-image.mjs` turns any source PNG/JPG into optimized AVIF + WebP + JPEG. Run from this
game dir (`public/games/seal-hunt-v1`):

```bash
# Source PNGs live in assets/ as *-src.png (git-ignored — large, local-only); outputs go to assets/.
# backdrop (soft-blur a sharp source into the foggy look)
node tools/encode-image.mjs assets/backdrop-landscape-src.png --name backdrop-landscape --out assets --width 1600 --blur 2
node tools/encode-image.mjs assets/backdrop-portrait-src.png  --name backdrop-portrait  --out assets --width 900  --blur 2

# covers (same tool — start/end screen background in style.css / og:image). cover.jpg stays JPEG for OG;
# the browser gets AVIF/WebP via image-set(). The portrait cover is browser-only (never OG).
node tools/encode-image.mjs assets/cover-src.png        --name cover        --out assets --width 1200
node tools/encode-image.mjs assets/cover-mobile-src.png --name cover_mobile --out assets --width 1080
```

Regenerate the placeholders any time with `node tools/make-placeholder-backdrop.mjs`.
