import { notFound } from 'next/navigation'
import { findNews } from '@/mock/sample'
import {
  requireDetail,
  detailMetadata,
  type SlugParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { SampleDetail } from '@/app/(frontend)/_components/mock/SampleDetail'

const SLUG = 'news'

export function generateMetadata({ params }: { params: SlugParams }) {
  return detailMetadata(params, SLUG, (locale, slug) => findNews(slug)?.title[locale])
}

export default async function NewsDetail({ params }: { params: SlugParams }) {
  const { locale, slug, section } = await requireDetail(params, SLUG)
  const doc = findNews(slug)
  if (!doc) notFound()
  return (
    <SampleDetail
      locale={locale}
      backHref={`/${locale}/${SLUG}`}
      backLabel={section.title[locale]}
      meta={doc.date}
      title={doc.title[locale]}
      date={doc.date}
      aiAssisted={doc.aiAssisted}
      seed={2}
      body={doc.body.map((b) => b[locale])}
    />
  )
}
