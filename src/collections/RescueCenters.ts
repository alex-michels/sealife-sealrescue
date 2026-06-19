import type { CollectionConfig } from 'payload'
import { isEditor } from '../access/roles'

export const RescueCenters: CollectionConfig = {
  slug: 'rescue-centers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'country', 'status', 'lastCheckedAt', 'verificationScore'],
    description: 'Каталог реабилитационных центров (sealrescue.info). Поддерживается Агентом-1.',
  },
  access: {
    read: () => true, // публичный справочник
    // Агенты НЕ пишут в прод напрямую (CLAUDE.md §1–2): изменения центров идут
    // через agent-proposals → ревью человека. Прямая запись — только людям-редакторам.
    create: isEditor,
    update: isEditor,
    delete: isEditor,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'НЕ переводится — имя центра одинаково во всех локалях (правило глоссария).' },
    },
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      type: 'row',
      fields: [
        { name: 'country', type: 'text', required: true },
        { name: 'region', type: 'text' },
      ],
    },
    { name: 'website', type: 'text' },
    {
      type: 'row',
      fields: [
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
      ],
    },
    { name: 'address', type: 'textarea' },
    { name: 'location', type: 'point', label: 'Координаты [lng, lat]' },
    {
      name: 'socialLinks',
      type: 'array',
      labels: { singular: 'Соцсеть', plural: 'Соцсети' },
      admin: { description: 'Соцсети центра: Instagram / Facebook / TikTok / LinkedIn / YouTube / VK / Telegram / X.' },
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: ['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'vk', 'telegram', 'x', 'other'],
        },
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'operatingLanguages',
      type: 'select',
      hasMany: true,
      options: ['ru', 'en', 'de', 'other'],
    },
    { name: 'description', type: 'richText', localized: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'needs_check',
      options: [
        { label: 'Активен', value: 'active' },
        { label: 'Не подтверждён', value: 'unconfirmed' },
        { label: 'Ссылка сломана', value: 'link_broken' },
        { label: 'Требует проверки', value: 'needs_check' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'verificationScore', type: 'number', min: 0, max: 1 },
        { name: 'lastCheckedAt', type: 'date' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'verifiedByAgentAt', type: 'date', admin: { description: 'Показываем на странице: «Проверено агентом».' } },
        { name: 'verifiedByHumanAt', type: 'date', admin: { description: 'Показываем на странице: «Проверено человеком».' } },
      ],
    },
    { name: 'sources', type: 'relationship', relationTo: 'sources', hasMany: true },
  ],
}
