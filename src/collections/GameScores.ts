import type { CollectionConfig } from 'payload'
import { isEditor } from '../access/roles'

/**
 * Анонимный лидерборд мини-игр (SH-05). EU-чистая модель данных:
 *  - НЕТ персональных данных: ни email, ни IP, ни аккаунтов.
 *  - Имя игрока локализуемо: храним locale-независимые ИНДЕКСЫ слов (`adjIdx`/`nounIdx`),
 *    имя рисуется на клиенте на языке зрителя из выровненных RU/EN-списков. `alias` (EN) —
 *    денормализованная подпись для админки. Свободного текста нет (НЕ UGC).
 *  - `board` — грубо desktop/mobile (без пиксельных размеров → без fingerprint).
 *  - `season` — ISO-неделя: доска сбрасывается еженедельно (просто фильтр по сезону).
 *
 * Запись — только через server-authoritative endpoint (см. src/endpoints/leaderboard.ts),
 * который валидирует и пишет через local API (overrideAccess). Прямой публичный create
 * закрыт; `delete` — никогда роли `agent` (CLAUDE.md §1, инвариант доступа).
 */
export const GameScores: CollectionConfig = {
  slug: 'game-scores',
  admin: {
    useAsTitle: 'alias',
    defaultColumns: ['alias', 'score', 'board', 'game', 'season', 'createdAt'],
    description: 'Анонимные результаты мини-игр (лидерборд). PII не хранится.',
  },
  access: {
    read: () => true, // публичная доска (нет PII)
    create: isEditor, // публично — только через валидирующий endpoint (local API); вручную — staff
    update: isEditor,
    delete: isEditor, // агент удалять не может
  },
  fields: [
    { name: 'game', type: 'relationship', relationTo: 'games', required: true, index: true },
    {
      name: 'alias',
      type: 'text',
      required: true,
      index: true, // канонический EN-рендер имени = ключ дедупа (game, alias, board, season)
      admin: { description: 'Канонический EN-рендер имени (идентичность + подпись в админке).' },
    },
    {
      name: 'nameParts',
      type: 'json',
      required: true,
      admin: {
        description:
          'Locale-независимые части имени {adj?,mod?,noun,pref?,suf?} — имя рисуется на клиенте на языке зрителя.',
      },
    },
    { name: 'score', type: 'number', required: true, min: 0 },
    { name: 'durationMs', type: 'number', required: true },
    {
      name: 'board',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Desktop', value: 'desktop' },
        { label: 'Mobile', value: 'mobile' },
      ],
    },
    {
      name: 'season',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'ISO-неделя (YYYY-Www) — для еженедельного сброса доски.' },
    },
  ],
}
