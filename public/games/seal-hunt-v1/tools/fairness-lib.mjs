// tools/fairness-lib.mjs — общая логика fairness-харнесса (QA-30/31).
// Используется и CLI (fairness-sim.mjs — ручные полные прогоны), и CI-тестами
// (tests/unit/sim-golden + fairness): бот и цикл раунда ОДНИ, чтобы CI мерил ровно то,
// что видит игрок. Здесь только DOM-free код (sim.js/prey.js/seal.js — headless).

import { BAL } from '../core/balance.js';
import { ROUND_MS, stepSeal, spawnTick } from '../core/sim.js';
import { PREY, updatePrey, resetSpawnState, scheduleStar } from '../entities/prey.js';
import { makeSeal } from '../entities/seal.js';

export const DT = 1 / 60; // фиксированный тик (≈60fps) — детерминизм
export const TICKS = Math.round(ROUND_MS / 1000 / DT);

// Профили экранов (display CSS px): small → 4K → ultra-wide → extra-tall.
export const PROFILES = [
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

/**
 * Seeded-подмена Math.random (единственная случайность ядра — спавн добычи в prey.js).
 * Common random numbers: seedRound(i) даёт раунду i ОДИНАКОВЫЙ поток на всех профилях,
 * чтобы разброс отражал механику, а не удачу RNG. restore() возвращает настоящий RNG.
 */
export function installSeededRandom(streamBase = 0) {
  const original = Math.random;
  let state = 1;
  Math.random = function mulberry32() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    seedRound(i) {
      state = ((streamBase >>> 0) * 1_000_003 + i + 1) | 0;
    },
    restore() {
      Math.random = original;
    },
  };
}

// Бот: жадный преследователь ближайшей добычи; целится ЗА неё, чтобы тюлень шёл на полной
// скорости (без ARRIVE-замедления). Одна политика на всех экранах → меряем механику.
export function botControl(seal) {
  let best = null,
    bestD2 = Infinity;
  for (const f of PREY) {
    const dx = f.x - seal.x,
      dy = f.y - seal.y,
      d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = f;
    }
  }
  if (!best) return { px: 0, py: 0, active: false, kx: 0, ky: 0 };
  const d = Math.sqrt(bestD2) || 1;
  const nx = (best.x - seal.x) / d,
    ny = (best.y - seal.y) / d;
  const lead = 250; // aim beyond the target so the seal stays at full speed
  return { px: best.x + nx * lead, py: best.y + ny * lead, active: true, kx: 0, ky: 0 };
}

/**
 * Один 60-секундный раунд бота в мире `world` (recomputeBalance должен быть уже вызван
 * вызывающей стороной, как в CLI/тестах). `onTick(i, seal, score)` — опциональный хук
 * для golden-логов (QA-30). Возвращает финальный счёт.
 */
export function runRound(world, onTick) {
  const seal = makeSeal(() => []); // dummy spots (rendering only)
  seal.maxSpeed = BAL.sealSpeed;
  seal.accel = BAL.sealAccel;
  seal.x = world.w * 0.3;
  seal.y = world.h * 0.5;
  seal.px = seal.x;
  seal.py = seal.y;
  seal.vx = seal.vy = 0;
  seal.buffT = 0; // ⚡ бафф звезды не тянется из прошлого раунда
  PREY.length = 0;
  resetSpawnState(); // раунд = чистая функция seed'а (edgeBag не тянется из прошлого раунда)
  scheduleStar(world); // ⚡ SH-13: раундовое расписание звезды (ровно 4 RNG-броска — как в игре)

  let timeLeft = ROUND_MS,
    spawnTimer = 0,
    score = 0;
  for (let i = 0; i < TICKS; i++) {
    timeLeft -= DT * 1000;
    spawnTimer = spawnTick(spawnTimer, DT, timeLeft, world);
    stepSeal(seal, botControl(seal), DT, world);
    // ⚡ очки = модель счёта игры: обычная добыча 1, молниевая звезда — STAR.points (5)
    updatePrey(DT, seal, world, (f) => { score += (f && f.sp.points) || 1; });
    if (onTick) onTick(i, seal, score);
  }
  return score;
}
