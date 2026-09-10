const STRINGS = {
  en: {
    title: 'Seal Run · Ocean expeditions',
    brand: 'OCEAN EXPEDITIONS',
    heroTop: 'A little seal.',
    heroBottom: 'A great big ocean.',
    intro: 'Find your current. Follow the fish. Make it to the other side.',
    explore: 'Explore',
    weekly: 'Weekly expedition',
    exploreHint:
      'Choose a coast. Every new route is a fresh adventure. Practice scores stay in this tab.',
    weeklyHint:
      'Five chapters. One weekly route. An anonymous game cookie remembers your weekly best for 7 days.',
    play: 'Let’s swim',
    loading: 'Preparing the water…',
    regenerate: 'New route',
    route: 'Route',
    relaxed: 'Gentle pace',
    how: 'How to swim',
    howMove: 'Move your pointer or drag to choose a depth. You can also use ↑ ↓ or W S.',
    howFish:
      'Fish restore energy. Larger, orange fish are worth more. Seals breathe air; the energy meter is an arcade mechanic.',
    howHazards: 'Dodge predators. Nets slow you down. Solid rocks push you away.',
    howBurst:
      'Space gives a short burst: it costs energy, so pick your moment. Escape or P pauses.',
    locations: 'Choose your waters',
    sound: 'Sound',
    motion: 'Reduced motion',
    on: 'On',
    off: 'Off',
    fullscreen: 'Fullscreen',
    pause: 'Pause',
    resume: 'Keep swimming',
    paused: 'A moment on the surface.',
    pauseHint: 'Your swim is paused. Take your time.',
    home: 'Back to the map',
    retry: 'Swim again',
    quit: 'End this swim',
    energy: 'Energy',
    lives: 'Lives',
    distance: 'Distance',
    fish: 'Fish',
    score: 'Score',
    chapter: 'Chapter',
    burst: 'Burst',
    up: 'Swim up',
    down: 'Swim down',
    drag: 'Drag anywhere · ↑ ↓ / W S · Space to burst',
    portrait: 'More ocean in landscape. Portrait works too.',
    finish: 'Coast clear.',
    finishHint: 'A little further. A little braver.',
    expeditionDone: 'Five waters. One great swim.',
    ended: 'Every swim is a story.',
    endedHint: 'A new route is waiting. Your next swim starts here.',
    next: 'Next waters',
    bank: 'Save expedition',
    submit: 'Send to weekly board',
    submitting: 'Saving your swim…',
    saved: 'Your swim is on the board.',
    practiceResult: 'Practice swim · no score submitted',
    leaderboard: 'Weekly board',
    boardLoading: 'Reading this week’s swims…',
    boardEmpty: 'The ocean is quiet. Set the first score.',
    boardError: 'The board is unavailable. You can still explore the ocean.',
    reload: 'Try again',
    close: 'Close',
    previous: 'Previous',
    more: 'Next',
    rank: 'Rank',
    swimmer: 'Swimmer',
    levels: 'Chapters',
    best: 'Your weekly best',
    startError: 'The weekly route could not be loaded. Try again or choose Explore.',
    submitError:
      'Your score was not saved. Check the connection and retry while this result is open.',
    usedToken: 'This swim was already submitted. Refresh the board to check your result.',
    shortSwim: 'A ranked swim needs at least 3 seconds of play. Try another swim.',
    expired:
      'This expedition token expired. Your result stays visible; start a new swim to rank again.',
    firstMove: 'Find your depth — move or drag',
    firstFish: 'Follow the silver trail for energy',
    firstHazard: 'Open water is your safe route',
    lowEnergy: 'Low energy — look for fish',
    hit: 'Life lost. Find clear water.',
    net: 'Caught in debris — keep moving',
    boostReady: 'Burst ready',
    privacy: 'Privacy',
    legal: 'Legal notice',
    terms: 'Terms',
    cookies: 'Cookies',
    comingSoon: 'Coming soon',
    readyOffline: 'Practice is ready offline',
    fantasy: 'A fantasy chapter',
    chapterDone: 'Chapter complete',
    nextHint: 'Fresh energy, three lives, a new coast.',
  },
  ru: {
    title: 'Seal Run · Океанские экспедиции',
    brand: 'ОКЕАНСКИЕ ЭКСПЕДИЦИИ',
    heroTop: 'Маленький тюлень.',
    heroBottom: 'Большой океан.',
    intro: 'Поймай течение. Следуй за рыбой. Доберись до другого берега.',
    explore: 'Исследовать',
    weekly: 'Экспедиция недели',
    exploreHint:
      'Выбери берег. Каждая новая трасса — новое приключение. Результаты тренировки остаются в этой вкладке.',
    weeklyHint:
      'Пять глав. Одна трасса на неделю. Анонимный игровой cookie помнит твой недельный рекорд 7 дней.',
    play: 'Поплыли',
    loading: 'Готовим океан…',
    regenerate: 'Новая трасса',
    route: 'Трасса',
    relaxed: 'Спокойный темп',
    how: 'Как плыть',
    howMove: 'Двигай указатель или веди пальцем, выбирая глубину. Можно нажимать ↑ ↓ или W S.',
    howFish:
      'Рыба восстанавливает энергию. Крупная оранжевая рыбка даёт больше очков. Тюлени дышат воздухом; шкала энергии — условность аркады.',
    howHazards: 'Уворачивайся от хищников. Сети замедляют. Камни отбрасывают.',
    howBurst: 'Пробел — короткий рывок за энергию. Выбирай момент. Escape или P — пауза.',
    locations: 'Выбери свой океан',
    sound: 'Звук',
    motion: 'Меньше движения',
    on: 'Вкл.',
    off: 'Выкл.',
    fullscreen: 'На весь экран',
    pause: 'Пауза',
    resume: 'Плыть дальше',
    paused: 'Минутка у поверхности.',
    pauseHint: 'Заплыв на паузе. Можно не спешить.',
    home: 'Вернуться к карте',
    retry: 'Ещё заплыв',
    quit: 'Завершить заплыв',
    energy: 'Энергия',
    lives: 'Жизни',
    distance: 'Дистанция',
    fish: 'Рыба',
    score: 'Очки',
    chapter: 'Глава',
    burst: 'Рывок',
    up: 'Плыть вверх',
    down: 'Плыть вниз',
    drag: 'Веди пальцем · ↑ ↓ / W S · Пробел — рывок',
    portrait: 'В альбомной ориентации океан просторнее. В портретной тоже можно.',
    finish: 'Берег достигнут.',
    finishHint: 'Чуть дальше. Чуть смелее.',
    expeditionDone: 'Пять морей. Большой заплыв.',
    ended: 'У каждого заплыва своя история.',
    endedHint: 'Новая трасса уже ждёт. Следующее приключение начинается здесь.',
    next: 'К новым берегам',
    bank: 'Сохранить экспедицию',
    submit: 'Отправить в таблицу недели',
    submitting: 'Сохраняем заплыв…',
    saved: 'Твой заплыв в таблице.',
    practiceResult: 'Тренировка · результат не отправлен',
    leaderboard: 'Таблица недели',
    boardLoading: 'Смотрим заплывы этой недели…',
    boardEmpty: 'В океане тихо. Поставь первый рекорд.',
    boardError: 'Таблица недоступна. Океан по-прежнему открыт для тренировки.',
    reload: 'Повторить',
    close: 'Закрыть',
    previous: 'Назад',
    more: 'Далее',
    rank: 'Место',
    swimmer: 'Пловец',
    levels: 'Главы',
    best: 'Твой рекорд недели',
    startError: 'Не удалось загрузить трассу недели. Повтори или выбери «Исследовать».',
    submitError: 'Очки не сохранены. Проверь соединение и повтори, пока открыт результат.',
    usedToken: 'Этот заплыв уже отправлен. Обнови таблицу, чтобы проверить результат.',
    shortSwim: 'Для таблицы нужно хотя бы 3 секунды игры. Попробуй ещё раз.',
    expired:
      'Время этой экспедиции истекло. Результат остаётся на экране; для таблицы начни новый заплыв.',
    firstMove: 'Выбери глубину — двигай указатель или палец',
    firstFish: 'Серебристая рыбка — твоя энергия',
    firstHazard: 'Открытая вода — безопасный путь',
    lowEnergy: 'Мало энергии — ищи рыбу',
    hit: 'Потеряна жизнь. Ищи чистую воду.',
    net: 'Мусор замедляет — двигайся дальше',
    boostReady: 'Рывок готов',
    privacy: 'Конфиденциальность',
    legal: 'Правовая информация',
    terms: 'Условия',
    cookies: 'Cookie',
    comingSoon: 'Скоро',
    readyOffline: 'Тренировка готова без сети',
    fantasy: 'Глава в мире фантазии',
    chapterDone: 'Глава пройдена',
    nextHint: 'Полная энергия, три жизни и новый берег.',
  },
}
const valid = (v) => v === 'ru' || v === 'en'
export function preference(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}
export function savePreference(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* In-memory settings still work. */
  }
}
const query = new URLSearchParams(location.search).get('lang'),
  saved = preference('seal_run_lang', '')
let language = valid(query)
  ? query
  : valid(saved)
    ? saved
    : navigator.language.toLowerCase().startsWith('ru')
      ? 'ru'
      : 'en'
export const lang = () => language
export const t = (key) => STRINGS[language][key] ?? STRINGS.en[key] ?? key
export function applyLanguage() {
  document.documentElement.lang = language
  document.title = t('title')
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n)
  })
  document.querySelectorAll('[data-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.label))
    el.title = t(el.dataset.label)
  })
  document
    .querySelectorAll('[data-lang]')
    .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.lang === language)))
  for (const el of document.querySelectorAll('[data-legal]'))
    el.href = '/' + language + '/' + el.dataset.legal
}
export function setLanguage(value, persist = false) {
  if (!valid(value)) return
  language = value
  if (persist) savePreference('seal_run_lang', value)
  applyLanguage()
  document.dispatchEvent(new Event('sealrun:language'))
}
applyLanguage()
