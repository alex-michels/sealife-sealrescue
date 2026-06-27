// render/scenery.js
// Связная подводная сцена на бренд-палитре (baltic→ink вода, baltic-зелёные водоросли),
// мягкие лучи света от поверхности — современный, «спроектированный» вид (DESIGN_BRIEF).
import { PALETTE } from '../core/theme.js';

let bubbles = [];
let tallKelp = [], shortKelp = [], grassTufts = [], rocks = [], rays = [];
let seaGrad = null, topGrad = null, botGrad = null;

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
