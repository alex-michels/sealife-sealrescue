// core/balance.js — константы баланса Seal Run (SR-03).
//
// Изоморфный dependency-free ESM (та же дисциплина, что core/course.js): без DOM/Phaser,
// импортируется браузером И Node (харнесс SR-04, серверный адаптер SR-10).
// Философия — как у core/balance.js Seal Hunter: device-independent инварианты в логических
// единицах (lu). Нормативный источник значений — docs/game-seal-run-spec.md §14; ВСЕ значения
// предварительные до прогона харнесса SR-04 (менять через tools/compare-variants.mjs).
//
// Геометрия мира/трассы (WORLD_H, FIELD_W, SEAL_X, SEAL_R, LU_PER_M, COURSE_LENGTH_LU,
// RAMP_DISTANCE_LU, N_BANDS, BAND_STEP, bandY, FISH_POINTS, OBSTACLE_DIMS) живёт в
// core/course.js — здесь она реэкспортируется, чтобы у потребителей был один вход.

export {
  WORLD_H,
  FIELD_W,
  SEAL_X,
  SEAL_R,
  LU_PER_M,
  COURSE_LENGTH_LU,
  CHUNK_LEN_LU,
  RAMP_DISTANCE_LU,
  N_BANDS,
  BAND_STEP,
  FISH_POINTS,
  FISH_POINTS_BUDGET_MAX,
  FISH_REACH_SLACK_LU,
  OBSTACLE_DIMS,
  bandY,
} from './course.js';

import { RAMP_DISTANCE_LU } from './course.js';

// — Шаг симуляции (спека §1.3): фиксированный, рендер-слой держит accumulator.
export const SIM_DT = 1 / 120; // c

// — Локомоция по средам (спека §1.6/§9.1): v1 заполнена только вода; `land` — задел v2
// (галумпинг: медленно/неуклюже) — шаг физики читает параметры из активной среды,
// чтобы v2 не переписывал sim.
export const SURFACE = {
  water: {
    VY_MAX: 420, // lu/c — потолок вертикальной скорости
    AY_MAX: 2600, // lu/c² — разгон к желаемой скорости (~0.16 c до потолка)
    TAU_Y: 0.12, // c — зона мягкого торможения у цели (ARRIVE)
  },
  land: null, // v2
};

export const KEY_TARGET_SPEED = 480; // lu/c — движение targetY от ↑/↓ (спека §2.1)

// — Скорость мира (спека §4).
export const SPEED_MIN = 240; // lu/c
export const SPEED_MAX = 420; // lu/c

/** Базовая скорость от дистанции: линейная рампа до плато. */
export function baseSpeed(d) {
  return SPEED_MIN + (SPEED_MAX - SPEED_MIN) * Math.min(1, d / RAMP_DISTANCE_LU);
}

// — Ресурсы: жизни + единый стамина/кислород-метр (спека §5).
export const STARTING_LIVES = 3;
export const STAMINA_MAX = 100;
export const STAMINA_DRAIN_PER_SEC = 4;
export const GRACE_WINDOW_MS = 2000;
export const STAMINA_EMPTY_SLOW_MULT = 0.6;
export const STAMINA_REFILL_AFTER_LIFE = 50;

// — Рыба (спека §7).
export const FISH_STAMINA_RESTORE = 12;
export const FISH_SPEED_BUFF_MULT = 1.15;
export const FISH_SPEED_BUFF_MS = 1500;
export const BUFF_STACK_MAX_MS = 6000; // баффы складываются длительностью, с потолком
export const FISH_PICKUP_R = 12; // lu (эффективный радиус подбора = SEAL_R + это)

// — Хищники (спека §6.2/§6.4).
export const PREDATOR_LIFE_COST = 1;
export const PREDATOR_HITSTUN_MS = 400;
export const PREDATOR_KNOCKBACK_LU = 40; // смещение по Y от центра хищника за время стана
export const INVULN_MS = 1200; // i-frames после удара
export const ORCA_PERIOD_LU = 900; // период вертикальной синусоиды орки (по мировой X)
export const SHARK_BIG_BOB_PERIOD_LU = 600; // период боба крупной акулы
// Чарджеры: относительная скорость сближения «поверх скролла» (lu/c НА ПЛАТО). В sim
// выражается ДИСТАНЦИОННЫМ отношением CHARGE_REL/SPEED_MAX — позиция акулы остаётся чистой
// функцией мировой X (спека §1.3), а не wall-clock (замедленный игрок видит ТОТ ЖЕ мир).
export const SHARK_CHARGE_REL = 180;
export const SHARK_BIG_CHARGE_REL = 120;

// — Мусор (антропогенный ярус, спека §6.3).
export const DEBRIS_SLOW_MULT = 0.4;
export const DEBRIS_SLOW_MS = 1800;
export const DEBRIS_STAMINA_DRAIN_MULT = 2.0;

// — Камни (естественный ярус, спека §6.5).
export const ROCK_BOUNCE_PX = 40; // lu (историческое имя _PX из дизайн-дока §1.4)
export const ROCK_RESTITUTION = 0.5;
export const ROCK_STAMINA_TAX = 5;
export const ROCK_TAX_COOLDOWN_MS = 300;

// — Сессия и очки (спека §10).
export const MAX_COURSE_MS = 150000;
export const SCORE_PER_M = 100;
export const SCORE_PER_FISH_POINT = 20;
export const SCORE_PER_LIFE = 300;

/**
 * Производная формула очков (спека §10.2): дистанция доминирует до финиша, финишировавшие
 * сравниваются рыбой и жизнями. Максимум 98 900 ≤ Zod-кап 100 000 (гарантия — бюджет рыбы
 * ≤ FISH_POINTS_BUDGET_MAX, инвариант chunk-lint §9.4-4).
 */
export function computeScore(distanceM, fishPoints, livesRemaining) {
  return SCORE_PER_M * distanceM + SCORE_PER_FISH_POINT * fishPoints + SCORE_PER_LIFE * livesRemaining;
}
