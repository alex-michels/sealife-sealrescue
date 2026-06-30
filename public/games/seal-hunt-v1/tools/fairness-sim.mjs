// tools/fairness-sim.mjs — headless fairness harness for Seal The Hunter.
//
// Runs the REAL game simulation core (core/sim.js + entities/prey.js) with an automated
// "bot" seal that plays identically on every screen, then reports the catch rate (final
// 60s score) per screen profile. If the means line up within noise, the game is fair
// across screen sizes; a profile that stands out is a real advantage/disadvantage.
//
// Run:  node tools/fairness-sim.mjs            (default 60 rounds/profile)
//       node tools/fairness-sim.mjs 200        (N rounds/profile)
//
// Best practice this follows: automated agent playtesting / Monte-Carlo balance sims
// (the way studios like EA measure balance objectively).

import { BAL, BASE, VIEW_CFG, computeWorld, recomputeBalance } from '../core/balance.js';
import { ROUND_MS, stepSeal, spawnTick } from '../core/sim.js';
import { PREY, updatePrey } from '../entities/prey.js';
import { makeSeal } from '../entities/seal.js';

const DT = 1 / 60;                 // fixed timestep (matches ~60fps; deterministic)
const TICKS = Math.round(ROUND_MS / 1000 / DT);
const N = Number(process.argv[2]) || 60;
// Default: the game's configured clamp (VIEW_CFG.maxAspect). CLAMP=999 tests "no clamp".
const CLAMP = process.env.CLAMP !== undefined ? Number(process.env.CLAMP) : VIEW_CFG.maxAspect;

// Screen profiles (display CSS px) we care about: small → extra-wide → extra-tall.
const PROFILES = [
  { name: 'small phone        ', w: 360, h: 640 },
  { name: 'tall phone   (9:19.5)', w: 412, h: 915 },
  { name: 'tablet portrait    ', w: 768, h: 1024 },
  { name: 'laptop 16:9        ', w: 1366, h: 768 },
  { name: 'desktop FHD 16:9   ', w: 1920, h: 1080 },
  { name: 'ultrawide 21:9     ', w: 3440, h: 1440 },
  { name: 'super-ultra 32:9   ', w: 3840, h: 1080 },
];

// — Bot: greedy nearest-prey chaser. Aims the "pointer" PAST the nearest prey so the seal
//   commits at full speed (no ARRIVE slowdown), then the collision sweep eats it. The same
//   policy on every screen → removes human skill so only the mechanics are measured.
function botControl(seal) {
  let best = null, bestD2 = Infinity;
  for (const f of PREY) {
    const dx = f.x - seal.x, dy = f.y - seal.y, d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = f; }
  }
  if (!best) return { px: 0, py: 0, active: false, kx: 0, ky: 0 };
  const d = Math.sqrt(bestD2) || 1;
  const nx = (best.x - seal.x) / d, ny = (best.y - seal.y) / d;
  const lead = 250; // aim beyond the target so the seal stays at full speed
  return { px: best.x + nx * lead, py: best.y + ny * lead, active: true, kx: 0, ky: 0 };
}

function runRound(world) {
  recomputeBalance(world.w, world.h);
  const seal = makeSeal(() => []);          // dummy spots (rendering only)
  seal.maxSpeed = BAL.sealSpeed;
  seal.accel = BAL.sealAccel;
  seal.x = world.w * 0.3; seal.y = world.h * 0.5;
  seal.px = seal.x; seal.py = seal.y; seal.vx = seal.vy = 0;
  PREY.length = 0;

  let timeLeft = ROUND_MS, spawnTimer = 0, score = 0;
  for (let i = 0; i < TICKS; i++) {
    timeLeft -= DT * 1000;
    spawnTimer = spawnTick(spawnTimer, DT, timeLeft, world);
    stepSeal(seal, botControl(seal), DT, world);
    updatePrey(DT, seal, world, () => score++);
  }
  return score;
}

function stats(xs) {
  const n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return { mean, sd, se: sd / Math.sqrt(n) };
}

console.log(`\nSeal The Hunter — fairness harness  (${N} rounds/profile, ${TICKS} ticks each)\n`);
console.log('profile               world(logical)  prey  catch/round  ±sd   (±se)');
console.log('─'.repeat(74));
console.log(CLAMP >= 100 ? '(no clamp — full screen)' : `(play-field aspect clamped at ${CLAMP}:1)`);
const results = [];
for (const p of PROFILES) {
  const world = computeWorld(p.w, p.h, CLAMP);
  recomputeBalance(world.w, world.h);
  const cap = BAL.maxPreyCap;
  const scores = Array.from({ length: N }, () => runRound(world));
  const s = stats(scores);
  results.push({ name: p.name.trim(), mean: s.mean });
  console.log(
    `${p.name} ${String(world.w + '×' + world.h).padStart(10)}   ${String(cap).padStart(3)}   ` +
    `${s.mean.toFixed(1).padStart(7)}    ${s.sd.toFixed(1).padStart(4)}  (±${s.se.toFixed(1)})`
  );
}
const means = results.map((r) => r.mean);
const lo = Math.min(...means), hi = Math.max(...means), avg = means.reduce((a, b) => a + b, 0) / means.length;
console.log('─'.repeat(74));
console.log(`spread across profiles: min ${lo.toFixed(1)}  max ${hi.toFixed(1)}  ` +
  `→ ${(((hi - lo) / avg) * 100).toFixed(1)}% (lower = fairer)\n`);
