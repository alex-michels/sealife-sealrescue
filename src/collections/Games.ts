import type { CollectionConfig } from 'payload'
import { readPublishedOrStaff, canCreateContent, canUpdateContent, isEditor } from '../access/roles'
import { forceAgentDrafts } from '../hooks/contentHooks'

/**
 * Мини-игры (sealife.info). Отдельная коллекция: у игры свой набор полей (встраиваемый
 * фрейм, «как играть», заставка), которых нет у статьи/квиза.
 *
 * Локализация: ru — исходная, en — перевод (как у Content/Species). slug НЕ локализуется
 * (canonical, общий для локалей). drafts + forceAgentDrafts = human-in-the-loop: агент может
 * предложить черновик, но не опубликовать и не удалить (CLAUDE.md §1).
 *
 * Сама игра (HTML/CSS/JS) лежит в /public/games/<...> и встраивается по `embed`-пути;
 * язык интерфейса игры передаётся фронтендом через ?lang=<locale>.
 */
export const Games: CollectionConfig = {
  slug: 'games',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'showCover', '_status', 'updatedAt'],
    description: 'Мини-игры (sealife.info).',
  },
  versions: { drafts: true },
  access: {
    read: readPublishedOrStaff,
    create: canCreateContent,
    update: canUpdateContent,
    delete: isEditor, // агент удалять не может
  },
  hooks: { beforeChange: [forceAgentDrafts] },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Canonical slug — общий для локалей (/ru/games/slug, /en/games/slug).' },
    },
    { name: 'excerpt', type: 'textarea', localized: true },
    {
      name: 'how',
      type: 'textarea',
      localized: true,
      admin: { description: '«Как играть»: управление и цель — текстом вне canvas (доступность).' },
    },
    {
      name: 'embed',
      type: 'text',
      admin: {
        description:
          'Путь к встроенной статической игре из /public (напр. /games/seal-hunt-v1/index.html). ' +
          'Язык игры подставляется автоматически (?lang=). Пусто — пока без играбельного фрейма.',
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Обложка игры: карточка в списке игр и (при showCover) заставка на странице. ' +
          'Пусто — декоративный плейсхолдер. Отдача через CDN/geo — M0-T04.',
      },
    },
    {
      name: 'showCardCover',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        condition: (data) => Boolean(data?.coverImage),
        description:
          'Показывать загруженную обложку на КАРТОЧКЕ в списке игр. Выкл — плейсхолдер (картинка сохраняется).',
      },
    },
    {
      name: 'showCover',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Показывать картинку-заставку над игрой на её странице. Выкл — сразу крупный игровой фрейм.',
      },
    },
    {
      name: 'coverSeed',
      type: 'number',
      admin: {
        condition: (data) => Boolean(data?.showCover),
        description: 'Вариант декоративной заставки (меняет оттенок). Любое целое число.',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Порядок в списке игр: меньше — выше.' },
    },
  ],
}
