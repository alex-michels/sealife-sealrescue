import type { CollectionConfig } from 'payload'
import { readPublishedOrStaff, canCreateContent, canUpdateContent, isEditor } from '../access/roles'
import { forceAgentDrafts, trackTranslationStatus, stampPublishedAt } from '../hooks/contentHooks'
import { topicSelectOptions } from '../content/topics'
import { provenanceField, sourcesField } from '../fields/provenance'
import { adminPreview } from '../preview/adminPreview'

export const Content: CollectionConfig = {
  slug: 'content',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', '_status', 'translationStatus', 'publishedAt', 'updatedAt'],
    description: 'Статьи, новости, мемы, страницы (sealife.info).',
    preview: adminPreview('content'), // CR-08
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
    beforeChange: [forceAgentDrafts, trackTranslationStatus, stampPublishedAt],
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
      // CR-05: дата ВЫХОДА материала. НЕ локализована: оригинал и перевод — один материал,
      // вышедший один раз. Ставится автоматически при первой публикации и больше не двигается;
      // выставленное вручную значение автоматика не перетирает (перенос старого материала,
      // отложенная публикация). См. src/content/publishedAt.ts.
      name: 'publishedAt',
      type: 'date',
      index: true, // по нему сортируются лента главной и все списки
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Дата выхода. Ставится сама при первой публикации; менять только если материал реально вышел в другой день.',
      },
    },
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
      // CR-15: сводка по переводам — колонка в списке. Массив `localeStatus` колонкой быть не
      // может, а без сводки «что осталось перевести» пришлось бы открывать документы по одному.
      // Заполняется хуком; редактировать руками нечего.
      name: 'translationStatus',
      type: 'select',
      index: true,
      // Без defaultValue сознательно: документы, созданные до CR-15, показывают ПУСТО, пока их не
      // сохранят. Пустое поле ничего не утверждает, а `missing` по умолчанию соврал бы про
      // переведённые материалы — то есть повторил бы ровно ту ошибку, ради которой всё чинилось.
      options: [
        { label: 'Переведено', value: 'current' },
        { label: 'Устарел', value: 'stale' },
        { label: 'Нужна проверка', value: 'review' },
        { label: 'Нет перевода', value: 'missing' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Состояние перевода. По этому полю фильтруется список: что осталось перевести.',
      },
    },
    {
      name: 'localeStatus',
      type: 'array',
      admin: {
        readOnly: true,
        description:
          'Актуальность перевода по локалям (CR-15). Заполняется автоматически: sourceHash — версия ' +
          'исходника, от которой сделан перевод. Устаревший перевод со страницы не убирается, ' +
          'это пометка для редактора.',
      },
      fields: [
        { name: 'locale', type: 'text' },
        { name: 'status', type: 'select', options: ['current', 'stale', 'review', 'missing'] },
        { name: 'sourceHash', type: 'text' },
        { name: 'translatedAt', type: 'date' },
      ],
    },
  ],
}
