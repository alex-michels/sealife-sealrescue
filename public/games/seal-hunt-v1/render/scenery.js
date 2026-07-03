// render/scenery.js
// Связная подводная сцена на бренд-палитре (baltic→ink вода, baltic-зелёные водоросли),
// мягкие лучи света от поверхности — современный, «спроектированный» вид (DESIGN_BRIEF).
import { PALETTE } from '../core/theme.js';

let bubbles = [];
let tallKelp = [], shortKelp = [], grassTufts = [], rocks = [], rays = [];
let seaGrad = null, topGrad = null, botGrad = null;

// ——— Optional static backdrop image (e.g. an AI-generated foggy coral scene). Drop files at
// assets/backdrop-landscape.{avif,webp,jpg} and assets/backdrop-portrait.{...} (see assets/README).
// When present they replace the procedural sea gradient + seabed flora as the field's base layer;
// the light shafts, depth tint and bubbles still draw on top for life. Absent → the procedural
// scene renders unchanged (no behaviour change, no console errors). The image is decoded before
// first use, so it never paints half-loaded — the gradient shows until it's ready (no pop-in).
const BACKDROP_SOURCES = {
  landscape: ['assets/backdrop-landscape.avif', 'assets/backdrop-landscape.webp', 'assets/backdrop-landscape.jpg'],
  portrait: ['assets/backdrop-portrait.avif', 'assets/backdrop-portrait.webp', 'assets/backdrop-portrait.jpg'],
};
const backdrop = { landscape: null, portrait: null }; // { img, w, h } once decoded, else null

// Try sources in order (AVIF → WebP → JPEG); resolve with the first that loads + decodes, else null.
function loadFirst(srcs) {
  return new Promise((resolve) => {
    let i = 0;
    const img = new Image();
    const tryNext = () => { if (i >= srcs.length) return resolve(null); img.src = srcs[i++]; };
    img.onerror = tryNext;
    img.onload = () => img.decode().then(
      () => resolve({ img, w: img.naturalWidth, h: img.naturalHeight }),
      tryNext,
    );
    tryNext();
  });
}

// Kick off backdrop loading once at startup. Best-effort; never throws.
export async function initBackdrop() {
  try {
    const [l, p] = await Promise.all([loadFirst(BACKDROP_SOURCES.landscape), loadFirst(BACKDROP_SOURCES.portrait)]);
    backdrop.landscape = l;
    backdrop.portrait = p || l; // portrait falls back to the landscape image if none provided
  } catch { /* keep procedural fallback */ }
}

function activeBackdrop(world) {
  const b = world.w >= world.h ? backdrop.landscape : (backdrop.portrait || backdrop.landscape);
  return b && b.img ? b : null;
}

export function isBackdropActive(world) { return !!activeBackdrop(world); }

// Paint the active backdrop across the WHOLE viewport (field + >2:1 border), so the static art
// reads as one continuous scene; the animated boundary markers (kelp-walls / water surface + boat /
// seabed grass) draw on top to show where play ends. Cover-fit, BOTTOM-anchored (seabed on the floor,
// grounding the kelp). EXCEPTION: a NON-border portrait (≤2:1, the field fills the screen) is lifted
// a touch — PORTRAIT_BOTTOM_CUT of the VIEWPORT height — to crop the deepest dark abyss band, so the
// reef stays visible near the floor but the view isn't "so deep". Bordered (>2:1) portrait keeps a
// flush bottom anchor (the bottom border + seabed handle it), as does landscape. Cut is clamped to
// the overflow so the top edge always stays covered.
const PORTRAIT_BOTTOM_CUT = 0.11; // ~11% of viewport height (≈ 90–130px); tune to taste
let bdCache = null, bdCacheKey = ''; // offscreen canvas: the cover-fit backdrop, pre-composited once
export function drawBackdropFullscreen(ctx, view, world, dpr = 1) {
  const b = activeBackdrop(world);
  if (!b) return false;
  const W = view.dispW, H = view.dispH;
  const s = Math.max(W / b.w, H / b.h);
  const dw = b.w * s, dh = b.h * s;
  const portraitNoBorder = world.h > world.w && view.oy <= 1; // ≤2:1 portrait → no top/bottom border
  const cut = portraitNoBorder ? Math.min(H * PORTRAIT_BOTTOM_CUT, dh - H) : 0;
  const dx = (W - dw) / 2, dy = (H - dh) + cut;

  // Cache the cover-fit result in an offscreen canvas at BACKING-STORE resolution — pixel-identical
  // to drawing the source each frame (same scale, no quality loss) — and blit it 1:1, so we don't
  // re-scale the source image every frame. Rebuilt only when the viewport / image / DPR changes.
  const key = `${W}|${H}|${dpr}|${b.img.currentSrc || b.img.src}`;
  if (bdCacheKey !== key) {
    bdCache = bdCache || document.createElement('canvas');
    bdCache.width = Math.max(1, Math.round(W * dpr));
    bdCache.height = Math.max(1, Math.round(H * dpr));
    const octx = bdCache.getContext('2d');
    octx.clearRect(0, 0, bdCache.width, bdCache.height);
    octx.drawImage(b.img, dx * dpr, dy * dpr, dw * dpr, dh * dpr);
    bdCacheKey = key;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // blit at backing-store 1:1 (caller's DPR transform restored after)
  ctx.drawImage(bdCache, 0, 0);
  ctx.restore();
  return true;
}

// The game's own water gradient as a translucent wash over the WHOLE viewport (field + border),
// so the backdrop art reads with consistent surface-light + depth across every screen/aspect — one
// cohesive palette on top, characters still pop above it. Subtle on purpose (don't bury the art).
let _waterGrad = null, _waterGradH = 0;
export function drawWaterGradient(ctx, view) {
  const { dispW, dispH } = view;
  if (!_waterGrad || _waterGradH !== dispH) { // gradient is static per viewport height → build once
    const g = ctx.createLinearGradient(0, 0, 0, dispH);
    g.addColorStop(0.0, 'rgba(237,241,243,0.06)'); // soft surface light up top
    g.addColorStop(0.18, 'rgba(237,241,243,0)');
    g.addColorStop(0.62, 'rgba(11,40,50,0)');
    g.addColorStop(1.0, 'rgba(11,40,50,0.34)'); // depth darkening toward the floor
    _waterGrad = g; _waterGradH = dispH;
  }
  ctx.fillStyle = _waterGrad;
  ctx.fillRect(0, 0, dispW, dispH);
}

function makeSeaGradient(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, world.h);
  g.addColorStop(0.0, PALETTE.water.surface);
  g.addColorStop(0.32, PALETTE.water.mid);
  g.addColorStop(0.7, PALETTE.water.deep);
  g.addColorStop(1.0, PALETTE.water.floor);
  return g;
}

// — Animated-kelp colour: an underwater GREEN in varied dark "Stufen" (random base lightness), with
// a darker-base → lighter-tip gradient per strand. ~1/3 of strands SHIMMER (переливаются). The spec
// is built once per strand; kelpStroke() rebuilds the gradient each frame so the shimmer animates.
function makeKelpColor() {
  return {
    hue: 142 + Math.random() * 30,   // green → teal-green (142–172); never toward cyan/blue
    sat: 44 + Math.random() * 18,    // 44–62% — stays green (not grey) even when it brightens
    lBase: 12 + Math.random() * 13,  // base lightness = the "Stufe" (12–25%; dark green)
    shimmer: Math.random() < 0.34,
    phase: Math.random() * Math.PI * 2,
  };
}
// Gradient stroke for one strand: base (x0,y0) darker → tip (x1,y1) lighter. The shimmer drifts only
// LIGHTNESS + SATURATION (HUE stays fixed in the green range), so it never washes toward blue or grey
// as it brightens. Saturation is floored (never greys) and the tip lightness capped (never pale) —
// the whole strand stays inside a narrow dark-green band.
function kelpStroke(ctx, col, x0, y0, x1, y1, t, reduced) {
  let l = col.lBase, sat = col.sat;
  if (col.shimmer && !reduced) { const s = Math.sin(t * 0.7 + col.phase); l += s * 4; sat += s * 7; }
  sat = Math.max(36, Math.min(70, sat));
  const lRoot = Math.max(7, l), lTip = Math.min(l + 9, 33);
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, `hsl(${col.hue}, ${sat}%, ${lRoot}%)`);
  g.addColorStop(1, `hsl(${col.hue}, ${sat}%, ${lTip}%)`);
  return g;
}

export function initScenery(world, ctx) {
  seaGrad = makeSeaGradient(ctx, world);

  const topH = Math.min(180, world.h * 0.24);
  topGrad = ctx.createLinearGradient(0, 0, 0, topH);
  topGrad.addColorStop(0, 'rgba(237,241,243,0.10)');
  topGrad.addColorStop(1, 'rgba(237,241,243,0.00)');

  const botY = world.h * 0.66;
  botGrad = ctx.createLinearGradient(0, botY, 0, world.h);
  botGrad.addColorStop(0, 'rgba(11,40,50,0.00)');
  botGrad.addColorStop(1, 'rgba(11,40,50,0.45)');

  // soft light shafts from the surface
  const rayCount = Math.max(2, Math.round(world.w / 360));
  rays = Array.from({ length: rayCount }, (_, i) => ({
    x: (i + 0.5) * world.w / rayCount + (Math.random() - 0.5) * world.w * 0.1,
    w: world.w * (0.05 + Math.random() * 0.06),
    phase: Math.random() * Math.PI * 2,
  }));

  bubbles = Array.from({ length: 26 }, () => ({
    x: Math.random() * world.w, y: Math.random() * world.h,
    r: 1 + Math.random() * 3, s: 8 + Math.random() * 12,
  }));

  const rockCount = Math.max(2, Math.round(world.w / 500));
  rocks = Array.from({ length: rockCount }, () => ({
    x: Math.random() * world.w, w: 60 + Math.random() * 120, h: 20 + Math.random() * 30,
  }));

  const kelpCols = Math.max(3, Math.round(world.w / 320));
  tallKelp = Array.from({ length: kelpCols }, (_, i) => ({
    x: (i + 0.5) * world.w / (kelpCols + 1),
    h: world.h * (0.42 + Math.random() * 0.4), // longer kelp (was 0.28–0.56)
    col: makeKelpColor(),
    swayPhase: Math.random() * Math.PI * 2,
  }));

  const shortCount = Math.max(4, Math.round(world.w / 260));
  shortKelp = Array.from({ length: shortCount }, () => ({
    x: Math.random() * world.w,
    h: world.h * (0.2 + Math.random() * 0.18), // taller (was 0.12–0.24)
    col: makeKelpColor(),
    swayPhase: Math.random() * Math.PI * 2,
  }));

  const tuftCount = Math.max(5, Math.round(world.w / 280));
  grassTufts = Array.from({ length: tuftCount }, () => ({
    x: Math.random() * world.w,
    blades: 6 + (Math.random() * 5 | 0),
    h: world.h * (0.1 + Math.random() * 0.1),
    width: 10 + Math.random() * 18,
    c: `hsl(${160 + Math.random() * 22}, 40%, ${15 + Math.random() * 7}%)`, // dark, slightly varied
    phase: Math.random() * Math.PI * 2,
  }));
}

export function drawBackground(ctx, world, t, reducedMotion = false, bottomExtra = 0) {
  // `bottomExtra` (world units) extends the seabed flora below the field down to the SCREEN bottom
  // in backdrop mode, so kelp/grass grow from the real (art) seabed on >1:2 screens instead of the
  // field edge that floats above it. floorY = where the plants are rooted (tips keep their y).
  const floorY = world.h + bottomExtra;
  // Base layer: when a backdrop is active it's already painted across the whole viewport (by
  // drawBackdropFullscreen), so here we fill the procedural sea gradient only when there's none.
  // Everything below (light shafts, tint, bubbles, swaying kelp/grass) draws on top either way.
  const bd = activeBackdrop(world);
  if (!bd) {
    ctx.fillStyle = seaGrad || PALETTE.water.mid;
    ctx.fillRect(0, 0, world.w, world.h);
  }

  // Light shafts (additive, subtle). A soft blur diffuses the hard polygon edges so they read as
  // hazy god-rays rather than crisp beams — kept dim (PALETTE.rays) so they don't fight the art.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (typeof ctx.filter === 'string') ctx.filter = `blur(${Math.round(Math.min(world.w, world.h) * 0.022)}px)`;
  for (const ray of rays) {
    const sway = reducedMotion ? 0 : Math.sin(t * 0.3 + ray.phase) * world.w * 0.02;
    const tx = ray.x + sway;
    const drift = world.h * 0.18;
    ctx.fillStyle = PALETTE.rays;
    ctx.beginPath();
    ctx.moveTo(tx - ray.w * 0.5, 0);
    ctx.lineTo(tx + ray.w * 0.5, 0);
    ctx.lineTo(tx + ray.w * 1.3 + drift, world.h);
    ctx.lineTo(tx + ray.w * 0.2 + drift, world.h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Surface glow + depth vignette — field-only. In backdrop mode these are replaced by the
  // screen-wide drawWaterGradient (applied to field + border) so the tint is consistent everywhere.
  if (!bd) {
    const topH = Math.min(180, world.h * 0.24);
    ctx.fillStyle = topGrad || 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, world.w, topH);

    const botY = world.h * 0.66;
    ctx.fillStyle = botGrad || 'rgba(0,0,0,0)';
    ctx.fillRect(0, botY, world.w, world.h - botY);
  }

  // Bubbles
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = PALETTE.bubble;
  for (const b of bubbles) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    b.y -= (reducedMotion ? 0.2 : 0.6) + b.s * 0.005;
    if (b.y < -10) { b.y = world.h + 10; b.x = Math.random() * world.w; }
  }
  ctx.globalAlpha = 1;

  // Animated seabed flora (swaying kelp / grass) — drawn on top of the backdrop image too, so the
  // plants keep moving over it (the image is the static scene BEHIND them). Design the backdrop to
  // sit behind the kelp — corals / rocks / fog, palette-matched, without big foreground kelp.
  // Tall kelp — rooted at floorY (screen bottom in backdrop mode); tips stay at world.h − k.h.
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const k of tallKelp) {
    const sway = reducedMotion ? 0 : Math.sin(t + k.swayPhase) * 18;
    const topY = world.h - k.h, totalH = floorY - topY;
    ctx.strokeStyle = kelpStroke(ctx, k.col, k.x, floorY, k.x + sway, topY, t, reducedMotion);
    ctx.beginPath();
    ctx.moveTo(k.x, floorY);
    ctx.quadraticCurveTo(k.x + sway * 0.3, floorY - totalH * 0.6, k.x + sway, topY);
    ctx.stroke();
  }

  // Short kelp
  ctx.lineWidth = 5;
  for (const s of shortKelp) {
    const sway = reducedMotion ? 0 : Math.sin(t * 1.1 + s.swayPhase) * 12;
    const topY = world.h - s.h, totalH = floorY - topY;
    ctx.strokeStyle = kelpStroke(ctx, s.col, s.x, floorY, s.x + sway * 0.8, topY, t, reducedMotion);
    ctx.beginPath();
    ctx.moveTo(s.x, floorY);
    ctx.quadraticCurveTo(s.x + sway * 0.35, floorY - totalH * 0.6, s.x + sway * 0.8, topY);
    ctx.stroke();
  }

  // Eelgrass tufts
  ctx.lineWidth = 2;
  for (const g of grassTufts) {
    const amp = reducedMotion ? 0 : 10;
    const cx = g.x, baseY = floorY, topY = world.h - g.h, totalH = baseY - topY;
    const step = g.width / (g.blades - 1);
    ctx.strokeStyle = g.c;
    for (let i = 0; i < g.blades; i++) {
      const x = cx - g.width / 2 + i * step;
      const phase = g.phase + i * 0.3;
      const sway = Math.sin(t * 1.2 + phase) * amp;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + sway * 0.2, baseY - totalH * 0.55, x + sway * 0.6, topY);
      ctx.stroke();
    }
  }

  // Seabed rocks (static) — skipped when a backdrop image is active (the art provides the rocks).
  if (!bd) {
    ctx.fillStyle = PALETTE.rock;
    for (const r of rocks) {
      ctx.beginPath();
      ctx.ellipse(r.x, world.h - 8, r.w, r.h, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ——————————————————————————————————————————————————————————————————————
// Diegetic border — appears when the screen is not exactly the fixed 16:9 / 9:16 play field
// (SH-12: любой не-16:9 экран получает бордюр — 16:10/4:3 сверху-снизу, 21:9 по бокам,
// портретные планшеты по бокам, вытянутые телефоны сверху-снизу). The leftover strips are
// NOT play space; we dress them as the world around the cove so they read as an intentional
// boundary instead of black bars. Contain-fit of a fixed-aspect field leaves leftover on at
// most ONE axis, so a screen shows EITHER side kelp walls OR seabed + sea surface — never
// both (initBorder keys off the REAL ox/oy gaps, not orientation). Coords are CSS px.

let B = null; // border scene, rebuilt each resize
const _mod = (a, n) => ((a % n) + n) % n;
const BOAT_H = 44; // drawn height of a boat (keel→masthead) at scale 1, for fit-capping

// view = { dispW, dispH, ox, oy, scale }; world = the clamped play field in logical units.
export function initBorder(view, world, ctx) {
  const { dispW, dispH, ox, oy, scale } = view;
  const aw = world.w * scale, ah = world.h * scale;
  const ax0 = ox, ay0 = oy, ax1 = ox + aw, ay1 = oy + ah;

  const deepGrad = ctx.createLinearGradient(0, 0, 0, dispH);
  deepGrad.addColorStop(0, PALETTE.water.deep);
  deepGrad.addColorStop(1, PALETTE.brand.INK); // darker than the lit field → field pops

  B = {
    ax0, ay0, ax1, ay1, dispW, dispH,
    hasSides: ox > 1, hasTopBottom: oy > 1,
    deepGrad, kelp: [], rocks: [], sky: null, seabed: null,
  };

  if (B.hasSides) buildSideWalls(dispW, dispH, ax0, ax1);
  if (B.hasTopBottom) { B.sky = buildSky(ctx, dispW, ay0); B.seabed = buildSeabed(ctx, dispW, ay1, dispH); }
}

// — Sides: rocky kelp walls (rocks at the base, kelp tallest/densest toward the field edge).
function buildSideWalls(dispW, dispH, ax0, ax1) {
  const kelp = [], rocks = [];
  const wall = (x0, x1, edgeX) => {
    const w = x1 - x0;
    if (w < 6) return;
    const nr = Math.max(2, Math.round(w / 55));
    for (let i = 0; i < nr; i++) {
      const x = x0 + Math.random() * w;
      rocks.push({
        x, y: dispH - (2 + Math.random() * 12),
        rw: 24 + Math.random() * Math.min(70, w * 0.6), rh: 16 + Math.random() * 26,
        c: Math.random() < 0.5 ? '#2A4750' : '#21404A',
      });
    }
    const n = Math.max(7, Math.round(w / 7));
    for (let i = 0; i < n; i++) {
      const x = x0 + Math.random() * w;
      const nearEdge = 1 - Math.min(1, Math.abs(x - edgeX) / w);
      kelp.push({
        x, h: dispH * (0.5 + 0.46 * nearEdge + Math.random() * 0.14),
        col: makeKelpColor(),
        lw: 5 + nearEdge * 6 + Math.random() * 3, phase: Math.random() * Math.PI * 2,
      });
    }
  };
  wall(0, ax0, ax0); wall(ax1, dispW, ax1);
  B.kelp = kelp; B.rocks = rocks;
}

// — Top: sky/air + drifting clouds and occasional boats on the surface (size scales to fit).
function buildSky(ctx, dispW, ay0) {
  const grad = ctx.createLinearGradient(0, 0, 0, Math.max(1, ay0));
  grad.addColorStop(0.0, '#C7DCE6'); grad.addColorStop(0.7, '#DCEAF0'); grad.addColorStop(1.0, '#EAF2F5');
  const clouds = Array.from({ length: Math.max(2, Math.round((dispW * ay0) / 55000)) }, () => ({
    x: Math.random() * dispW, y: 6 + Math.random() * Math.max(8, ay0 * 0.55),
    s: 0.55 + Math.random() * 1.1, v: 4 + Math.random() * 7, a: 0.3 + Math.random() * 0.3,
  }));
  const boats = [];
  if (ay0 > 56) {
    const fit = (ay0 * 0.85) / BOAT_H;
    for (let i = 0, n = Math.max(1, Math.round(dispW / 850)); i < n; i++) boats.push({
      x: Math.random() * dispW, v: 7 + Math.random() * 9,
      s: Math.min(1.2 + Math.random() * 0.8, fit),
      dir: Math.random() < 0.5 ? 1 : -1, hue: Math.random() < 0.5 ? PALETTE.brand.BUOY : '#C25A3A',
      bob: Math.random() * Math.PI * 2,
    });
  }
  return { grad, clouds, boats };
}

// — Bottom: sandy seabed (graded shades) with ripples, pebbles, driftwood, boulders, eelgrass
//   and dunes; a depth-fog dissolves the seam so the seabed emerges from the murk, not a line.
function buildSeabed(ctx, dispW, ay1, dispH) {
  const h = dispH - ay1;
  const grad = ctx.createLinearGradient(0, ay1, 0, dispH);
  grad.addColorStop(0.0, PALETTE.water.floor);
  grad.addColorStop(0.2, '#33403C');
  grad.addColorStop(0.46, '#7E7058');
  grad.addColorStop(0.68, '#C7B591');
  grad.addColorStop(0.87, '#AD9B7C');
  grad.addColorStop(1.0, '#927C5C');
  const hazeH = Math.min(h * 0.62, 150);
  const haze = ctx.createLinearGradient(0, ay1, 0, ay1 + hazeH);
  haze.addColorStop(0.0, 'rgba(11,40,50,0.96)');
  haze.addColorStop(0.5, 'rgba(11,40,50,0.5)');
  haze.addColorStop(1.0, 'rgba(11,40,50,0)');
  const yIn = (lo, hi) => ay1 + h * (lo + Math.random() * (hi - lo));
  const dunes = Array.from({ length: Math.max(2, Math.round(dispW / 340)) }, () => ({
    x: Math.random() * dispW, y: ay1 + h * (0.22 + Math.random() * 0.2),
    rw: 130 + Math.random() * 240, rh: 26 + Math.random() * 34,
    c: Math.random() < 0.5 ? '#5E5440' : '#6C6049',
  }));
  const ripples = Array.from({ length: Math.max(3, Math.round(dispW / 110)) }, () => ({
    x: Math.random() * dispW, y: yIn(0.32, 0.85), w: 40 + Math.random() * 120, a: 0.05 + Math.random() * 0.06,
  }));
  const pebbles = Array.from({ length: Math.max(8, Math.round(dispW / 38)) }, () => ({
    x: Math.random() * dispW, y: yIn(0.28, 0.95), r: 1.4 + Math.random() * 3,
    c: Math.random() < 0.5 ? '#B6A488' : '#8E8270',
  }));
  const rocks = Array.from({ length: Math.max(2, Math.round(dispW / 210)) }, () => ({
    x: Math.random() * dispW, y: yIn(0.4, 0.9), rw: 16 + Math.random() * 40, rh: 9 + Math.random() * 18,
    c: Math.random() < 0.5 ? '#8B8472' : '#6E6857',
  }));
  const driftwood = Array.from({ length: Math.max(1, Math.round(dispW / 520)) }, () => ({
    x: 40 + Math.random() * (dispW - 80), y: yIn(0.45, 0.85), len: 60 + Math.random() * 90,
    ang: -0.5 + Math.random(), thick: 5 + Math.random() * 5, c: Math.random() < 0.5 ? '#5C4A38' : '#6B5A46',
  }));
  const grass = Array.from({ length: Math.max(3, Math.round(dispW / 150)) }, () => ({
    x: Math.random() * dispW, baseY: yIn(0.2, 0.55), blades: 4 + (Math.random() * 4 | 0),
    gh: 16 + Math.random() * Math.min(46, h * 0.55), width: 10 + Math.random() * 16,
    c: `hsl(${160 + Math.random() * 22}, 40%, ${15 + Math.random() * 7}%)`, phase: Math.random() * Math.PI * 2,
  }));
  return { grad, haze, hazeH, dunes, ripples, pebbles, rocks, driftwood, grass };
}

// Deep backdrop over the whole canvas (covers any strip). The opaque play field is painted
// over its own rect next; sky/seabed paint over their strips.
export function drawDeepBackdrop(ctx, view) {
  ctx.fillStyle = (B && B.deepGrad) || PALETTE.water.floor;
  ctx.fillRect(0, 0, view.dispW, view.dispH);
}

// Border layers BEHIND the play field (seabed, sky + clouds + boats, side walls).
export function drawBorderBack(ctx, view, world, t, reducedMotion = false, bd = false) {
  if (!B) return;
  if (B.hasTopBottom) { drawSeabed(ctx, t, reducedMotion, bd); drawSkyBack(ctx, t, reducedMotion, bd); }
  if (B.hasSides) drawSideWalls(ctx, t, reducedMotion, bd);
}

// Border layers IN FRONT of the play field: the wavy water surface + the edge vignette.
export function drawBorderFront(ctx, view, world, t, reducedMotion = false) {
  if (!B) return;
  if (B.hasTopBottom) drawWaterline(ctx, B.ay0, B.dispW, t, reducedMotion);
  drawEdgeVignette(ctx);
}

function drawSideWalls(ctx, t, reduced, bd = false) {
  const { dispH } = B;
  if (!bd) for (const r of B.rocks) { // static base rocks — the art provides them in backdrop mode
    ctx.fillStyle = r.c;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, r.rw, r.rh, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(237,241,243,0.05)';
    ctx.beginPath(); ctx.ellipse(r.x - r.rw * 0.3, r.y - r.rh * 0.4, r.rw * 0.5, r.rh * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save(); ctx.lineCap = 'round'; // animated kelp-wall — always (the boundary marker)
  for (const k of B.kelp) {
    const sway = reduced ? 0 : Math.sin(t * 0.8 + k.phase) * 10;
    ctx.lineWidth = k.lw;
    ctx.strokeStyle = kelpStroke(ctx, k.col, k.x, dispH, k.x + sway, dispH - k.h, t, reduced);
    ctx.beginPath(); ctx.moveTo(k.x, dispH);
    ctx.quadraticCurveTo(k.x + sway * 0.4, dispH - k.h * 0.6, k.x + sway, dispH - k.h);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSkyBack(ctx, t, reduced, bd = false) {
  const { dispW, ay0 } = B, S = B.sky;
  // Sky/AIR above the surface — drawn in BOTH modes (the bd flag no longer skips it) so there's a
  // clear water↔air separation at the waterline: the backdrop art is water, so the air must cover
  // the top border, otherwise the boat sails on the same teal as below the surface.
  ctx.fillStyle = S.grad; ctx.fillRect(0, 0, dispW, ay0);
  for (const c of S.clouds) {
    const x = reduced ? c.x : _mod(c.x + t * c.v + 80, dispW + 160) - 80;
    drawCloud(ctx, x, c.y, c.s, c.a);
  }
  for (const bo of S.boats) { // small boat(s) on the surface — the top-edge boundary marker
    const x = reduced ? bo.x : _mod(bo.x + t * bo.v * bo.dir + 100, dispW + 200) - 100;
    const yWater = ay0 + (reduced ? 0 : Math.sin(t * 0.9 + bo.bob) * 2);
    drawBoat(ctx, x, yWater, bo.s, bo.dir, bo.hue);
  }
}

function drawCloud(ctx, x, y, s, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#F4F8FA';
  const w = 60 * s, h = 18 * s;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.6, h, 0, 0, Math.PI * 2);
  ctx.ellipse(x - w * 0.45, y + h * 0.3, w * 0.4, h * 0.7, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.5, y + h * 0.25, w * 0.45, h * 0.78, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.restore();
}

// Sailboat sitting ON the waterline: keel at y=0 (surface), hull + mast + sail above it.
function drawBoat(ctx, x, yWater, s, dir, hue) {
  ctx.save(); ctx.translate(x, yWater); ctx.scale(dir * s, s);
  ctx.fillStyle = PALETTE.brand.INK;
  ctx.beginPath(); ctx.moveTo(-40, -14); ctx.lineTo(40, -14); ctx.lineTo(30, 0); ctx.lineTo(-30, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = hue; ctx.fillRect(-36, -15.5, 72, 4);
  ctx.strokeStyle = PALETTE.brand.INK; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-3, -14); ctx.lineTo(-3, -44); ctx.stroke();
  ctx.fillStyle = '#F4F8FA';
  ctx.beginPath(); ctx.moveTo(-1, -16); ctx.lineTo(-1, -42); ctx.lineTo(22, -19); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawWaterline(ctx, y, w, t, reduced) {
  const amp = reduced ? 1.5 : 3.5, k = 0.025, ph = reduced ? 0 : t * 1.6;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, y + 12);
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y + Math.sin(x * k + ph) * amp);
  ctx.lineTo(w, y + 12); ctx.closePath();
  ctx.fillStyle = 'rgba(60,124,151,0.28)'; ctx.fill(); // softer surface band (was 0.5)
  ctx.beginPath();
  for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x * k + ph) * amp; x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
  ctx.strokeStyle = 'rgba(244,248,250,0.22)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.stroke(); // dimmer, thinner (was 0.5 / 2)
  ctx.restore();
}

function drawSeabed(ctx, t, reduced, bd = false) {
  const { dispW, ay1, dispH } = B, S = B.seabed;
  if (!bd) { // opaque sand + static dunes/ripples/pebbles/driftwood/rocks — the art supplies these
  ctx.fillStyle = S.grad; ctx.fillRect(0, ay1, dispW, dispH - ay1);
  for (const d of S.dunes) {
    ctx.fillStyle = d.c;
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.rw, d.rh, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const r of S.ripples) {
    ctx.strokeStyle = `rgba(74,60,42,${r.a})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r.x - r.w / 2, r.y); ctx.quadraticCurveTo(r.x, r.y - 5, r.x + r.w / 2, r.y); ctx.stroke();
  }
  for (const p of S.pebbles) { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
  for (const d of S.driftwood) drawDriftwood(ctx, d);
  for (const r of S.rocks) {
    ctx.fillStyle = r.c; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.rw, r.rh, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(237,241,243,0.08)';
    ctx.beginPath(); ctx.ellipse(r.x - r.rw * 0.3, r.y - r.rh * 0.35, r.rw * 0.5, r.rh * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  } // end if (!bd) — static seabed
  ctx.lineWidth = 2; ctx.lineCap = 'round'; // animated seabed grass — always (bottom-edge marker)
  for (const g of S.grass) {
    const step = g.width / Math.max(1, g.blades - 1);
    ctx.strokeStyle = g.c;
    for (let i = 0; i < g.blades; i++) {
      const x = g.x - g.width / 2 + i * step;
      const sway = reduced ? 0 : Math.sin(t * 1.2 + g.phase + i * 0.3) * 6;
      ctx.beginPath(); ctx.moveTo(x, g.baseY);
      ctx.quadraticCurveTo(x + sway * 0.3, g.baseY - g.gh * 0.6, x + sway * 0.7, g.baseY - g.gh); ctx.stroke();
    }
  }
  if (!bd) { ctx.fillStyle = S.haze; ctx.fillRect(0, ay1, dispW, S.hazeH); }
}

function drawDriftwood(ctx, d) {
  ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang);
  ctx.strokeStyle = d.c; ctx.lineWidth = d.thick; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-d.len / 2, 0); ctx.quadraticCurveTo(0, -6, d.len / 2, 2); ctx.stroke();
  ctx.lineWidth = d.thick * 0.6;
  ctx.beginPath(); ctx.moveTo(d.len * 0.1, -1); ctx.lineTo(d.len * 0.25, -d.len * 0.22); ctx.stroke();
  ctx.restore();
}

// Soft inner vignette seating the field — only on the side edges (kelp walls); the surface
// waterline and seabed shadow handle the top/bottom transition.
function drawEdgeVignette(ctx) {
  if (!B.hasSides) return;
  const { ax0, ay0, ax1, ay1 } = B, ah = ay1 - ay0;
  const SH = 'rgba(11,40,50,0.5)', CLR = 'rgba(11,40,50,0)', V = 24;
  let g = ctx.createLinearGradient(ax0, 0, ax0 + V, 0); g.addColorStop(0, SH); g.addColorStop(1, CLR);
  ctx.fillStyle = g; ctx.fillRect(ax0, ay0, V, ah);
  g = ctx.createLinearGradient(ax1, 0, ax1 - V, 0); g.addColorStop(0, SH); g.addColorStop(1, CLR);
  ctx.fillStyle = g; ctx.fillRect(ax1 - V, ay0, V, ah);
}
