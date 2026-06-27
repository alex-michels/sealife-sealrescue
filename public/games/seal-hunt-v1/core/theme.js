// theme.js — игровая палитра на основе бренд-токенов «Foggy Coastal Utility»
// (DESIGN_BRIEF §2a). Игра — это отдельный подводный «мир» в iframe, поэтому держим
// один связный тёмный underwater-набор: холодная teal-вода + ТЁПЛЫЙ тюлень (pebble,
// «шкура»), чтобы сцена не уходила в моно-холод. Один тёплый акцент — buoy (приз).
//
// Принцип современного флэт-арта: ограниченная согласованная палитра, 2–3 тона на объект
// (база/тень/блик), чистые силуэты, мало «шумных» штрихов.

// — Бренд-примитивы (как в DESIGN_BRIEF)
const FOG = '#EDF1F3';
const INK = '#15303A';
const BALTIC = '#1E5B5B';
const AZURE = '#2C6A8F';
const AZURE_BRIGHT = '#3E7FA6';
const AZURE_SOFT = '#DDEBF3';
const PEBBLE = '#A99C8C';
const SANDBANK = '#E7D9C0';
const BUOY = '#EE5A36';

export const PALETTE = {
  brand: { FOG, INK, BALTIC, AZURE, AZURE_BRIGHT, AZURE_SOFT, PEBBLE, SANDBANK, BUOY },

  // — Вода: поверхность (светлее) → дно (почти ink). Якорь — baltic.
  water: {
    surface: '#3C7C97', // подсвеченная поверхность (azure-bright светлее)
    mid: BALTIC,
    deep: '#123E48',
    floor: '#0B2832', // самый низ + цвет letterbox-полей
  },
  rays: 'rgba(231,238,242,0.05)', // мягкие лучи света от поверхности
  bubble: 'rgba(231,238,242,0.45)',
  kelp: ['#19524E', '#236B5F', '#2C7E68'], // baltic-зелёные водоросли (тёмное→светлее)
  rock: 'rgba(18,40,48,0.55)',
  seabed: 'rgba(12,32,40,0.6)',

  // — Тюлень: окрас «серки» (молодой тюлень после линьки белька) — серебристо-серый
  // с контршейдингом (тёмная спина → светлый живот) и тёмными крапинами (как Weddell/grey seal).
  seal: {
    back: '#5C6970', // спина — тёмный сланцево-серый (dorsal)
    body: '#98A4A9', // основной светло-серый (серка)
    belly: '#DDE3E4', // серебристый живот (ventral)
    rim: '#EAEEEF', // мягкий контровой блик
    spot: 'rgba(58,70,76,0.42)', // тёмные крапины
    claw: '#1B2A30', // тёмные когти на передних ластах
    dark: INK, // глаз, нос
    whisker: 'rgba(237,241,243,0.9)',
  },

  // — Рыбы: холодные «серебристые» схемы + тёплые акценты. {back, body, belly, eye}
  fish: {
    silver: { back: '#4E7C99', body: '#AFC6D4', belly: '#E4EDF2', eye: INK },
    steel: { back: AZURE, body: '#86ADC4', belly: AZURE_SOFT, eye: INK },
    teal: { back: BALTIC, body: '#5C948F', belly: '#CBE0DA', eye: INK },
    pale: { back: '#9FB6C0', body: '#D3E0E6', belly: FOG, eye: INK },
    coral: { back: '#C2452A', body: BUOY, belly: '#F3A88D', eye: '#2A0F0A' }, // приз, редко
    sand: { back: '#C9B79A', body: SANDBANK, belly: '#F3ECDC', eye: INK }, // тёплый
    squid: { back: '#AE6459', body: '#CD897C', belly: '#E5BCB2', eye: '#1B0B18' },
  },
  highlight: 'rgba(237,241,243,0.9)', // блик на глазу
};
