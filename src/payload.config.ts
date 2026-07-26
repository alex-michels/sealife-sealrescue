import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'
import path from 'path'
import sharp from 'sharp'
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
import { mediaStaticDir } from './media/storage'
import { leaderboardSubmit, leaderboardRead, leaderboardStart } from './endpoints/leaderboard'
import { gameConfigRead } from './endpoints/gameConfig'
import { locales, defaultLocale, localeLabels } from './i18n/config'
import { en } from '@payloadcms/translations/languages/en'
import { ru } from '@payloadcms/translations/languages/ru'
import { de } from '@payloadcms/translations/languages/de'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Медиа: alt-текст локализован и обязателен для accessibility (WCAG/EAA) + SEO.
 *
 * **CR-04.** `staticDir` задан ЯВНО и абсолютным путём (см. `src/media/storage.ts`): без него
 * Payload резолвил каталог загрузок от рабочего каталога процесса, а в проде это симлинк на
 * каталог релиза, который деплой пересоздаёт с `--delete` и подчищает `rm -rf`. Загрузки
 * исчезали бы на следующем деплое, причём локально всё работало бы идеально.
 *
 * `imageSizes` + `formatOptions` дают srcset и заодно снимают приватностный хвост: без
 * пережатия оригинал отдавался байт-в-байт вместе с EXIF, включая GPS с телефона. Sharp
 * метаданные в вывод не переносит, поэтому пережатие оригинала — и есть очистка.
 */
const mediaDir = mediaStaticDir(path.resolve(dirname, '..'))

// Предупреждение о потере загрузок — только на РАБОТАЮЩЕМ сервере. При `next build` конфиг
// грузится каждым воркером, и MEDIA_DIR там законно пуст (каталог существует на боксе, не в CI):
// warning на сборке был бы шумом ×N, который приучают игнорировать. Не бросаем исключение
// вообще — упавший старт хуже, чем работающий сайт с предупреждением в journalctl.
if (
  process.env.NODE_ENV === 'production' &&
  !process.env.MEDIA_DIR &&
  process.env.NEXT_PHASE !== 'phase-production-build'
) {
  console.warn(
    `[media] MEDIA_DIR не задан, загрузки пойдут в ${mediaDir}. ` +
      'В проде это каталог релиза — файлы исчезнут при следующем деплое. См. docs/DEPLOYMENT.md §7a.',
  )
}

const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: mediaDir,
    // Только изображения: коллекция обслуживает обложки, а не файловый хостинг.
    mimeTypes: ['image/*'],
    // Пережимаем оригинал: ограничивает вес и убирает EXIF (в т.ч. GPS) — sharp не переносит
    // метаданные в вывод. `withoutEnlargement` не даёт растянуть маленькую картинку.
    resizeOptions: { width: 2400, height: undefined, withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 82 } },
    // Производные под реальные точки рендера: карточка в сетке, тело статьи, hero.
    imageSizes: [
      { name: 'thumbnail', width: 400, withoutEnlargement: true },
      { name: 'card', width: 800, withoutEnlargement: true },
      { name: 'hero', width: 1600, withoutEnlargement: true },
    ],
    focalPoint: true,
    crop: true,
  },
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
  // CR-04: без явной передачи sharp Payload пишет предупреждение в лог и МОЛЧА игнорирует
  // imageSizes / resizeOptions / formatOptions — производные не генерируются, а оригинал
  // сохраняется как есть, вместе с EXIF. Пакет в зависимостях был; не хватало этой строки.
  sharp,
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
    // CR-01: выключено СПЕЦИАЛЬНО. С fallback документ, написанный только на исходной локали,
    // возвращался заполненным при запросе другой — исходный язык выдавал себя за перевод
    // (нарушение инварианта №3). Глобально, а не по запросу: у смонтированного REST/GraphQL
    // локаль задаёт клиент, и опт-аут по месту там недостижим — у `glossary` `read: () => true`,
    // и русские `note`/`variants` уезжали как английские.
    // ⚠️ Это меняет ДЕФОЛТ, а не запирает дверь: явный `?fallback-locale=ru` Payload всё ещё
    // обслуживает. Публичные страницы закрыты гейтом `translatedWhere()` (src/i18n/translated.ts).
    // Цена для админки проверена: Document/List-вью Payload и так читают с `fallbackLocale: false`,
    // а локализованных `array` с required/minRows и локализованных `number` в схеме нет.
    fallback: false,
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
