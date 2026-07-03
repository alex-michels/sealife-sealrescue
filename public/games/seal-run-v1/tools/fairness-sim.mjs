// tools/fairness-sim.mjs — CLI-харнесс честности Seal Run (SR-04). Гейт перед тюнингом
// баланса (дисциплина fairness-sim Seal Hunter): бот с фиксированной политикой
// (tools/bot-lib.mjs) по профилям каденса ввода × N сидов-трасс.
//
//   node public/games/seal-run-v1/tools/fairness-sim.mjs [N=20]
//
// Разброс по СИДАМ = разброс «трассы недели» (насколько разные недели сопоставимы);
// разброс по ПРОФИЛЯМ на одном сиде = чувствительность к каденсу ввода (девайс-прокси;
// экранная девайс-ось у Seal Run отсутствует по построению — equal horizon, спека §1.2).

import { PROFILES, runMatrix, seasonSeeds, summarize, mean } from './bot-lib.mjs';

const n = Math.max(2, Math.min(200, parseInt(process.argv[2] ?? '20', 10) || 20));
const seeds = seasonSeeds(n);

console.log(`Seal Run fairness: ${PROFILES.length} профиля × ${n} сидов (${seeds[0]}..${seeds[n - 1]})\n`);
const t0 = Date.now();
const matrix = runMatrix(seeds, PROFILES);

const fmt = (v, w = 6, p = 1) => String(v.toFixed(p)).padStart(w);
console.log('профиль            |  dist m ± sd   [min..max] | finish% |  fish | lives | dur s |  score');
console.log('-'.repeat(96));
for (const { profile, runs } of matrix) {
  const s = summarize(runs);
  console.log(
    `${profile.name.padEnd(18)} | ${fmt(s.distMean, 6)} ±${fmt(s.distSd, 5)} [${String(s.distMin).padStart(3)}..${String(s.distMax).padStart(3)}] |   ${fmt(s.finishRate * 100, 5)} | ${fmt(s.fishMean, 5)} | ${fmt(s.livesMean, 5, 2)} | ${fmt(s.durMean, 5)} | ${fmt(s.scoreMean, 7, 0)}`,
  );
}

// Чувствительность к каденсу: на каждом сиде max−min дистанции между профилями.
const bySeed = seeds.map((seed, i) => {
  const dists = matrix.map((m) => m.runs[i].distanceM);
  return { seed, spread: Math.max(...dists) - Math.min(...dists), dists };
});
const worst = [...bySeed].sort((a, b) => b.spread - a.spread).slice(0, 5);
console.log(`\nКаденс-чувствительность (max−min дистанции между профилями на сиде):`);
console.log(`  средняя ${fmt(mean(bySeed.map((x) => x.spread)), 5)} м; худшие сиды:`);
for (const w of worst) console.log(`    ${w.seed}: ±${w.spread} м (${w.dists.join(' / ')})`);

// Разброс трасс между неделями (профиль 0 — эталонный «sharp»).
const sharp = matrix[0].runs.map((r) => r.distanceM);
const sMin = Math.min(...sharp), sMax = Math.max(...sharp);
console.log(`\nРазброс «трасс недели» (sharp): ${sMin}..${sMax} м — сиды сопоставимы, если узко.`);
console.log(`\nГотово за ${((Date.now() - t0) / 1000).toFixed(1)} c.`);
