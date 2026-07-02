import type { GlobalConfig } from 'payload'
import { isEditor } from '../access/roles'
import { sectionDefs } from '../site/sections'

/**
 * Редактируемый контент разделов (M1-T27): editor переопределяет title/intro/обложку
 * карточек разделов из админки, НЕ трогая роутинг.
 *
 * СТРУКТУРА разделов (slug/site/nav/hasDetail) живёт ТОЛЬКО в коде
 * (src/site/sections.ts) — единственный источник правды для роутинга и route-guard'ов.
 * Здесь — global (не коллекция): `section` — select с опциями из sectionDefs (не
 * свободный ввод), рендер накладывает overrides по slug с fallback'ом на код при
 * пустом значении (src/site/sectionContent.ts). БД может только дополнять,
 * не создавать/ломать разделы — рассинхрон невозможен.
 *
 * Локализация: title/intro — native localized (все контент-локали: ru/en/de).
 * Пустая локаль НЕ фолбэчится на ru — берётся значение из кода (fallbackLocale: false
 * при чтении). Обложка одна на раздел (не per-locale); отдаётся через media
 * (CDN/geo-варианты — M0-T04).
 */
export const SectionContent: GlobalConfig = {
  slug: 'section-content',
  label: 'Контент разделов',
  admin: {
    description:
      'Переопределения заголовка/лида/обложки разделов. Пустое поле = значение из кода. ' +
      'Сами разделы (маршруты) добавляются только в коде.',
  },
  // У globals нет create/delete — только read/update. Агент не редактирует (isEditor).
  access: {
    read: () => true,
    update: isEditor,
  },
  fields: [
    {
      name: 'overrides',
      type: 'array',
      admin: { description: 'Не больше одной записи на раздел (лишние игнорируются рендером).' },
      fields: [
        {
          name: 'section',
          type: 'select',
          required: true,
          options: sectionDefs.map((s) => ({ value: s.slug, label: `${s.site}: ${s.slug}` })),
        },
        { name: 'title', type: 'text', localized: true, admin: { description: 'H1 страницы раздела. Пусто — из кода.' } },
        {
          name: 'intro',
          type: 'textarea',
          localized: true,
          admin: { description: 'Лид-абзац раздела и текст карточки в хабе. Пусто — из кода.' },
        },
        {
          name: 'cover',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Обложка карточки раздела в хабе на главной. Пусто — карточка без картинки.' },
        },
      ],
    },
  ],
}
