# Game image assets

## Static backdrop (optional)

The game can use a static image as the play-field background instead of the procedural sea
gradient + seabed flora. The in-game **light shafts, depth tint and bubbles still draw on top**, so
the scene stays alive. If these files are absent, the procedural scene renders unchanged.

Expected files (the loader tries AVIF → WebP → JPEG, first that loads wins):

```
assets/backdrop-landscape.{avif,webp,jpg}   used when the field is landscape/square (w ≥ h)
assets/backdrop-portrait.{avif,webp,jpg}    used in portrait (falls back to landscape if absent)
```

- Drawn **cover-fit, anchored to the bottom** — keep the seabed/corals along the lower edge and
  open, foggy water up top, so horizontal cropping on different aspect ratios is harmless.
- A **foggy / blurred** look is ideal: it compresses tiny and shows no artifacts when scaled.
- Match the water palette in `core/theme.js` (teal surface → ink deep) so the overlays blend.
- The image is decoded before first use → no half-loaded flash; the gradient shows until ready.
- Borders on >2:1 screens stay **procedural** (kelp walls / seabed / sky) — the backdrop is the
  play field only.

The committed files are **placeholders** (see `tools/make-placeholder-backdrop.mjs`). Replace them
with real art at the same names.

## Encoding (backdrop **and** covers)

`tools/encode-image.mjs` turns any source PNG/JPG into optimized AVIF + WebP + JPEG. Run from this
game dir (`public/games/seal-hunt-v1`):

```bash
# backdrop (soft-blur a sharp source into the foggy look)
node tools/encode-image.mjs backdrop-src.png --name backdrop-landscape --out assets --width 1600 --blur 2
node tools/encode-image.mjs backdrop-portrait-src.png --name backdrop-portrait --out assets --width 900 --blur 2

# covers (same tool — start/end screen background in index.html / og:image)
node tools/encode-image.mjs cover-src.png        --name cover        --out . --width 1200
node tools/encode-image.mjs cover-mobile-src.png --name cover_mobile --out . --width 800
```

Regenerate the placeholders any time with `node tools/make-placeholder-backdrop.mjs`.
