import type { Locale } from './config'

/** BCP-47 теги по локали (день-месяц-год во всех трёх). */
const bcp47: Record<Locale, string> = { ru: 'ru-RU', en: 'en-GB' }

/** Локализованная дата (длинный формат). */
export function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(bcp47[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
