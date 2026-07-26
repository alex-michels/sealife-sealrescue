/**
 * Единый источник правды о локалях (masterplan §7: «locale — это конфиг»).
 *
 * Этот модуль НЕ импортирует payload/next — он подключается из payload.config,
 * хуков, middleware (edge runtime) и серверных компонентов. Держать его без
 * тяжёлых зависимостей.
 *
 * Список локалей — единственный «рубильник»: добавить/убрать локаль = одна строка ниже
 * + подпись в localeLabels. Это автоматически обновляет: локали Payload, целевые локали
 * перевода (хуки), редирект middleware, статические параметры маршрутов и hreflang.
 */
export const locales = ['ru', 'en'] as const

export type Locale = (typeof locales)[number]

/** Исходная локаль (masterplan §3, контент пишется на ru). Для Payload и фолбэка перевода. */
export const defaultLocale: Locale = 'ru'

/**
 * Локаль для посетителей, чей язык мы НЕ поддерживаем, и для запросов без
 * Accept-Language. НЕ путать с defaultLocale.
 * Политика: русскоязычные → ru, все остальные → en.
 */
export const fallbackLocale: Locale = 'en'

/** Целевые локали перевода = всё, кроме исходной. */
export const targetLocales: Locale[] = locales.filter((l) => l !== defaultLocale)

/** Человекочитаемые подписи (для admin Payload и переключателя языка). */
export const localeLabels: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
}

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value)

/**
 * Legal-only локали: НЕ контент-локали, роутятся ТОЛЬКО под legal-страницы.
 *
 * `de` остаётся исключительно ради немецкоязычных Impressum/Datenschutz: оператор
 * находится в Германии, и обязанность по §5 DDG / §18 MStV не зависит от того, на каких
 * языках сайт. Немецкого КОНТЕНТА нет: `/de/articles`, `/de/species`, `/de/<slug>` и любой
 * другой контентный роут отдают 404 (страницы валидируют `isLocale`, а не `isRouteLocale`).
 *
 * ⚠️ Временное состояние: решение «оставлять ли DE-версии legal вообще» отложено до
 * юридической консультации (Roadmap **EU-06**). После неё — либо убрать `de` отсюда совсем,
 * либо зафиксировать как постоянное. См. `docs/COMPLIANCE_EU_DE.md`.
 */
export const legalOnlyLocales = ['de'] as const

/** Все локали, которые вообще могут стоять префиксом в URL (контентные + legal-only). */
export const routeLocales = [...locales, ...legalOnlyLocales] as const

export type RouteLocale = (typeof routeLocales)[number]

export const isRouteLocale = (value: string): value is RouteLocale =>
  (routeLocales as readonly string[]).includes(value)

/**
 * Локаль «обвязки» страницы (header/nav/баннер согласия) для произвольного route-локаля.
 * На немецкой legal-странице сам текст немецкий, а интерфейс сайта — на фолбэке (en),
 * потому что немецких UI-строк и немецкого контента больше нет.
 */
export const chromeLocale = (value: RouteLocale): Locale =>
  isLocale(value) ? value : fallbackLocale
