// core/alias.js — анонимная локализуемая идентичность игрока (клиент).
// Имя варьируется по шаблонам (Прил./Мод./Преф-/-Суф + Сущ.), что расширяет пространство
// имён без чисел. Части детерминированно собираются из (seed, game); рисуются на ЯЗЫКЕ ЗРИТЕЛЯ
// из выровненных RU/EN/DE-списков. И DE, и RU склоняют прилагательное по роду СУЩЕСТВИТЕЛЬНОГО
// (род зависит от языка: Тюлень=m в RU, но Robbe=f в DE → отдельные поля `gru`/`gde`, m/f/n).
//   DE: род «головы» (у компаунда его задаёт СУФФИКС); окончания -er/-e/-es.
//   RU: согласование с ВЕДУЩИМ существительным; -ый/-ой/-ий → -ая/-яя (ж.р.), -ое/-ее (ср.р.).
// Имя НЕ персональные данные. Сервер собирает те же части тем же алгоритмом.
//
// ⚠️ KEEP IN SYNC с src/endpoints/leaderboard.ts (там EN-копия): порядок/ДЛИНА списков, PATTERNS,
// mulberry32, порядок бросков. Добавляешь NOUN — добавь EN-строку в NOUN_EN там же (та же позиция).

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
  { en: 'Glossy', ru: 'Глянцевый', de: 'Glänzend' },
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

// Существительные. `gde`/`gru` — род для нем./рус. склонения (m/f/n). Род зависит от языка!
// ⚠️ Длина/порядок ДОЛЖНЫ совпадать с NOUN_EN в src/endpoints/leaderboard.ts.
const NOUN = [
  { en: 'Seal', ru: 'Тюлень', de: 'Robbe', gde: 'f', gru: 'm' },
  { en: 'Walrus', ru: 'Морж', de: 'Walross', gde: 'n', gru: 'm' },
  { en: 'Whale', ru: 'Кит', de: 'Wal', gde: 'm', gru: 'm' },
  { en: 'Dolphin', ru: 'Дельфин', de: 'Delfin', gde: 'm', gru: 'm' },
  { en: 'Narwhal', ru: 'Нарвал', de: 'Narwal', gde: 'm', gru: 'm' },
  { en: 'Spermwhale', ru: 'Кашалот', de: 'Pottwal', gde: 'm', gru: 'm' },
  { en: 'Crab', ru: 'Краб', de: 'Krabbe', gde: 'f', gru: 'm' },
  { en: 'Octopus', ru: 'Осьминог', de: 'Oktopus', gde: 'm', gru: 'm' },
  { en: 'Squid', ru: 'Кальмар', de: 'Tintenfisch', gde: 'm', gru: 'm' },
  { en: 'Lobster', ru: 'Омар', de: 'Hummer', gde: 'm', gru: 'm' },
  { en: 'Anchovy', ru: 'Анчоус', de: 'Sardelle', gde: 'f', gru: 'm' },
  { en: 'Salmon', ru: 'Лосось', de: 'Lachs', gde: 'm', gru: 'm' },
  { en: 'Burbot', ru: 'Налим', de: 'Quappe', gde: 'f', gru: 'm' },
  { en: 'Perch', ru: 'Окунь', de: 'Barsch', gde: 'm', gru: 'm' },
  { en: 'Eel', ru: 'Угорь', de: 'Aal', gde: 'm', gru: 'm' },
  { en: 'Ray', ru: 'Скат', de: 'Rochen', gde: 'm', gru: 'm' },
  { en: 'Seahorse', ru: 'Конёк', de: 'Seepferdchen', gde: 'n', gru: 'm' },
  { en: 'Krill', ru: 'Криль', de: 'Krill', gde: 'm', gru: 'm' },
  { en: 'Coral', ru: 'Коралл', de: 'Koralle', gde: 'f', gru: 'm' },
  { en: 'Kraken', ru: 'Кракен', de: 'Krake', gde: 'm', gru: 'm' },
  { en: 'Triton', ru: 'Тритон', de: 'Triton', gde: 'm', gru: 'm' },
  { en: 'Merman', ru: 'Водяной', de: 'Wassermann', gde: 'm', gru: 'm' },
  { en: 'Catfish', ru: 'Сом', de: 'Wels', gde: 'm', gru: 'm' },
  { en: 'Bubble', ru: 'Пузырь', de: 'Blase', gde: 'f', gru: 'm' },
  { en: 'Buoy', ru: 'Буёк', de: 'Boje', gde: 'f', gru: 'm' },
  { en: 'Anchor', ru: 'Якорь', de: 'Anker', gde: 'm', gru: 'm' },
  { en: 'Reef', ru: 'Риф', de: 'Riff', gde: 'n', gru: 'm' },
  { en: 'Beacon', ru: 'Маяк', de: 'Leuchtfeuer', gde: 'n', gru: 'm' },
  { en: 'Cormorant', ru: 'Баклан', de: 'Kormoran', gde: 'm', gru: 'm' },
  { en: 'Puffin', ru: 'Тупик', de: 'Papageitaucher', gde: 'm', gru: 'm' },
  { en: 'Penguin', ru: 'Пингвин', de: 'Pinguin', gde: 'm', gru: 'm' },
  { en: 'Sturgeon', ru: 'Осётр', de: 'Stör', gde: 'm', gru: 'm' },
  { en: 'Halibut', ru: 'Палтус', de: 'Heilbutt', gde: 'm', gru: 'm' },
  { en: 'Marlin', ru: 'Марлин', de: 'Marlin', gde: 'm', gru: 'm' },
  { en: 'Sprat', ru: 'Шпрот', de: 'Sprotte', gde: 'f', gru: 'm' },
  { en: 'Pollock', ru: 'Минтай', de: 'Pollack', gde: 'm', gru: 'm' },
  { en: 'Tuna', ru: 'Тунец', de: 'Thunfisch', gde: 'm', gru: 'm' },
  { en: 'Crayfish', ru: 'Рак', de: 'Flusskrebs', gde: 'm', gru: 'm' },
  { en: 'Urchin', ru: 'Ёж', de: 'Seeigel', gde: 'm', gru: 'm' },
  { en: 'Mollusk', ru: 'Моллюск', de: 'Molluske', gde: 'f', gru: 'm' },
  { en: 'Scallop', ru: 'Гребешок', de: 'Jakobsmuschel', gde: 'f', gru: 'm' },
  { en: 'Leviathan', ru: 'Левиафан', de: 'Leviathan', gde: 'm', gru: 'm' },
  { en: 'Serpent', ru: 'Змей', de: 'Schlange', gde: 'f', gru: 'm' },
  { en: 'Pelican', ru: 'Пеликан', de: 'Pelikan', gde: 'm', gru: 'm' },
  // — милые/умилительные (M-DE-NAMES). Род в RU и DE может различаться.
  { en: 'Sealie', ru: 'Тюля', de: 'Seehündchen', gde: 'n', gru: 'f' },
  { en: 'Chonker', ru: 'Толстыш', de: 'Dickerchen', gde: 'n', gru: 'm' },
  { en: 'Toughie', ru: 'Крепыш', de: 'Kraftpaket', gde: 'n', gru: 'm' },
  { en: 'Nixie', ru: 'Русалочка', de: 'Nixe', gde: 'f', gru: 'f' },
  { en: 'Gobbler', ru: 'Жрун', de: 'Vielfraß', gde: 'm', gru: 'm' },
  { en: 'Zucchini', ru: 'Кабачок', de: 'Zucchini', gde: 'f', gru: 'm' },
  { en: 'Sea Cucumber', ru: 'Морской огурец', de: 'Seegurke', gde: 'f', gru: 'm' },
  { en: 'Spud', ru: 'Картошка', de: 'Kartoffel', gde: 'f', gru: 'f' },
  { en: 'Submarine', ru: 'Субмарина', de: 'U-Boot', gde: 'n', gru: 'f' },
  { en: 'Donut', ru: 'Пончик', de: 'Krapfen', gde: 'm', gru: 'm' },
  { en: 'Dumplet', ru: 'Колобок', de: 'Teigkugel', gde: 'f', gru: 'm' },
];

// Префикс к существительному (EN — через пробел, RU — через дефис: «Тюль-Якорь»)
const PREFIX = [
  { en: 'Seal', ru: 'Тюль', de: 'Robben' },
  { en: 'Pup', ru: 'Нерпа', de: 'Heuler' },
  { en: 'Selkie', ru: 'Селки', de: 'Selkie' },
  { en: 'Walrus', ru: 'Морж', de: 'Walross' },
];
// Суффикс к существительному (EN — через пробел, RU/DE — через дефис: «Якорь-Булочка» / «Anker-Brötchen»)
// `gde` — род для немецкого склонения; в RU прилагательное согласуется с ведущим существительным,
// поэтому род суффикса в RU не нужен.
const SUFFIX = [
  { en: 'Bun', ru: 'Булочка', de: 'Brötchen', gde: 'n' },
  { en: 'Loaf', ru: 'Батон', de: 'Laib', gde: 'm' },
  { en: 'Blob', ru: 'Пельмень', de: 'Klops', gde: 'm' },
  { en: 'Bean', ru: 'Пирожок', de: 'Böhnchen', gde: 'n' },
  { en: 'Pud', ru: 'Пузик', de: 'Pudding', gde: 'm' },
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

/**
 * Стабильный opaque-seed игрока (генерируется один раз, хранится локально).
 * ВСЕГДА uint32 (`>>> 0`): сервер валидирует seed в диапазоне 0..2^32-1, а makeParts
 * всё равно маскирует `seed >>> 0`. Если этого не делать, «большой» seed (старый билд /
 * ручная правка localStorage) даёт корректное имя, но сабмит падает `invalid_input` —
 * счёт молча не засчитывается. Маска не меняет имя (makeParts маскирует так же).
 */
export function getSeed() {
  try {
    const v = localStorage.getItem(SEED_KEY);
    if (v && /^\d+$/.test(v)) return Number(v) >>> 0;
  } catch {}
  const s = (Math.floor(Math.random() * 4294967295)) >>> 0;
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

// Род «головы» имени для склонения прилагательного. Зависит от языка:
//  DE — у компаунда род задаёт СУФФИКС (последний элемент), иначе существительное (поле `gde`);
//  RU — согласование с ВЕДУЩИМ существительным (поле `gru`); префикс/суффикс род не меняют.
const DE_END = { m: 'er', f: 'e', n: 'es' };
function headGenderFor(parts, lang) {
  if (lang === 'de') {
    const e = parts.suf != null ? SUFFIX[parts.suf] : NOUN[parts.noun];
    return (e || NOUN[0]).gde;
  }
  return (NOUN[parts.noun] || NOUN[0]).gru; // ru
}

// Русское склонение прилагательного: хранится муж. форма (-ый/-ой/-ий) → ж.р./ср.р.
// Мягкая основа (-ий не после г/к/х/ж/ш/щ/ч, напр. «Древний») → -яя/-ее; иначе -ая/-ое.
function declineRu(adj, gender) {
  if (!gender || gender === 'm') return adj;
  const stem = adj.slice(0, -2);
  const soft = adj.slice(-2) === 'ий' && !'гкхжшщч'.includes(stem.slice(-1));
  if (gender === 'f') return stem + (soft ? 'яя' : 'ая');
  return stem + (soft ? 'ее' : 'ое'); // ср.р.
}

// Прилагательное на нужном языке со склонением по роду (de/ru); en — без изменений.
function adjForm(list, i, lang, gender) {
  const base = pick(list, i, lang);
  if (lang === 'de') return base + (DE_END[gender] || 'er');
  if (lang === 'ru') return declineRu(base, gender);
  return base;
}

/** Имя по частям на нужном языке. */
export function renderName(parts, lang) {
  if (!parts || parts.noun == null) return '';
  const gender = headGenderFor(parts, lang);
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
