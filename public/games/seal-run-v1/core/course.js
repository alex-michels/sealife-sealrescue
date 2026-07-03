// core/course.js — сид-детерминированный генератор трассы Seal Run (SR-02).
//
// ИЗОМОРФНЫЙ dependency-free ESM: НИКАКОГО DOM/Phaser/fs — эти же файлы импортирует
// и браузерная игра, и тонкий Node-адаптер анти-чита в `src/` (SR-10 п.3). Это осознанный
// уход от ловушки «синхронизировать байт-в-байт руками» (болячка alias.js ↔ leaderboard.ts):
// генератор существует В ОДНОМ экземпляре. Паритет Node↔браузер охраняет golden-hash
// тест (SR-14); детерминизм-дисциплина: целые числа в данных, RNG только mulberry32
// и только паттерном floor(rnd()*n), ровно ОДИН бросок на выбранный чанк.
//
// Нормативная спека: docs/game-seal-run-spec.md §1, §4.3, §9.

import { CHUNKS } from './chunks/index.js';

// — Константы мира/трассы (спека §1, §14). Физика/баланс тюленя — SR-03 (core/balance.js).
export const WORLD_H = 540;            // lu; 0 = поверхность, 540 = дно
export const FIELD_W = 960;            // lu; видимое поле (равный горизонт, спека §1.2)
export const SEAL_X = 240;             // lu; экранный X тюленя от левого края поля
export const SEAL_R = 24;              // lu; хитбокс тюленя (нужен линту/бюджетам)
export const LU_PER_M = 40;            // дисплейные метры: floor(lu / 40)
export const COURSE_LENGTH_LU = 36000; // 900 м
export const CHUNK_LEN_LU = 1200;      // v1: одинакова у всех чанков
export const RAMP_DISTANCE_LU = 12000; // рампа скорости/сложности (спека §4)
export const N_BANDS = 5;
export const BAND_STEP = WORLD_H / N_BANDS; // 108 lu

// Очки рыбы (спека §7) — нужны здесь для бюджетов анти-чита; SR-03 реэкспортирует.
export const FISH_POINTS = { fish_small: 1, fish_rare: 4 };
// Суммарный потолок очков рыбы на трассу — гарантирует score ≤ 100000 (спека §9.4-4, §10.2).
export const FISH_POINTS_BUDGET_MAX = 400;
// Зазор досягаемости для серверной сверки бюджета: рыба считается собираемой,
// если её atLu ≤ дистанция + этот запас (радиус подбора + округление метров).
export const FISH_REACH_SLACK_LU = 50;

// Габариты препятствий без параметров в данных чанка (спека §6).
export const OBSTACLE_DIMS = {
  ghost_net: { w: 160, h: 200 },
  plastic_cluster: { w: 140, h: 120 },
  orca: { r: 46 },
  shark_white: { r: 30 },
  shark_big: { r: 42 },
};

/** Центр полосы k (0 — у поверхности, N_BANDS-1 — у дна). Спека §3. */
export function bandY(k) {
  return (WORLD_H * (2 * k + 1)) / (2 * N_BANDS);
}

// — RNG-примитивы. ⚠️ Побитовые копии public/games/seal-hunt-v1/core/alias.js —
// НЕ «улучшать» независимо: на них стоит кросс-рантайм-паритет анти-чита.
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Префикс изолирует сид Seal Run от любых других потребителей hash(season).
const SEED_PREFIX = 'seal-run-v1:';

/** uint32-сид трассы из строки сезона (ISO-неделя 'YYYY-Www'). Спека §9.2. */
export function seedU32For(seedStr) {
  return hashStr(SEED_PREFIX + seedStr);
}

/** Потолок сложности чанков от дистанции: 1..5. Спека §4.3. */
export function difficultyCeil(d) {
  return 1 + Math.floor(4 * Math.min(1, d / RAMP_DISTANCE_LU));
}

// После intense-чанка — принудительно «дыхание» (спека §4.3).
const EASY_AFTER_INTENSE_MAX = 2;

/**
 * Собрать трассу недели. Детерминированно: один и тот же seedStr → байт-в-байт
 * одинаковый результат в Node и браузере (courseHash — страж SR-14).
 *
 * @param {string} seedStr  строка сезона ('2026-W27'); сервер берёт её ИЗ ТОКЕНА (SR-10 п.2)
 * @param {string} biome    v1: только 'coastal'
 * @param {Array}  registry реестр чанков (инъекция для тестов/линта; по умолчанию CHUNKS)
 */
export function generateCourse(seedStr, biome = 'coastal', registry = CHUNKS) {
  const pool = registry.filter((c) => c.biome === biome);
  if (pool.length === 0) throw new Error(`no chunks for biome ${biome}`);
  const seedU32 = seedU32For(seedStr);
  const rnd = mulberry32(seedU32);

  const picked = [];
  let total = 0;
  let last = null;
  while (total < COURSE_LENGTH_LU) {
    const ceil = difficultyCeil(total);
    const afterIntense = last !== null && last.intense === true;
    let eligible = pool.filter(
      (c) =>
        c.difficulty <= ceil &&
        (last === null || c.id !== last.id) &&
        (!afterIntense || (c.difficulty <= EASY_AFTER_INTENSE_MAX && !c.intense)),
    );
    if (eligible.length === 0) eligible = pool; // недостижимо при валидной библиотеке (линт §9.4-5)
    const chunk = eligible[Math.floor(rnd() * eligible.length)]; // единственный бросок на чанк
    picked.push({ chunk, startLu: total });
    total += chunk.lenLu;
    last = chunk;
  }

  // Плоские списки с глобальными позициями; всё за финишем отбрасывается (спека §9.3-3).
  const obstacles = [];
  const fish = [];
  for (const { chunk, startLu } of picked) {
    for (const o of chunk.obstacles) {
      const atLu = startLu + o.atLu;
      if (atLu >= COURSE_LENGTH_LU) continue;
      obstacles.push({ ...o, atLu });
    }
    for (const f of chunk.fish) {
      const atLu = startLu + f.atLu;
      if (atLu >= COURSE_LENGTH_LU) continue;
      fish.push({ ...f, atLu, points: FISH_POINTS[f.type] ?? 0 });
    }
  }

  return {
    seedStr,
    seedU32,
    biome,
    lengthLu: COURSE_LENGTH_LU,
    chunkIds: picked.map((p) => p.chunk.id),
    chunkStarts: picked.map((p) => p.startLu),
    obstacles,
    fish,
  };
}

/**
 * Бюджеты рыбы до дистанции d (lu) — опора серверной сверки fishCollected/score
 * (SR-10 п.3, спека §10.3). Точные (по atLu каждой рыбы), а не по границам чанков.
 */
export function fishCountBudget(course, d) {
  let n = 0;
  for (const f of course.fish) if (f.atLu <= d + FISH_REACH_SLACK_LU) n++;
  return n;
}
export function fishPointsBudget(course, d) {
  let p = 0;
  for (const f of course.fish) if (f.atLu <= d + FISH_REACH_SLACK_LU) p += f.points;
  return p;
}

/**
 * Golden-hash трассы: FNV-1a по канонической строке с ЯВНЫМ порядком полей
 * (не JSON.stringify произвольных объектов — порядок ключей не контрактный).
 * Совпадение (а) при повторе и (б) Node↔браузер — предмет CI-теста SR-14.
 */
export function courseHash(course) {
  const obs = course.obstacles
    .map((o) => [o.type, o.band, o.atLu, o.w ?? '', o.h ?? '', o.ampBands ?? ''].join(':'))
    .join('|');
  const fsh = course.fish.map((f) => [f.type, f.band, f.atLu].join(':')).join('|');
  return hashStr(
    [course.seedU32.toString(16), course.biome, course.chunkIds.join(','), obs, fsh].join(';'),
  );
}
