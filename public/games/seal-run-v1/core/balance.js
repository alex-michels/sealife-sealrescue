// core/balance.js — константы баланса Seal Run (SR-03/SR-04).
//
// Изоморфный dependency-free ESM (та же дисциплина, что core/course.js): без DOM/Phaser,
// импортируется браузером И Node (харнесс SR-04, серверный адаптер SR-10).
// Философия — как у core/balance.js Seal Hunter: device-independent инварианты в логических
// единицах (lu). Нормативный источник значений — docs/game-seal-run-spec.md §14; ВСЕ значения
// предварительные до прогона харнесса SR-04 (менять через tools/compare-variants.mjs).
//
// ТЮНИНГИ живут в МУТИРУЕМОМ объекте BAL (прецедент BAL Seal Hunter): их подменяет ТОЛЬКО
// tools/compare-variants.mjs для seeded A/B (снапшот → патч → прогон → откат). Рантайм игры
// и sim НИКОГДА не мутируют BAL. Геометрия мира/трассы — в course.js (реэкспорт ниже),
// она не тюнинг и не мутируется.

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

// — Шаг симуляции (спека §1.3): фиксированный, рендер-слой держит accumulator. НЕ тюнинг.
export const SIM_DT = 1 / 120; // c

/** Тюнинги первого прохода (спека §14). Мутируется только compare-variants (см. шапку). */
export const BAL = {
  // — Локомоция по средам (спека §1.6/§9.1): v1 заполнена только вода; `land` — задел v2
  // (галумпинг) — шаг физики читает параметры из активной среды, v2 не переписывает sim.
  SURFACE: {
    water: {
      VY_MAX: 420, // lu/c — потолок вертикальной скорости
      AY_MAX: 2600, // lu/c² — разгон к желаемой скорости (~0.16 c до потолка)
      TAU_Y: 0.12, // c — зона мягкого торможения у цели (ARRIVE)
    },
    land: null, // v2
  },
  KEY_TARGET_SPEED: 480, // lu/c — движение targetY от ↑/↓ (спека §2.1)

  // — Скорость мира (спека §4).
  SPEED_MIN: 240, // lu/c
  SPEED_MAX: 420, // lu/c

  // — Ресурсы: жизни + единый стамина/кислород-метр (спека §5).
  STARTING_LIVES: 3,
  STAMINA_MAX: 100,
  STAMINA_DRAIN_PER_SEC: 4,
  GRACE_WINDOW_MS: 2000,
  STAMINA_EMPTY_SLOW_MULT: 0.6,
  STAMINA_REFILL_AFTER_LIFE: 50,

  // — Рыба (спека §7).
  FISH_STAMINA_RESTORE: 12,
  FISH_SPEED_BUFF_MULT: 1.15,
  FISH_SPEED_BUFF_MS: 1500,
  BUFF_STACK_MAX_MS: 6000, // баффы складываются длительностью, с потолком
  FISH_PICKUP_R: 12, // lu (эффективный радиус подбора = SEAL_R + это)

  // — Хищники (спека §6.2/§6.4).
  PREDATOR_LIFE_COST: 1,
  PREDATOR_HITSTUN_MS: 400,
  PREDATOR_KNOCKBACK_LU: 40, // смещение по Y от центра хищника за время стана
  INVULN_MS: 1200, // i-frames после удара
  ORCA_PERIOD_LU: 900, // период вертикальной синусоиды орки (по мировой X)
  SHARK_BIG_BOB_PERIOD_LU: 600, // период боба крупной акулы
  // Чарджеры: относительная скорость сближения «поверх скролла» (lu/c НА ПЛАТО). В sim
  // выражается ДИСТАНЦИОННЫМ отношением CHARGE_REL/SPEED_MAX — позиция акулы остаётся чистой
  // функцией мировой X (спека §1.3/§6.2), а не wall-clock.
  SHARK_CHARGE_REL: 180,
  SHARK_BIG_CHARGE_REL: 120,

  // — Мусор (антропогенный ярус, спека §6.3).
  DEBRIS_SLOW_MULT: 0.4,
  DEBRIS_SLOW_MS: 1800,
  DEBRIS_STAMINA_DRAIN_MULT: 2.0,

  // — Камни (естественный ярус, спека §6.5).
  ROCK_BOUNCE_PX: 40, // lu (историческое имя _PX из дизайн-дока §1.4)
  ROCK_RESTITUTION: 0.5,
  ROCK_STAMINA_TAX: 5,
  ROCK_TAX_COOLDOWN_MS: 300,

  // — Сессия и очки (спека §10).
  MAX_COURSE_MS: 150000,
  SCORE_PER_M: 100,
  SCORE_PER_FISH_POINT: 20,
  SCORE_PER_LIFE: 300,
};

/** Базовая скорость от дистанции: линейная рампа до плато (спека §4.1). */
export function baseSpeed(d) {
  return BAL.SPEED_MIN + (BAL.SPEED_MAX - BAL.SPEED_MIN) * Math.min(1, d / RAMP_DISTANCE_LU);
}

/**
 * Производная формула очков (спека §10.2): дистанция доминирует до финиша, финишировавшие
 * сравниваются рыбой и жизнями. Максимум 98 900 ≤ Zod-кап 100 000 (гарантия — бюджет рыбы
 * ≤ FISH_POINTS_BUDGET_MAX, инвариант chunk-lint §9.4-4).
 */
export function computeScore(distanceM, fishPoints, livesRemaining) {
  return (
    BAL.SCORE_PER_M * distanceM +
    BAL.SCORE_PER_FISH_POINT * fishPoints +
    BAL.SCORE_PER_LIFE * livesRemaining
  );
}
