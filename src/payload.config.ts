import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { RescueCenters } from './collections/RescueCenters'
import { Content } from './collections/Content'
import { Quizzes } from './collections/Quizzes'
import { Sources } from './collections/Sources'
import { AgentProposals, AgentRuns } from './collections/Agents'
import { UserSubmissions, Reactions } from './collections/Community'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Медиа: alt-текст локализован и обязателен для accessibility (WCAG/EAA) + SEO.
const Media: CollectionConfig = {
  slug: 'media',
  upload: true,
  access: { read: () => true },
  fields: [
    {
      name: 'alt',
      type: 'text',
      localized: true,
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
    Quizzes,
    Sources,
    AgentProposals,
    AgentRuns,
    UserSubmissions,
    Reactions,
    Media,
  ],
  localization: {
    locales: [
      { label: 'Русский', code: 'ru' },
      { label: 'English', code: 'en' },
      // { label: 'Deutsch', code: 'de' }, // включить позже одной строкой
    ],
    defaultLocale: 'ru',
    fallback: true,
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
