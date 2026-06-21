import { notFound } from 'next/navigation'
import { findArticle } from '@/mock/sample'
import {
  requireDetail,
  detailMetadata,
  type SlugParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { SampleDetail } from '@/app/(frontend)/_components/mock/SampleDetail'

const SLUG = 'articles'

export function generateMetadata({ params }: { params: SlugParams }) {
  return detailMetadata(params, SLUG, (locale, slug) => findArticle(slug)?.title[locale])
}

export default async function ArticleDetail({ params }: { params: SlugParams }) {
  const { locale, slug, section } = await requireDetail(params, SLUG)
  const doc = findArticle(slug)
  if (!doc) notFound()
  return (
    <SampleDetail
      locale={locale}
      backHref={`/${locale}/${SLUG}`}
      backLabel={section.title[locale]}
      meta={locale === 'en' ? `${doc.readMin} min read` : `${doc.readMin} мин чтения`}
      title={doc.title[locale]}
      date={doc.date}
      aiAssisted={doc.aiAssisted}
      seed={1}
      body={doc.body.map((b) => b[locale])}
    />
  )
}
