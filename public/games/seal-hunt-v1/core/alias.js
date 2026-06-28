// core/alias.js — анонимная локализуемая идентичность игрока (клиент).
// Имя варьируется по шаблонам (Прил./Мод./Преф-/-Суф + Сущ.), что расширяет пространство
// имён до ~40k без чисел. Части детерминированно собираются из (seed, game); рисуются на
// ЯЗЫКЕ ЗРИТЕЛЯ из выровненных RU/EN/DE-списков. RU — мужской род; DE — базовая форма (без склонения).
// Имя НЕ персональные данные. Сервер собирает те же части тем же алгоритмом.
//
// ⚠️ KEEP IN SYNC (порядок/длина списков, PATTERNS, mulberry32, порядок бросков) с
// src/endpoints/leaderboard.ts (там EN-копия).

const SEED_KEY = 'seal_hunt_seed';

const ADJ = [
  { en: 'Salty', ru: 'Солёный', de: 'Salzig' },
  { en: 'Brave', ru: 'Храбрый', de: 'Tapfer' },
  { en: 'Sleepy', ru: 'Сонный', de: 'Schläfrig' },
  { en: 'Cosy', ru: 'Уютный', de: 'Gemütlich' },
  { en: 'Misty', ru: 'Туманный', de: 'Neblig' },
  { en: 'Sunny', ru: 'Солнечный', de: 'Sonnig' },
  { en: 'Plump', ru: 'Пухлый', de: 'Mollig' },
  { en: 'Swift', ru: 'Шустрый', de: 'Flink' },
  { en: 'Gentle', ru: 'Ласковый', de: 'Sanft' },
  { en: 'Jolly', ru: 'Весёлый', de: 'Fröhlich' },
  { en: 'Bold', ru: 'Смелый', de: 'Kühn' },
  { en: 'Lucky', ru: 'Везучий', de: 'Glücklich' },
  { en: 'Mellow', ru: 'Спокойный', de: 'Gelassen' },
  { en: 'Nimble', ru: 'Юркий', de: 'Wendig' },
  { en: 'Quiet', ru: 'Тихий', de: 'Still' },
  { en: 'Shiny', ru: 'Блестящий', de: 'Strahlend' },
  { en: 'Snug', ru: 'Тёплый', de: 'Kuschelig' },
  { en: 'Tidal', ru: 'Приливный', de: 'Tidal' },
  { en: 'Wavy', ru: 'Волнистый', de: 'Wellig' },
  { en: 'Zippy', ru: 'Прыткий', de: 'Flitzig' },
  { en: 'Pebbly', ru: 'Галечный', de: 'Kieselig' },
  { en: 'Breezy', ru: 'Ветреный', de: 'Luftig' },
  { en: 'Frosty', ru: 'Морозный', de: 'Frostig' },
  { en: 'Glossy', ru: 'Лоснящийся', de: 'Glänzend' },
  { en: 'Hardy', ru: 'Стойкий', de: 'Robust' },
  { en: 'Merry', ru: 'Радостный', de: 'Vergnügt' },
  { en: 'Splashy', ru: 'Брызгучий', de: 'Spritzig' },
  { en: 'Whiskered', ru: 'Усатый', de: 'Schnurrbärtig' },
  { en: 'Mighty', ru: 'Могучий', de: 'Mächtig' },
  { en: 'Deep', ru: 'Глубинный', de: 'Tief' },
  { en: 'Ancient', ru: 'Древний', de: 'Uralt' },
  { en: 'Pearly', ru: 'Жемчужный', de: 'Perlig' },
  { en: 'Amber', ru: 'Янтарный', de: 'Bernstein' },
  { en: 'Spotted', ru: 'Пятнистый', de: 'Gefleckt' },
  { en: 'Prickly', ru: 'Колючий', de: 'Stachelig' },
  { en: 'Slippery', ru: 'Скользкий', de: 'Glitschig' },
  { en: 'Foamy', ru: 'Пенный', de: 'Schaumig' },
  { en: 'Grumpy', ru: 'Ворчливый', de: 'Grummelig' },
  { en: 'Royal', ru: 'Царский', de: 'Königlich' },
  { en: 'Curious', ru: 'Любопытный', de: 'Neugierig' },
];

// «Тюленьи»/смешные модификаторы (ru-муж.)
const MOD = [
  { en: 'Chonky', ru: 'Толстый', de: 'Pummelig' },
  { en: 'Fluffy', ru: 'Пушистый', de: 'Flauschig' },
  { en: 'Round', ru: 'Круглый', de: 'Rund' },
  { en: 'Smol', ru: 'Мелкий', de: 'Winzig' },
  { en: 'Beeg', ru: 'Большой', de: 'Riesig' },
  { en: 'Derpy', ru: 'Глупый', de: 'Trottelig' },
  { en: 'Sandy', ru: 'Песчаный', de: 'Sandig' },
  { en: 'Pudgy', ru: 'Пузатый', de: 'Dicklich' },
  { en: 'Floofy', ru: 'Лохматый', de: 'Zottelig' },
  { en: 'Squishy', ru: 'Мягкий', de: 'Weich' },
  { en: 'Blubbery', ru: 'Жирный', de: 'Speckig' },
  { en: 'Cuddly', ru: 'Милый', de: 'Knuddelig' },
];

// Существительные — морские (ru-муж.)
const NOUN = [
  { en: 'Seal', ru: 'Тюлень', de: 'Robbe' },
  { en: 'Walrus', ru: 'Морж', de: 'Walross' },
  { en: 'Whale', ru: 'Кит', de: 'Wal' },
  { en: 'Dolphin', ru: 'Дельфин', de: 'Delfin' },
  { en: 'Narwhal', ru: 'Нарвал', de: 'Narwal' },
  { en: 'Spermwhale', ru: 'Кашалот', de: 'Pottwal' },
  { en: 'Crab', ru: 'Краб', de: 'Krabbe' },
  { en: 'Octopus', ru: 'Осьминог', de: 'Oktopus' },
  { en: 'Squid', ru: 'Кальмар', de: 'Tintenfisch' },
  { en: 'Lobster', ru: 'Омар', de: 'Hummer' },
  { en: 'Anchovy', ru: 'Анчоус', de: 'Sardelle' },
  { en: 'Salmon', ru: 'Лосось', de: 'Lachs' },
  { en: 'Burbot', ru: 'Налим', de: 'Quappe' },
  { en: 'Perch', ru: 'Окунь', de: 'Barsch' },
  { en: 'Eel', ru: 'Угорь', de: 'Aal' },
  { en: 'Ray', ru: 'Скат', de: 'Rochen' },
  { en: 'Seahorse', ru: 'Конёк', de: 'Seepferdchen' },
  { en: 'Krill', ru: 'Криль', de: 'Krill' },
  { en: 'Coral', ru: 'Коралл', de: 'Koralle' },
  { en: 'Kraken', ru: 'Кракен', de: 'Krake' },
  { en: 'Triton', ru: 'Тритон', de: 'Triton' },
  { en: 'Merman', ru: 'Водяной', de: 'Wassermann' },
  { en: 'Catfish', ru: 'Сом', de: 'Wels' },
  { en: 'Bubble', ru: 'Пузырь', de: 'Blase' },
  { en: 'Buoy', ru: 'Буёк', de: 'Boje' },
  { en: 'Anchor', ru: 'Якорь', de: 'Anker' },
  { en: 'Reef', ru: 'Риф', de: 'Riff' },
  { en: 'Beacon', ru: 'Маяк', de: 'Leuchtfeuer' },
  { en: 'Cormorant', ru: 'Баклан', de: 'Kormoran' },
  { en: 'Puffin', ru: 'Тупик', de: 'Papageitaucher' },
  { en: 'Penguin', ru: 'Пингвин', de: 'Pinguin' },
  { en: 'Sturgeon', ru: 'Осётр', de: 'Stör' },
  { en: 'Halibut', ru: 'Палтус', de: 'Heilbutt' },
  { en: 'Marlin', ru: 'Марлин', de: 'Marlin' },
  { en: 'Sprat', ru: 'Шпрот', de: 'Sprotte' },
  { en: 'Pollock', ru: 'Минтай', de: 'Pollack' },
  { en: 'Tuna', ru: 'Тунец', de: 'Thunfisch' },
  { en: 'Crayfish', ru: 'Рак', de: 'Flusskrebs' },
  { en: 'Urchin', ru: 'Ёж', de: 'Seeigel' },
  { en: 'Mollusk', ru: 'Моллюск', de: 'Molluske' },
  { en: 'Scallop', ru: 'Гребешок', de: 'Jakobsmuschel' },
  { en: 'Leviathan', ru: 'Левиафан', de: 'Leviathan' },
  { en: 'Serpent', ru: 'Змей', de: 'Schlange' },
  { en: 'Pelican', ru: 'Пеликан', de: 'Pelikan' },
];

// Префикс к существительному (EN — через пробел, RU — через дефис: «Тюль-Якорь»)
const PREFIX = [
  { en: 'Seal', ru: 'Тюль', de: 'Robben' },
  { en: 'Pup', ru: 'Нерпа', de: 'Heuler' },
  { en: 'Selkie', ru: 'Селки', de: 'Selkie' },
  { en: 'Walrus', ru: 'Морж', de: 'Walross' },
];
// Суффикс к существительному (EN — через пробел, RU/DE — через дефис: «Якорь-Булочка» / «Anker-Brötchen»)
const SUFFIX = [
  { en: 'Bun', ru: 'Булочка', de: 'Brötchen' },
  { en: 'Loaf', ru: 'Батон', de: 'Laib' },
  { en: 'Blob', ru: 'Пельмень', de: 'Klops' },
  { en: 'Bean', ru: 'Пирожок', de: 'Böhnchen' },
  { en: 'Pud', ru: 'Пузик', de: 'Pudding' },
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

// Имена-части есть на en/ru; прочие локали (de) рисуются английскими словами (fallback),
// чтобы не дублировать ~140 слов и не расходиться с серверной копией в leaderboard.ts.
const pick = (list, i, lang) => {
  const e = list[i] || list[0];
  return e[lang] || e.en;
};

/** Имя по частям на нужном языке. */
export function renderName(parts, lang) {
  if (!parts || parts.noun == null) return '';
  const out = [];
  if (parts.adj != null) out.push(pick(ADJ, parts.adj, lang));
  if (parts.mod != null) out.push(pick(MOD, parts.mod, lang));
  let n = pick(NOUN, parts.noun, lang);
  // RU и DE — компаунд через дефис («Тюль-Якорь» / «Robben-Anker»); EN — через пробел.
  const hyphen = lang === 'ru' || lang === 'de';
  if (parts.pref != null) {
    const p = pick(PREFIX, parts.pref, lang);
    n = hyphen ? `${p}-${n}` : `${p} ${n}`;
  }
  if (parts.suf != null) {
    const s = pick(SUFFIX, parts.suf, lang);
    n = hyphen ? `${n}-${s}` : `${n} ${s}`;
  }
  out.push(n);
  return out.join(' ');
}

/** Имя текущего игрока для игры на нужном языке (для приветствия на старте). */
export function getAlias(game, lang) {
  return renderName(makeParts(getSeed(), game), lang);
}
