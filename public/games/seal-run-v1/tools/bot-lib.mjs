// tools/bot-lib.mjs — headless-бот Seal Run (SR-04): фиксированная политика непрерывного
// Y-контроля (Roadmap: «держаться безопасной полосы, заходить за рыбой, если путь чист»).
//
// Бот — ИЗМЕРИТЕЛЬНЫЙ ИНСТРУМЕНТ (дисциплина fairness-lib Seal Hunter): его веса/логика
// фиксированы и НЕ тюнятся вместе с балансом — иначе измерение поплывёт вместе с измеряемым.
// Детерминизм: политика — чистая функция состояния, sim — фикс-шаг без RNG → один
// (seed, profile) всегда даёт байт-в-байт один результат.
//
// ОСЬ «УСТРОЙСТВ» (осознанное отличие от Seal Hunter): equal horizon (спека §1.2) убрал
// экранную геометрию из симуляции ПО ПОСТРОЕНИЮ — профили экранов сравнивать нечем.
// Девайс-ось заменена профилями КАДЕНСА ВВОДА (как часто игрок корректирует цель:
// мышь/тач/расслабленно) — единственный оставшийся девайс-зависимый фактор.

import { generateCourse } from '../core/course.js';
import { createSim, applyInput, step, getResult, predatorPos } from '../core/sim.js';
import {
  FIELD_W,
  SEAL_X,
  SEAL_R,
  N_BANDS,
  BAND_STEP,
  LU_PER_M,
  bandY,
  SIM_DT,
  BAL,
} from '../core/balance.js';

export const PROFILES = [
  { name: 'sharp-mouse  80ms', reactMs: 80 },
  { name: 'touch       160ms', reactMs: 160 },
  { name: 'relaxed     240ms', reactMs: 240 },
];

// — Константы политики (фиксированы, см. шапку).
const LOOK = FIELD_W - SEAL_X; // 720 lu — бот «видит» ровно горизонт игрока
const SAMPLE_LU = 24; // шаг сэмплирования встречи с хищником
const PRED_PAD = 14; // допуск контакта по x при сэмплировании
const BAND_PAD = 10; // допуск по y при отнесении угрозы к полосе
const W_FISH = 90; // рыбина ≈ 90 lu чистого пути
const W_MOVE = 0.35; // цена lu вертикального манёвра
const W_DEBRIS = 140; // штраф полосы с мусором (замедление+расход, но не смерть)

/** Одно решение бота: целевой Y по оценке полос впереди. Чистая функция состояния. */
export function decide(state) {
  const d = state.d;
  const clear = new Array(N_BANDS).fill(LOOK);
  const debrisPenalty = new Array(N_BANDS).fill(0);
  const gain = new Array(N_BANDS).fill(0);

  // Камни: твёрдая геометрия — обрезают чистый путь полосы.
  for (const r of state.rocks) {
    if (r.x + r.halfW < d - SEAL_R) continue;
    if (r.x - r.halfW > d + LOOK) break;
    const ahead = Math.max(0, r.x - r.halfW - d - SEAL_R);
    for (let k = 0; k < N_BANDS; k++) {
      const y = bandY(k);
      if (y >= r.yTop - SEAL_R && y <= r.yBot + SEAL_R) clear[k] = Math.min(clear[k], ahead);
    }
  }
  // Мусор: не смертелен — мягкий штраф полосам, которые он накрывает в окне.
  for (const z of state.debris) {
    if (z.x + z.halfW < d) continue;
    if (z.x - z.halfW > d + LOOK) break;
    for (let k = 0; k < N_BANDS; k++) {
      if (Math.abs(bandY(k) - z.yc) <= z.halfH + SEAL_R) debrisPenalty[k] += 1;
    }
  }
  // Хищники: сэмплируем ВСТРЕЧУ — где окажется хищник, когда тюлень доплывёт туда
  // (predatorPos — та же чистая функция мировой X, что в коллизиях sim).
  for (const o of state.predators) {
    if (o.atLu < d - 2 * FIELD_W) continue;
    if (o.atLu > d + LOOK + 2 * FIELD_W) break;
    for (let s = 0; s <= LOOK; s += SAMPLE_LU) {
      const p = predatorPos(o, d + s);
      if (Math.abs(p.x - (d + s)) > p.r + SEAL_R + PRED_PAD) continue;
      for (let k = 0; k < N_BANDS; k++) {
        if (Math.abs(bandY(k) - p.y) <= p.r + SEAL_R + BAND_PAD)
          clear[k] = Math.min(clear[k], Math.max(0, s - 20));
      }
    }
  }
  // Рыба: считается только та, до которой путь в полосе чист.
  for (const f of state.fish) {
    if (f.taken) continue;
    if (f.x < d) continue;
    if (f.x > d + LOOK) break;
    const k = Math.max(0, Math.min(N_BANDS - 1, Math.round((f.y - BAND_STEP / 2) / BAND_STEP)));
    if (f.x - d <= clear[k]) gain[k] += f.points;
  }

  let best = 0;
  let bestScore = -Infinity;
  for (let k = 0; k < N_BANDS; k++) {
    const score =
      clear[k] + gain[k] * W_FISH - Math.abs(bandY(k) - state.y) * W_MOVE - debrisPenalty[k] * W_DEBRIS;
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return bandY(best);
}

/** Полный забег бота по трассе. Детерминирован для (course, profile). */
export function runBot(course, profile) {
  const state = createSim(course);
  let target = state.y;
  let nextDecideMs = 0;
  const maxTicks = Math.ceil(BAL.MAX_COURSE_MS / (SIM_DT * 1000)) + 10;
  for (let i = 0; i < maxTicks && state.phase === 'running'; i++) {
    if (state.tMs >= nextDecideMs) {
      target = decide(state);
      nextDecideMs = state.tMs + profile.reactMs;
    }
    applyInput(state, { targetY: target });
    step(state);
  }
  const r = getResult(state);
  return { ...r, finished: state.phase === 'finished' && !state.finishedByTimeout };
}

/** Сиды-сезоны для матрицы прогонов. */
export function seasonSeeds(n, startYear = 2026) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const year = startYear + Math.floor(i / 52);
    out.push(`${year}-W${String((i % 52) + 1).padStart(2, '0')}`);
  }
  return out;
}

/** Матрица: профили × сиды → результаты забегов. */
export function runMatrix(seeds, profiles = PROFILES) {
  const courses = seeds.map((s) => generateCourse(s));
  return profiles.map((profile) => ({
    profile,
    runs: courses.map((course, i) => ({ seed: seeds[i], ...runBot(course, profile) })),
  }));
}

export const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) * (x - m))));
};

/** Сводка по набору забегов одного профиля. */
export function summarize(runs) {
  const dist = runs.map((r) => r.distanceM);
  const score = runs.map((r) => r.score);
  return {
    n: runs.length,
    distMean: mean(dist),
    distSd: sd(dist),
    distMin: Math.min(...dist),
    distMax: Math.max(...dist),
    scoreMean: mean(score),
    fishMean: mean(runs.map((r) => r.fishCollected)),
    livesMean: mean(runs.map((r) => r.livesRemaining)),
    finishRate: mean(runs.map((r) => (r.finished ? 1 : 0))),
    durMean: mean(runs.map((r) => r.durationMs)) / 1000,
  };
}

export { LU_PER_M };
