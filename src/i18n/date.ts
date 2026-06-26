import type { Locale } from './config'

/** Локализованная дата (длинный формат). ru → ru-RU, en → en-GB (день-месяц-год). */
export function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
