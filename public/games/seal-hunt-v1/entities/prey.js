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
// How fast prey yaw toward their heading (rad/s) — like the seal's turnRate, a touch snappier.
// Drives the FACING render only (drawPrey); does not touch velocity/collision → fairness-neutral.
const PREY_TURN = 9;

const F = PALETTE.fish;

// Dark separation edge: a near-opaque ink silhouette drawn slightly enlarged BEHIND each
// creature so it reads against the busy reef backdrop, not only flat water. One tone for all
// species → a cohesive flat-art "sticker" edge; paired with the light dorsal rim below, prey
// pop on BOTH the bright reef and dark deep water (dark edge separates on light, light rim on
// dark). Grows ~constant px at any fish radius.
const OUTLINE = 'rgba(12,34,48,0.7)';
const outlineGrow = (r) => 1 + Math.min(0.16, 2.2 / r);

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

function starPath(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = i * (Math.PI * 2 / 5) - Math.PI / 2;
    const x = Math.cos(a) * r * 0.92, y = Math.sin(a) * r * 0.92;
    const ax = Math.cos(a + 0.63) * r * 0.4, ay = Math.sin(a + 0.63) * r * 0.4;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    ctx.lineTo(ax, ay);
  }
  ctx.closePath();
}

// `alpha` (SH-12 follow-up): базовый множитель прозрачности рыбы — рендер-фейд за краем поля
// (см. drawPrey/EDGE_FADE_LU). Внутренние absolute-присваивания globalAlpha умножаются на него.
function drawStar(ctx, r, c, alpha = 1) {
  ctx.globalAlpha = alpha;
  // separation edge
  ctx.save();
  ctx.scale(outlineGrow(r), outlineGrow(r));
  ctx.fillStyle = OUTLINE;
  starPath(ctx, r);
  ctx.fill();
  ctx.restore();

  // body: radial centre→arm shade (raised centre, flatter arms) for a little volume
  starPath(ctx, r);
  const g = ctx.createRadialGradient(0, 0, r * 0.08, 0, 0, r);
  g.addColorStop(0, c.belly);
  g.addColorStop(0.5, c.body);
  g.addColorStop(1, c.back);
  ctx.fillStyle = g;
  ctx.fill();

  // tube-feet dots down each arm
  ctx.save();
  starPath(ctx, r);
  ctx.clip();
  ctx.globalAlpha = 0.4 * alpha;
  ctx.fillStyle = c.back;
  for (let i = 0; i < 5; i++) {
    const a = i * (Math.PI * 2 / 5) - Math.PI / 2;
    for (let d = 0.32; d < 0.85; d += 0.22) {
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * d, Math.sin(a) * r * d, r * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = alpha;
  ctx.restore();
}

function drawSquid(ctx, r, c, anim = null, alpha = 1) {
  ctx.globalAlpha = alpha;
  const ph = anim ? anim.tentPhase : 0;
  const amp = anim ? anim.tentAmp : 0;
  const mantle = () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.62, r * 0.92, 0, 0, Math.PI * 2); };
  const tentacles = (color, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    for (let k = -2; k <= 2; k++) {
      // a travelling wave across the arms — control point and tip sway out of phase so they curl
      const sway = Math.sin(ph + k * 0.9) * r * 0.18 * amp;
      const tipSway = Math.sin(ph + k * 0.9 + 0.7) * r * 0.26 * amp;
      ctx.beginPath();
      ctx.moveTo(k * r * 0.16, r * 0.5);
      ctx.quadraticCurveTo(k * r * 0.22 + sway, r * 0.92, k * r * 0.28 + tipSway, r * 1.2);
      ctx.stroke();
    }
  };

  // separation edge: heavier tentacles + enlarged mantle, behind everything
  ctx.save();
  ctx.scale(outlineGrow(r), outlineGrow(r));
  tentacles(OUTLINE, Math.max(2, r * 0.2));
  ctx.fillStyle = OUTLINE;
  mantle(); ctx.fill();
  ctx.restore();

  tentacles(c.back, Math.max(1.5, r * 0.12));

  // mantle with a vertical counter-shade (dark top → light belly)
  mantle();
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, c.back);
  g.addColorStop(0.5, c.body);
  g.addColorStop(1, c.belly);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.fillStyle = c.eye;
  ctx.beginPath(); ctx.arc(-r * 0.26, -r * 0.04, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.26, -r * 0.04, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.highlight;
  ctx.beginPath(); ctx.arc(-r * 0.23, -r * 0.07, r * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.29, -r * 0.07, r * 0.035, 0, Math.PI * 2); ctx.fill();
}

function drawFish(ctx, r, c, variant, tailKick = 0, prize = false, anim = null, alpha = 1) {
  if (variant === 'star') return drawStar(ctx, r, c, alpha);
  if (variant === 'squid') return drawSquid(ctx, r, c, anim, alpha);
  ctx.globalAlpha = alpha;

  const rx = variant === 'slim' ? r * 1.12 : variant === 'eel' ? r * 1.2 : r * 0.95;
  const ry = variant === 'slim' ? r * 0.46 : r * 0.6;
  const hasFins = variant !== 'eel';
  const k = r * 0.5 * (0.7 + tailKick); // tail half-height (widens a touch on flee)
  const wag = anim ? anim.tailWag : 0; // tail sway while swimming

  // tail pivots at its base so it sways like a swimming fish; body/dorsal/belly stay put. The
  // path is built under its own transform, so the separation-edge pass (drawn under scale(grow))
  // and the colour pass stay aligned through the same wag.
  const tail = () => {
    ctx.save();
    ctx.translate(-rx * 0.82, 0);
    ctx.rotate(wag);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-rx * 0.68, -k);
    ctx.lineTo(-rx * 0.68, k);
    ctx.closePath();
    ctx.restore();
  };
  const dorsal = () => { ctx.beginPath(); ctx.moveTo(-r * 0.05, -ry * 0.78); ctx.quadraticCurveTo(r * 0.32, -ry * 1.7, r * 0.5, -ry * 0.66); ctx.closePath(); };

  // 1) separation edge — enlarged ink silhouette of the whole fish, drawn behind everything
  ctx.save();
  ctx.scale(outlineGrow(r), outlineGrow(r));
  ctx.fillStyle = OUTLINE;
  if (hasFins) { tail(); ctx.fill(); dorsal(); ctx.fill(); }
  fishBody(ctx, r, variant); ctx.fill();
  ctx.restore();

  // 2) tail fin (round/slim)
  if (hasFins) { ctx.fillStyle = c.back; tail(); ctx.fill(); }

  // 3) body — vertical counter-shade (dark back → light belly), matching the seal
  fishBody(ctx, r, variant);
  const fur = ctx.createLinearGradient(0, -ry, 0, ry);
  fur.addColorStop(0, c.back);
  fur.addColorStop(0.5, c.body);
  fur.addColorStop(1, c.belly);
  ctx.fillStyle = fur;
  ctx.fill();

  // 4) dorsal fin on the back (stronger fishy silhouette)
  if (hasFins) { ctx.fillStyle = c.back; dorsal(); ctx.fill(); }

  // 5) inner details clipped to the body: lateral line + glossy top rim
  ctx.save();
  fishBody(ctx, r, variant);
  ctx.clip();
  ctx.globalAlpha = 0.32 * alpha;
  ctx.strokeStyle = c.back;
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.moveTo(-rx * 0.85, -r * 0.03);
  ctx.lineTo(rx * 0.62, -r * 0.03);
  ctx.stroke();
  // top rim light — separates the fish on dark deep water; brighter on the prize
  ctx.globalAlpha = (prize ? 0.85 : 0.5) * alpha;
  ctx.strokeStyle = prize ? '#FFEACB' : PALETTE.highlight;
  ctx.lineWidth = Math.max(1, r * (prize ? 0.16 : 0.12));
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.9, ry * 0.92, 0, Math.PI * 1.12, Math.PI * 1.96);
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.restore();

  // 6) eye + highlight
  ctx.fillStyle = c.eye;
  ctx.beginPath(); ctx.arc(rx * 0.55, -r * 0.12, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.highlight;
  ctx.beginPath(); ctx.arc(rx * 0.58, -r * 0.15, r * 0.045, 0, Math.PI * 2); ctx.fill();

  // 7) soft mouth
  ctx.strokeStyle = c.eye;
  ctx.globalAlpha = 0.6 * alpha;
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rx * 0.78, r * 0.08);
  ctx.quadraticCurveTo(rx * 0.92, r * 0.1, rx * 0.99, r * 0.05);
  ctx.stroke();
  ctx.globalAlpha = alpha;

  // 8) prize fish (goldie) — a tiny sparkle so the rare, valuable catch stands out
  if (prize) {
    ctx.fillStyle = '#FFF4E0';
    const sx = rx * 0.12, sy = -ry * 0.72, s = r * 0.22;
    ctx.beginPath();
    ctx.moveTo(sx, sy - s); ctx.lineTo(sx + s * 0.28, sy - s * 0.28);
    ctx.lineTo(sx + s, sy); ctx.lineTo(sx + s * 0.28, sy + s * 0.28);
    ctx.lineTo(sx, sy + s); ctx.lineTo(sx - s * 0.28, sy + s * 0.28);
    ctx.lineTo(sx - s, sy); ctx.lineTo(sx - s * 0.28, sy - s * 0.28);
    ctx.closePath();
    ctx.fill();
  }
}

// -------------------------------------------------------
// species catalog — cohesive brand schemes + shared renderer.
// `habitat` drives where a creature enters from (biology, not "falling from the sky"):
//   'pelagic' — schooling fish; swim in horizontally, rise from the depths (diel vertical
//               migration), never from the air. Top entry only when the top is open water.
//   'benthic' — seabed dwellers (octopus, starfish, sand-burrowers, demersal cod); enter
//               from the bottom or sides, never the top.
const SPECIES = [
  { name: 'goldie', habitat: 'pelagic', size: 1.0, scheme: F.coral, variant: 'round', prize: true, wiggle: (f, dt, i) => { f.vx += Math.sin(f.t * 4.8 + i) * 4 * dt; f.vy += Math.cos(f.t * 4.2 + i) * 4 * dt; } },
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
// Сброс спавн-состояния (QA-30/31): bag переживает раунды, из-за чего раунд i зависел от
// хвоста предыдущего — харнесс/golden-тесты требуют «раунд = f(seed)». Живая игра сброс
// не зовёт (ей не важно), харнесс — в начале каждого раунда.
export function resetSpawnState() { edgeBag = []; }
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
      x, y, px: x, py: y, vx, vy, r: baseR, t: 0, dir, ang: Math.atan2(vy, vx), face: vx >= 0 ? 1 : -1, sp,
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

    // Face the way it swims, like the seal: yaw a stored angle toward the velocity, capped per
    // frame so it turns smoothly (drawPrey rotates the sprite by f.ang). Render-only — no effect
    // on position/collision/balance, so the fairness harness is unaffected.
    {
      if (typeof f.ang !== 'number') f.ang = Math.atan2(f.vy, f.vx);
      const spd = Math.hypot(f.vx, f.vy);
      if (spd > 4) {
        const wrap = (a) => (a + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        let d = wrap(Math.atan2(f.vy, f.vx) - f.ang);
        const step = PREY_TURN * dt;
        if (Math.abs(d) > step) d = Math.sign(d) * step;
        f.ang = wrap(f.ang + d);
      }
      // Sticky left/right facing (hysteresis): so a fish can face its heading WITHOUT rolling
      // belly-up. Near-vertical headings (|cos| < 0.15) keep the last facing → no flip-flicker
      // on straight up/down swims. drawPrey then flips + tilts (never a full roll).
      const cx = Math.cos(f.ang);
      if (typeof f.face !== 'number') f.face = cx >= 0 ? 1 : -1;
      else if (cx > 0.15) f.face = 1;
      else if (cx < -0.15) f.face = -1;
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
    // on frame 1. Rendering handles edge exits diegetically in drawPrey: side walls cover the
    // cove edges, bottom fades under the seabed, and top overshoot is painted back under the
    // drawn waterline so fish never appear in the air strip on ultra-tall screens.
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

// Зона рендер-фейда за краем поля (lu): чуть УЖЕ sim-кулла (±40, updatePrey), чтобы добыча
// растворялась ДО удаления — сам кулл становится невидимым. Только альфа-рендер, не механика.
const EDGE_FADE_LU = 38;

/**
 * Добыча за краем поля остаётся видимой в бордюре по бокам/снизу (никакого clip там): её прячут
 * диегетические слои — стены водорослей рисуются ПОВЕРХ добычи (drawBorderFront), снизу — фейд
 * под дно. СВЕРХУ (граница воды) особый случай: верхний бордюр — воздух, туда добычу пускать
 * нельзя. Раньше её «зеркалили» вниз солидным спрайтом — так получался ловимый на вид, но
 * недостижимый фантом: тюлень закламплен в поле (core/sim.js), а коллизия проверяет РЕАЛЬНУЮ
 * позицию рыбы (updatePrey), поэтому клик по фантому не засчитывался. Теперь у поверхности:
 *   (1) clip по ватерлинии (worldY ≥ 0) — над водой не рисуем (никакой рыбы «в воздухе»);
 *   (2) рыба рисуется на СВОЕЙ реальной позиции и фейдится по мере всплытия (over/EDGE_FADE_LU)
 *       → плавно «ныряет» под поверхность, а не исчезает рывком;
 *   (3) кольцо-рябь (`surf.ripples`) маркирует точку пересечения.
 * Рендер честен относительно коллизии → видимая под водой добыча всегда достижима. Физика/
 * спавн/кулл/поимка НЕ трогаются (fairness).
 */
export function drawPrey(ctx, world, surf = null) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t = performance.now() / 1000;
  ctx.save();

  // Рябь на поверхности там, где рыба пересекает линию воды (вход из top-спавна / бегство
  // вверх): маркер «нырнула/ушла за поверхность». Чисто визуально, под reduced-motion выключено.
  if (surf && surf.ripples && !reduced) {
    for (const f of PREY) {
      if (f.y > -34 && f.y < 8) {
        const a = 1 - Math.min(1, Math.abs(f.y) / 34);
        ctx.strokeStyle = `rgba(237,241,243,${(0.38 * a).toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(f.x, 1.5, f.r * (1.6 - 0.6 * a), 3.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // Top-surface exit (ultra-tall screens): the top border is air. Clip prey to BELOW the
  // waterline (half-plane worldY ≥ 0) so a fish crossing the surface sinks out of view instead
  // of flying in the sky — while sides/bottom stay open (prey slide behind the kelp walls /
  // fade under the seabed, tested separately). The fish keeps its REAL sim position and only
  // fades as it breaches, so it never becomes a solid "catchable" phantom where the seal can't
  // reach (the seal is clamped to the field — core/sim.js). Render stays honest with collision.
  if (surf) {
    ctx.beginPath();
    ctx.rect(-1e5, 0, 2e5, world.h + 1e5);
    ctx.clip();
  }

  for (const f of PREY) {
    // Насколько рыба вышла за поле по ЛЮБОЙ оси → альфа 1 → 0 к EDGE_FADE_LU. Верхний overshoot
    // фейдится так же, как бока/низ, поэтому прорыв поверхности растворяется (без резкого «поп»).
    const overX = f.x < 0 ? -f.x : f.x > world.w ? f.x - world.w : 0;
    const overY = f.y < 0 ? -f.y : f.y > world.h ? f.y - world.h : 0;
    const over = Math.max(overX, overY);
    const fadeA = over > 0 ? Math.max(0, 1 - over / EDGE_FADE_LU) : 1;
    if (fadeA <= 0) continue;
    const variant = f.sp.variant;
    const ph = t + f.phase;
    const wig = reduced ? 0 : Math.sin(ph * WIGGLE.rotFreq) * WIGGLE.rotAmp;
    const sclY = 1 + (reduced ? 0 : Math.sin((t + f.phase * 0.7) * (WIGGLE.rotFreq * 0.33)) * WIGGLE.scaleAmp);

    // Fin-fish face their heading but stay BELLY-DOWN (they do NOT roll over like the seal): a
    // sticky left/right flip (f.face) + a pitch that tilts the nose up/down. scale(face,1) then
    // rotate(pitch) reproduces the heading direction with the belly always down — combining
    // "look where you swim" with "never flip upside-down". Squid & starfish aren't +x-facing
    // (vertical mantle / radial body), so they stay upright — only their parts move.
    const orient = variant !== 'squid' && variant !== 'star';

    // swim animation (off under reduced-motion): tail sway for fin-fish, tentacle wave for squid,
    // scaled by how hard the creature is swimming so idle prey only drift gently.
    const swim = Math.min(1, Math.hypot(f.vx, f.vy) / (BAL.fishSpeedMax * 0.6));
    const anim = reduced ? null : {
      tailWag: Math.sin(ph * 8) * 0.4 * (0.45 + 0.55 * swim),
      tentPhase: ph * 2.4,
      tentAmp: 0.4 + 0.6 * swim,
    };

    ctx.save();
    ctx.translate(f.x, f.y);
    if (orient) {
      const a = (typeof f.ang === 'number') ? f.ang : Math.atan2(f.vy, f.vx);
      const face = f.face || (Math.cos(a) >= 0 ? 1 : -1);
      const pitch = Math.atan2(Math.sin(a), face * Math.cos(a)); // ∈ (−90°,90°) → belly stays down
      ctx.scale(face, 1);
      ctx.rotate(pitch + wig);
    } else {
      ctx.rotate(wig);
    }
    ctx.scale(1, sclY);
    drawFish(ctx, f.r, f.sp.scheme, variant, f.tailKick, f.sp.prize, anim, fadeA);
    ctx.restore();
  }

  ctx.restore();
}
