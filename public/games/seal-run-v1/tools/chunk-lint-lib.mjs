// tools/chunk-lint-lib.mjs — инварианты библиотеки чанков и собранных трасс (SR-02).
// Гейт CI (спека docs/game-seal-run-spec.md §9.4, §11): «никогда не несправедливо при
// первой встрече» — проверяется машиной, не глазами. Логика отделена от CLI
// (chunk-lint.mjs) по образцу fairness-lib/fairness-sim Seal Hunter.
//
// Модель угроз КОНСЕРВАТИВНА (жёстче реальной симуляции — ложные «зелёные» хуже
// ложных «красных» при авторинге):
//  • угроза занимает ВСЕ полосы своего вертикального диапазона на всём x-интервале
//    (тайминг-окна синусоиды орки не учитываются);
//  • у чарджеров (акулы) интервал расширен влево на максимальный добег за время
//    видимости: ceil(FIELD_W · CHARGE_REL / SPEED_MAX);
//  • перелёт между полосами моделируется half/half: первая половина хопа должна
//    быть безопасна в исходной полосе, вторая — в целевой;
//  • мусор (ghost_net/plastic_cluster) в проходимости НЕ участвует (замедляет,
//    не убивает) — но участвует в предупреждениях о плотности.

import {
  WORLD_H,
  FIELD_W,
  SEAL_R,
  COURSE_LENGTH_LU,
  CHUNK_LEN_LU,
  N_BANDS,
  BAND_STEP,
  FISH_POINTS,
  FISH_POINTS_BUDGET_MAX,
  OBSTACLE_DIMS,
  bandY,
  difficultyCeil,
  generateCourse,
  courseHash,
} from '../core/course.js';
import { BAL } from '../core/balance.js';

// — Константы модели (производные спеки §2.2/§9.4). Скорости/баффы/чардж — из
// core/balance.js BAL (SR-03/SR-04, единый источник правды; линт снимает значения на момент
// импорта — вариантные мутации BAL к линту не относятся); дериваты фиксируются здесь,
// чтобы дрейф был осознанным диффом, а не «случайно поехало».
const WORST_SPEED = BAL.SPEED_MAX * BAL.FISH_SPEED_BUFF_MULT; // 483 lu/с
const REACT_S = 0.25;
const BAND_HOP_S = 0.34;
export const HOP_LU = Math.ceil(WORST_SPEED * (REACT_S + BAND_HOP_S)); // 285
const PAD = 8; // страховочный зазор вокруг хитбоксов, lu
const CHARGE_EXTEND = {
  shark_white: Math.ceil((FIELD_W * BAL.SHARK_CHARGE_REL) / BAL.SPEED_MAX), // 412
  shark_big: Math.ceil((FIELD_W * BAL.SHARK_BIG_CHARGE_REL) / BAL.SPEED_MAX), // 275
};
const START_BAND = 2; // стартовая полоса тюленя (середина столба)
const MIN_CORRIDOR = 3 * SEAL_R; // 72 lu — спека §9.4-2
const FISH_WINDOW_LU = 6000; // скользящее окно питания (жёстче спековых 30с — см. §9.4-3:
const FISH_WINDOW_MIN = 10; //   на рампе 6000 lu занимают дольше, чем на плато)
const CHUNK_EDGE_MARGIN = 120; // препятствия не ближе к границам чанка (кросс-чанк-честность)
const MAX_CHUNK_FISH_POINTS = Math.floor(FISH_POINTS_BUDGET_MAX / (COURSE_LENGTH_LU / CHUNK_LEN_LU)); // 13

const PREDATORS = new Set(['orca', 'shark_white', 'shark_big']);
const KNOWN = new Set(['rock', 'orca', 'shark_white', 'shark_big', 'ghost_net', 'plastic_cluster']);

/** Вертикальный диапазон тела угрозы (lu). null — мусор (не смертелен). */
function threatYRange(o) {
  const yc = bandY(o.band);
  switch (o.type) {
    case 'rock':
      return [yc - o.h / 2, yc + o.h / 2];
    case 'orca': {
      const r = OBSTACLE_DIMS.orca.r;
      return [yc - o.ampBands * BAND_STEP - r, yc + o.ampBands * BAND_STEP + r];
    }
    case 'shark_white': {
      const r = OBSTACLE_DIMS.shark_white.r;
      return [yc - r, yc + r];
    }
    case 'shark_big': {
      const r = OBSTACLE_DIMS.shark_big.r;
      return [yc - 0.5 * BAND_STEP - r, yc + 0.5 * BAND_STEP + r];
    }
    default:
      return null;
  }
}

/** x-интервал угрозы (lu, консервативный). */
function threatXRange(o) {
  const halfW =
    o.type === 'rock' ? o.w / 2 : (OBSTACLE_DIMS[o.type]?.r ?? OBSTACLE_DIMS[o.type]?.w / 2 ?? 0);
  const left = o.atLu - halfW - SEAL_R - PAD - (CHARGE_EXTEND[o.type] ?? 0);
  const right = o.atLu + halfW + SEAL_R + PAD;
  return [left, right];
}

/** Полосы, перекрытые угрозой (центр полосы внутри y-диапазона ± SEAL_R). */
function threatBands(o) {
  const yr = threatYRange(o);
  if (!yr) return [];
  const out = [];
  for (let k = 0; k < N_BANDS; k++) {
    const y = bandY(k);
    if (y >= yr[0] - SEAL_R && y <= yr[1] + SEAL_R) out.push(k);
  }
  return out;
}

function mergeIntervals(list) {
  const s = [...list].sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const iv of s) {
    const last = out[out.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else out.push([...iv]);
  }
  return out;
}

/** Безопасные интервалы по полосам для набора смертельных угроз на [0, lengthLu]. */
function safeIntervalsByBand(obstacles, lengthLu) {
  const blocked = Array.from({ length: N_BANDS }, () => []);
  for (const o of obstacles) {
    if (o.type === 'ghost_net' || o.type === 'plastic_cluster') continue;
    const [x0, x1] = threatXRange(o);
    for (const b of threatBands(o)) blocked[b].push([Math.max(0, x0), Math.min(lengthLu, x1)]);
  }
  return blocked.map((list) => {
    const merged = mergeIntervals(list);
    const safe = [];
    let cur = 0;
    for (const [a, b] of merged) {
      if (a > cur) safe.push([cur, a]);
      cur = Math.max(cur, b);
    }
    if (cur < lengthLu) safe.push([cur, lengthLu]);
    return safe;
  });
}

/**
 * Проходимость (спека §9.4-1): earliest-arrival BFS по безопасным интервалам
 * (safe-interval planning). Хоп на соседнюю полосу занимает HOP_LU по x; half/half
 * безопасность (см. шапку). Мультиполосный манёвр = цепочка одиночных хопов
 * (консервативнее спековой формулы с общим REACT_S на манёвр).
 */
export function checkSolvable(obstacles, lengthLu) {
  const safe = safeIntervalsByBand(obstacles, lengthLu);
  const HALF_A = Math.floor(HOP_LU / 2);
  const startIdx = safe[START_BAND].findIndex(([a, b]) => a <= 0 && b > 0);
  if (startIdx < 0) return { ok: false, reason: 'start band blocked at 0' };

  const earliest = safe.map((ivs) => ivs.map(() => Infinity));
  earliest[START_BAND][startIdx] = 0;
  const queue = [[START_BAND, startIdx]];
  while (queue.length) {
    const [b, i] = queue.shift();
    const [iA, iB] = safe[b][i];
    const from = Math.max(earliest[b][i], iA);
    if (iB >= lengthLu) return { ok: true };
    for (const nb of [b - 1, b + 1]) {
      if (nb < 0 || nb >= N_BANDS) continue;
      for (let j = 0; j < safe[nb].length; j++) {
        const [jA, jB] = safe[nb][j];
        // Ищем минимальный x отправления: [x, x+HALF_A] ⊆ (b,i), [x+HALF_A, x+HOP_LU] ⊆ (nb,j)
        const xMin = Math.max(from, jA - HALF_A);
        const xMax = Math.min(iB - HALF_A, jB - HOP_LU);
        if (xMin > xMax) continue;
        const arrive = xMin + HOP_LU;
        if (arrive < earliest[nb][j]) {
          earliest[nb][j] = arrive;
          queue.push([nb, j]);
        }
      }
    }
  }
  for (let b = 0; b < N_BANDS; b++)
    for (let i = 0; i < safe[b].length; i++)
      if (earliest[b][i] < Infinity && safe[b][i][1] >= lengthLu) return { ok: true };
  // Диагностика: первый «непроходимый» рубеж = минимум по полосам концов достижимых интервалов.
  let frontier = 0;
  for (let b = 0; b < N_BANDS; b++)
    for (let i = 0; i < safe[b].length; i++)
      if (earliest[b][i] < Infinity) frontier = Math.max(frontier, safe[b][i][1]);
  return { ok: false, reason: `unreachable beyond ~${Math.round(frontier)} lu` };
}

/** Коридор в твёрдой геометрии (спека §9.4-2): в каждом столбце свободно ≥ MIN_CORRIDOR. */
export function checkCorridor(obstacles, lengthLu) {
  const rocks = obstacles.filter((o) => o.type === 'rock');
  for (let x = 0; x <= lengthLu; x += 12) {
    const covers = rocks
      .filter((o) => x >= o.atLu - o.w / 2 - SEAL_R && x <= o.atLu + o.w / 2 + SEAL_R)
      .map((o) => threatYRange(o));
    if (!covers.length) continue;
    const merged = mergeIntervals(covers.map(([a, b]) => [Math.max(0, a - SEAL_R), Math.min(WORLD_H, b + SEAL_R)]));
    let best = merged[0][0] - 0;
    for (let i = 1; i < merged.length; i++) best = Math.max(best, merged[i][0] - merged[i - 1][1]);
    best = Math.max(best, WORLD_H - merged[merged.length - 1][1]);
    if (best < MIN_CORRIDOR) return { ok: false, x, gap: best };
  }
  return { ok: true };
}

/** Статические инварианты одного чанка. Возвращает список ошибок. */
export function lintChunk(c) {
  const errs = [];
  const e = (m) => errs.push(`[${c.id ?? '?'}] ${m}`);

  if (typeof c.id !== 'string' || !c.id) e('id обязателен');
  if (c.biome !== 'coastal') e(`biome '${c.biome}' — v1 поддерживает только 'coastal'`);
  if (!Number.isInteger(c.difficulty) || c.difficulty < 1 || c.difficulty > 5)
    e(`difficulty ${c.difficulty} вне 1..5`);
  if (typeof c.intense !== 'boolean') e('intense обязан быть boolean');
  if (c.lenLu !== CHUNK_LEN_LU) e(`lenLu ${c.lenLu} ≠ ${CHUNK_LEN_LU} (v1: фикс. длина)`);
  if (c.intense && c.difficulty < 3) e('intense-чанк обязан иметь difficulty ≥ 3');

  let predators = 0;
  for (const o of c.obstacles ?? []) {
    if (!KNOWN.has(o.type)) e(`неизвестный тип препятствия '${o.type}'`);
    if (!Number.isInteger(o.band) || o.band < 0 || o.band >= N_BANDS) e(`band ${o.band} вне 0..${N_BANDS - 1}`);
    if (!Number.isInteger(o.atLu)) e(`atLu ${o.atLu} не целое`);
    if (o.atLu < CHUNK_EDGE_MARGIN || o.atLu > c.lenLu - CHUNK_EDGE_MARGIN)
      e(`препятствие ${o.type}@${o.atLu} ближе ${CHUNK_EDGE_MARGIN} lu к границе чанка`);
    if (PREDATORS.has(o.type)) predators++;
    if (o.type === 'rock') {
      if (!Number.isInteger(o.w) || o.w < 60 || o.w > 300) e(`rock w ${o.w} вне 60..300`);
      if (!Number.isInteger(o.h) || o.h < 40 || o.h > 2 * BAND_STEP) e(`rock h ${o.h} вне 40..${2 * BAND_STEP}`);
    }
    if (o.type === 'orca') {
      if (o.ampBands !== 1 && o.ampBands !== 2) e(`orca ampBands ${o.ampBands} ∉ {1,2}`);
      const r = OBSTACLE_DIMS.orca.r;
      const lo = bandY(o.band) - o.ampBands * BAND_STEP;
      const hi = bandY(o.band) + o.ampBands * BAND_STEP;
      if (lo < r || hi > WORLD_H - r)
        e(`orca band ${o.band} amp ${o.ampBands}: траектория выходит за столб воды (${lo}..${hi})`);
    }
    if (o.type === 'shark_big') {
      const r = OBSTACLE_DIMS.shark_big.r;
      const lo = bandY(o.band) - 0.5 * BAND_STEP;
      const hi = bandY(o.band) + 0.5 * BAND_STEP;
      if (lo < r || hi > WORLD_H - r) e(`shark_big band ${o.band}: боб выходит за столб воды`);
    }
    // Угроза не должна вылезать из чанка (кросс-чанк-честность при любой сборке).
    const [x0, x1] = threatXRange(o);
    if (o.type !== 'ghost_net' && o.type !== 'plastic_cluster') {
      if (x0 < 0 || x1 > c.lenLu) e(`${o.type}@${o.atLu}: конс. угроза [${Math.round(x0)},${Math.round(x1)}] выходит за чанк`);
    }
  }
  if (c.difficulty <= 2 && predators > 1) e(`difficulty ${c.difficulty}: хищников ${predators} > 1 (§11-3)`);
  if (c.difficulty <= 2 && c.intense) e('лёгкий чанк не может быть intense');

  const fish = c.fish ?? [];
  if (fish.length < 2) e(`рыбы ${fish.length} < 2 (питание, §9.4-3)`);
  let pts = 0;
  for (const f of fish) {
    if (!(f.type in FISH_POINTS)) e(`неизвестный тип рыбы '${f.type}'`);
    if (!Number.isInteger(f.band) || f.band < 0 || f.band >= N_BANDS) e(`fish band ${f.band} вне 0..${N_BANDS - 1}`);
    if (!Number.isInteger(f.atLu) || f.atLu < 40 || f.atLu > c.lenLu - 40) e(`fish atLu ${f.atLu} вне [40, ${c.lenLu - 40}]`);
    pts += FISH_POINTS[f.type] ?? 0;
  }
  if (pts > MAX_CHUNK_FISH_POINTS)
    e(`очков рыбы ${pts} > ${MAX_CHUNK_FISH_POINTS} (гарантия бюджета трассы ≤ ${FISH_POINTS_BUDGET_MAX}, §9.4-4)`);

  // Проходимость самого чанка изолированно (грубый фильтр; настоящая проверка — по трассам).
  const solv = checkSolvable(c.obstacles ?? [], c.lenLu);
  if (!solv.ok) e(`чанк непроходим изолированно: ${solv.reason}`);
  const corr = checkCorridor(c.obstacles ?? [], c.lenLu);
  if (!corr.ok) e(`коридор ${corr.gap} lu < ${MIN_CORRIDOR} на x=${corr.x}`);

  return errs;
}

/** Инварианты библиотеки в целом (спека §9.4-5). */
export function lintLibrary(registry) {
  const errs = [];
  if (registry.length < 15 || registry.length > 25)
    errs.push(`библиотека: ${registry.length} чанков вне 15..25`);
  const ids = new Set();
  for (const c of registry) {
    if (ids.has(c.id)) errs.push(`дубликат id ${c.id}`);
    ids.add(c.id);
    errs.push(...lintChunk(c));
  }
  for (let i = 1; i < registry.length; i++)
    if (registry[i - 1].id >= registry[i].id) {
      errs.push('реестр не отсортирован по id (Node↔браузер-паритет)');
      break;
    }
  const d1 = registry.filter((c) => c.difficulty === 1).length;
  if (d1 < 4) errs.push(`difficulty-1 чанков ${d1} < 4 (старт трассы, §9.4-5)`);
  return errs;
}

/** Инварианты собранной трассы (спека §9.3/§9.4). */
export function lintCourse(course, registry) {
  const errs = [];
  const e = (m) => errs.push(`[seed ${course.seedStr}] ${m}`);
  const byId = new Map(registry.map((c) => [c.id, c]));

  if (course.chunkIds.length * CHUNK_LEN_LU !== COURSE_LENGTH_LU)
    e(`длина сборки ${course.chunkIds.length} чанков ≠ ${COURSE_LENGTH_LU / CHUNK_LEN_LU}`);
  let last = null;
  for (let i = 0; i < course.chunkIds.length; i++) {
    const c = byId.get(course.chunkIds[i]);
    if (!c) { e(`неизвестный чанк ${course.chunkIds[i]}`); continue; }
    const startLu = course.chunkStarts[i];
    if (c.difficulty > difficultyCeil(startLu))
      e(`чанк ${c.id} (d${c.difficulty}) на ${startLu} lu выше потолка ${difficultyCeil(startLu)}`);
    if (last) {
      if (last.id === c.id) e(`повтор подряд: ${c.id}`);
      if (last.intense && (c.difficulty > 2 || c.intense))
        e(`после intense ${last.id} идёт ${c.id} (d${c.difficulty}${c.intense ? ', intense' : ''})`);
    }
    last = c;
  }

  const totalPts = course.fish.reduce((s, f) => s + f.points, 0);
  if (totalPts > FISH_POINTS_BUDGET_MAX) e(`бюджет рыбы ${totalPts} > ${FISH_POINTS_BUDGET_MAX}`);

  // Питание: скользящее окно (см. шапку — жёстче спековых «30 с», покрывает рампу).
  const fishX = course.fish.map((f) => f.atLu).sort((a, b) => a - b);
  for (let s = 0; s + FISH_WINDOW_LU <= COURSE_LENGTH_LU; s += 300) {
    let n = 0;
    for (const x of fishX) if (x >= s && x < s + FISH_WINDOW_LU) n++;
    if (n < FISH_WINDOW_MIN) { e(`окно [${s}, ${s + FISH_WINDOW_LU}): рыбы ${n} < ${FISH_WINDOW_MIN}`); break; }
  }

  const solv = checkSolvable(course.obstacles, course.lengthLu);
  if (!solv.ok) e(`трасса непроходима: ${solv.reason}`);
  const corr = checkCorridor(course.obstacles, course.lengthLu);
  if (!corr.ok) e(`коридор ${corr.gap} lu < ${MIN_CORRIDOR} на x=${corr.x}`);

  return errs;
}

/** Полный прогон: библиотека + N сид-сборок (+детерминизм повторного вызова). */
export function runLint(registry, seeds) {
  const errors = [...lintLibrary(registry)];
  for (const seed of seeds) {
    const a = generateCourse(seed, 'coastal', registry);
    const b = generateCourse(seed, 'coastal', registry);
    if (courseHash(a) !== courseHash(b)) errors.push(`[seed ${seed}] недетерминизм generateCourse`);
    errors.push(...lintCourse(a, registry));
  }
  return errors;
}
