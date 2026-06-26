import { notFound } from 'next/navigation'
import { findGame } from '@/mock/sample'
import {
  requireDetail,
  detailMetadata,
  type SlugParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { SampleDetail } from '@/app/(frontend)/_components/mock/SampleDetail'

const SLUG = 'games'

export function generateMetadata({ params }: { params: SlugParams }) {
  return detailMetadata(params, SLUG, (locale, slug) => findGame(slug)?.title[locale])
}

export default async function GameDetail({ params }: { params: SlugParams }) {
  const { locale, slug, section } = await requireDetail(params, SLUG)
  const game = findGame(slug)
  if (!game) notFound()
  return (
    <SampleDetail
      locale={locale}
      backHref={`/${locale}/${SLUG}`}
      backLabel={section.title[locale]}
      meta={locale === 'en' ? 'Mini-game' : 'Мини-игра'}
      title={game.title[locale]}
      seed={4}
      body={[game.excerpt[locale]]}
    >
      {/* Canvas-заглушка + HTML-инструкция вне canvas (доступность, DESIGN_BRIEF §13). */}
      <div className="mt-8 flex aspect-[16/9] items-center justify-center rounded-card border border-border bg-surface-info text-sm text-muted">
        canvas (M1)
      </div>
      <h2 className="mt-4 text-xl">{locale === 'en' ? 'How to play' : 'Как играть'}</h2>
      <p className="mt-2 text-muted">{game.how[locale]}</p>
    </SampleDetail>
  )
}
