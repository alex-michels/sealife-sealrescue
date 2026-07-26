import type { CollectionConfig } from 'payload'
import { readPublishedOrStaff, canCreateContent, canUpdateContent, isEditor } from '../access/roles'
import { forceAgentDrafts } from '../hooks/contentHooks'
import { provenanceField, sourcesField } from '../fields/provenance'
import { conservationAssessmentField } from '../fields/conservation'

/**
 * «Тюленепедия» (M1-T03): карточки видов ластоногих для sealife.info.
 *
 * Отдельная коллекция (не Content type=species): у вида свой набор полей
 * (латынь, ареал, размер, факты, охранный статус), которых нет у статьи/новости.
 *
 * Локализация: ru — исходная, en — перевод (как у Content). latin НЕ локализуется
 * (научное имя одинаково во всех локалях — правило глоссария). drafts + forceAgentDrafts =
 * human-in-the-loop: агент может предложить черновик, но не опубликовать (CLAUDE.md §1).
 */
export const Species: CollectionConfig = {
  slug: 'species',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'latin', 'conservationStatus', '_status', 'updatedAt'],
    description: 'Виды ластоногих (Тюленепедия, sealife.info).',
  },
  versions: { drafts: true },
  access: {
    read: readPublishedOrStaff,
    create: canCreateContent,
    update: canUpdateContent,
    delete: isEditor, // агент удалять не может
  },
  hooks: {
    // Только human-in-the-loop (агент → черновик). Трекинг integrity перевода
    // (localeStatus, как в Content) подключим вместе с провенансом в M1-T08/EU-11.
    beforeChange: [forceAgentDrafts],
  },
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Canonical slug — общий для локалей (/ru/species/slug, /en/species/slug).' },
    },
    {
      name: 'latin',
      type: 'text',
      required: true,
      admin: { description: 'Научное (латинское) имя. НЕ переводится (правило глоссария).' },
    },
    {
      name: 'conservationStatus',
      type: 'select',
      admin: { description: 'Охранный статус IUCN. Подпись локализуется в UI.' },
      options: [
        { label: 'LC — вызывающие наименьшие опасения', value: 'LC' },
        { label: 'NT — близкие к уязвимому', value: 'NT' },
        { label: 'VU — уязвимые', value: 'VU' },
        { label: 'EN — вымирающие', value: 'EN' },
        { label: 'CR — на грани исчезновения', value: 'CR' },
        { label: 'DD — недостаточно данных', value: 'DD' },
      ],
    },
    conservationAssessmentField(),
    {
      type: 'row',
      fields: [
        { name: 'region', type: 'text', localized: true, admin: { description: 'Ареал.' } },
        { name: 'size', type: 'text', localized: true, admin: { description: 'Размер, напр. «≈ 1.3 м».' } },
      ],
    },
    { name: 'excerpt', type: 'textarea', localized: true },
    { name: 'body', type: 'richText', localized: true },
    {
      name: 'facts',
      type: 'array',
      labels: { singular: 'Факт', plural: 'Факты' },
      admin: { description: 'Короткие факты. Используются на карточке вида и в «Факте дня».' },
      fields: [{ name: 'text', type: 'text', required: true, localized: true }],
    },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    {
      name: 'aiGenerated',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Устаревший одиночный флаг: не различает язык. Заполняйте группу «provenance» ' +
          '(M1-T08/EU-11).',
      },
    },
    provenanceField(),
    sourcesField(
      'Источники по виду (Red List, справочники, публикации). Обязательны для утверждений ' +
        'о статусе и биологии — см. BIO-13/BIO-14.',
    ),
  ],
}
