// tools/fairness-sim.mjs — headless fairness harness for Seal The Hunter (CLI).
//
// Runs the REAL game simulation core (core/sim.js + entities/prey.js) with an automated
// "bot" seal that plays identically on every screen, then reports the catch rate (final
// 60s score) per screen profile. If the means line up within noise, the game is fair
// across screen sizes; a profile that stands out is a real advantage/disadvantage.
//
// Run:  node tools/fairness-sim.mjs            (default 60 rounds/profile)
//       node tools/fairness-sim.mjs 200        (N rounds/profile)
//
// Логика (бот, раунд, профили, seeded RNG) — в tools/fairness-lib.mjs: её же гоняет CI
// (QA-30 golden-run + QA-31 пороги в tests/unit/). Полный прогон — вручную при изменении
// баланса; CI держит сокращённый с ассертами.
//
// Best practice this follows: automated agent playtesting / Monte-Carlo balance sims
// (the way studios like EA measure balance objectively).

import { VIEW_CFG, computeWorld, recomputeBalance, BAL } from '../core/balance.js';
import { PROFILES, TICKS, installSeededRandom, runRound } from './fairness-lib.mjs';

const N = Number(process.argv[2]) || 60;
// Default: фикс. аспект поля (SH-12, VIEW_CFG.aspect = 16/9). ASPECT=<x> — эксперимент с
// другим фикс. аспектом (напр. ASPECT=2 — старая «длина» клампа SH-02b).
const ASPECT = process.env.ASPECT !== undefined ? Number(process.env.ASPECT) : VIEW_CFG.aspect;

// SEED=off|none|random → UNSEEDED: keep the real Math.random (non-deterministic, like the
// live game). Use with large N (1000–2000) to average noise out the "real" way.
// SEED=<n> → deterministic stream n (default 0), common random numbers across profiles.
const SEED_RAW = String(process.env.SEED ?? '').toLowerCase();
const UNSEEDED = ['off', 'none', 'random', 'rand', 'real'].includes(SEED_RAW);
const SEED_BASE = UNSEEDED ? 0 : (Number(process.env.SEED) || 0) >>> 0;
const rng = UNSEEDED ? null : installSeededRandom(SEED_BASE);

function stats(xs) {
  const n = xs.length,
    mean = xs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return { mean, sd, se: sd / Math.sqrt(n) };
}

console.log(`\nSeal The Hunter — fairness harness  (${N} rounds/profile, ${TICKS} ticks each)`);
console.log(
  UNSEEDED
    ? 'UNSEEDED: real RNG (non-deterministic) — use large N to average noise\n'
    : `seeded RNG: deterministic, common random numbers across profiles (SEED=${SEED_BASE})\n`,
);
console.log('profile               world(logical)  prey  catch/round  ±sd   (±se)');
console.log('─'.repeat(74));
console.log(`(fixed play-field aspect ${ASPECT.toFixed(3)}:1 per orientation — SH-12)`);
const results = [];
for (const p of PROFILES) {
  const world = computeWorld(p.w, p.h, ASPECT);
  recomputeBalance(world.w, world.h);
  const cap = BAL.maxPreyCap;
  const scores = Array.from({ length: N }, (_, i) => {
    if (rng) rng.seedRound(i);
    return runRound(world);
  });
  const s = stats(scores);
  results.push({ name: p.name.trim(), mean: s.mean });
  console.log(
    `${p.name} ${String(world.w + '×' + world.h).padStart(10)}   ${String(cap).padStart(3)}   ` +
      `${s.mean.toFixed(1).padStart(7)}    ${s.sd.toFixed(1).padStart(4)}  (±${s.se.toFixed(1)})`,
  );
}
const means = results.map((r) => r.mean);
const lo = Math.min(...means),
  hi = Math.max(...means),
  avg = means.reduce((a, b) => a + b, 0) / means.length;
console.log('─'.repeat(74));
console.log(
  `spread across profiles: min ${lo.toFixed(1)}  max ${hi.toFixed(1)}  ` +
    `→ ${(((hi - lo) / avg) * 100).toFixed(1)}% (lower = fairer)\n`,
);
