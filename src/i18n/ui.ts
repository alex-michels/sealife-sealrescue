import type { Locale } from './config'

/**
 * Строки интерфейса фронтенда. Контент (статьи/мемы) хранится в Payload и
 * переводится заранее; здесь только статичные подписи UI.
 * Бренд и tagline у каждого сайта свои — см. `src/site/config.ts`.
 *
 * При добавлении локали TypeScript потребует заполнить все ключи — намеренно,
 * чтобы перевод интерфейса не забыли.
 */
type UIKey =
  // sealife
  | 'latest'
  | 'empty'
  | 'aiGenerated'
  | 'language'
  | 'crossRescue'
  | 'crossRescueCta'
  // sealrescue
  | 'rescueHeadline'
  | 'rescueStep1'
  | 'rescueStep2'
  | 'rescueStep3'
  | 'rescueStep4'
  | 'rescueDistance'
  | 'rescueCta'
  | 'centersTitle'
  | 'centersSoon'
  | 'crossLife'
  | 'crossLifeCta'
  // согласие на аналитику / cookie
  | 'consentTitle'
  | 'consentText'
  | 'consentMore'
  | 'consentAccept'
  | 'consentDecline'
  | 'footerCookies'
  | 'cookiesTitle'
  | 'cookiesIntro'
  | 'cookiesPlausible'
  | 'cookiesWithdraw'
  | 'cookiesStatusLabel'
  | 'cookiesGranted'
  | 'cookiesDenied'
  | 'cookiesNone'
  | 'cookiesEnable'
  | 'cookiesDisable'

const dict: Record<Locale, Record<UIKey, string>> = {
  ru: {
    latest: 'Свежее',
    empty: 'Тут пока тихо, как тюлень после обеда.',
    aiGenerated: 'Подготовлено с участием AI.',
    language: 'Язык',
    crossRescue: 'Нашёл тюленя? Это не шутки.',
    crossRescueCta: 'Что делать →',
    rescueHeadline: 'Нашёл тюленя на берегу?',
    rescueStep1: 'Не подходите близко.',
    rescueStep2: 'Уберите собак — на поводок или подальше.',
    rescueStep3: 'Не трогайте и не кормите.',
    rescueStep4: 'Оцените состояние с расстояния.',
    rescueDistance: 'Держитесь на безопасном расстоянии. Точная норма зависит от страны и местных правил.',
    rescueCta: 'Найти центры рядом →',
    centersTitle: 'Центры рядом',
    centersSoon: 'Каталог реабилитационных центров появится здесь (M2).',
    crossLife: 'Устали от серьёзного?',
    crossLifeCta: 'К тюленям →',
    consentTitle: 'Согласие на аналитику',
    consentText:
      'Мы используем Plausible — приватную аналитику без cookies. Она не собирает персональные данные, не идентифицирует вас и не передаёт данные третьим лицам. Включить аналитику?',
    consentMore: 'Подробнее',
    consentAccept: 'Принять',
    consentDecline: 'Отклонить',
    footerCookies: 'Настройки cookie',
    cookiesTitle: 'Аналитика и cookie',
    cookiesIntro:
      'Сайт использует Plausible Analytics — приватный аналитический сервис. Он не использует cookies, не собирает персональные данные и не идентифицирует посетителей. Данные о посещаемости обрабатываются в агрегированном виде и не передаются третьим лицам.',
    cookiesPlausible:
      'Аналитика включается только с вашего явного согласия (opt-in): до согласия скрипт не загружается. Ваш выбор согласия хранится в строго необходимом cookie.',
    cookiesWithdraw:
      'Вы можете в любой момент изменить или отозвать своё решение ниже — это так же просто, как дать согласие.',
    cookiesStatusLabel: 'Текущий выбор:',
    cookiesGranted: 'аналитика включена',
    cookiesDenied: 'аналитика отключена',
    cookiesNone: 'не задан',
    cookiesEnable: 'Включить аналитику',
    cookiesDisable: 'Отключить аналитику',
  },
  en: {
    latest: 'Latest',
    empty: 'Quiet here — like a seal after lunch.',
    aiGenerated: 'Prepared with AI assistance.',
    language: 'Language',
    crossRescue: 'Found a seal? This is no joke.',
    crossRescueCta: 'What to do →',
    rescueHeadline: 'Found a seal on the beach?',
    rescueStep1: 'Keep your distance.',
    rescueStep2: 'Keep dogs away — on a leash or far off.',
    rescueStep3: 'Do not touch or feed it.',
    rescueStep4: 'Assess its condition from a distance.',
    rescueDistance: 'Keep a safe distance. The exact rule depends on the country and local regulations.',
    rescueCta: 'Find centers nearby →',
    centersTitle: 'Centers nearby',
    centersSoon: 'The directory of rehabilitation centers will appear here (M2).',
    crossLife: 'Tired of the serious stuff?',
    crossLifeCta: 'To the seals →',
    consentTitle: 'Analytics consent',
    consentText:
      'We use Plausible — privacy-friendly analytics without cookies. It collects no personal data, does not identify you, and shares nothing with third parties. Enable analytics?',
    consentMore: 'Learn more',
    consentAccept: 'Accept',
    consentDecline: 'Decline',
    footerCookies: 'Cookie settings',
    cookiesTitle: 'Analytics & cookies',
    cookiesIntro:
      'This site uses Plausible Analytics — a privacy-friendly analytics service. It uses no cookies, collects no personal data, and does not identify visitors. Traffic data is processed in aggregate and never shared with third parties.',
    cookiesPlausible:
      'Analytics is enabled only with your explicit consent (opt-in): the script is not loaded before you agree. Your consent choice is stored in a strictly necessary cookie.',
    cookiesWithdraw:
      'You can change or withdraw your decision at any time below — it is as easy as giving consent.',
    cookiesStatusLabel: 'Current choice:',
    cookiesGranted: 'analytics enabled',
    cookiesDenied: 'analytics disabled',
    cookiesNone: 'not set',
    cookiesEnable: 'Enable analytics',
    cookiesDisable: 'Disable analytics',
  },
}

export const t = (locale: Locale, key: UIKey): string => dict[locale]?.[key] ?? dict.ru[key]
