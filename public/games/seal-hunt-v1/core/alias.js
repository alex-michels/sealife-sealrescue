// core/alias.js — анонимная локализуемая идентичность игрока (клиент).
// Имя варьируется по шаблонам (Прил./Мод./Преф-/-Суф + Сущ.), что расширяет пространство
// имён до ~40k без чисел. Части детерминированно собираются из (seed, game); рисуются на
// ЯЗЫКЕ ЗРИТЕЛЯ из выровненных RU/EN/DE-списков. RU — мужской род; DE склоняет прилагательное
// по роду «головы» имени (поле `g`: m/f/n у NOUN и SUFFIX) — сильное склонение -er/-e/-es.
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
  { en: 'Tidal', ru: 'Приливный', de: 'Wogend' },
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
  { en: 'Amber', ru: 'Янтарный', de: 'Golden' },
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

// Существительные — морские (ru-муж.). `g` — род для немецкого склонения (m/f/n).
const NOUN = [
  { en: 'Seal', ru: 'Тюлень', de: 'Robbe', g: 'f' },
  { en: 'Walrus', ru: 'Морж', de: 'Walross', g: 'n' },
  { en: 'Whale', ru: 'Кит', de: 'Wal', g: 'm' },
  { en: 'Dolphin', ru: 'Дельфин', de: 'Delfin', g: 'm' },
  { en: 'Narwhal', ru: 'Нарвал', de: 'Narwal', g: 'm' },
  { en: 'Spermwhale', ru: 'Кашалот', de: 'Pottwal', g: 'm' },
  { en: 'Crab', ru: 'Краб', de: 'Krabbe', g: 'f' },
  { en: 'Octopus', ru: 'Осьминог', de: 'Oktopus', g: 'm' },
  { en: 'Squid', ru: 'Кальмар', de: 'Tintenfisch', g: 'm' },
  { en: 'Lobster', ru: 'Омар', de: 'Hummer', g: 'm' },
  { en: 'Anchovy', ru: 'Анчоус', de: 'Sardelle', g: 'f' },
  { en: 'Salmon', ru: 'Лосось', de: 'Lachs', g: 'm' },
  { en: 'Burbot', ru: 'Налим', de: 'Quappe', g: 'f' },
  { en: 'Perch', ru: 'Окунь', de: 'Barsch', g: 'm' },
  { en: 'Eel', ru: 'Угорь', de: 'Aal', g: 'm' },
  { en: 'Ray', ru: 'Скат', de: 'Rochen', g: 'm' },
  { en: 'Seahorse', ru: 'Конёк', de: 'Seepferdchen', g: 'n' },
  { en: 'Krill', ru: 'Криль', de: 'Krill', g: 'm' },
  { en: 'Coral', ru: 'Коралл', de: 'Koralle', g: 'f' },
  { en: 'Kraken', ru: 'Кракен', de: 'Krake', g: 'm' },
  { en: 'Triton', ru: 'Тритон', de: 'Triton', g: 'm' },
  { en: 'Merman', ru: 'Водяной', de: 'Wassermann', g: 'm' },
  { en: 'Catfish', ru: 'Сом', de: 'Wels', g: 'm' },
  { en: 'Bubble', ru: 'Пузырь', de: 'Blase', g: 'f' },
  { en: 'Buoy', ru: 'Буёк', de: 'Boje', g: 'f' },
  { en: 'Anchor', ru: 'Якорь', de: 'Anker', g: 'm' },
  { en: 'Reef', ru: 'Риф', de: 'Riff', g: 'n' },
  { en: 'Beacon', ru: 'Маяк', de: 'Leuchtfeuer', g: 'n' },
  { en: 'Cormorant', ru: 'Баклан', de: 'Kormoran', g: 'm' },
  { en: 'Puffin', ru: 'Тупик', de: 'Papageitaucher', g: 'm' },
  { en: 'Penguin', ru: 'Пингвин', de: 'Pinguin', g: 'm' },
  { en: 'Sturgeon', ru: 'Осётр', de: 'Stör', g: 'm' },
  { en: 'Halibut', ru: 'Палтус', de: 'Heilbutt', g: 'm' },
  { en: 'Marlin', ru: 'Марлин', de: 'Marlin', g: 'm' },
  { en: 'Sprat', ru: 'Шпрот', de: 'Sprotte', g: 'f' },
  { en: 'Pollock', ru: 'Минтай', de: 'Pollack', g: 'm' },
  { en: 'Tuna', ru: 'Тунец', de: 'Thunfisch', g: 'm' },
  { en: 'Crayfish', ru: 'Рак', de: 'Flusskrebs', g: 'm' },
  { en: 'Urchin', ru: 'Ёж', de: 'Seeigel', g: 'm' },
  { en: 'Mollusk', ru: 'Моллюск', de: 'Molluske', g: 'f' },
  { en: 'Scallop', ru: 'Гребешок', de: 'Jakobsmuschel', g: 'f' },
  { en: 'Leviathan', ru: 'Левиафан', de: 'Leviathan', g: 'm' },
  { en: 'Serpent', ru: 'Змей', de: 'Schlange', g: 'f' },
  { en: 'Pelican', ru: 'Пеликан', de: 'Pelikan', g: 'm' },
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
  { en: 'Bun', ru: 'Булочка', de: 'Brötchen', g: 'n' },
  { en: 'Loaf', ru: 'Батон', de: 'Laib', g: 'm' },
  { en: 'Blob', ru: 'Пельмень', de: 'Klops', g: 'm' },
  { en: 'Bean', ru: 'Пирожок', de: 'Böhnchen', g: 'n' },
  { en: 'Pud', ru: 'Пузик', de: 'Pudding', g: 'm' },
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

// Все части локализованы на en/ru/de (en — подстраховка при пропуске).
const pick = (list, i, lang) => {
  const e = list[i] || list[0];
  return e[lang] || e.en;
};

// Род «головы» имени: при суффиксе род задаёт последний элемент компаунда (суффикс),
// иначе — само существительное. Нужен для немецкого склонения прилагательных.
const ADJ_END = { m: 'er', f: 'e', n: 'es' };
function headGender(parts) {
  if (parts.suf != null) return (SUFFIX[parts.suf] || SUFFIX[0]).g;
  return (NOUN[parts.noun] || NOUN[0]).g;
}
// Прилагательное на нужном языке; для de — сильное склонение по роду (Runder/Runde/Rundes).
function adjForm(list, i, lang, gender) {
  const base = pick(list, i, lang);
  if (lang !== 'de') return base;
  return base + (ADJ_END[gender] || 'er');
}

/** Имя по частям на нужном языке. */
export function renderName(parts, lang) {
  if (!parts || parts.noun == null) return '';
  const gender = headGender(parts);
  const out = [];
  if (parts.adj != null) out.push(adjForm(ADJ, parts.adj, lang, gender));
  if (parts.mod != null) out.push(adjForm(MOD, parts.mod, lang, gender));
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
