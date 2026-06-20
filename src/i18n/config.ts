/**
 * Единый источник правды о локалях (masterplan §7: «locale — это конфиг»).
 *
 * Этот модуль НЕ импортирует payload/next — он подключается из payload.config,
 * хуков, middleware (edge runtime) и серверных компонентов. Держать его без
 * тяжёлых зависимостей.
 *
 * Добавить DE позже = ОДНА строка ниже ('de') + подпись в localeLabels.
 * Это автоматически обновит: локали Payload, целевые локали перевода (хуки),
 * редирект middleware, статические параметры маршрутов и hreflang.
 */
export const locales = ['ru', 'en'] as const // + 'de' — одной строкой

export type Locale = (typeof locales)[number]

/** Исходная локаль (masterplan §3, контент пишется на ru). Для Payload и фолбэка перевода. */
export const defaultLocale: Locale = 'ru'

/**
 * Локаль для посетителей, чей язык мы НЕ поддерживаем (напр. немецкий), и для
 * запросов без Accept-Language. НЕ путать с defaultLocale.
 * Политика: русскоязычные → ru, все остальные → en.
 */
export const fallbackLocale: Locale = 'en'

/** Целевые локали перевода = всё, кроме исходной. */
export const targetLocales: Locale[] = locales.filter((l) => l !== defaultLocale)

/** Человекочитаемые подписи (для admin Payload и переключателя языка). */
export const localeLabels: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  // de: 'Deutsch',
}

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value)
