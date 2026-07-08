import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { RescueCenters } from './collections/RescueCenters'
import { Content } from './collections/Content'
import { Species } from './collections/Species'
import { Quizzes } from './collections/Quizzes'
import { Games } from './collections/Games'
import { GameScores } from './collections/GameScores'
import { Sources } from './collections/Sources'
import { Glossary } from './collections/Glossary'
import { AgentProposals, AgentRuns } from './collections/Agents'
import { UserSubmissions, Reactions } from './collections/Community'
import { SectionContent } from './globals/SectionContent'
import { isEditor } from './access/roles'
import { leaderboardSubmit, leaderboardRead, leaderboardStart } from './endpoints/leaderboard'
import { gameConfigRead } from './endpoints/gameConfig'
import { locales, defaultLocale, localeLabels } from './i18n/config'
import { en } from '@payloadcms/translations/languages/en'
import { ru } from '@payloadcms/translations/languages/ru'
import { de } from '@payloadcms/translations/languages/de'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Медиа: alt-текст локализован и обязателен для accessibility (WCAG/EAA) + SEO.
const Media: CollectionConfig = {
  slug: 'media',
  upload: true,
  // Явный access (SEC-07): без него Payload по умолчанию пускал в create/update/delete
  // ЛЮБОГО залогиненного, включая agent — нарушение инварианта «delete никогда не agent».
  access: { read: () => true, create: isEditor, update: isEditor, delete: isEditor },
  fields: [
    {
      name: 'alt',
      type: 'text',
      localized: true,
      required: true, // Accessibility (WCAG 2.1 AA / EAA) + SEO — обязательно, а не на словах.
      admin: { description: 'Accessibility (WCAG 2.1 AA / EAA) + SEO. Заполнять обязательно.' },
    },
  ],
}

export default buildConfig({
  serverURL: process.env.SERVER_URL,
  admin: { user: 'users' },
  editor: lexicalEditor(),
  collections: [
    Users,
    RescueCenters,
    Content,
    Species,
    Quizzes,
    Games,
    GameScores,
    Sources,
    Glossary,
    AgentProposals,
    AgentRuns,
    UserSubmissions,
    Reactions,
    Media,
  ],
  globals: [SectionContent],
  endpoints: [leaderboardStart, leaderboardSubmit, leaderboardRead, gameConfigRead],
  localization: {
    // Контент-локали берутся из единого источника (src/i18n/config.ts): ru/en/de.
    locales: locales.map((code) => ({ code, label: localeLabels[code] })),
    defaultLocale,
    fallback: true,
  },
  // Язык интерфейса админки (staff) — RU/EN/DE; выбирается в профиле пользователя/по Accept-Language.
  // Это НЕ контент-локализация (та — в `localization` выше).
  i18n: {
    supportedLanguages: { en, ru, de },
    fallbackLanguage: 'en',
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
