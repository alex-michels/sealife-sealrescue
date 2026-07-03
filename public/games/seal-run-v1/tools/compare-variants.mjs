// tools/compare-variants.mjs — seeded A/B тюнингов Seal Run (SR-04).
// Common random numbers: одни и те же сиды-трассы + детерминированный бот → разница
// столбцов = ЧИСТЫЙ эффект тюнинга, не шум (дисциплина compare-variants Seal Hunter).
//
//   node public/games/seal-run-v1/tools/compare-variants.mjs [N=12] '<variantJSON>' ...
//   node .../compare-variants.mjs 12 '{"DEBRIS_SLOW_MULT":0.5}' '{"STAMINA_DRAIN_PER_SEC":5}'
//   node .../compare-variants.mjs 12 '{"SURFACE":{"water":{"VY_MAX":380}}}'
//
// Вариант — JSON-патч поверх BAL (core/balance.js): снапшот → патч → прогон → откат.
// БОЛЬШЕ НИКТО BAL не мутирует (см. шапку balance.js).

import { BAL } from '../core/balance.js';
import { PROFILES, runMatrix, seasonSeeds, summarize } from './bot-lib.mjs';

const args = process.argv.slice(2);
const n = Math.max(2, Math.min(100, parseInt(args[0] ?? '12', 10) || 12));
const variants = args.slice(1).map((s) => JSON.parse(s));
if (variants.length === 0) {
  console.error('Укажи хотя бы один вариант-JSON, напр. \'{"DEBRIS_SLOW_MULT":0.5}\'');
  process.exit(1);
}

const seeds = seasonSeeds(n);

function mergeDeep(dst, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && dst[k] && typeof dst[k] === 'object') mergeDeep(dst[k], v);
    else dst[k] = v;
  }
}

function runVariant(patch) {
  const snapshot = structuredClone(BAL);
  try {
    if (patch) mergeDeep(BAL, patch);
    return runMatrix(seeds, PROFILES);
  } finally {
    for (const k of Object.keys(BAL)) delete BAL[k];
    Object.assign(BAL, snapshot);
  }
}

const fmt = (v, w = 6, p = 1) => String(v.toFixed(p)).padStart(w);
const delta = (v, b, w = 7, p = 1) => {
  const d = v - b;
  return `${d >= 0 ? '+' : ''}${d.toFixed(p)}`.padStart(w);
};

console.log(`Seal Run A/B: baseline vs ${variants.length} вариант(а/ов), ${n} сидов, ${PROFILES.length} профиля\n`);
const baseline = runVariant(null);

for (const [vi, patch] of variants.entries()) {
  console.log(`— Вариант ${vi + 1}: ${JSON.stringify(patch)}`);
  const res = runVariant(patch);
  console.log('  профиль            | dist m (Δ)        | finish% (Δ)    | fish (Δ)      | score (Δ)');
  for (let p = 0; p < PROFILES.length; p++) {
    const b = summarize(baseline[p].runs);
    const v = summarize(res[p].runs);
    console.log(
      `  ${PROFILES[p].name.padEnd(18)} | ${fmt(v.distMean)} (${delta(v.distMean, b.distMean)}) | ${fmt(v.finishRate * 100, 5)} (${delta(v.finishRate * 100, b.finishRate * 100, 6)}) | ${fmt(v.fishMean, 5)} (${delta(v.fishMean, b.fishMean, 6)}) | ${fmt(v.scoreMean, 7, 0)} (${delta(v.scoreMean, b.scoreMean, 8, 0)})`,
    );
  }
  console.log('');
}
