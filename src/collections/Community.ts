import type { CollectionConfig } from 'payload'
import { isEditor, isEditorField } from '../access/roles'

/**
 * UGC: премодерация всегда. Минимум персональных данных (GDPR / data minimization).
 * Email НЕ запрашиваем — только опциональный ник в TG/VK, если человек хочет ответ.
 */
export const UserSubmissions: CollectionConfig = {
  slug: 'user-submissions',
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['summary', 'submissionType', 'status', 'createdAt'],
    description: 'Присланное пользователями: мем-подписи, правки, новые центры, жалобы.',
  },
  access: {
    read: isEditor,      // не публичны до модерации
    create: () => true,  // прислать может любой, без аккаунта
    update: isEditor,
    delete: isEditor,
  },
  fields: [
    { name: 'summary', type: 'text' },
    {
      name: 'submissionType',
      type: 'select',
      required: true,
      options: [
        { label: 'Подпись к мему', value: 'meme_caption' },
        { label: 'Правка', value: 'correction' },
        { label: 'Новый центр', value: 'new_center' },
        { label: 'Жалоба', value: 'report' },
        { label: 'Другое', value: 'other' },
      ],
    },
    { name: 'content', type: 'textarea', required: true },
    { name: 'relatedCollection', type: 'text' },
    { name: 'relatedId', type: 'text' },
    {
      name: 'contactHandle',
      type: 'text',
      admin: { description: 'НЕОБЯЗАТЕЛЬНО. Ник в TG/VK для ответа. Email не запрашиваем (минимизация данных).' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      // Премодерация (EU-10/DSA): статус меняет ТОЛЬКО editor/admin. Без field-access
      // аноним мог прислать status:'approved' в публичный create и самоодобриться
      // (найдено тестом QA-25) — теперь значение отбрасывается, остаётся default pending.
      access: { create: isEditorField, update: isEditorField },
      options: ['pending', 'approved', 'rejected'],
    },
  ],
}

/**
 * Реакции БЕЗ авторизации и без аккаунтов — просто счётчики.
 * Прямую запись держим за staff: инкремент идёт через отдельный rate-limited
 * эндпоинт (Payload custom endpoint или Next route handler), который делает
 * атомарный +1. Защита от накрутки — на фронте (localStorage) + rate-limit.
 * Так анонимный пользователь не сможет выставить произвольный count через API.
 */
export const Reactions: CollectionConfig = {
  slug: 'reactions',
  admin: { useAsTitle: 'key', defaultColumns: ['key', 'emoji', 'count'] },
  access: {
    read: () => true,
    create: isEditor,
    update: isEditor,
    delete: isEditor,
  },
  fields: [
    { name: 'key', type: 'text', required: true, admin: { description: 'collection:id, напр. content:123' } },
    { name: 'emoji', type: 'text', required: true },
    { name: 'count', type: 'number', defaultValue: 0 },
  ],
}
