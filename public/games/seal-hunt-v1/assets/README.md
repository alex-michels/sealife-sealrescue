# Game image assets

## Static backdrop (optional)

The game can use a static image as the play-field background instead of the flat procedural sea
gradient. The in-game **light shafts, depth tint, bubbles AND the animated swaying kelp/grass still
draw on top**, so the scene stays alive. If these files are absent, the procedural scene renders
unchanged.

Expected files (the loader tries AVIF → WebP → JPEG, first that loads wins):

```
assets/backdrop-landscape.{avif,webp,jpg}   used when the field is landscape/square (w ≥ h)
assets/backdrop-portrait.{avif,webp,jpg}    used in portrait (falls back to landscape if absent)
```

- Covers the **play field only** (the 2:1-clamped centre), **cover-fit, anchored to the bottom** —
  keep the seabed/corals along the lower edge and open, foggy water up top, so cropping on different
  aspect ratios is harmless.
- **Top edge ≈ `#3C7C97`, bottom edge ≈ `#0B2832`** (the CSS page background) so it blends into the
  game gradient and the dark page; the placeholder generator already does this exactly.
- **Design it to sit BEHIND the animated kelp**: corals / rocks / fog, *no big foreground kelp*
  (the swaying kelp/grass is drawn on top by the game — bake-in kelp would double up).
- **Match the water palette** in `core/theme.js` (teal surface `water.surface` → ink deep
  `water.floor`, kelp greens) so the on-top light shafts, bubbles and kelp blend seamlessly.
- A **foggy / blurred** look is ideal: it compresses tiny and shows no artifacts when scaled.
- The image is decoded before first use → no half-loaded flash; the gradient shows until ready.
- On **>2:1 / >1:2** screens the leftover **border stays procedural and ANIMATED** — swaying
  kelp-walls on the sides, rippling sea surface + drifting boats on top, sand/rocks seabed at the
  bottom. The backdrop image is the play field only; the border frames it as before.

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
