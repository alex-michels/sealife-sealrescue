import type { CollectionBeforeChangeHook, CollectionSlug, PayloadRequest } from 'payload'
import { defaultLocale, targetLocales, type Locale } from '../i18n/config'
import { nextPublishedAt } from '../content/publishedAt'
import {
  coverageOf,
  onSourceChanged,
  onTranslationSaved,
  sourceHashOf,
  summarizeTranslation,
  TRANSLATED_FIELDS,
  hasText,
  type LocaleStatusRow,
  type TranslatableDoc,
} from '../content/localeStatus'

// Исходная локаль и целевые локали перевода берутся из единого источника
// (src/i18n/config.ts). DE добавляется там одной строкой — здесь ничего менять не надо.
const SOURCE_LOCALE: Locale = defaultLocale
const TARGET_LOCALES: Locale[] = targetLocales

/**
 * Агенты публиковать не могут: любое изменение от роли 'agent'
 * принудительно остаётся черновиком. Это и есть human-in-the-loop на уровне БД.
 */
export const forceAgentDrafts: CollectionBeforeChangeHook = ({ data, req }) => {
  if (req.user?.role === 'agent') {
    return { ...data, _status: 'draft' }
  }
  return data
}

/** Переводимые поля документа в одной локали (data поверх originalDoc — partial-update). */
const translatableOf = (data: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
  Object.fromEntries(
    TRANSLATED_FIELDS.map((f) => [f, data?.[f] ?? originalDoc?.[f]]),
  ) as TranslatableDoc

/** Прежние строки статуса: на partial-update их в `data` нет — иначе потеряли бы sourceHash. */
const existingRows = (
  data: Record<string, unknown>,
  originalDoc?: Record<string, unknown>,
): LocaleStatusRow[] => {
  const raw = Array.isArray(data?.localeStatus)
    ? data.localeStatus
    : Array.isArray(originalDoc?.localeStatus)
      ? originalDoc.localeStatus
      : []
  return raw as LocaleStatusRow[]
}

/**
 * Прочитать документ в ДРУГОЙ локали, чем та, в которой идёт запись.
 *
 * ⚠️ `req` сюда сознательно НЕ передаётся. Payload при наличии `req` берёт локаль из `req.locale`
 * и молча игнорирует явный аргумент `locale`: запрос «дай мне en» внутри записи русского возвращал
 * русский документ, после чего перевод сравнивался сам с собой. Отловлено на живом Payload —
 * unit-тест с подставным `findByID` такое поймать не может в принципе, потому что подставной
 * клиент честно отдаёт запрошенную локаль.
 *
 * Цена отказа от `req` — чтение вне текущей транзакции, то есть зафиксированное состояние. Для
 * соседней локали это ровно то, что нужно: текущая запись её не трогает. Обычный SELECT в Postgres
 * на строке с незакрытой транзакцией не блокируется (MVCC), так что дедлока здесь нет.
 *
 * Строго `fallbackLocale: false` — иначе исходник подменит собой отсутствующий перевод и трекер
 * объявит переведённым то, чего нет.
 *
 * Ошибку чтения глотаем: статус перевода не тот повод, по которому сохранение материала
 * должно падать.
 */
async function readInLocale(
  req: PayloadRequest,
  collection: CollectionSlug,
  id: string | number,
  locale: Locale,
): Promise<TranslatableDoc | null> {
  try {
    const doc = (await req.payload.findByID({
      collection,
      id,
      locale,
      fallbackLocale: false,
      draft: true,
      depth: 0,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>
    return translatableOf(doc)
  } catch {
    return null
  }
}

/**
 * Трекинг актуальности перевода (Roadmap **CR-15**). Вся логика — в `src/content/localeStatus.ts`,
 * здесь только сбор данных из запроса.
 *
 * Хук видит документ в ОДНОЙ локали (`req.locale`), поэтому у него две ветки:
 *  - пишут исходник → пересчитать, не уехал ли он от переводов;
 *  - пишут перевод → зафиксировать, от какой версии исходника он сделан (тот самый писатель,
 *    которого не было и без которого статус вечно залипал в `stale`).
 *
 * Соседнюю локаль приходится дочитывать отдельным запросом: в `data`/`originalDoc` лежит только
 * текущая. Запрос идёт через `req`, то есть внутри той же транзакции.
 */
export const trackTranslationStatus: CollectionBeforeChangeHook = async ({
  data,
  req,
  originalDoc,
  collection,
}) => {
  const locale: Locale = req.locale && req.locale !== 'all' ? (req.locale as Locale) : SOURCE_LOCALE
  const id = originalDoc?.id as string | number | undefined
  const slug = collection.slug as CollectionSlug
  const current = translatableOf(data, originalDoc)
  const existing = existingRows(data, originalDoc)

  const withSummary = (localeStatus: LocaleStatusRow[]) => ({
    ...data,
    localeStatus,
    translationStatus: summarizeTranslation(localeStatus, TARGET_LOCALES),
  })

  if (locale === SOURCE_LOCALE) {
    const hash = sourceHashOf(current)
    const targets = await Promise.all(
      TARGET_LOCALES.map(async (loc) => {
        // На создании перевода заведомо нет — лишний запрос не делаем.
        const other = id ? await readInLocale(req, slug, id, loc) : null
        return { locale: loc, translated: other ? TRANSLATED_FIELDS.some((f) => hasText(other[f])) : false }
      }),
    )
    return withSummary(onSourceChanged(existing, hash, targets))
  }

  // Документ создают сразу в целевой локали — исходника, от которого он «переведён», ещё нет.
  if (!id) return data
  const source = await readInLocale(req, slug, id, SOURCE_LOCALE)
  if (!source) return data

  return withSummary(
    onTranslationSaved(
      existing,
      locale,
      sourceHashOf(source),
      coverageOf(source, current),
      new Date().toISOString(),
      TARGET_LOCALES,
    ),
  )
}

/**
 * CR-05: штамп даты публикации. Логика — чистая `nextPublishedAt` (`src/content/publishedAt.ts`),
 * здесь только подстановка «сейчас» и склейка с данными записи.
 */
export const stampPublishedAt: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const next = nextPublishedAt(data, originalDoc, new Date().toISOString())
  return next ? { ...data, publishedAt: next } : data
}
