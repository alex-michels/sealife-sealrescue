import type { CollectionConfig } from 'payload'
import { isEditor, isLoggedIn, canCreateContent, canUpdateContent } from '../access/roles'

/**
 * AgentProposal — СЕРДЦЕ human-in-the-loop.
 * Агент СОЗДАЁТ предложение; статус approve/reject меняет ТОЛЬКО человек (isEditor).
 */
export const AgentProposals: CollectionConfig = {
  slug: 'agent-proposals',
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['summary', 'proposalType', 'status', 'confidence', 'createdAt'],
    description: 'Очередь на ревью. Агенты предлагают — человек решает.',
  },
  access: {
    read: isLoggedIn,
    create: canCreateContent,   // в т.ч. агенты
    update: isEditor,           // approve/reject — только человек
    delete: isEditor,
  },
  fields: [
    { name: 'summary', type: 'text', required: true },
    {
      name: 'proposalType',
      type: 'select',
      required: true,
      options: [
        { label: 'Обновление центра', value: 'center_update' },
        { label: 'Новый центр', value: 'new_center' },
        { label: 'Черновик новости', value: 'news_draft' },
        { label: 'Сломанная ссылка', value: 'broken_link' },
        { label: 'Устаревший перевод', value: 'stale_translation' },
        { label: 'SEO-предложение', value: 'seo_suggestion' },
        { label: 'Другое', value: 'other' },
      ],
    },
    { name: 'targetCollection', type: 'text', admin: { description: 'slug целевой коллекции, напр. rescue-centers' } },
    { name: 'targetId', type: 'text', admin: { description: 'id целевого документа (если обновление)' } },
    { name: 'diff', type: 'json', admin: { description: 'Что меняется: { field: { from, to } }' } },
    { name: 'evidence', type: 'json', admin: { description: 'Доказательства: URL, снапшот HTML, цитаты' } },
    { name: 'sources', type: 'relationship', relationTo: 'sources', hasMany: true },
    { name: 'confidence', type: 'number', min: 0, max: 1 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Ожидает', value: 'pending' },
        { label: 'Одобрено', value: 'approved' },
        { label: 'Отклонено', value: 'rejected' },
        { label: 'Применено', value: 'applied' },
      ],
    },
    { name: 'reviewerNotes', type: 'textarea' },
    { name: 'agentRun', type: 'relationship', relationTo: 'agent-runs' },
  ],
}

/**
 * AgentRun — audit log прогонов + контроль бюджета (cost).
 */
export const AgentRuns: CollectionConfig = {
  slug: 'agent-runs',
  admin: {
    useAsTitle: 'agentName',
    defaultColumns: ['agentName', 'status', 'startedAt', 'proposalsCreated', 'cost'],
  },
  access: {
    read: isLoggedIn,
    create: canCreateContent,
    update: canUpdateContent,
    delete: isEditor,
  },
  fields: [
    {
      name: 'agentName',
      type: 'select',
      required: true,
      options: [
        { label: 'Researcher / факт-чекер', value: 'researcher' },
        { label: 'Content Admin', value: 'content_admin' },
        { label: 'Translator', value: 'translator' },
        { label: 'SysAdmin', value: 'sysadmin' },
        { label: 'SEO', value: 'seo' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'running',
      options: ['running', 'success', 'failed'],
    },
    {
      type: 'row',
      fields: [
        { name: 'startedAt', type: 'date' },
        { name: 'finishedAt', type: 'date' },
      ],
    },
    { name: 'proposalsCreated', type: 'number', defaultValue: 0 },
    { name: 'cost', type: 'number', admin: { description: 'Стоимость прогона, USD (бюджет-контроль AI API).' } },
    { name: 'logs', type: 'json' },
  ],
}
