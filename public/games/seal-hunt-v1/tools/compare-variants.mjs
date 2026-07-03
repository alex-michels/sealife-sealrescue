// tools/compare-variants.mjs — head-to-head fairness comparison of the three prey models,
// under IDENTICAL seeded randomness (common random numbers across variants AND profiles).
//
//   main   — original random-edge spawn + world-scaled asymmetric edge-push (what ships on `main`)
//   hybrid — shuffle-bag 4-edge spawn + fixed symmetric edge-push, straight-in entry (branch HEAD)
//   varied — hybrid spawn/push but ±45° cone entry headings (the "diagonal-entry look")
//
// Why this exists: the single-variant harness (fairness-sim.mjs) is now seeded, but the
// ORIGINAL 6.0%/8.5%/main comparison was made unseeded at N=80, where the spread (an order
// statistic over 16 profiles) swung 6.6%↔9.5% run-to-run and could NOT actually separate the
// variants. This runs all three through the EXACT same seeded stream so the deltas are real.
//
// Run:  node tools/compare-variants.mjs [N]      (default 120 rounds/profile/variant)
//       SEED=7 node tools/compare-variants.mjs   (different deterministic stream)
//       ASPECT=2 node tools/compare-variants.mjs (эксперимент с другим фикс. аспектом, SH-12)

import { BAL, BASE, VIEW_CFG, computeWorld, recomputeBalance } from '../core/balance.js';
import { ROUND_MS, stepSeal } from '../core/sim.js';
import { makeSeal } from '../entities/seal.js';

import * as MAIN from './variants/prey-main.js';
import * as HYBRID from '../entities/prey.js';            // the shipped HEAD = hybrid straight-in
import * as VARIED from './variants/prey-varied.js';

const DT = 1 / 60;
const TICKS = Math.round(ROUND_MS / 1000 / DT);
const N = Number(process.argv[2]) || 120;
const ASPECT = process.env.ASPECT !== undefined ? Number(process.env.ASPECT) : VIEW_CFG.aspect;

// — Seeded RNG (mulberry32), same scheme as fairness-sim.mjs. seedRound(i) depends ONLY on the
//   round index, so round i starts from the same stream for every variant & profile (common
//   random numbers → the cross-variant delta is the mechanics, not RNG luck).
let _rngState = 1;
function mulberry32() {
  _rngState |= 0; _rngState = (_rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(_rngState ^ (_rngState >>> 15), 1 | _rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
// SEED=off|none|random → UNSEEDED: keep the real Math.random (non-deterministic, exactly like
// the live game). Use with large N (1000–2000) to average noise out the "real" way instead of
// fixing a stream. SEED=<n> → deterministic stream n (default 0).
const SEED_RAW = String(process.env.SEED ?? '').toLowerCase();
const UNSEEDED = ['off', 'none', 'random', 'rand', 'real'].includes(SEED_RAW);
const SEED_BASE = UNSEEDED ? 0 : (Number(process.env.SEED) || 0) >>> 0;
function seedRound(i) { _rngState = (SEED_BASE * 1_000_003 + i + 1) | 0; }
if (!UNSEEDED) Math.random = mulberry32; // else: real RNG, common-random-numbers off

const VARIANTS = [
  { key: 'main', mod: MAIN, label: 'main   (random-edge + scaled asym push, straight-in)' },
  { key: 'hybrid', mod: HYBRID, label: 'hybrid (shuffle-bag + fixed sym push, straight-in)' },
  { key: 'varied', mod: VARIED, label: 'varied (shuffle-bag + fixed sym push, ±45° entry)' },
];

const PROFILES = [
  { name: 'small phone  4:3   ', w: 360, h: 640 },
  { name: 'phone        9:16  ', w: 414, h: 736 },
  { name: 'tall phone   9:19.5', w: 412, h: 915 },
  { name: 'extra-tall   9:21  ', w: 412, h: 962 },
  { name: 'tablet      3:4    ', w: 768, h: 1024 },
  { name: 'tablet      10:16  ', w: 800, h: 1280 },
  { name: 'tablet land 4:3    ', w: 1024, h: 768 },
  { name: 'laptop      16:10  ', w: 1280, h: 800 },
  { name: 'laptop      16:9   ', w: 1366, h: 768 },
  { name: 'desktop FHD 16:9   ', w: 1920, h: 1080 },
  { name: 'desktop QHD 16:9   ', w: 2560, h: 1440 },
  { name: '4K          16:9   ', w: 3840, h: 2160 },
  { name: 'wide window ~2:1   ', w: 2000, h: 980 },
  { name: 'ultrawide   21:9   ', w: 2560, h: 1080 },
  { name: 'ultrawide   21:9 hi', w: 3440, h: 1440 },
  { name: 'super-ultra 32:9   ', w: 3840, h: 1080 },
];

function botControl(seal, mod) {
  let best = null, bestD2 = Infinity;
  for (const f of mod.PREY) {
    const dx = f.x - seal.x, dy = f.y - seal.y, d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = f; }
  }
  if (!best) return { px: 0, py: 0, active: false, kx: 0, ky: 0 };
  const d = Math.sqrt(bestD2) || 1;
  const nx = (best.x - seal.x) / d, ny = (best.y - seal.y) / d;
  const lead = 250;
  return { px: best.x + nx * lead, py: best.y + ny * lead, active: true, kx: 0, ky: 0 };
}

// Local copy of core/sim.js spawnTick, parameterised by the variant module (sim.js's own
// spawnTick is hard-bound to the shipped prey.js, so it can't drive the variants).
function spawnTick(spawnTimer, dt, timeLeft, world, mod) {
  spawnTimer -= dt;
  const progress = 1 - Math.max(0, timeLeft) / ROUND_MS;
  const targetPop = Math.min(BAL.maxPreyCap, Math.round(BAL.maxPreyCap * 0.6 + progress * BAL.maxPreyCap * 0.4));
  if (mod.PREY.length < targetPop && spawnTimer <= 0) {
    const need = targetPop - mod.PREY.length;
    mod.spawnPrey(world, Math.min(2, need));
    const catchup = need > 6 ? 0.35 : 0.55;
    const diagK = BAL.diag / BASE.diag;
    spawnTimer = catchup / Math.max(0.85, Math.min(1.3, diagK));
  }
  return spawnTimer;
}

function runRound(world, mod) {
  recomputeBalance(world.w, world.h);
  const seal = makeSeal(() => []);
  seal.maxSpeed = BAL.sealSpeed;
  seal.accel = BAL.sealAccel;
  seal.x = world.w * 0.3; seal.y = world.h * 0.5;
  seal.px = seal.x; seal.py = seal.y; seal.vx = seal.vy = 0;
  mod.PREY.length = 0;

  let timeLeft = ROUND_MS, spawnTimer = 0, score = 0;
  for (let i = 0; i < TICKS; i++) {
    timeLeft -= DT * 1000;
    spawnTimer = spawnTick(spawnTimer, DT, timeLeft, world, mod);
    stepSeal(seal, botControl(seal, mod), DT, world);
    mod.updatePrey(DT, seal, world, () => score++);
  }
  return score;
}

function spreadPct(means) {
  const lo = Math.min(...means), hi = Math.max(...means);
  const avg = means.reduce((a, b) => a + b, 0) / means.length;
  return { lo, hi, avg, pct: ((hi - lo) / avg) * 100 };
}

// results[profileName][variantKey] = mean catch/round
const results = PROFILES.map(() => ({}));
const perVariantMeans = { main: [], hybrid: [], varied: [] };

for (const v of VARIANTS) {
  PROFILES.forEach((p, pi) => {
    const world = computeWorld(p.w, p.h, ASPECT);
    let sum = 0;
    for (let i = 0; i < N; i++) { if (!UNSEEDED) seedRound(i); sum += runRound(world, v.mod); }
    const mean = sum / N;
    results[pi][v.key] = mean;
    perVariantMeans[v.key].push(mean);
  });
}

console.log(`\nSeal The Hunter — prey-variant head-to-head  (${N} rounds/profile/variant, ` +
  `${UNSEEDED ? 'UNSEEDED real RNG' : `seeded SEED=${SEED_BASE}`})`);
console.log(`(fixed play-field aspect ${ASPECT.toFixed(3)}:1 per orientation — SH-12)\n`);
for (const v of VARIANTS) console.log(`  ${v.key.padEnd(7)} ${v.label}`);

console.log('\nprofile                 main   hybrid  varied   range');
console.log('─'.repeat(60));
PROFILES.forEach((p, pi) => {
  const r = results[pi];
  const row = [r.main, r.hybrid, r.varied];
  const range = (Math.max(...row) - Math.min(...row)).toFixed(1);
  console.log(
    `${p.name}  ${r.main.toFixed(1).padStart(6)}  ${r.hybrid.toFixed(1).padStart(6)}  ` +
    `${r.varied.toFixed(1).padStart(6)}   ±${range}`
  );
});
console.log('─'.repeat(60));

console.log('\nFAIRNESS (cross-profile spread; lower = fairer) + difficulty (grand mean catch):');
const tag = { main: '', hybrid: '', varied: '' };
const spreads = {};
for (const v of VARIANTS) {
  const s = spreadPct(perVariantMeans[v.key]);
  spreads[v.key] = s;
  console.log(
    `  ${v.key.padEnd(7)} spread ${s.pct.toFixed(1).padStart(5)}%  ` +
    `(min ${s.lo.toFixed(1)}  max ${s.hi.toFixed(1)})   grand mean ${s.avg.toFixed(1)} catch/round`
  );
}
const fairest = VARIANTS.map(v => v.key).sort((a, b) => spreads[a].pct - spreads[b].pct)[0];
console.log(`\n  → fairest: ${fairest} (${spreads[fairest].pct.toFixed(1)}%). ` +
  `main ${spreads.main.pct.toFixed(1)}% · hybrid ${spreads.hybrid.pct.toFixed(1)}% · varied ${spreads.varied.pct.toFixed(1)}%\n`);
