import type { Locale } from '@/i18n/config'
import type { SiteId } from '@/site/config'

/**
 * Микрокопия design-mock (M0-T19). Держим ОТДЕЛЬНО от `i18n/ui.ts`: это временные
 * подписи sample-оболочки; когда придёт реальный контент (M1/M2), модуль заменяется,
 * а `ui.ts` остаётся чистым. Тон различается по сайту (DESIGN_BRIEF §8).
 */
type Dict = {
  mockNotice: string
  backHome: string
  readMore: string
  start: string
  // состояния (DESIGN_BRIEF §4c/§8) — тон зависит от сайта
  empty: Record<SiteId, string>
  error: Record<SiteId, string>
  retry: string
  loading: string
  // демо-переключатель состояний (только в моке)
  stateLabel: string
  statePopulated: string
  stateEmpty: string
  stateLoading: string
  stateError: string
  // rescue
  filters: string
  filterAll: string
  resultsCount: (n: number) => string
  mapToggle: string
  mapPlaceholder: string
  call: string
  website: string
  route: string
  reportIssue: string
  distanceUnknown: string
  // report-форма (без email, COMPLIANCE)
  formNick: string
  formNickHint: string
  formMessage: string
  formSubmit: string
  formNoEmail: string
  formContactHint: string
  formContactLink: string
  formDone: string
  // квест
  questRestart: string
  questResult: string
}

const ru: Dict = {
  mockNotice: 'Демо-режим: образцы данных, не настоящие записи. Контент появится в M1–M2.',
  backHome: '← На главную',
  readMore: 'Читать →',
  start: 'Начать →',
  empty: {
    sealife: 'Тут пока тихо, как тюлень после обеда.',
    sealrescue: 'Данных пока нет. Проверьте соседний регион или сообщите об ошибке.',
  },
  error: {
    sealife: 'Что-то утонуло. Перезагрузим?',
    sealrescue: 'Не удалось загрузить данные. Обновите страницу или откройте список центров.',
  },
  retry: 'Обновить',
  loading: 'Загружаем…',
  stateLabel: 'Состояние (демо):',
  statePopulated: 'С данными',
  stateEmpty: 'Пусто',
  stateLoading: 'Загрузка',
  stateError: 'Ошибка',
  filters: 'Фильтры',
  filterAll: 'Все',
  resultsCount: (n) => `Найдено: ${n}`,
  mapToggle: 'Показать на карте',
  mapPlaceholder: 'Карта появится здесь (M2). Локатор всегда list-first.',
  call: 'Позвонить',
  website: 'Сайт',
  route: 'Маршрут',
  reportIssue: 'Сообщить об ошибке',
  distanceUnknown: 'Держитесь на безопасном расстоянии — точная норма зависит от страны.',
  formNick: 'Ник в TG/VK (необязательно)',
  formNickHint: 'Только если хотите, чтобы с вами связались. Email не запрашиваем.',
  formMessage: 'Что не так или какой центр предложить',
  formSubmit: 'Отправить на модерацию',
  formNoEmail: 'Мы не собираем email — нигде, даже ради ответа (минимизация данных).',
  formContactHint: 'Нужен гарантированный ответ? Контакт оператора —',
  formContactLink: 'в правовой информации',
  formDone: 'Спасибо! Заявка уйдёт на премодерацию (демо: ничего не отправлено).',
  questRestart: 'Пройти заново',
  questResult: 'Итог',
}

const en: Dict = {
  mockNotice: 'Demo mode: sample data, not real records. Content lands in M1–M2.',
  backHome: '← Home',
  readMore: 'Read →',
  start: 'Start →',
  empty: {
    sealife: 'Quiet here — like a seal after lunch.',
    sealrescue: 'No data yet. Check a neighbouring region or report an issue.',
  },
  error: {
    sealife: 'Something sank. Reload?',
    sealrescue: 'Couldn’t load the data. Refresh the page or open the centers list.',
  },
  retry: 'Reload',
  loading: 'Loading…',
  stateLabel: 'State (demo):',
  statePopulated: 'Populated',
  stateEmpty: 'Empty',
  stateLoading: 'Loading',
  stateError: 'Error',
  filters: 'Filters',
  filterAll: 'All',
  resultsCount: (n) => `Found: ${n}`,
  mapToggle: 'Show on map',
  mapPlaceholder: 'A map will appear here (M2). The locator is always list-first.',
  call: 'Call',
  website: 'Website',
  route: 'Directions',
  reportIssue: 'Report an issue',
  distanceUnknown: 'Keep a safe distance — the exact rule depends on the country.',
  formNick: 'TG/VK handle (optional)',
  formNickHint: 'Only if you want to be contacted. We do not ask for email.',
  formMessage: 'What’s wrong, or which center to suggest',
  formSubmit: 'Send for moderation',
  formNoEmail: 'We collect no email — anywhere, not even to reply (data minimisation).',
  formContactHint: 'Need a guaranteed reply? The operator contact is',
  formContactLink: 'in the legal notice',
  formDone: 'Thanks! This would go to pre-moderation (demo: nothing was sent).',
  questRestart: 'Start over',
  questResult: 'Result',
}

const de: Dict = {
  mockNotice: 'Demo-Modus: Beispieldaten, keine echten Einträge. Inhalte folgen in M1–M2.',
  backHome: '← Startseite',
  readMore: 'Lesen →',
  start: 'Starten →',
  empty: {
    sealife: 'Hier ist es still — wie eine Robbe nach dem Mittagessen.',
    sealrescue: 'Noch keine Daten. Prüfen Sie eine Nachbarregion oder melden Sie einen Fehler.',
  },
  error: {
    sealife: 'Etwas ist abgesoffen. Neu laden?',
    sealrescue: 'Daten konnten nicht geladen werden. Seite aktualisieren oder die Zentrenliste öffnen.',
  },
  retry: 'Neu laden',
  loading: 'Lädt…',
  stateLabel: 'Zustand (Demo):',
  statePopulated: 'Mit Daten',
  stateEmpty: 'Leer',
  stateLoading: 'Laden',
  stateError: 'Fehler',
  filters: 'Filter',
  filterAll: 'Alle',
  resultsCount: (n) => `Gefunden: ${n}`,
  mapToggle: 'Auf Karte zeigen',
  mapPlaceholder: 'Eine Karte erscheint hier (M2). Der Locator ist immer list-first.',
  call: 'Anrufen',
  website: 'Website',
  route: 'Route',
  reportIssue: 'Fehler melden',
  distanceUnknown: 'Halten Sie einen sicheren Abstand — der genaue Wert hängt vom Land ab.',
  formNick: 'TG/VK-Handle (optional)',
  formNickHint: 'Nur falls Sie kontaktiert werden möchten. Wir fragen keine E-Mail ab.',
  formMessage: 'Was stimmt nicht, oder welches Zentrum vorschlagen',
  formSubmit: 'Zur Moderation senden',
  formNoEmail: 'Wir erfassen keine E-Mail — nirgends, auch nicht für eine Antwort (Datenminimierung).',
  formContactHint: 'Eine garantierte Antwort nötig? Der Betreiberkontakt steht',
  formContactLink: 'im Impressum',
  formDone: 'Danke! Dies ginge in die Vormoderation (Demo: nichts wurde gesendet).',
  questRestart: 'Neu starten',
  questResult: 'Ergebnis',
}

const dict: Record<Locale, Dict> = { ru, en, de }

export const m = (locale: Locale): Dict => dict[locale] ?? ru
