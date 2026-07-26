import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { translatedWhere } from '@/i18n/translated'
import { Card } from '../ui/Card'
import { EqualCardGrid } from '../ui/EqualCardGrid'

/**
 * Лента «Свежее» главной sealife: async-компонент под <Suspense> в page.tsx.
 * Запрос живёт здесь (а не в page), чтобы стримилась только лента: hero/хаб
 * разделов отдаются сразу, а notFound() страницы (вне Suspense) может отдать
 * настоящий HTTP 404 (M0-T19).
 */
export async function LatestFeed({ locale }: { locale: Locale }) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'content',
    locale,
    fallbackLocale: false, // CR-01
    where: { and: [{ _status: { equals: 'published' } }, translatedWhere('title')] },
    sort: '-updatedAt',
    limit: 20,
    depth: 0,
  })

  if (docs.length === 0) {
    // Empty как настоящий UI-блок на info-поверхности (azure-soft), текст тёмный (§4c/§2e).
    return <div className="rounded-card bg-surface-info p-6 text-text">{t(locale, 'empty')}</div>
  }

  return (
    <EqualCardGrid>
      {docs.map((doc) => (
        <li key={doc.id}>
          <Link href={`/${locale}/${doc.slug}`} className="block h-full">
            <Card className="h-full transition-transform hover:-translate-y-0.5">
              <span className="font-mono text-xs uppercase tracking-wide text-muted">
                {doc.type}
              </span>
              <h3 className="mt-2 text-xl">{doc.title}</h3>
            </Card>
          </Link>
        </li>
      ))}
    </EqualCardGrid>
  )
}
