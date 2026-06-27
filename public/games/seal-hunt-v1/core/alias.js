// core/alias.js — анонимная идентичность игрока (клиент).
// Игрок хранит локально только opaque-seed (целое число). Псевдоним детерминированно
// собирается из seed с солью по игре: «Adjective Noun N». Имя НЕ персональные данные
// (один из ~1M вариантов, не привязано к человеку). Сервер собирает то же самое из seed.
//
// ⚠️ KEEP IN SYNC с src/endpoints/leaderboard.ts (тот же список и алгоритм).

const SEED_KEY = 'seal_hunt_seed';

const ADJ = [
  'Brave', 'Sleepy', 'Cosy', 'Plucky', 'Salty', 'Misty', 'Sunny', 'Chubby',
  'Swift', 'Gentle', 'Jolly', 'Bold', 'Lucky', 'Mellow', 'Nimble', 'Quiet',
  'Round', 'Shiny', 'Snug', 'Spry', 'Tidal', 'Wavy', 'Zippy', 'Pebbly',
  'Breezy', 'Drifty', 'Frosty', 'Glossy', 'Hardy', 'Merry', 'Plump', 'Splashy',
];
const NOUN = [
  'Seal', 'Otter', 'Walrus', 'Puffin', 'Cormorant', 'Kelp', 'Pebble', 'Buoy',
  'Wave', 'Tide', 'Cove', 'Skerry', 'Fjord', 'Selkie', 'Sprat', 'Herring',
  'Anchovy', 'Flipper', 'Whisker', 'Bubble', 'Dune', 'Reef', 'Shrimp', 'Beacon',
  'Mussel', 'Barnacle', 'Lichen', 'Gull', 'Tern', 'Harbor', 'Current', 'Surf',
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

export function aliasFromSeed(seed, game) {
  const e = ((seed >>> 0) ^ hashStr(game)) >>> 0;
  const adj = ADJ[e % ADJ.length];
  const noun = NOUN[Math.floor(e / ADJ.length) % NOUN.length];
  const num = Math.floor(e / (ADJ.length * NOUN.length)) % 1000;
  return `${adj} ${noun} ${num}`;
}

/** Имя игрока для конкретной игры (для приветствия на старте). */
export function getAlias(game) {
  return aliasFromSeed(getSeed(), game);
}
