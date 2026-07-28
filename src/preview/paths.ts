import { isLocale, type Locale } from '@/i18n/config'

/**
 * Пути предпросмотра черновиков (Roadmap **CR-08**).
 *
 * ## Что было сломано
 * Ни `admin.preview`, ни `draftMode()`, ни `draft: true` — ни в одном запросе. Вместе с BIO-16
 * (всё сеется черновиком) и published-only публичными чтениями редакторский цикл выглядел так:
 * написал в админке → **опубликовал** → посмотрел на живом сайте → починил. То есть публикация
 * использовалась как способ посмотреть, а инвариант №1 говорит, что публикация — осознанное
 * человеческое действие, а не кнопка «показать».
 *
 * ## Почему отдельный модуль
 * Здесь чистая часть: какой URL у предпросмотра и какой путь вообще допустим. Она не знает ни про
 * Payload, ни про Next, поэтому проверяется unit-тестом — а это ровно то место, где ошибка стоит
 * дорого: слабая проверка пути превращает эндпоинт в открытый редирект.
 */

/** Коллекции, у которых есть публичная деталь и, значит, есть что предпросматривать. */
export const previewable = {
  content: (slug: string, locale: Locale) => `/${locale}/${slug}`,
  species: (slug: string, locale: Locale) => `/${locale}/species/${slug}`,
} as const

export type PreviewableCollection = keyof typeof previewable

export const isPreviewable = (value: string): value is PreviewableCollection =>
  Object.prototype.hasOwnProperty.call(previewable, value)

/** Путь публичной страницы документа, или null — если предпросматривать нечего. */
export function previewPath(
  collection: string,
  slug: string | null | undefined,
  locale: string,
): string | null {
  if (!isPreviewable(collection)) return null
  if (!slug) return null // черновик без slug ещё не имеет адреса
  if (!isLocale(locale)) return null
  return previewable[collection](slug, locale)
}

/**
 * Проверка пути, пришедшего в эндпоинт извне.
 *
 * ⚠️ Это защита от **открытого редиректа**: без неё `/api/preview?path=https://evil.example`
 * увёл бы пользователя на чужой сайт с нашего домена, да ещё и с включённым draft-режимом.
 * Поэтому принимаем только относительный путь: начинается с одного `/`, без схемы, без хоста и
 * без `\` (его некоторые парсеры URL трактуют как `/`, и `//evil.example` стало бы абсолютным).
 */
export function safeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/')) return null
  if (raw.startsWith('//')) return null
  if (raw.includes('\\')) return null
  if (raw.includes('://')) return null
  return raw
}
