import type { CollectionConfig } from 'payload'
import { isEditor, isLoggedIn, canCreateContent, canUpdateContent } from '../access/roles'

export const Sources: CollectionConfig = {
  slug: 'sources',
  admin: {
    useAsTitle: 'url',
    defaultColumns: ['url', 'type', 'trustLevel', 'lastFetchedAt'],
    description: 'Источники для фактчекинга. trustLevel = allowlist (OWASP).',
  },
  access: {
    read: isLoggedIn,
    create: canCreateContent,
    update: canUpdateContent,
    delete: isEditor,
  },
  fields: [
    { name: 'url', type: 'text', required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Официальный', value: 'official' },
        { label: 'Новости', value: 'news' },
        { label: 'Соцсети', value: 'social' },
        { label: 'Ручной', value: 'manual' },
      ],
    },
    {
      name: 'trustLevel',
      type: 'number',
      min: 0,
      max: 1,
      defaultValue: 0.5,
      admin: { description: 'Официальным источникам — высокий trust; для критичных данных используем allowlist.' },
    },
    { name: 'lastFetchedAt', type: 'date' },
    { name: 'notes', type: 'textarea' },
  ],
}
