// core/sim.js — DOM-free ядро симуляции Seal Run (SR-03).
//
// Как у Seal Hunter: чистая логика без canvas/document — её гоняют и игра (рендер-слой
// Phaser, SR-05), и headless-харнесс (SR-04), и юнит-тесты. Изоморфный dependency-free ESM.
// Нормативная спека: docs/game-seal-run-spec.md (§2 физика Y, §4 скорость, §5 автомат
// ресурсов, §6 препятствия, §8 порядок тика, §10 завершение/очки).
//
// Детерминизм (спека §1.3): фиксированный шаг SIM_DT (accumulator — в рендер-слое), НОЛЬ
// RNG в рантайме — движение хищников суть чистые функции мировой X. Чарджеры (акулы)
// выражены дистанционным отношением CHARGE_REL/BAL.SPEED_MAX, а не wall-clock: замедленный
// игрок встречает ТОТ ЖЕ мир в тех же мировых координатах.

// Тюнинги — через мутируемый BAL (читается В МОМЕНТ обращения — так compare-variants
// может подменять значения между прогонами без пере-импорта модулей).
import {
  WORLD_H,
  FIELD_W,
  SEAL_X,
  SEAL_R,
  LU_PER_M,
  COURSE_LENGTH_LU,
  BAND_STEP,
  OBSTACLE_DIMS,
  bandY,
  SIM_DT,
  BAL,
  baseSpeed,
  computeScore,
} from './balance.js';

const { min, max, hypot, sin, PI, floor, abs } = Math;

const HORIZON_LU = FIELD_W - SEAL_X; // 720 — видимая дистанция вперёд; активация чарджеров
const Y_MIN = SEAL_R;
const Y_MAX = WORLD_H - SEAL_R;
const clampY = (y) => max(Y_MIN, min(Y_MAX, y));

/**
 * Позиция хищника как чистая функция мировой X тюленя `d` (спека §6.2). Экспорт — рендеру
 * (SR-05) и харнессу (SR-04): спрайты рисуются ИЗ этой функции, никакой второй физики.
 */
export function predatorPos(o, d) {
  const yc = bandY(o.band);
  switch (o.type) {
    case 'orca':
      return {
        x: o.atLu,
        y: yc + o.ampBands * BAND_STEP * sin((2 * PI * (d - o.atLu)) / BAL.ORCA_PERIOD_LU),
        r: OBSTACLE_DIMS.orca.r,
      };
    case 'shark_white': {
      const adv = max(0, d - (o.atLu - HORIZON_LU)); // активируется, войдя в горизонт
      return { x: o.atLu - (BAL.SHARK_CHARGE_REL / BAL.SPEED_MAX) * adv, y: yc, r: OBSTACLE_DIMS.shark_white.r };
    }
    case 'shark_big': {
      const adv = max(0, d - (o.atLu - HORIZON_LU));
      return {
        x: o.atLu - (BAL.SHARK_BIG_CHARGE_REL / BAL.SPEED_MAX) * adv,
        y: yc + 0.5 * BAND_STEP * sin((2 * PI * (d - o.atLu)) / BAL.SHARK_BIG_BOB_PERIOD_LU),
        r: OBSTACLE_DIMS.shark_big.r,
      };
    }
    default:
      return null;
  }
}

/** Создать состояние раунда для (сид-детерминированной) трассы из generateCourse. */
export function createSim(course) {
  const rocks = [];
  const predators = [];
  const debris = [];
  for (const o of course.obstacles) {
    if (o.type === 'rock') {
      const yc = bandY(o.band);
      rocks.push({ x: o.atLu, halfW: o.w / 2, yTop: yc - o.h / 2, yBot: yc + o.h / 2, lastTaxMs: -Infinity });
    } else if (o.type === 'ghost_net' || o.type === 'plastic_cluster') {
      const dims = OBSTACLE_DIMS[o.type];
      debris.push({ x: o.atLu, yc: bandY(o.band), halfW: dims.w / 2, halfH: dims.h / 2 });
    } else {
      predators.push({ ...o });
    }
  }
  const byX = (a, b) => a.x - b.x || 0;
  rocks.sort(byX);
  debris.sort(byX);
  predators.sort((a, b) => a.atLu - b.atLu);
  const fish = course.fish
    .map((f) => ({ x: f.atLu, y: bandY(f.band), points: f.points, type: f.type, taken: false }))
    .sort(byX);

  return {
    // — тюлень
    y: WORLD_H / 2,
    vy: 0,
    targetY: WORLD_H / 2,
    // — мир
    d: 0, // мировая X тюленя = пройденная дистанция, lu
    lengthLu: course.lengthLu ?? COURSE_LENGTH_LU,
    tMs: 0,
    effSpeed: 0, // скорость последнего тика (для HUD/рендера)
    // — ресурсы и статусы (спека §5.2): status — ресурсный автомат; хит-стан/i-frames —
    // независимые таймеры (множители §4.2 ортогональны); phase — жизненный цикл раунда.
    lives: BAL.STARTING_LIVES,
    stamina: BAL.STAMINA_MAX,
    status: 'normal', // 'normal' | 'exhausted'
    phase: 'running', // 'running' | 'dead' | 'finished'
    finishedByTimeout: false,
    graceDeadlineMs: 0,
    hitstunUntilMs: -Infinity,
    invulnUntilMs: -Infinity,
    knockVy: 0,
    buffLeftMs: 0,
    debrisUntilMs: -Infinity,
    // — результат
    fishCollected: 0,
    fishPoints: 0,
    // — сущности (рантайм-копии, отсортированы по x) + курсоры «прошедшего»
    rocks,
    predators,
    debris,
    fish,
    cur: { rock: 0, pred: 0, deb: 0, fish: 0 },
    // — события тика для рендера/аудио (дренить takeEvents)
    events: [],
  };
}

/**
 * Разрешить ввод в targetY (спека §2.1, «последний выигрывает» — решает вызывающий,
 * передавая актуальный источник). ctrl: { targetY? } прямое задание (тач/бот) ИЛИ
 * { pointerY? } указатель ИЛИ { keyDir?: -1|0|1 } клавиши (двигают target со скоростью
 * BAL.KEY_TARGET_SPEED). Зовётся раз на sim-тик до step().
 */
export function applyInput(state, ctrl, dt = SIM_DT) {
  if (state.phase !== 'running') return;
  if (ctrl == null) return;
  if (typeof ctrl.targetY === 'number') state.targetY = clampY(ctrl.targetY);
  else if (typeof ctrl.pointerY === 'number') state.targetY = clampY(ctrl.pointerY);
  else if (ctrl.keyDir === -1 || ctrl.keyDir === 1)
    state.targetY = clampY(state.targetY + ctrl.keyDir * BAL.KEY_TARGET_SPEED * dt);
}

function emit(state, type, data) {
  state.events.push(data ? { t: state.tMs, type, ...data } : { t: state.tMs, type });
}

/** Забрать накопленные события (рендер/аудио); очищает буфер. */
export function takeEvents(state) {
  const out = state.events;
  state.events = [];
  return out;
}

function loseLife(state, cause) {
  state.lives -= BAL.PREDATOR_LIFE_COST;
  emit(state, 'life-lost', { cause, lives: state.lives });
  if (state.lives <= 0) {
    state.phase = 'dead';
    emit(state, 'dead');
  }
}

/** Один тик симуляции (dt = SIM_DT, фиксированный). Мутирует state. */
export function step(state, dt = SIM_DT) {
  if (state.phase !== 'running') return;
  state.tMs += dt * 1000;
  const inHitstun = state.tMs < state.hitstunUntilMs;
  const S = BAL.SURFACE.water; // v1: единственная среда (спека §1.6)

  // 1) Физика Y — 1D ARRIVE (спека §2.2); в хит-стане ввод игнорируется, действует отброс.
  if (inHitstun) {
    state.y = clampY(state.y + state.knockVy * dt);
    state.vy = 0;
  } else {
    const vyDes = max(-S.VY_MAX, min(S.VY_MAX, (state.targetY - state.y) / S.TAU_Y));
    state.vy += max(-S.AY_MAX * dt, min(S.AY_MAX * dt, vyDes - state.vy));
    state.y = clampY(state.y + state.vy * dt);
  }

  // 2) Скролл мира (спека §4.2): множители независимы; в хит-стане мир стоит.
  const buffed = state.buffLeftMs > 0;
  const slowed = state.tMs < state.debrisUntilMs;
  const effSpeed = inHitstun
    ? 0
    : baseSpeed(state.d) *
      (buffed ? BAL.FISH_SPEED_BUFF_MULT : 1) *
      (slowed ? BAL.DEBRIS_SLOW_MULT : 1) *
      (state.status === 'exhausted' ? BAL.STAMINA_EMPTY_SLOW_MULT : 1);
  state.effSpeed = effSpeed;
  state.d += effSpeed * dt;
  if (buffed) state.buffLeftMs = max(0, state.buffLeftMs - dt * 1000);

  const d = state.d;

  // 3) Коллизии (спека §8): камни (выталкивание) → хищники/мусор/рыба.
  // ВАЖНО: камни меняют state.y — последующие проверки читают y ПОСЛЕ разрешения.
  // Курсоры отбрасывают безвозвратно пройденное (мир по x статичен, кроме чарджеров,
  // которые двигаются ВЛЕВО — их окно тоже конечно и привязано к atLu).
  const C = state.cur;

  // — камни: твёрдая геометрия, вертикальное разрешение (x тюленя = дистанция, назад не двигаем)
  while (C.rock < state.rocks.length && state.rocks[C.rock].x + state.rocks[C.rock].halfW < d - SEAL_R - BAL.ROCK_BOUNCE_PX) C.rock++;
  for (let i = C.rock; i < state.rocks.length; i++) {
    const r = state.rocks[i];
    if (r.x - r.halfW > d + SEAL_R) break;
    const cx = max(r.x - r.halfW, min(r.x + r.halfW, d));
    const cy = max(r.yTop, min(r.yBot, state.y));
    if (hypot(d - cx, state.y - cy) >= SEAL_R) continue;
    // Выталкивание + отскок: в сторону от центра камня; если у той стороны нет места
    // (камень у поверхности/дна) — в противоположную (лint гарантирует коридор §9.4-2).
    const rockCy = (r.yTop + r.yBot) / 2;
    let dir = state.y <= rockCy ? -1 : 1;
    let ny = dir < 0 ? r.yTop - SEAL_R - BAL.ROCK_BOUNCE_PX : r.yBot + SEAL_R + BAL.ROCK_BOUNCE_PX;
    if (ny < Y_MIN || ny > Y_MAX) {
      dir = -dir;
      ny = dir < 0 ? r.yTop - SEAL_R - BAL.ROCK_BOUNCE_PX : r.yBot + SEAL_R + BAL.ROCK_BOUNCE_PX;
    }
    state.y = clampY(ny);
    state.vy = dir * abs(state.vy) * BAL.ROCK_RESTITUTION;
    if (state.tMs - r.lastTaxMs >= BAL.ROCK_TAX_COOLDOWN_MS) {
      r.lastTaxMs = state.tMs;
      state.stamina = max(0, state.stamina - BAL.ROCK_STAMINA_TAX);
      emit(state, 'rock-bounce', { dir });
    }
  }

  // — хищники: −жизнь + хит-стан + отброс + i-frames (спека §6.4)
  while (
    C.pred < state.predators.length &&
    state.predators[C.pred].atLu < d - 2 * HORIZON_LU // чарджер к этому моменту гарантированно прошёл
  )
    C.pred++;
  if (state.tMs >= state.invulnUntilMs && !inHitstun) {
    for (let i = C.pred; i < state.predators.length; i++) {
      const o = state.predators[i];
      if (o.atLu > d + FIELD_W) break; // ещё за горизонтом
      const p = predatorPos(o, d);
      if (p.x < d - 200) continue; // уже прошёл мимо
      if (hypot(d - p.x, state.y - p.y) >= p.r + SEAL_R) continue;
      loseLife(state, o.type);
      if (state.phase !== 'running') return;
      state.hitstunUntilMs = state.tMs + BAL.PREDATOR_HITSTUN_MS;
      state.invulnUntilMs = state.tMs + BAL.INVULN_MS;
      const dir = state.y <= p.y ? -1 : 1; // отброс от центра хищника
      state.knockVy = (dir * BAL.PREDATOR_KNOCKBACK_LU) / (BAL.PREDATOR_HITSTUN_MS / 1000);
      emit(state, 'predator-hit', { predator: o.type });
      break; // один удар за тик
    }
  }

  // — мусор: pass-through зона, refresh дебаффа пока центр внутри (спека §6.3)
  while (C.deb < state.debris.length && state.debris[C.deb].x + state.debris[C.deb].halfW < d) C.deb++;
  for (let i = C.deb; i < state.debris.length; i++) {
    const z = state.debris[i];
    if (z.x - z.halfW > d) break;
    if (abs(state.y - z.yc) <= z.halfH) {
      const wasSlowed = state.tMs < state.debrisUntilMs;
      state.debrisUntilMs = state.tMs + BAL.DEBRIS_SLOW_MS;
      if (!wasSlowed) emit(state, 'debris-enter');
    }
  }

  // — рыба: подбор (спека §7)
  while (C.fish < state.fish.length && state.fish[C.fish].x < d - (SEAL_R + BAL.FISH_PICKUP_R)) C.fish++;
  for (let i = C.fish; i < state.fish.length; i++) {
    const f = state.fish[i];
    if (f.x > d + SEAL_R + BAL.FISH_PICKUP_R) break;
    if (f.taken || hypot(d - f.x, state.y - f.y) > SEAL_R + BAL.FISH_PICKUP_R) continue;
    f.taken = true;
    state.fishCollected++;
    state.fishPoints += f.points;
    state.stamina = min(BAL.STAMINA_MAX, state.stamina + BAL.FISH_STAMINA_RESTORE);
    state.buffLeftMs = min(state.buffLeftMs + BAL.FISH_SPEED_BUFF_MS, BAL.BUFF_STACK_MAX_MS);
    emit(state, 'fish', { fishType: f.type, points: f.points });
    if (state.status === 'exhausted' && state.stamina > 0) {
      state.status = 'normal';
      emit(state, 'recovered');
    }
  }

  // 4) Ресурсы: пассивный расход дыхания (в хит-стане продолжается — мир стоит, дыхание нет).
  const drain = BAL.STAMINA_DRAIN_PER_SEC * (state.tMs < state.debrisUntilMs ? BAL.DEBRIS_STAMINA_DRAIN_MULT : 1) * dt;
  state.stamina = max(0, state.stamina - drain);
  if (state.status === 'normal' && state.stamina <= 0) {
    state.status = 'exhausted';
    state.graceDeadlineMs = state.tMs + BAL.GRACE_WINDOW_MS;
    emit(state, 'exhausted');
  } else if (state.status === 'exhausted' && state.tMs >= state.graceDeadlineMs) {
    loseLife(state, 'exhaustion'); // без i-frames/хит-стана — хищника не было (спека §5.2)
    if (state.phase !== 'running') return;
    state.stamina = BAL.STAMINA_REFILL_AFTER_LIFE;
    state.status = 'normal';
  }

  // 5) Завершение (спека §10.1).
  if (state.d >= state.lengthLu) {
    state.d = state.lengthLu;
    state.phase = 'finished';
    emit(state, 'finished');
  } else if (state.tMs >= BAL.MAX_COURSE_MS) {
    state.phase = 'finished';
    state.finishedByTimeout = true;
    emit(state, 'finished', { timeout: true });
  }
}

/** Итог раунда → поля сабмита/HTML-результата (спека §10). */
export function getResult(state) {
  const distanceM = floor(min(state.d, state.lengthLu) / LU_PER_M);
  return {
    phase: state.phase,
    distanceM,
    fishCollected: state.fishCollected,
    fishPoints: state.fishPoints,
    livesRemaining: max(0, state.lives),
    durationMs: Math.round(state.tMs),
    score: computeScore(distanceM, state.fishPoints, max(0, state.lives)),
  };
}
