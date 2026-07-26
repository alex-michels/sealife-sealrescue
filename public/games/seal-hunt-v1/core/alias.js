// core/alias.js — анонимная локализуемая идентичность игрока (клиент).
// Имя варьируется по шаблонам (Прил./Мод./Преф-/-Суф + Сущ.), что расширяет пространство
// имён без чисел. Части детерминированно собираются из (seed, game); рисуются на ЯЗЫКЕ ЗРИТЕЛЯ
// из выровненных RU/EN-списков. RU склоняет прилагательное по роду СУЩЕСТВИТЕЛЬНОГО
// (поле `gru`, m/f/n).
//   RU: согласование с ВЕДУЩИМ существительным; -ый/-ой/-ий → -ая/-яя (ж.р.), -ое/-ее (ср.р.).
// Имя НЕ персональные данные. Сервер собирает те же части тем же алгоритмом.
//
// ⚠️ KEEP IN SYNC с src/endpoints/leaderboard.ts (там EN-копия): порядок/ДЛИНА списков, PATTERNS,
// mulberry32, порядок бросков. Добавляешь NOUN — добавь EN-строку в NOUN_EN там же (та же позиция).

const SEED_KEY = 'seal_hunt_seed'

const ADJ = [
  { en: 'Salty', ru: 'Солёный' },
  { en: 'Brave', ru: 'Храбрый' },
  { en: 'Sleepy', ru: 'Сонный' },
  { en: 'Cosy', ru: 'Уютный' },
  { en: 'Misty', ru: 'Туманный' },
  { en: 'Sunny', ru: 'Солнечный' },
  { en: 'Plump', ru: 'Пухлый' },
  { en: 'Swift', ru: 'Шустрый' },
  { en: 'Gentle', ru: 'Ласковый' },
  { en: 'Jolly', ru: 'Весёлый' },
  { en: 'Bold', ru: 'Смелый' },
  { en: 'Lucky', ru: 'Везучий' },
  { en: 'Mellow', ru: 'Спокойный' },
  { en: 'Nimble', ru: 'Юркий' },
  { en: 'Quiet', ru: 'Тихий' },
  { en: 'Shiny', ru: 'Блестящий' },
  { en: 'Snug', ru: 'Тёплый' },
  { en: 'Tidal', ru: 'Приливный' },
  { en: 'Wavy', ru: 'Волнистый' },
  { en: 'Zippy', ru: 'Прыткий' },
  { en: 'Pebbly', ru: 'Галечный' },
  { en: 'Breezy', ru: 'Ветреный' },
  { en: 'Frosty', ru: 'Морозный' },
  { en: 'Glossy', ru: 'Глянцевый' },
  { en: 'Hardy', ru: 'Стойкий' },
  { en: 'Merry', ru: 'Радостный' },
  { en: 'Splashy', ru: 'Брызгучий' },
  { en: 'Whiskered', ru: 'Усатый' },
  { en: 'Mighty', ru: 'Могучий' },
  { en: 'Deep', ru: 'Глубинный' },
  { en: 'Ancient', ru: 'Древний' },
  { en: 'Pearly', ru: 'Жемчужный' },
  { en: 'Amber', ru: 'Янтарный' },
  { en: 'Spotted', ru: 'Пятнистый' },
  { en: 'Prickly', ru: 'Колючий' },
  { en: 'Slippery', ru: 'Скользкий' },
  { en: 'Foamy', ru: 'Пенный' },
  { en: 'Grumpy', ru: 'Ворчливый' },
  { en: 'Royal', ru: 'Царский' },
  { en: 'Curious', ru: 'Любопытный' },
]

// «Тюленьи»/смешные модификаторы (ru-муж.)
const MOD = [
  { en: 'Chonky', ru: 'Толстый' },
  { en: 'Fluffy', ru: 'Пушистый' },
  { en: 'Round', ru: 'Круглый' },
  { en: 'Smol', ru: 'Мелкий' },
  { en: 'Beeg', ru: 'Большой' },
  { en: 'Derpy', ru: 'Глупый' },
  { en: 'Sandy', ru: 'Песчаный' },
  { en: 'Pudgy', ru: 'Пузатый' },
  { en: 'Floofy', ru: 'Лохматый' },
  { en: 'Squishy', ru: 'Мягкий' },
  { en: 'Blubbery', ru: 'Жирный' },
  { en: 'Cuddly', ru: 'Милый' },
]

// Существительные. `gru` — род для русского склонения (m/f/n).
// ⚠️ Длина/порядок ДОЛЖНЫ совпадать с NOUN_EN в src/endpoints/leaderboard.ts.
const NOUN = [
  { en: 'Seal', ru: 'Тюлень', gru: 'm' },
  { en: 'Walrus', ru: 'Морж', gru: 'm' },
  { en: 'Whale', ru: 'Кит', gru: 'm' },
  { en: 'Dolphin', ru: 'Дельфин', gru: 'm' },
  { en: 'Narwhal', ru: 'Нарвал', gru: 'm' },
  { en: 'Spermwhale', ru: 'Кашалот', gru: 'm' },
  { en: 'Crab', ru: 'Краб', gru: 'm' },
  { en: 'Octopus', ru: 'Осьминог', gru: 'm' },
  { en: 'Squid', ru: 'Кальмар', gru: 'm' },
  { en: 'Lobster', ru: 'Омар', gru: 'm' },
  { en: 'Anchovy', ru: 'Анчоус', gru: 'm' },
  { en: 'Salmon', ru: 'Лосось', gru: 'm' },
  { en: 'Burbot', ru: 'Налим', gru: 'm' },
  { en: 'Perch', ru: 'Окунь', gru: 'm' },
  { en: 'Eel', ru: 'Угорь', gru: 'm' },
  { en: 'Ray', ru: 'Скат', gru: 'm' },
  { en: 'Seahorse', ru: 'Конёк', gru: 'm' },
  { en: 'Krill', ru: 'Криль', gru: 'm' },
  { en: 'Coral', ru: 'Коралл', gru: 'm' },
  { en: 'Kraken', ru: 'Кракен', gru: 'm' },
  { en: 'Triton', ru: 'Тритон', gru: 'm' },
  { en: 'Merman', ru: 'Водяной', gru: 'm' },
  { en: 'Catfish', ru: 'Сом', gru: 'm' },
  { en: 'Bubble', ru: 'Пузырь', gru: 'm' },
  { en: 'Buoy', ru: 'Буёк', gru: 'm' },
  { en: 'Anchor', ru: 'Якорь', gru: 'm' },
  { en: 'Reef', ru: 'Риф', gru: 'm' },
  { en: 'Beacon', ru: 'Маяк', gru: 'm' },
  { en: 'Cormorant', ru: 'Баклан', gru: 'm' },
  { en: 'Puffin', ru: 'Тупик', gru: 'm' },
  { en: 'Penguin', ru: 'Пингвин', gru: 'm' },
  { en: 'Sturgeon', ru: 'Осётр', gru: 'm' },
  { en: 'Halibut', ru: 'Палтус', gru: 'm' },
  { en: 'Marlin', ru: 'Марлин', gru: 'm' },
  { en: 'Sprat', ru: 'Шпрот', gru: 'm' },
  { en: 'Pollock', ru: 'Минтай', gru: 'm' },
  { en: 'Tuna', ru: 'Тунец', gru: 'm' },
  { en: 'Crayfish', ru: 'Рак', gru: 'm' },
  { en: 'Urchin', ru: 'Ёж', gru: 'm' },
  { en: 'Mollusk', ru: 'Моллюск', gru: 'm' },
  { en: 'Scallop', ru: 'Гребешок', gru: 'm' },
  { en: 'Leviathan', ru: 'Левиафан', gru: 'm' },
  { en: 'Serpent', ru: 'Змей', gru: 'm' },
  { en: 'Pelican', ru: 'Пеликан', gru: 'm' },
  // — милые/умилительные имена.
  { en: 'Sealie', ru: 'Тюля', gru: 'f' },
  { en: 'Chonker', ru: 'Толстыш', gru: 'm' },
  { en: 'Toughie', ru: 'Крепыш', gru: 'm' },
  { en: 'Nixie', ru: 'Русалочка', gru: 'f' },
  { en: 'Gobbler', ru: 'Жрун', gru: 'm' },
  { en: 'Zucchini', ru: 'Кабачок', gru: 'm' },
  { en: 'Sea Cucumber', ru: 'Морской огурец', gru: 'm' },
  { en: 'Spud', ru: 'Картошка', gru: 'f' },
  { en: 'Submarine', ru: 'Субмарина', gru: 'f' },
  { en: 'Donut', ru: 'Пончик', gru: 'm' },
  { en: 'Dumplet', ru: 'Колобок', gru: 'm' },
]

// Префикс к существительному (EN — через пробел, RU — через дефис: «Тюль-Якорь»)
const PREFIX = [
  { en: 'Seal', ru: 'Тюль' },
  { en: 'Pup', ru: 'Нерпа' },
  { en: 'Selkie', ru: 'Селки' },
  { en: 'Walrus', ru: 'Морж' },
]
// Суффикс к существительному (EN — через пробел, RU — через дефис: «Якорь-Булочка»)
const SUFFIX = [
  { en: 'Bun', ru: 'Булочка' },
  { en: 'Loaf', ru: 'Батон' },
  { en: 'Blob', ru: 'Пельмень' },
  { en: 'Bean', ru: 'Пирожок' },
  { en: 'Pud', ru: 'Пузик' },
]

const PATTERNS = [
  {},
  { adj: true },
  { mod: true },
  { adj: true, mod: true },
  { pref: true },
  { adj: true, pref: true },
  { suf: true },
  { adj: true, suf: true },
]

function hashStr(s) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
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
    const v = localStorage.getItem(SEED_KEY)
    if (v && /^\d+$/.test(v)) return Number(v) >>> 0
  } catch {}
  const s = Math.floor(Math.random() * 4294967295) >>> 0
  try {
    localStorage.setItem(SEED_KEY, String(s))
  } catch {}
  return s
}

/** Детерминированные части имени из (seed, game). */
export function makeParts(seed, game) {
  const rnd = mulberry32(((seed >>> 0) ^ hashStr(game)) >>> 0)
  const patIdx = Math.floor(rnd() * PATTERNS.length)
  const adj = Math.floor(rnd() * ADJ.length)
  const mod = Math.floor(rnd() * MOD.length)
  const noun = Math.floor(rnd() * NOUN.length)
  const pref = Math.floor(rnd() * PREFIX.length)
  const suf = Math.floor(rnd() * SUFFIX.length)
  const pat = PATTERNS[patIdx]
  const parts = { noun }
  if (pat.adj) parts.adj = adj
  if (pat.mod) parts.mod = mod
  if (pat.pref) parts.pref = pref
  if (pat.suf) parts.suf = suf
  return parts
}

// Все части локализованы на en/ru (en — подстраховка при пропуске).
const pick = (list, i, lang) => {
  const e = list[i] || list[0]
  return e[lang] || e.en
}

// Род «головы» имени для склонения прилагательного. Зависит от языка:

// RU — согласование с ВЕДУЩИМ существительным (поле `gru`); префикс/суффикс род не меняют.
function headGenderFor(parts) {
  return (NOUN[parts.noun] || NOUN[0]).gru // ru
}

// Русское склонение прилагательного: хранится муж. форма (-ый/-ой/-ий) → ж.р./ср.р.
// Мягкая основа (-ий не после г/к/х/ж/ш/щ/ч, напр. «Древний») → -яя/-ее; иначе -ая/-ое.
function declineRu(adj, gender) {
  if (!gender || gender === 'm') return adj
  const stem = adj.slice(0, -2)
  const soft = adj.slice(-2) === 'ий' && !'гкхжшщч'.includes(stem.slice(-1))
  if (gender === 'f') return stem + (soft ? 'яя' : 'ая')
  return stem + (soft ? 'ее' : 'ое') // ср.р.
}

// Прилагательное на нужном языке со склонением по роду (ru); en — без изменений.
function adjForm(list, i, lang, gender) {
  const base = pick(list, i, lang)
  if (lang === 'ru') return declineRu(base, gender)
  return base
}

/** Имя по частям на нужном языке. */
export function renderName(parts, lang) {
  if (!parts || parts.noun == null) return ''
  const gender = headGenderFor(parts)
  const out = []
  if (parts.adj != null) out.push(adjForm(ADJ, parts.adj, lang, gender))
  if (parts.mod != null) out.push(adjForm(MOD, parts.mod, lang, gender))
  let n = pick(NOUN, parts.noun, lang)
  // RU — компаунд через дефис («Тюль-Якорь»); EN — через пробел.
  const hyphen = lang === 'ru'
  if (parts.pref != null) {
    const p = pick(PREFIX, parts.pref, lang)
    n = hyphen ? `${p}-${n}` : `${p} ${n}`
  }
  if (parts.suf != null) {
    const s = pick(SUFFIX, parts.suf, lang)
    n = hyphen ? `${n}-${s}` : `${n} ${s}`
  }
  out.push(n)
  return out.join(' ')
}

/** Имя текущего игрока для игры на нужном языке (для приветствия на старте). */
export function getAlias(game, lang) {
  return renderName(makeParts(getSeed(), game), lang)
}
