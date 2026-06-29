// render/scenery.js
// Связная подводная сцена на бренд-палитре (baltic→ink вода, baltic-зелёные водоросли),
// мягкие лучи света от поверхности — современный, «спроектированный» вид (DESIGN_BRIEF).
import { PALETTE } from '../core/theme.js';

let bubbles = [];
let tallKelp = [], shortKelp = [], grassTufts = [], rocks = [], rays = [];
let seaGrad = null, topGrad = null, botGrad = null;

// — Diegetic border: the world framing the FIXED arena on wide/tall screens (NOT play
//   space — see balance.js). Sides = rocky kelp walls; bottom = sandy seabed (grass,
//   driftwood, rocks, pebbles); top = water surface + sky (waves, boats, clouds, birds).
//   Built per resize from the VIEW rect; animations are time-based and honour reduced-motion.
let B = null;
const _mod = (a, n) => ((a % n) + n) % n;

function makeSeaGradient(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, world.h);
  g.addColorStop(0.0, PALETTE.water.surface);
  g.addColorStop(0.32, PALETTE.water.mid);
  g.addColorStop(0.7, PALETTE.water.deep);
  g.addColorStop(1.0, PALETTE.water.floor);
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
    h: world.h * (0.28 + Math.random() * 0.28),
    c: PALETTE.kelp[i % PALETTE.kelp.length],
    swayPhase: Math.random() * Math.PI * 2,
  }));

  const shortCount = Math.max(4, Math.round(world.w / 260));
  shortKelp = Array.from({ length: shortCount }, () => ({
    x: Math.random() * world.w,
    h: world.h * (0.12 + Math.random() * 0.12),
    c: PALETTE.kelp[1 + ((Math.random() * 2) | 0)] ?? PALETTE.kelp[1],
    swayPhase: Math.random() * Math.PI * 2,
  }));

  const tuftCount = Math.max(5, Math.round(world.w / 280));
  grassTufts = Array.from({ length: tuftCount }, () => ({
    x: Math.random() * world.w,
    blades: 6 + (Math.random() * 5 | 0),
    h: world.h * (0.1 + Math.random() * 0.1),
    width: 10 + Math.random() * 18,
    c: PALETTE.kelp[2],
    phase: Math.random() * Math.PI * 2,
  }));
}

export function drawBackground(ctx, world, t, reducedMotion = false) {
  // Sea gradient
  ctx.fillStyle = seaGrad || PALETTE.water.mid;
  ctx.fillRect(0, 0, world.w, world.h);

  // Light shafts (additive, subtle)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
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

  // Surface glow
  const topH = Math.min(180, world.h * 0.24);
  ctx.fillStyle = topGrad || 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, world.w, topH);

  // Depth vignette
  const botY = world.h * 0.66;
  ctx.fillStyle = botGrad || 'rgba(0,0,0,0)';
  ctx.fillRect(0, botY, world.w, world.h - botY);

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

  // Tall kelp
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const k of tallKelp) {
    const sway = reducedMotion ? 0 : Math.sin(t + k.swayPhase) * 18;
    ctx.strokeStyle = k.c;
    ctx.beginPath();
    ctx.moveTo(k.x, world.h);
    ctx.quadraticCurveTo(k.x + sway * 0.3, world.h - k.h * 0.6, k.x + sway, world.h - k.h);
    ctx.stroke();
  }

  // Short kelp
  ctx.lineWidth = 5;
  for (const s of shortKelp) {
    const sway = reducedMotion ? 0 : Math.sin(t * 1.1 + s.swayPhase) * 12;
    ctx.strokeStyle = s.c;
    ctx.beginPath();
    ctx.moveTo(s.x, world.h);
    ctx.quadraticCurveTo(s.x + sway * 0.35, world.h - s.h * 0.6, s.x + sway * 0.8, world.h - s.h);
    ctx.stroke();
  }

  // Eelgrass tufts
  ctx.lineWidth = 2;
  for (const g of grassTufts) {
    const amp = reducedMotion ? 0 : 10;
    const cx = g.x, baseY = world.h;
    const step = g.width / (g.blades - 1);
    ctx.strokeStyle = g.c;
    for (let i = 0; i < g.blades; i++) {
      const x = cx - g.width / 2 + i * step;
      const phase = g.phase + i * 0.3;
      const sway = Math.sin(t * 1.2 + phase) * amp;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + sway * 0.2, baseY - g.h * 0.55, x + sway * 0.6, baseY - g.h);
      ctx.stroke();
    }
  }

  // Seabed rocks
  ctx.fillStyle = PALETTE.rock;
  for (const r of rocks) {
    ctx.beginPath();
    ctx.ellipse(r.x, world.h - 8, r.w, r.h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ——————————————————————————————————————————————————————————————————————
// Diegetic border — frames the FIXED arena when the screen is wider/taller than it.
// The leftover strips are NOT play space; we dress them as the world around the cove so
// it reads as an intentional boundary instead of black bars. With contain-fit only ONE
// axis ever has leftover, so a screen shows EITHER side walls (wide) OR surface+seabed
// (tall) — never both. All coords are CSS px (caller resets the transform to DPR).

// Build the border scene for the current VIEW. `view` = { dispW, dispH, ox, oy, scale };
// `world` = the fixed arena in logical units. Re-run on every resize.
export function initBorder(view, world, ctx) {
  const { dispW, dispH, ox, oy, scale } = view;
  const aw = world.w * scale, ah = world.h * scale;
  const ax0 = ox, ay0 = oy, ax1 = ox + aw, ay1 = oy + ah;

  const deepGrad = ctx.createLinearGradient(0, 0, 0, dispH);
  deepGrad.addColorStop(0, PALETTE.water.deep);
  deepGrad.addColorStop(1, PALETTE.brand.INK); // darker than the lit arena → arena pops

  B = {
    ax0, ay0, ax1, ay1, dispW, dispH,
    hasSides: ox > 1, hasTopBottom: oy > 1,
    deepGrad, kelp: [], rocks: [], sky: null, seabed: null,
  };

  if (B.hasSides) buildSideWalls(dispW, dispH, ax0, ax1);
  if (B.hasTopBottom) { B.sky = buildSky(ctx, dispW, ay0); B.seabed = buildSeabed(ctx, dispW, ay1, dispH); }
}

// — Sides: rocky kelp walls. Rocks at the base (behind), kelp fronds tallest/densest
//   toward the arena edge, thinning into the dark outer water.
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
      const nearEdge = 1 - Math.min(1, Math.abs(x - edgeX) / w); // 1 at arena edge → 0 outer
      kelp.push({
        x, h: dispH * (0.5 + 0.46 * nearEdge + Math.random() * 0.14),
        c: PALETTE.kelp[(Math.random() * PALETTE.kelp.length) | 0],
        lw: 5 + nearEdge * 6 + Math.random() * 3, phase: Math.random() * Math.PI * 2,
      });
    }
  };
  wall(0, ax0, ax0); wall(ax1, dispW, ax1);
  B.kelp = kelp; B.rocks = rocks;
}

// — Top: sky/air + drifting clouds, occasional boats on the surface, and birds when
//   there's real vertical room. Detail scales with the available space (good UX).
function buildSky(ctx, dispW, ay0) {
  const grad = ctx.createLinearGradient(0, 0, 0, Math.max(1, ay0));
  grad.addColorStop(0.0, '#C7DCE6'); // foggy upper sky
  grad.addColorStop(0.7, '#DCEAF0');
  grad.addColorStop(1.0, '#EAF2F5'); // pale hazy horizon at the waterline
  const clouds = Array.from({ length: Math.max(2, Math.round((dispW * ay0) / 55000)) }, () => ({
    x: Math.random() * dispW, y: 6 + Math.random() * Math.max(8, ay0 * 0.55),
    s: 0.55 + Math.random() * 1.1, v: 4 + Math.random() * 7, a: 0.3 + Math.random() * 0.3,
  }));
  const boats = Array.from({ length: Math.max(1, Math.round(dispW / 900)) }, () => ({
    x: Math.random() * dispW, v: 7 + Math.random() * 9, s: 0.8 + Math.random() * 0.6,
    dir: Math.random() < 0.5 ? 1 : -1, hue: Math.random() < 0.5 ? PALETTE.brand.BUOY : '#C25A3A',
    bob: Math.random() * Math.PI * 2,
  }));
  const birds = [];
  if (ay0 > 90) {
    for (let i = 0, n = Math.max(1, Math.round(dispW / 650)); i < n; i++) birds.push({
      x: Math.random() * dispW, y: 10 + Math.random() * (ay0 * 0.45),
      v: 26 + Math.random() * 40, s: 0.7 + Math.random() * 0.6,
      dir: Math.random() < 0.5 ? 1 : -1, ph: Math.random() * Math.PI * 2,
    });
  }
  return { grad, clouds, boats, birds };
}

// — Bottom: sandy seabed (graded shades), with sand ripples, pebbles, driftwood snags,
//   boulders and swaying eelgrass — the cove floor continuing below the play field.
function buildSeabed(ctx, dispW, ay1, dispH) {
  const h = dispH - ay1;
  const grad = ctx.createLinearGradient(0, ay1, 0, dispH);
  grad.addColorStop(0.0, 'rgba(46,58,64,1)'); // shadowed where the seabed meets the cove
  grad.addColorStop(0.16, '#8E7E62');         // sand emerging from shadow
  grad.addColorStop(0.5, '#C7B591');          // lit sand
  grad.addColorStop(0.82, '#AD9B7C');
  grad.addColorStop(1.0, '#927C5C');          // wet/deeper sand
  const yIn = (lo, hi) => ay1 + h * (lo + Math.random() * (hi - lo));
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
    c: PALETTE.kelp[2], phase: Math.random() * Math.PI * 2,
  }));
  return { grad, ripples, pebbles, rocks, driftwood, grass };
}

// Deep backdrop over the whole canvas (covers any border strip). The opaque arena is
// painted over its own rect afterwards; sky/seabed paint over their strips. The deep
// water only stays visible *between* the side kelp fronds.
export function drawDeepBackdrop(ctx, view) {
  ctx.fillStyle = (B && B.deepGrad) || PALETTE.water.floor;
  ctx.fillRect(0, 0, view.dispW, view.dispH);
}

// Draw the framing world over the leftover strips, then a soft vignette to seat the arena.
export function drawBorderDecor(ctx, view, world, t, reducedMotion = false) {
  if (!B) return;
  if (B.hasTopBottom) { drawSeabed(ctx, t, reducedMotion); drawSky(ctx, t, reducedMotion); }
  if (B.hasSides) drawSideWalls(ctx, t, reducedMotion);
  drawEdgeVignette(ctx);
}

function drawSideWalls(ctx, t, reduced) {
  const { dispH } = B;
  for (const r of B.rocks) {
    ctx.fillStyle = r.c;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, r.rw, r.rh, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(237,241,243,0.05)';
    ctx.beginPath(); ctx.ellipse(r.x - r.rw * 0.3, r.y - r.rh * 0.4, r.rw * 0.5, r.rh * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save(); ctx.lineCap = 'round';
  for (const k of B.kelp) {
    const sway = reduced ? 0 : Math.sin(t * 0.8 + k.phase) * 10;
    ctx.lineWidth = k.lw; ctx.strokeStyle = k.c;
    ctx.beginPath(); ctx.moveTo(k.x, dispH);
    ctx.quadraticCurveTo(k.x + sway * 0.4, dispH - k.h * 0.6, k.x + sway, dispH - k.h);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSky(ctx, t, reduced) {
  const { dispW, ay0 } = B, S = B.sky;
  ctx.fillStyle = S.grad; ctx.fillRect(0, 0, dispW, ay0);

  for (const c of S.clouds) {
    const x = reduced ? c.x : _mod(c.x + t * c.v + 80, dispW + 160) - 80;
    drawCloud(ctx, x, c.y, c.s, c.a);
  }
  for (const b of S.birds) {
    const x = reduced ? b.x : _mod(b.x + t * b.v * b.dir, dispW + 40);
    const y = b.y + (reduced ? 0 : Math.sin(t * 1.4 + b.ph) * 3);
    drawBird(ctx, x, y, b.s);
  }
  for (const bo of S.boats) {
    const x = reduced ? bo.x : _mod(bo.x + t * bo.v * bo.dir + 100, dispW + 200) - 100;
    const y = ay0 - 1 + (reduced ? 0 : Math.sin(t * 0.9 + bo.bob) * 2);
    drawBoat(ctx, x, y, bo.s, bo.dir, bo.hue);
  }
  drawWaterline(ctx, ay0, dispW, t, reduced);
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

function drawBird(ctx, x, y, s) {
  ctx.save(); ctx.strokeStyle = 'rgba(21,48,58,0.5)'; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
  const w = 8 * s;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.2, y - w * 0.75, x, y - w * 0.1);
  ctx.quadraticCurveTo(x + w * 0.2, y - w * 0.75, x + w, y);
  ctx.stroke(); ctx.restore();
}

function drawBoat(ctx, x, y, s, dir, hue) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
  ctx.fillStyle = PALETTE.brand.INK; // hull
  ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.lineTo(18, 9); ctx.lineTo(-20, 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = hue; ctx.fillRect(-22, -0.5, 44, 2.5); // accent stripe
  ctx.strokeStyle = PALETTE.brand.INK; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-2, -17); ctx.stroke(); // mast
  ctx.fillStyle = '#F4F8FA'; // sail
  ctx.beginPath(); ctx.moveTo(-1, -1); ctx.lineTo(-1, -16); ctx.lineTo(12, -3); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawWaterline(ctx, y, w, t, reduced) {
  const amp = reduced ? 1.5 : 3.5, k = 0.025, ph = reduced ? 0 : t * 1.6;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, y + 12);
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y + Math.sin(x * k + ph) * amp);
  ctx.lineTo(w, y + 12); ctx.closePath();
  ctx.fillStyle = 'rgba(60,124,151,0.5)'; ctx.fill(); // surface water tint just below the line
  ctx.beginPath();
  for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x * k + ph) * amp; x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
  ctx.strokeStyle = 'rgba(244,248,250,0.5)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); // foam crest
  ctx.restore();
}

function drawSeabed(ctx, t, reduced) {
  const { dispW, ay1, dispH } = B, S = B.seabed;
  ctx.fillStyle = S.grad; ctx.fillRect(0, ay1, dispW, dispH - ay1);

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
  ctx.lineWidth = 2; ctx.lineCap = 'round';
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
}

function drawDriftwood(ctx, d) {
  ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang);
  ctx.strokeStyle = d.c; ctx.lineWidth = d.thick; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-d.len / 2, 0); ctx.quadraticCurveTo(0, -6, d.len / 2, 2); ctx.stroke();
  ctx.lineWidth = d.thick * 0.6; // small branch
  ctx.beginPath(); ctx.moveTo(d.len * 0.1, -1); ctx.lineTo(d.len * 0.25, -d.len * 0.22); ctx.stroke();
  ctx.restore();
}

// Soft inner vignette so the lit arena looks recessed/seated, not pasted on. Only on the
// side edges (the kelp walls); the surface waterline and seabed shadow handle top/bottom.
function drawEdgeVignette(ctx) {
  if (!B.hasSides) return;
  const { ax0, ay0, ax1, ay1 } = B, ah = ay1 - ay0;
  const SH = 'rgba(11,40,50,0.5)', CLR = 'rgba(11,40,50,0)', V = 24;
  let g = ctx.createLinearGradient(ax0, 0, ax0 + V, 0); g.addColorStop(0, SH); g.addColorStop(1, CLR);
  ctx.fillStyle = g; ctx.fillRect(ax0, ay0, V, ah);
  g = ctx.createLinearGradient(ax1, 0, ax1 - V, 0); g.addColorStop(0, SH); g.addColorStop(1, CLR);
  ctx.fillStyle = g; ctx.fillRect(ax1 - V, ay0, V, ah);
}
