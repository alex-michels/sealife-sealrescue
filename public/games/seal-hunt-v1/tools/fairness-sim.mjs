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

// — Seeded RNG (determinism). The game core's only randomness is Math.random() in prey spawn;
//   override the global with a seeded mulberry32 so every run is byte-for-byte reproducible.
//   The round is re-seeded with a profile-INDEPENDENT seed (common random numbers): round i
//   starts from the same stream on every profile, so the cross-profile spread reflects the
//   MECHANICS, not RNG luck. The old unseeded harness let the spread swing 6.6%↔9.5% at N=80
//   (min/max are order statistics over 16 profiles, so they amplify per-round noise) — which
//   couldn't distinguish the hybrid from `main`. `SEED=<n>` picks a different deterministic
//   stream (default 0) to confirm a result isn't a one-seed artefact.
let _rngState = 1;
function mulberry32() {
  _rngState |= 0; _rngState = (_rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(_rngState ^ (_rngState >>> 15), 1 | _rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
// SEED=off|none|random → UNSEEDED: keep the real Math.random (non-deterministic, like the live
// game). Use with large N (1000–2000) to average noise out the "real" way. SEED=<n> → stream n.
const SEED_RAW = String(process.env.SEED ?? '').toLowerCase();
const UNSEEDED = ['off', 'none', 'random', 'rand', 'real'].includes(SEED_RAW);
const SEED_BASE = UNSEEDED ? 0 : (Number(process.env.SEED) || 0) >>> 0;
function seedRound(i) { _rngState = (SEED_BASE * 1_000_003 + i + 1) | 0; }
if (!UNSEEDED) Math.random = mulberry32; // game core (prey.js) reads the global → deterministic

// Screen profiles (display CSS px) — ALL resolutions: small → 4K → ultra-wide → extra-tall.
const PROFILES = [
  // —— portrait (phones / tablets)
  { name: 'small phone  4:3   ', w: 360, h: 640 },
  { name: 'phone        9:16  ', w: 414, h: 736 },
  { name: 'tall phone   9:19.5', w: 412, h: 915 },
  { name: 'extra-tall   9:21  ', w: 412, h: 962 },
  { name: 'tablet      3:4    ', w: 768, h: 1024 },
  { name: 'tablet      10:16  ', w: 800, h: 1280 },
  // —— landscape (laptops / desktops)
  { name: 'tablet land 4:3    ', w: 1024, h: 768 },
  { name: 'laptop      16:10  ', w: 1280, h: 800 },
  { name: 'laptop      16:9   ', w: 1366, h: 768 },
  { name: 'desktop FHD 16:9   ', w: 1920, h: 1080 },
  { name: 'desktop QHD 16:9   ', w: 2560, h: 1440 },
  { name: '4K          16:9   ', w: 3840, h: 2160 },
  // —— wide / ultra-wide
  { name: 'wide window ~2:1   ', w: 2000, h: 980 },
  { name: 'ultrawide   21:9   ', w: 2560, h: 1080 },
  { name: 'ultrawide   21:9 hi', w: 3440, h: 1440 },
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

console.log(`\nSeal The Hunter — fairness harness  (${N} rounds/profile, ${TICKS} ticks each)`);
console.log(UNSEEDED
  ? 'UNSEEDED: real RNG (non-deterministic) — use large N to average noise\n'
  : `seeded RNG: deterministic, common random numbers across profiles (SEED=${SEED_BASE})\n`);
console.log('profile               world(logical)  prey  catch/round  ±sd   (±se)');
console.log('─'.repeat(74));
console.log(CLAMP >= 100 ? '(no clamp — full screen)' : `(play-field aspect clamped at ${CLAMP}:1)`);
const results = [];
for (const p of PROFILES) {
  const world = computeWorld(p.w, p.h, CLAMP);
  recomputeBalance(world.w, world.h);
  const cap = BAL.maxPreyCap;
  const scores = Array.from({ length: N }, (_, i) => { if (!UNSEEDED) seedRound(i); return runRound(world); });
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
