// core/alias.js — анонимная локализуемая идентичность игрока (клиент).
// Игрок хранит локально только opaque-seed. Имя = locale-независимые индексы из (seed, game),
// которые рисуются на ЯЗЫКЕ ЗРИТЕЛЯ из выровненных RU/EN-списков. Без чисел, морская тематика
// (реалистично/фэнтези/смешно). RU — мужской род (прил.+сущ. согласованы). Имя НЕ персональные
// данные. Сервер собирает те же индексы из seed.
//
// ⚠️ KEEP IN SYNC (порядок и длина) с src/endpoints/leaderboard.ts (там EN-копия).

const SEED_KEY = 'seal_hunt_seed';

// Прилагательные (en / ru-муж.)
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

// Существительные — морские (en / ru-муж., чтобы прил. согласовалось)
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

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
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

/** Locale-независимые индексы имени из (seed, game). */
export function nameIndices(seed, game) {
  const e = ((seed >>> 0) ^ hashStr(game)) >>> 0;
  return { adj: e % ADJ.length, noun: Math.floor(e / ADJ.length) % NOUN.length };
}

/** Имя по индексам на нужном языке. */
export function renderName(adjIdx, nounIdx, lang) {
  const a = ADJ[adjIdx] || ADJ[0];
  const n = NOUN[nounIdx] || NOUN[0];
  return lang === 'ru' ? `${a.ru} ${n.ru}` : `${a.en} ${n.en}`;
}

/** Имя текущего игрока для игры на нужном языке (для приветствия на старте). */
export function getAlias(game, lang) {
  const { adj, noun } = nameIndices(getSeed(), game);
  return renderName(adj, noun, lang);
}
