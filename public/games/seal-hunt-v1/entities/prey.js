// entities/prey.js
import { BAL } from '../core/balance.js';
import { PALETTE } from '../core/theme.js';

// tiny helper
const lerp = (a, b, t) => a + (b - a) * t;

// Collision sweep samples (sub-steps along the frame). Local so prey logic has no DOM
// dependency and runs headless in the fairness harness (matches the core/sim.js refactor).
const SWEEP_T = [0, 0.5, 1];

// --- Cute idle motion + C-start–like escape tuning ---
const WIGGLE = {
  rotAmp: 0.08, // ±rad idle body wobble
  rotFreq: 5.0,
  scaleAmp: 0.04,
};
const ESCAPE = {
  threatK: 4, // threat radius ≈ seal.r * threatK
  burstImpulse: 256, // instantaneous dv (px/s) on trigger (away from seal) — ×1.6 tempo
  maxBoost: 1.6, // cap: up to 1.6× normal fish max speed during escape (ratio, unscaled)
  fleeHold: 0.22,
  restAfter: 1.2,
  steer: 416, // while fleeing, extra away-from-seal steering (px/s^2) — ×1.6 tempo
  dragHi: 0.985,
  dragLo: 0.998,
};
const CRUISE = {
  targetK: 0.55, // target ≈ 55% of BAL.fishSpeedMin (auto-scales with the speed tempo)
  accel: 192, // how quickly they regain that slow cruise (px/s^2) — ×1.6 tempo
  wander: 29, // tiny heading meander (px/s^2) — ×1.6 tempo
};

const F = PALETTE.fish;

// ——— Shared flat-art fish renderer (one cohesive style, brand schemes).
// Variants: 'round' | 'slim' | 'eel' | 'squid' | 'star'. Fish face +x (head right).
function fishBody(ctx, r, variant) {
  ctx.beginPath();
  if (variant === 'round') ctx.ellipse(0, 0, r * 0.95, r * 0.6, 0, 0, Math.PI * 2);
  else if (variant === 'slim') ctx.ellipse(0, 0, r * 1.12, r * 0.46, 0, 0, Math.PI * 2);
  else {
    // eel / sandlance — slim leaf
    ctx.moveTo(-r * 1.25, 0);
    ctx.quadraticCurveTo(r * 0.15, -r * 0.4, r * 1.2, 0);
    ctx.quadraticCurveTo(r * 0.15, r * 0.4, -r * 1.25, 0);
    ctx.closePath();
  }
}

function drawStar(ctx, r, c) {
  ctx.fillStyle = c.body;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = i * (Math.PI * 2 / 5) - Math.PI / 2;
    const x = Math.cos(a) * r * 0.85, y = Math.sin(a) * r * 0.85;
    const ax = Math.cos(a + 0.6) * r * 0.38, ay = Math.sin(a + 0.6) * r * 0.38;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    ctx.lineTo(ax, ay);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = c.back;
  for (let i = 0; i < 5; i++) {
    const a = i * (Math.PI * 2 / 5) - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSquid(ctx, r, c) {
  ctx.strokeStyle = c.back;
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.lineCap = 'round';
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(k * r * 0.16, r * 0.5);
    ctx.quadraticCurveTo(k * r * 0.22, r * 0.92, k * r * 0.28, r * 1.2);
    ctx.stroke();
  }
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.1, r * 0.62, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.1, r * 0.62, r * 0.92, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = c.belly;
  ctx.fillRect(-r * 0.7, r * 0.12, r * 1.4, r);
  ctx.restore();
  ctx.fillStyle = c.eye;
  ctx.beginPath(); ctx.arc(-r * 0.26, -r * 0.04, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.26, -r * 0.04, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.highlight;
  ctx.beginPath(); ctx.arc(-r * 0.23, -r * 0.07, r * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.29, -r * 0.07, r * 0.035, 0, Math.PI * 2); ctx.fill();
}

function drawFish(ctx, r, c, variant, tailKick = 0) {
  if (variant === 'star') return drawStar(ctx, r, c);
  if (variant === 'squid') return drawSquid(ctx, r, c);

  const rx = variant === 'slim' ? r * 1.12 : variant === 'eel' ? r * 1.2 : r * 0.95;

  // tail fin (round/slim) — widens a touch on flee
  if (variant !== 'eel') {
    const k = r * 0.5 * (0.7 + tailKick);
    ctx.fillStyle = c.back;
    ctx.beginPath();
    ctx.moveTo(-rx * 0.82, 0);
    ctx.lineTo(-rx * 1.5, -k);
    ctx.lineTo(-rx * 1.5, k);
    ctx.closePath();
    ctx.fill();
  }

  // body base
  fishBody(ctx, r, variant);
  ctx.fillStyle = c.body;
  ctx.fill();

  // two-tone belly + subtle lateral line, clipped to the body
  ctx.save();
  fishBody(ctx, r, variant);
  ctx.clip();
  ctx.fillStyle = c.belly;
  ctx.fillRect(-r * 2, r * 0.04, r * 4, r * 2);
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = c.back;
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  ctx.moveTo(-rx * 0.9, -r * 0.05);
  ctx.lineTo(rx * 0.7, -r * 0.05);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  // eye + highlight
  ctx.fillStyle = c.eye;
  ctx.beginPath(); ctx.arc(rx * 0.55, -r * 0.12, r * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.highlight;
  ctx.beginPath(); ctx.arc(rx * 0.58, -r * 0.15, r * 0.04, 0, Math.PI * 2); ctx.fill();

  // soft mouth
  ctx.strokeStyle = c.eye;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rx * 0.78, r * 0.07);
  ctx.quadraticCurveTo(rx * 0.9, r * 0.09, rx * 0.97, r * 0.05);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// -------------------------------------------------------
// species catalog — cohesive brand schemes + shared renderer.
// `habitat` drives where a creature enters from (biology, not "falling from the sky"):
//   'pelagic' — schooling fish; swim in horizontally, rise from the depths (diel vertical
//               migration), never from the air. Top entry only when the top is open water.
//   'benthic' — seabed dwellers (octopus, starfish, sand-burrowers, demersal cod); enter
//               from the bottom or sides, never the top.
const SPECIES = [
  { name: 'goldie', habitat: 'pelagic', size: 1.0, scheme: F.coral, variant: 'round', wiggle: (f, dt, i) => { f.vx += Math.sin(f.t * 4.8 + i) * 4 * dt; f.vy += Math.cos(f.t * 4.2 + i) * 4 * dt; } },
  { name: 'herring', habitat: 'pelagic', size: 0.9, scheme: F.silver, variant: 'slim', wiggle: (f, dt, i) => { f.vy += Math.sin(f.t * 3.6 + i) * 5 * dt; } },
  { name: 'sprat', habitat: 'pelagic', size: 0.7, scheme: F.pale, variant: 'slim', wiggle: (f, dt, i) => { f.vx += Math.sin(f.t * 5.0 + i) * 3 * dt; } },
  { name: 'anchovy', habitat: 'pelagic', size: 0.75, scheme: F.steel, variant: 'slim', wiggle: (f, dt, i) => { f.vy += Math.cos(f.t * 4.2 + i) * 4 * dt; } },
  { name: 'sardine', habitat: 'pelagic', size: 0.85, scheme: F.silver, variant: 'round', wiggle: (f, dt, i) => { f.vx += Math.sin(f.t * 3.8 + i) * 3.5 * dt; } },
  { name: 'smelt', habitat: 'pelagic', size: 0.8, scheme: F.teal, variant: 'slim', wiggle: (f, dt, i) => { f.vx += Math.sin(f.t * 4.6 + i) * 3 * dt; } },
  { name: 'sandlance', habitat: 'benthic', size: 0.85, scheme: F.steel, variant: 'eel', wiggle: (f, dt, i) => { f.vy += Math.sin(f.t * 5.0 + i) * 3.5 * dt; } },
  { name: 'capelin', habitat: 'pelagic', size: 0.7, scheme: F.teal, variant: 'eel', wiggle: (f, dt, i) => { f.vx += Math.sin(f.t * 5.2 + i) * 3 * dt; } },
  { name: 'codling', habitat: 'benthic', size: 1.0, scheme: F.sand, variant: 'round', wiggle: (f, dt, i) => { f.vx += Math.sin(f.t * 3.4 + i) * 3 * dt; f.vy += Math.cos(f.t * 3.0 + i) * 2 * dt; } },
  { name: 'squid', habitat: 'benthic', size: 1.2, scheme: F.squid, variant: 'squid', wiggle: (f, dt) => { f.vy += Math.sin(f.t * 2.2) * 6 * dt; } },
  { name: 'star', habitat: 'benthic', size: 0.9, scheme: F.sand, variant: 'star', wiggle: (f) => { f.vx *= 0.995; f.vy *= 0.995; } },
];
Object.freeze(SPECIES);

export const PREY = []; // active list

// Spawn edge: an EVEN but unpredictable rotation of ALL FOUR edges (symmetric variant — top
// included so entry, like exit, is rotation-invariant; no orientation gets a denser/easier
// inflow). A shuffle "bag" hands out each edge exactly once per four spawns, random order — so
// no edge floods and players can't camp one to farm prey, yet the order stays unpredictable.
let edgeBag = [];
function nextEdge() {
  if (edgeBag.length === 0) {
    edgeBag = ['left', 'right', 'top', 'bottom'];
    for (let i = edgeBag.length - 1; i > 0; i--) { // Fisher–Yates shuffle
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = edgeBag[i]; edgeBag[i] = edgeBag[j]; edgeBag[j] = tmp;
    }
  }
  return edgeBag.pop();
}

export function spawnPrey(world, n = 1) {
  for (let i = 0; i < n; i++) {
    const sp = SPECIES[(Math.random() * SPECIES.length) | 0];
    const edge = nextEdge();
    const speed = BAL.fishSpeedMin + Math.random() * (BAL.fishSpeedMax - BAL.fishSpeedMin);
    const baseR = (12 + Math.random() * 10) * sp.size * BAL.fishSizeK;
    const lat = (Math.random() - 0.5) * speed * 0.35; // small tangential drift for the entry

    // Spawn just off the edge (clipped to the play frame until they swim in). STRAIGHT-IN entry:
    // each fish heads straight in along the edge normal with a little tangential drift (`lat`).
    // (A ±45° "diagonal-entry" variant was measured equally fair AND felt identical in playtest —
    // worklog §4a/§4b — so straight-in is kept for simplicity. prey-varied.js keeps the variant.)
    let x, y, vx, vy, dir;
    if (edge === 'left') { x = -20; y = Math.random() * world.h; vx = speed; vy = lat; dir = 1; }
    else if (edge === 'right') { x = world.w + 20; y = Math.random() * world.h; vx = -speed; vy = lat; dir = -1; }
    else if (edge === 'bottom') { x = Math.random() * world.w; y = world.h + 20; vx = lat; vy = -speed; dir = Math.sign(vx) || 1; }
    else { x = Math.random() * world.w; y = -20; vx = lat; vy = speed; dir = Math.sign(vx) || 1; } // top

    PREY.push({
      x, y, px: x, py: y, vx, vy, r: baseR, t: 0, dir, sp,
      phase: Math.random() * Math.PI * 2,
      fleeT: 0, restT: 0, tailKick: 0,
    });
  }
}

export function updatePrey(dt, seal, world, eatCb) {
  // Fixed-resolution world (SH-02): balance is device-independent, so no screen scaling.
  const boostK = 1.0;
  const steerK = 1.0;
  const threatK = ESCAPE.threatK;

  for (let i = PREY.length - 1; i >= 0; i--) {
    const f = PREY[i];

    f.px = f.x; f.py = f.y;
    f.t += dt; f.phase += dt;

    {
      const dx = f.x - seal.x, dy = f.y - seal.y;
      const d2 = dx * dx + dy * dy;
      const threatR = (seal.r * threatK) + f.r * 1.2;
      const threat2 = threatR * threatR;

      if (f.fleeT > 0) f.fleeT -= dt;
      if (f.restT > 0) f.restT -= dt;

      // C-start–like trigger: quick turn & burst when seal is close
      if (d2 < threat2 && f.fleeT <= 0 && f.restT <= 0) {
        const d = Math.max(1, Math.sqrt(d2));
        const nx = dx / d, ny = dy / d;
        f.vx += nx * (ESCAPE.burstImpulse * boostK);
        f.vy += ny * (ESCAPE.burstImpulse * boostK);
        f.dir = Math.sign(f.vx) || f.dir;
        f.fleeT = ESCAPE.fleeHold;
        f.restT = ESCAPE.restAfter;
        f.tailKick = 1.0;
      }

      if (f.fleeT > 0) {
        const d = Math.max(1, Math.sqrt(d2));
        f.vx += (ESCAPE.steer * steerK) * (dx / d) * dt;
        f.vy += (ESCAPE.steer * steerK) * (dy / d) * dt;
      }

      f.sp.wiggle(f, dt, i);

      const drag = f.fleeT > 0 ? ESCAPE.dragHi : ESCAPE.dragLo;
      f.vx *= drag; f.vy *= drag;

      // baseline cruise when not fleeing
      if (f.fleeT <= 0) {
        const sp = Math.hypot(f.vx, f.vy);
        const target = BAL.fishSpeedMin * CRUISE.targetK;
        const a = CRUISE.accel * dt;
        if (sp < target) {
          if (sp < 1) {
            const ang = f.phase * 1.7 + i * 0.9;
            f.vx += Math.cos(ang) * a;
            f.vy += Math.sin(ang) * a;
          } else {
            f.vx += (f.vx / sp) * a;
            f.vy += (f.vy / sp) * a;
          }
        }
        f.vx += Math.sin(f.phase * 1.3 + i) * CRUISE.wander * dt;
        f.vy += Math.cos(f.phase * 1.1 + i * 0.57) * CRUISE.wander * dt;
        f.dir = Math.sign(f.vx) || f.dir;
      }

      const vmaxBoost = 1.0 + (ESCAPE.maxBoost - 1.0) * boostK;
      const vmax = BAL.fishSpeedMax * (f.fleeT > 0 ? vmaxBoost : 1.0);
      const sp = Math.hypot(f.vx, f.vy);
      if (sp > vmax) { const k = vmax / sp; f.vx *= k; f.vy *= k; }
    }

    f.x += f.vx * dt; f.y += f.vy * dt;

    // HYBRID: keep PR#24's even 4-edge shuffle-bag spawn, but the ORIGINAL "fish stay" physics
    // — a soft inward push near EVERY edge, SYMMETRIC (same fixed margin & strength on x and y;
    // a fixed band from each edge is rotation-invariant). Prey linger in the field instead of
    // leaking out, which is what keeps the catch rate aspect-insensitive (the flow-through's
    // leakage was what amplified the aspect effect and broke fairness).
    {
      const m = 42, edgeSteer = 180;
      let pushX = 0, pushY = 0;
      if (f.x < m) pushX = (m - f.x) / m;
      else if (f.x > world.w - m) pushX = -(f.x - (world.w - m)) / m;
      if (f.y < m) pushY = (m - f.y) / m;
      else if (f.y > world.h - m) pushY = -(f.y - (world.h - m)) / m;
      f.vx += edgeSteer * pushX * dt;
      f.vy += edgeSteer * pushY * dt;
    }

    // Safety cull only (the push keeps prey in; a hard flee burst can still take one out, then
    // respawn tops up). Symmetric margin (40) > spawn offset (20) so a fresh fish isn't culled
    // on frame 1. Rendering is clipped to the field (drawPrey), so any straggler never shows in
    // the border.
    if (f.x < -40 || f.x > world.w + 40 || f.y < -40 || f.y > world.h + 40 ||
        Number.isNaN(f.x) || Number.isNaN(f.y)) { PREY.splice(i, 1); continue; }

    // collision sweep (shared samples from game.js)
    const eatR = f.r + seal.r * 0.9, eatR2 = eatR * eatR;
    let hit = false;
    for (const tt of SWEEP_T) {
      const sx = lerp(seal.px, seal.x, tt), sy = lerp(seal.py, seal.y, tt);
      const fx = lerp(f.px, f.x, tt), fy = lerp(f.py, f.y, tt);
      const ex = fx - sx, ey = fy - sy;
      if (ex * ex + ey * ey < eatR2) { hit = true; break; }
    }
    if (hit) { PREY.splice(i, 1); eatCb(); continue; }

    if (f.tailKick > 0) f.tailKick = Math.max(0, f.tailKick - dt * 5);
  }
}

export function drawPrey(ctx, world) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t = performance.now() / 1000;

  // Clip prey to the play frame: a fish entering/leaving laterally appears/disappears at the
  // arena edge (off-screen on 16:9/portrait, behind the cove wall on widescreen) instead of
  // swimming visibly in the border where the seal can't reach it.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, world.w, world.h);
  ctx.clip();

  for (const f of PREY) {
    const dir = (f.dir || (f.vx >= 0 ? 1 : -1)) >= 0 ? 1 : -1;
    const wig = reduced ? 0 : Math.sin((t + f.phase) * WIGGLE.rotFreq) * WIGGLE.rotAmp;
    const sclY = 1 + (reduced ? 0 : Math.sin((t + f.phase * 0.7) * (WIGGLE.rotFreq * 0.33)) * WIGGLE.scaleAmp);

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(dir, 1);
    ctx.rotate(wig);
    ctx.scale(1, sclY);
    drawFish(ctx, f.r, f.sp.scheme, f.sp.variant, f.tailKick);
    ctx.restore();
  }

  ctx.restore();
}
