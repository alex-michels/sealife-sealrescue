import type { CollectionConfig } from 'payload'
import { readPublishedOrStaff, canCreateContent, canUpdateContent, isEditor } from '../access/roles'
import { forceAgentDrafts, markTranslationsStale } from '../hooks/contentHooks'
import { topicSelectOptions } from '../content/topics'
import { provenanceField, sourcesField } from '../fields/provenance'

export const Content: CollectionConfig = {
  slug: 'content',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', '_status', 'updatedAt'],
    description: 'Статьи, новости, мемы, страницы (sealife.info).',
  },
  // drafts = нативный статус draft/published = human-in-the-loop.
  versions: { drafts: true },
  access: {
    read: readPublishedOrStaff,
    create: canCreateContent,
    update: canUpdateContent,
    delete: isEditor, // агент удалять не может
  },
  hooks: {
    beforeChange: [forceAgentDrafts, markTranslationsStale],
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'article',
      options: [
        { label: 'Статья', value: 'article' },
        { label: 'Новость', value: 'news' },
        { label: 'Мем', value: 'meme' },
        { label: 'Страница', value: 'page' },
      ],
    },
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Canonical slug — общий для всех локалей (/ru/slug, /en/slug).' },
    },
    { name: 'excerpt', type: 'textarea', localized: true },
    { name: 'body', type: 'richText', localized: true },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    {
      name: 'topics',
      type: 'select',
      hasMany: true,
      options: topicSelectOptions,
      admin: {
        description:
          'Темы для фильтра ленты/галереи (M1-T02). slug общий для локалей; подпись локализуется в коде (content/topics.ts), НЕ в content-локализации.',
      },
    },
    {
      name: 'crossLink',
      type: 'group',
      admin: { description: 'Перелинковка sealife <-> sealrescue.' },
      fields: [
        { name: 'rescueCenter', type: 'relationship', relationTo: 'rescue-centers' },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'metaTitle', type: 'text', localized: true },
        { name: 'metaDescription', type: 'textarea', localized: true },
      ],
    },
    {
      name: 'aiGenerated',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Устаревший одиночный флаг: не различает язык, поэтому машинный перевод человеческого ' +
          'текста им не описывается. Оставлен для совместимости — заполняйте группу «provenance» ' +
          '(M1-T08/EU-11).',
      },
    },
    provenanceField(),
    sourcesField(
      'Источники, на которых основан материал. Агент, перепроверяющий факты в интернете, ' +
        'обязан их проставлять (см. docs/agents.md).',
    ),
    {
      name: 'localeStatus',
      type: 'array',
      admin: { description: 'Integrity перевода (Агент 3). Заполняется автоматически.' },
      fields: [
        { name: 'locale', type: 'text' },
        { name: 'status', type: 'select', options: ['current', 'stale', 'review'] },
        { name: 'sourceHash', type: 'text', admin: { readOnly: true } },
        { name: 'translatedAt', type: 'date' },
      ],
    },
  ],
}
