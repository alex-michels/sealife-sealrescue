// Fairness model (SH-12 — единый аспект; сменил SH-02b «full-screen + кламп 2:1»):
// играбельное поле ФИКСИРОВАНО — 960×540 lu (16:9) в ландшафте, 540×960 (9:16) в портрете.
// Экран поле не меняет вообще: у всех ландшафтов идентичный мир, у всех портретов идентичный
// мир (полный «равный горизонт», как у Seal Run). Инварианты SH-02b остаются основой:
//   • constant seal/fish speed and size;
//   • constant prey DENSITY: prey count ∝ area (оба фикс-поля равноплощадны → cap одинаков).
// История: SH-02b держал короткую ось 540 lu и позволял длинной следовать за экраном с
// клампом 2:1 — бот-харнесс показал, что поле длиннее ~2:1 измеримо легче (длинное узкое
// поле выгодно охотнику); внутри ≤2:1 оставался остаточный спред ~5% по форме поля. SH-12
// (после SH-11: доска единая) убирает и его: сравнивать формы больше нечего, остаётся только
// честная разница 16:9-поля vs 9:16-поля (ландшафт vs портрет) — замерена харнессом, числа в
// docs/game-seal-hunter.md. Экраны не ровно 16:9 (16:10, 4:3, 21:9, телефоны) получают
// диегетический бордюр «край бухты» (render/scenery.js обрабатывает ЛЮБУЮ ось зазора) —
// принято осознанно (Roadmap SH-12). Механика/спавн/анимации НЕ тронуты — только вью-математика.

export const VIEW_CFG = {
  logicalShort: 540, // logical units по короткой оси поля (константа для всех)
  aspect: 16 / 9, // фиксированный аспект поля (ландшафт 16:9; портрет — обратный, 9:16)
};

// Reference world (landscape 960×540) used for density + legacy diag ratios.
export const BASE = { diag: Math.hypot(960, 540), area: 960 * 540 };

// ~22 prey on the reference screen → density reused for every world size.
const PREY_DENSITY = 22 / BASE.area;

export const BAL = {
  diag: BASE.diag,
  area: BASE.area,

  // Tempo (SH-02 tuning): seal & prey speeds scaled ×1.6 together → more action,
  // same difficulty ratios. Seal accel bumped for a snappy ~0.13s to top speed (game feel).
  fishSpeedMin: 96,
  fishSpeedMax: 144,

  sealSpeed: 320,
  sealAccel: 2400,

  fishSizeK: 1,
  maxPreyCap: 22,
};

// ⚡ Молниевая морская звезда (SH-13) — ОЧЕНЬ РЕДКИЙ бафф-пикап. Дизайн-практика пикапов:
// редкость = восторг (не заваливать), мощный многоканальный фидбэк на подборе (свой звук +
// вспышка), видимая длительность баффа (аура на тюлене), баланс силы/длительности через
// харнесс. Расписание СИД-ДЕТЕРМИНИРОВАНО (3 броска Math.random на раунд ДО спавнов —
// стабильная позиция в потоке; golden/fairness это учитывают осознанно).
export const STAR = {
  chance: 0.10, // вероятность появления за раунд (≈1 из 10 раундов; максимум 1 за раунд)
  windowMs: [10_000, 45_000], // окно случайного момента появления внутри 60с-раунда
  lifeMs: 9_000, // живёт недолго — окно возможности (urgency), потом растворяется
  fadeMs: 1_500, // последние мс — предупреждающий фейд
  points: 5, // очков за поимку (решение владельца: 5 вместо обычного 1)
  buffMult: 2, // ×2 скорость тюленя…
  buffSec: 3, // …на 3 секунды (2026-07-03: 2 → 3 после теста владельца — 2 c гасли слишком быстро)
  r: 17, // логический радиус (крупнее обычной звезды — читаемый силуэт)
  inset: 70, // отступ случайной позиции от краёв поля, lu
};

/**
 * Логический мир для дисплея (CSS px): ФИКСИРОВАННОЕ поле (SH-12) — от экрана зависит только
 * ориентация. 16:9 в ландшафте (960×540), 9:16 в портрете (540×960). Рендер contain-fit'ит
 * поле в экран (game.js: VIEW.scale/ox/oy), остаток одевает бордюр (render/scenery.js).
 * Третий параметр — override аспекта ТОЛЬКО для экспериментов харнесса (ASPECT=…).
 */
export function computeWorld(dispW, dispH, aspect = VIEW_CFG.aspect) {
  const short = VIEW_CFG.logicalShort;
  const longLogical = Math.round(short * aspect);
  return dispW >= dispH ? { w: longLogical, h: short } : { w: short, h: longLogical };
}

/**
 * Balance is constant in logical units (device-independent). Prey count tracks area so the
 * DENSITY is the same on every screen — the key to an equal catch rate when filling the
 * screen. The cap is only a generous perf guard (never bites on real screens: 32:9 ≈ 44).
 */
export function recomputeBalance(worldW, worldH) {
  BAL.diag = Math.hypot(worldW, worldH);
  BAL.area = worldW * worldH;

  BAL.fishSpeedMin = 96;
  BAL.fishSpeedMax = 144;
  BAL.sealSpeed = 320;
  BAL.sealAccel = 2400;
  BAL.fishSizeK = 1;

  BAL.maxPreyCap = Math.max(12, Math.min(200, Math.round(BAL.area * PREY_DENSITY)));
}
