import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { isLocale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { getSection } from '@/site/sections'
import { findGameBySlug, gameLocales } from '@/app/(frontend)/_components/content/getGames'
import { Cover } from '@/app/(frontend)/_components/content/Cover'

type SlugParams = Promise<{ site: string; locale: string; slug: string }>
const SLUG = 'games'

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
  const { site, locale, slug } = await params
  if (!isSite(site) || !isLocale(locale) || !getSection(site, SLUG)) return {}
  const game = await findGameBySlug(locale, slug)
  if (!game) return {}
  return {
    title: game.title,
    description: game.excerpt || undefined,
    alternates: buildAlternates(`/${SLUG}/${slug}`, locale, sites[site], await gameLocales(slug)),
  }
}

export default async function GameDetail({ params }: { params: SlugParams }) {
  const { site, locale, slug } = await params
  if (!isSite(site) || !isLocale(locale) || !getSection(site, SLUG)) notFound()

  const game = await findGameBySlug(locale, slug)
  if (!game) notFound()

  // Играбельный фрейм — главное на странице → даём ему больше места.
  const wide = Boolean(game.embed)

  return (
    <div className={`mx-auto ${wide ? 'max-w-5xl' : 'max-w-3xl'} px-5 py-10`}>
      <Link href={`/${locale}/${SLUG}`} className="font-mono text-xs text-muted hover:text-link">
        ← {getSection(site, SLUG)!.title[locale]}
      </Link>
      <article>
        <span className="font-mono text-xs uppercase tracking-wide text-muted">
          {{ ru: 'Мини-игра', en: 'Mini-game', de: 'Mini-Spiel' }[locale]}
        </span>
        <h1 className="mt-2 text-4xl">{game.title}</h1>

        {/* Картинка-заставка — опционально, переключается в админке (showCover):
            загруженная обложка (coverImage) либо декоративный плейсхолдер по coverSeed. */}
        {game.showCover && (
          <Cover image={game.coverImage} seed={game.coverSeed ?? 0} className="mt-6 rounded-card" />
        )}

        {game.excerpt && <p className="mt-6 text-muted">{game.excerpt}</p>}

        {/* Встраиваемая статическая игра из /public, либо canvas-заглушка (DESIGN_BRIEF §13). */}
        {game.embed ? (
          <iframe
            src={`${game.embed}?lang=${locale}&game=${game.slug}`}
            title={game.title}
            className="mt-6 block h-[72vh] min-h-[460px] w-full rounded-card border border-border bg-surface-info"
            loading="lazy"
            allow="fullscreen; autoplay"
          />
        ) : (
          <div className="mt-6 flex aspect-[16/9] items-center justify-center rounded-card border border-border bg-surface-info text-sm text-muted">
            canvas (M1)
          </div>
        )}

        {game.how && (
          <>
            <h2 className="mt-4 text-xl">
              {{ ru: 'Как играть', en: 'How to play', de: 'So wird gespielt' }[locale]}
            </h2>
            <p className="mt-2 whitespace-pre-line text-muted">{game.how}</p>
          </>
        )}
      </article>
    </div>
  )
}
