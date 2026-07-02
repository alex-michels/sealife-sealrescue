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
  | 'crossRescueCurious'
  | 'crossRescueCuriousCta'
  | 'backHome'
  // 404 (микрокопия различается по сайту — бриф §7)
  | 'notFoundTitle'
  | 'notFoundBodyLife'
  | 'notFoundBodyRescue'
  | 'filterAll'
  | 'filterByTopic'
  | 'factOfDay'
  | 'speciesRange'
  | 'speciesLength'
  | 'speciesConservation'
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
    crossRescueCurious: 'А как вообще спасают тюленей?',
    crossRescueCuriousCta: 'Узнать →',
    backHome: '← На главную',
    notFoundTitle: 'Страница не найдена',
    notFoundBodyLife: 'Эта страница уплыла — или её никогда и не было.',
    notFoundBodyRescue:
      'Такой страницы нет. Проверьте адрес или вернитесь на главную — там есть инструкция «нашёл тюленя» и список разделов.',
    filterAll: 'Все',
    filterByTopic: 'Фильтр по теме',
    factOfDay: 'Факт дня',
    speciesRange: 'Ареал',
    speciesLength: 'Размер',
    speciesConservation: 'Охранный статус',
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
    crossRescueCurious: 'How are seals actually rescued?',
    crossRescueCuriousCta: 'Find out →',
    backHome: '← Home',
    notFoundTitle: 'Page not found',
    notFoundBodyLife: 'This page swam away — or maybe it never existed.',
    notFoundBodyRescue:
      'This page does not exist. Check the address or return to the start page — it has the "found a seal" guide and all sections.',
    filterAll: 'All',
    filterByTopic: 'Filter by topic',
    factOfDay: 'Fact of the day',
    speciesRange: 'Range',
    speciesLength: 'Size',
    speciesConservation: 'Conservation status',
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
  de: {
    latest: 'Frisches',
    empty: 'Hier ist es still — wie eine Robbe nach dem Mittagessen.',
    aiGenerated: 'Mit KI-Unterstützung erstellt.',
    language: 'Sprache',
    crossRescue: 'Eine Robbe gefunden? Kein Spaß.',
    crossRescueCta: 'Was tun →',
    crossRescueCurious: 'Wie werden Robben eigentlich gerettet?',
    crossRescueCuriousCta: 'Erfahren →',
    backHome: '← Startseite',
    notFoundTitle: 'Seite nicht gefunden',
    notFoundBodyLife: 'Diese Seite ist davongeschwommen — oder es gab sie nie.',
    notFoundBodyRescue:
      'Diese Seite existiert nicht. Prüfen Sie die Adresse oder kehren Sie zur Startseite zurück — dort finden Sie die Anleitung „Robbe gefunden“ und alle Bereiche.',
    filterAll: 'Alle',
    filterByTopic: 'Nach Thema filtern',
    factOfDay: 'Fakt des Tages',
    speciesRange: 'Verbreitung',
    speciesLength: 'Größe',
    speciesConservation: 'Schutzstatus',
    rescueHeadline: 'Eine Robbe am Strand gefunden?',
    rescueStep1: 'Halten Sie Abstand.',
    rescueStep2: 'Halten Sie Hunde fern — an der Leine oder weit weg.',
    rescueStep3: 'Nicht anfassen und nicht füttern.',
    rescueStep4: 'Beurteilen Sie den Zustand aus der Entfernung.',
    rescueDistance:
      'Halten Sie einen sicheren Abstand. Der genaue Wert hängt vom Land und den örtlichen Vorschriften ab.',
    rescueCta: 'Zentren in der Nähe finden →',
    centersTitle: 'Zentren in der Nähe',
    centersSoon: 'Das Verzeichnis der Rehabilitationszentren erscheint hier (M2).',
    crossLife: 'Genug vom Ernst?',
    crossLifeCta: 'Zu den Robben →',
    consentTitle: 'Einwilligung in die Analyse',
    consentText:
      'Wir nutzen Plausible — datenschutzfreundliche Analyse ohne Cookies. Sie erfasst keine personenbezogenen Daten, identifiziert Sie nicht und gibt nichts an Dritte weiter. Analyse aktivieren?',
    consentMore: 'Mehr erfahren',
    consentAccept: 'Akzeptieren',
    consentDecline: 'Ablehnen',
    footerCookies: 'Cookie-Einstellungen',
    cookiesTitle: 'Analyse & Cookies',
    cookiesIntro:
      'Diese Website nutzt Plausible Analytics — einen datenschutzfreundlichen Analysedienst. Er verwendet keine Cookies, erfasst keine personenbezogenen Daten und identifiziert keine Besucher. Zugriffsdaten werden aggregiert verarbeitet und nicht an Dritte weitergegeben.',
    cookiesPlausible:
      'Die Analyse wird nur mit Ihrer ausdrücklichen Einwilligung aktiviert (Opt-in): Das Skript wird vor Ihrer Zustimmung nicht geladen. Ihre Einwilligung wird in einem unbedingt erforderlichen Cookie gespeichert.',
    cookiesWithdraw:
      'Sie können Ihre Entscheidung jederzeit unten ändern oder widerrufen — so einfach wie die Einwilligung.',
    cookiesStatusLabel: 'Aktuelle Auswahl:',
    cookiesGranted: 'Analyse aktiviert',
    cookiesDenied: 'Analyse deaktiviert',
    cookiesNone: 'nicht festgelegt',
    cookiesEnable: 'Analyse aktivieren',
    cookiesDisable: 'Analyse deaktivieren',
  },
}

export const t = (locale: Locale, key: UIKey): string => dict[locale]?.[key] ?? dict.ru[key]
