/**
 * Идемпотентный посев глоссария. Запуск:  pnpm seed:glossary
 * (использует `payload run`, который грузит .env и конфиг проекта).
 *
 * ВАЖНО: используем top-level await, а НЕ floating `run().catch()`.
 * `payload run` делает `await import(script)` и сразу `process.exit(0)`, поэтому
 * плавающий промис не успел бы выполниться — процесс убивался до записи в БД.
 *
 * source — общий ключ; перевод пишется по локалям (ru — сам термин, en — перевод).
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { glossaryTerms } from './glossaryTerms'

const payload = await getPayload({ config })

let created = 0
let updated = 0

for (const term of glossaryTerms) {
  const base = {
    source: term.source,
    category: term.category,
    doNotTranslate: term.doNotTranslate ?? false,
    variants: (term.variants ?? []).map((value) => ({ value })),
  }

  const existing = await payload.find({
    collection: 'glossary',
    where: { source: { equals: term.source } },
    limit: 1,
  })

  const id = existing.docs[0]?.id

  if (id) {
    // Исходная локаль: общие поля + ru-заметка + ru-эквивалент = сам термин.
    await payload.update({
      collection: 'glossary',
      id,
      locale: 'ru',
      data: { ...base, translation: term.source, note: term.note },
    })
    // Целевая локаль: перевод.
    await payload.update({
      collection: 'glossary',
      id,
      locale: 'en',
      data: { translation: term.en },
    })
    updated++
  } else {
    const doc = await payload.create({
      collection: 'glossary',
      locale: 'ru',
      data: { ...base, translation: term.source, note: term.note },
    })
    await payload.update({
      collection: 'glossary',
      id: doc.id,
      locale: 'en',
      data: { translation: term.en },
    })
    created++
  }
}

console.log(`Глоссарий: создано ${created}, обновлено ${updated} (всего ${glossaryTerms.length}).`)
