import type { CollectionConfig } from 'payload'
import { defaultLocale, isLocale } from '@/i18n/config'
import { previewPath, type PreviewableCollection } from './paths'

/**
 * Кнопка «Preview» в админке Payload (**CR-08**).
 *
 * Возвращает ссылку на наш эндпоинт `/api/preview`, а не прямо на страницу: именно он проверяет
 * сессию сотрудника и включает draft-режим. Ссылка прямо на страницу показала бы черновик только
 * тому, у кого draft-режим уже включён, — то есть выглядела бы сломанной.
 *
 * Локаль берётся из контекста админки (редактор смотрит ту версию, которую правит); если она
 * почему-то не пришла или не является контент-локалью — исходная.
 */
export function adminPreview(
  collection: PreviewableCollection,
): NonNullable<NonNullable<CollectionConfig['admin']>['preview']> {
  return (doc, { locale }) => {
    const requested = typeof locale === 'string' && isLocale(locale) ? locale : defaultLocale
    const slug = typeof doc?.slug === 'string' ? doc.slug : null
    const path = previewPath(collection, slug, requested)
    // null → Payload не покажет кнопку. Черновику без slug показывать нечего.
    return path ? `/api/preview?path=${encodeURIComponent(path)}` : null
  }
}
