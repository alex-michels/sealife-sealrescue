// core/theme.js — палитра и арт-контракт Seal Run (SR-06).
//
// Чистые данные + хелперы БЕЗ DOM/Phaser: модуль импортируют браузер (render/art.js)
// и Node (tests/unit/seal-run-theme.unit.spec.ts) — та же дисциплина core/, что у sim.js.
// Рисование живёт в render/art.js (ему нужен canvas); здесь — ЧТО рисуем и КАКИМ цветом.
//
// Палитра выведена из бренд-примитивов «Foggy Coastal Utility» (docs/DESIGN_BRIEF.md §2a);
// прецедент — core/theme.js Seal Hunter. Вода — ТОТ ЖЕ градиент, что у Seal Hunter
// (один океан на обе игры), актёрский состав свой. Стиль — cartoon-flat: чистые силуэты,
// 2–3 тона на объект + один вертикальный градиент (контршейдинг), без шумных штрихов.
//
// Контракт честности (спека §11-5): фоновые слои живут в узкой полосе значений вокруг
// цвета воды (не конкурируют с геймплеем), игровые сущности — за её пределами; ярусы
// различимы силуэтом, цвет — вторичный канал. Числовая версия контракта — в unit-тесте.

// — Бренд-примитивы (DESIGN_BRIEF §2a)
export const BRAND = {
  FOG: '#EDF1F3',
  INK: '#15303A',
  BALTIC: '#1E5B5B',
  AZURE: '#2C6A8F',
  AZURE_BRIGHT: '#3E7FA6',
  AZURE_SOFT: '#DDEBF3',
  PEBBLE: '#A99C8C',
  SANDBANK: '#E7D9C0',
  BUOY: '#EE5A36',
  BUOY_DARK: '#BE3F22',
};

// — Вода: поверхность → дно. Значения = water Seal Hunter (theme.js) — визуальная связность игр.
export const WATER = {
  surface: '#3C7C97',
  mid: BRAND.BALTIC,
  deep: '#123E48',
  floor: '#0B2832', // + цвет letterbox-полей (style.css)
};

/** Визуальная линия воды, lu. Камни band 0 (yTop < 0) её пробивают — «квази-суша». */
export const WATERLINE_Y = 10;

// — Параллакс (Roadmap SR-06: 2–3 слоя). factor = доля скорости мира; при
// prefers-reduced-motion рендер выставляет factor 0 (SR-07: параллакс глушится).
// tileW слоёв несоизмеримы (1280 vs 880) — повторы не синхронизируются.
export const PARALLAX = {
  far: { factor: 0.12, tileW: 1280 }, // дальние скалы-кекуры + силуэты ламинарии
  mid: { factor: 0.35, tileW: 880 }, // келп-лес + валуны на грунтовой полосе
};

// Глубинное затухание фона: насколько цвет слоя примешан к воде (0 = чистый цвет).
export const DEPTH_FADE = { far: 0.72, mid: 0.45 };

// — Тюлень Уэдделла (решение владельца, SR-06): БЕЗ ушных раковин, серебристый градиент
// с контршейдингом (тёмная сине-сланцевая спина → серебро → светлое брюхо), тёмный крап,
// большие глаза, «улыбчивая» морда.
export const SEAL = {
  back: '#4E5D66',
  body: '#9FADB5',
  belly: '#E8EEF0',
  rim: 'rgba(244,248,249,0.55)', // контровой блик по спине
  spot: 'rgba(47,60,68,0.38)', // крап
  eye: '#101D24',
  eyeShine: 'rgba(237,241,243,0.95)',
  nose: '#16242B',
  mouth: 'rgba(16,29,36,0.6)',
  whisker: 'rgba(237,241,243,0.8)',
};

// — Сущности: {2–3 тона на объект}. Ярусы: хищники (холодные тёмные), антропогенный мусор
// («чужие» бледные + сигнальные поплавки buoy), камни (тёмный teal, сливаются с водой
// НАМЕРЕННО меньше хищников — статичны и прощают), рыба (серебро / коралл-приз).
export const ENTITY = {
  fish_small: { back: '#4E7C99', body: '#B3C9D6', belly: '#E6EEF3', eye: BRAND.INK },
  fish_rare: {
    back: '#B23A1F',
    body: BRAND.BUOY,
    belly: '#FFCFA8',
    eye: '#2A0F0A',
    glow: 'rgba(255,214,150,0.32)',
  },
  orca: {
    body: '#10181D',
    patch: BRAND.FOG,
    belly: BRAND.FOG,
    saddle: '#8FA3AD',
    jaw: 'rgba(237,241,243,0.35)',
  },
  shark_white: { back: '#5E7789', body: '#8CA3B2', belly: '#E9EFF2', eye: '#0F1B21' },
  shark_big: { back: '#3E5361', body: '#5F7280', belly: '#AFBEC6', eye: '#0F1B21' },
  rock: { base: '#274A54', lit: '#3A6270', dark: '#16333C', algae: '#2C6B5B', algaeLit: '#37806B' },
  // сухая макушка кекура над водой — тёплый гранит (pebble-семья) + пена
  skerry: { dry: '#8E8577', lit: '#B2A896', foam: 'rgba(237,241,243,0.9)' },
  ghost_net: { line: 'rgba(203,226,218,0.55)', float: BRAND.BUOY, floatRim: BRAND.BUOY_DARK },
  plastic_cluster: {
    bottle: 'rgba(221,235,243,0.8)',
    bag: 'rgba(237,241,243,0.5)',
    fold: 'rgba(159,180,190,0.5)',
    cap: BRAND.BUOY,
    shard: 'rgba(201,155,184,0.6)',
  },
  foam: { band: 'rgba(237,241,243,0.85)', crest: 'rgba(255,255,255,0.9)' },
  kelp: ['#19524E', '#236B5F', '#2C7E68'], // как у Seal Hunter — общий вид ламинарии
};

// — Контракт «текстура ↔ сущность sim»: каждый kind, который рендерит game.js, обязан
// иметь запись; w/h — ЛОГИЧЕСКИЕ размеры (lu), рисуются в 2× (render/art.js).
//
// Честность габаритов: у хищников хитбокс — круг r (OBSTACLE_DIMS), ТЕЛО спрайта обязано
// накрывать круг целиком (w ≥ 2r и bodyH ≥ 2r; плавники могут торчать наружу — это
// «прощающий» перебор визуала, спека §8). SR-05-плейсхолдеры это нарушали (орка 60 lu
// при хитбоксе 92) — тут исправлено; инвариант закреплён unit-тестом.
// originY — где в текстуре лежит ЦЕНТР ТЕЛА (сим-координата): спинной плавник выше центра.
export const TEXTURES = {
  seal: { frames: ['seal_0', 'seal_1'], w: 100, h: 56, bodyH: 48 },
  orca: { key: 'orca', w: 170, h: 120, bodyH: 92, originY: 0.6 },
  shark_white: { key: 'shark_white', w: 118, h: 78, bodyH: 60, originY: 0.615 },
  shark_big: { key: 'shark_big', w: 150, h: 102, bodyH: 84, originY: 0.57 },
  fish_small: { key: 'fish_small', w: 28, h: 18 },
  fish_rare: { key: 'fish_rare', w: 38, h: 26 },
  rock: { key: 'rock', w: 120, h: 120 }, // растягивается под габарит конкретного камня
  skerry_cap: { key: 'skerry_cap', w: 120, h: 44 }, // декор-оверлей, хитбокса нет
  ghost_net: { key: 'ghost_net', w: 160, h: 200 }, // = OBSTACLE_DIMS
  plastic_cluster: { key: 'plastic_cluster', w: 140, h: 120 }, // = OBSTACLE_DIMS
};

// — Хелперы цвета (чистые; их же использует unit-тест контрактов)

/** '#RRGGBB' → {r,g,b} (0–255). */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Смесь двух hex-цветов: t=0 → a, t=1 → b. Возвращает hex. */
export function mix(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = (x, y) => Math.round(x + (y - x) * t);
  return (
    '#' +
    [c(ca.r, cb.r), c(ca.g, cb.g), c(ca.b, cb.b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** hex + альфа → строка rgba(). */
export function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Относительная светимость WCAG (0..1) — числовой контракт читаемости в unit-тесте. */
export function relLuma(hex) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
