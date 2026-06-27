// core/alias.js — анонимная локализуемая идентичность игрока (клиент).
// Имя варьируется по шаблонам (Прил./Мод./Преф-/-Суф + Сущ.), что расширяет пространство
// имён до ~40k без чисел. Части детерминированно собираются из (seed, game); рисуются на
// ЯЗЫКЕ ЗРИТЕЛЯ из выровненных RU/EN-списков. RU — мужской род (прил. согласованы).
// Имя НЕ персональные данные. Сервер собирает те же части тем же алгоритмом.
//
// ⚠️ KEEP IN SYNC (порядок/длина списков, PATTERNS, mulberry32, порядок бросков) с
// src/endpoints/leaderboard.ts (там EN-копия).

const SEED_KEY = 'seal_hunt_seed';

const ADJ = [
  { en: 'Salty', ru: 'Солёный' }, { en: 'Brave', ru: 'Храбрый' }, { en: 'Sleepy', ru: 'Сонный' },
  { en: 'Cosy', ru: 'Уютный' }, { en: 'Misty', ru: 'Туманный' }, { en: 'Sunny', ru: 'Солнечный' },
  { en: 'Plump', ru: 'Пухлый' }, { en: 'Swift', ru: 'Шустрый' }, { en: 'Gentle', ru: 'Ласковый' },
  { en: 'Jolly', ru: 'Весёлый' }, { en: 'Bold', ru: 'Смелый' }, { en: 'Lucky', ru: 'Везучий' },
  { en: 'Mellow', ru: 'Спокойный' }, { en: 'Nimble', ru: 'Юркий' }, { en: 'Quiet', ru: 'Тихий' },
  { en: 'Shiny', ru: 'Блестящий' }, { en: 'Snug', ru: 'Тёплый' }, { en: 'Tidal', ru: 'Приливный' },
  { en: 'Wavy', ru: 'Волнистый' }, { en: 'Zippy', ru: 'Прыткий' }, { en: 'Pebbly', ru: 'Галечный' },
  { en: 'Breezy', ru: 'Ветреный' }, { en: 'Frosty', ru: 'Морозный' }, { en: 'Glossy', ru: 'Лоснящийся' },
  { en: 'Hardy', ru: 'Стойкий' }, { en: 'Merry', ru: 'Радостный' }, { en: 'Splashy', ru: 'Брызгучий' },
  { en: 'Whiskered', ru: 'Усатый' }, { en: 'Mighty', ru: 'Могучий' }, { en: 'Deep', ru: 'Глубинный' },
  { en: 'Ancient', ru: 'Древний' }, { en: 'Pearly', ru: 'Жемчужный' }, { en: 'Amber', ru: 'Янтарный' },
  { en: 'Spotted', ru: 'Пятнистый' }, { en: 'Prickly', ru: 'Колючий' }, { en: 'Slippery', ru: 'Скользкий' },
  { en: 'Foamy', ru: 'Пенный' }, { en: 'Grumpy', ru: 'Ворчливый' }, { en: 'Royal', ru: 'Царский' },
  { en: 'Curious', ru: 'Любопытный' },
];

// «Тюленьи»/смешные модификаторы (ru-муж.)
const MOD = [
  { en: 'Chonky', ru: 'Толстый' }, { en: 'Fluffy', ru: 'Пушистый' }, { en: 'Round', ru: 'Круглый' },
  { en: 'Smol', ru: 'Мелкий' }, { en: 'Beeg', ru: 'Большой' }, { en: 'Derpy', ru: 'Глупый' },
  { en: 'Sandy', ru: 'Песчаный' }, { en: 'Pudgy', ru: 'Пузатый' }, { en: 'Floofy', ru: 'Лохматый' },
  { en: 'Squishy', ru: 'Мягкий' }, { en: 'Blubbery', ru: 'Жирный' }, { en: 'Cuddly', ru: 'Милый' },
];

// Существительные — морские (ru-муж.)
const NOUN = [
  { en: 'Seal', ru: 'Тюлень' }, { en: 'Walrus', ru: 'Морж' }, { en: 'Whale', ru: 'Кит' },
  { en: 'Dolphin', ru: 'Дельфин' }, { en: 'Narwhal', ru: 'Нарвал' }, { en: 'Spermwhale', ru: 'Кашалот' },
  { en: 'Crab', ru: 'Краб' }, { en: 'Octopus', ru: 'Осьминог' }, { en: 'Squid', ru: 'Кальмар' },
  { en: 'Lobster', ru: 'Омар' }, { en: 'Anchovy', ru: 'Анчоус' }, { en: 'Salmon', ru: 'Лосось' },
  { en: 'Burbot', ru: 'Налим' }, { en: 'Perch', ru: 'Окунь' }, { en: 'Eel', ru: 'Угорь' },
  { en: 'Ray', ru: 'Скат' }, { en: 'Seahorse', ru: 'Конёк' }, { en: 'Krill', ru: 'Криль' },
  { en: 'Coral', ru: 'Коралл' }, { en: 'Kraken', ru: 'Кракен' }, { en: 'Triton', ru: 'Тритон' },
  { en: 'Merman', ru: 'Водяной' }, { en: 'Catfish', ru: 'Сом' }, { en: 'Bubble', ru: 'Пузырь' },
  { en: 'Buoy', ru: 'Буёк' }, { en: 'Anchor', ru: 'Якорь' }, { en: 'Reef', ru: 'Риф' },
  { en: 'Beacon', ru: 'Маяк' }, { en: 'Cormorant', ru: 'Баклан' }, { en: 'Puffin', ru: 'Тупик' },
  { en: 'Penguin', ru: 'Пингвин' }, { en: 'Sturgeon', ru: 'Осётр' }, { en: 'Halibut', ru: 'Палтус' },
  { en: 'Marlin', ru: 'Марлин' }, { en: 'Sprat', ru: 'Шпрот' }, { en: 'Pollock', ru: 'Минтай' },
  { en: 'Tuna', ru: 'Тунец' }, { en: 'Crayfish', ru: 'Рак' }, { en: 'Urchin', ru: 'Ёж' },
  { en: 'Mollusk', ru: 'Моллюск' }, { en: 'Scallop', ru: 'Гребешок' }, { en: 'Leviathan', ru: 'Левиафан' },
  { en: 'Serpent', ru: 'Змей' }, { en: 'Pelican', ru: 'Пеликан' },
];

// Префикс к существительному (EN — через пробел, RU — через дефис: «Тюль-Якорь»)
const PREFIX = [
  { en: 'Seal', ru: 'Тюль' }, { en: 'Pup', ru: 'Нерпа' }, { en: 'Selkie', ru: 'Селки' }, { en: 'Walrus', ru: 'Морж' },
];
// Суффикс к существительному (EN — через пробел, RU — через дефис: «Якорь-Булочка»)
const SUFFIX = [
  { en: 'Bun', ru: 'Булочка' }, { en: 'Loaf', ru: 'Батон' }, { en: 'Blob', ru: 'Пельмень' },
  { en: 'Bean', ru: 'Пирожок' }, { en: 'Pud', ru: 'Пузик' },
];

const PATTERNS = [
  {}, { adj: true }, { mod: true }, { adj: true, mod: true },
  { pref: true }, { adj: true, pref: true }, { suf: true }, { adj: true, suf: true },
];

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Стабильный opaque-seed игрока (генерируется один раз, хранится локально). */
export function getSeed() {
  try {
    const v = localStorage.getItem(SEED_KEY);
    if (v && /^\d+$/.test(v)) return Number(v);
  } catch {}
  const s = Math.floor(Math.random() * 4294967295);
  try { localStorage.setItem(SEED_KEY, String(s)); } catch {}
  return s;
}

/** Детерминированные части имени из (seed, game). */
export function makeParts(seed, game) {
  const rnd = mulberry32(((seed >>> 0) ^ hashStr(game)) >>> 0);
  const patIdx = Math.floor(rnd() * PATTERNS.length);
  const adj = Math.floor(rnd() * ADJ.length);
  const mod = Math.floor(rnd() * MOD.length);
  const noun = Math.floor(rnd() * NOUN.length);
  const pref = Math.floor(rnd() * PREFIX.length);
  const suf = Math.floor(rnd() * SUFFIX.length);
  const pat = PATTERNS[patIdx];
  const parts = { noun };
  if (pat.adj) parts.adj = adj;
  if (pat.mod) parts.mod = mod;
  if (pat.pref) parts.pref = pref;
  if (pat.suf) parts.suf = suf;
  return parts;
}

const pick = (list, i, lang) => (list[i] || list[0])[lang];

/** Имя по частям на нужном языке. */
export function renderName(parts, lang) {
  if (!parts || parts.noun == null) return '';
  const out = [];
  if (parts.adj != null) out.push(pick(ADJ, parts.adj, lang));
  if (parts.mod != null) out.push(pick(MOD, parts.mod, lang));
  let n = pick(NOUN, parts.noun, lang);
  if (parts.pref != null) {
    const p = pick(PREFIX, parts.pref, lang);
    n = lang === 'ru' ? `${p}-${n}` : `${p} ${n}`;
  }
  if (parts.suf != null) {
    const s = pick(SUFFIX, parts.suf, lang);
    n = lang === 'ru' ? `${n}-${s}` : `${n} ${s}`;
  }
  out.push(n);
  return out.join(' ');
}

/** Имя текущего игрока для игры на нужном языке (для приветствия на старте). */
export function getAlias(game, lang) {
  return renderName(makeParts(getSeed(), game), lang);
}
