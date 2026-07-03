import type { CollectionConfig } from 'payload'
import { isEditor } from '../access/roles'

/**
 * Анонимный лидерборд мини-игр (SH-05). EU-чистая модель данных:
 *  - НЕТ персональных данных: ни email, ни IP, ни аккаунтов, ни сырого seed.
 *  - `playerKey` — НЕДЕЛЬНЫЙ односторонний хэш sha256(seed:game:season). Нужен только для
 *    дедупа строки игрока внутри недели; ротируется каждую неделю и удаляется при сбросе →
 *    долговременного идентификатора нет (эффективно анонимно).
 *  - Имя локализуемо: храним части (`nameParts`) + EN base (`baseAlias`) + `suffix`. Имя
 *    рисуется на клиенте на языке зрителя; уникальность дисплея — суффиксом при коллизии
 *    («Triton Loaf 2»). `alias` (EN display) — для админки. Свободного текста нет (НЕ UGC).
 *  - Доска ЕДИНАЯ: деление desktop/mobile снято (2026-07-03) — консистентность с Seal Run
 *    («равный горизонт»); остаточный портрет-vs-ландшафт спред Seal Hunter принят осознанно.
 *  - `season` — ISO-неделя: доска сбрасывается еженедельно (фильтр + еженедельная очистка).
 *
 * Запись — только через server-authoritative endpoint (см. src/endpoints/leaderboard.ts),
 * который валидирует и пишет через local API (overrideAccess). Прямой публичный create
 * закрыт; `delete` — никогда роли `agent` (CLAUDE.md §1, инвариант доступа).
 */
export const GameScores: CollectionConfig = {
  slug: 'game-scores',
  admin: {
    useAsTitle: 'alias',
    defaultColumns: ['alias', 'score', 'game', 'season', 'createdAt'],
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
      name: 'playerKey',
      type: 'text',
      required: true,
      index: true, // sha256(seed:game:season) — дедуп строки игрока за неделю; ротируется
      admin: { description: 'Недельный односторонний ключ игрока (не сырой seed). Идентичность строки.' },
    },
    {
      name: 'baseAlias',
      type: 'text',
      required: true,
      index: true, // EN base без суффикса — для подсчёта коллизий имени
      admin: { description: 'EN base имени (без суффикса) — для уникальности дисплея.' },
    },
    {
      name: 'suffix',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { description: '0/1 — без суффикса; ≥2 — добавляется к имени при коллизии («… 2»).' },
    },
    {
      name: 'alias',
      type: 'text',
      required: true,
      admin: { description: 'EN display-имя (base + суффикс) — подпись в админке.' },
    },
    {
      name: 'nameParts',
      type: 'json',
      required: true,
      admin: {
        description: 'Locale-независимые части имени — имя рисуется на клиенте на языке зрителя.',
      },
    },
    { name: 'score', type: 'number', required: true, min: 0 },
    { name: 'durationMs', type: 'number', required: true },
    {
      name: 'season',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'ISO-неделя (YYYY-Www) — для еженедельного сброса доски.' },
    },
  ],
}
