import Link from 'next/link'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Content } from '@/payload-types'
import type { Locale } from '@/i18n/config'
import { formatDate } from '@/i18n/date'
import { topicLabel } from '@/content/topics'
import { Cover } from './Cover'
import { AiBadge } from './AiBadge'
import { CrossLink } from './CrossLink'

const typeLabels: Record<Content['type'], Record<Locale, string>> = {
  article: { ru: 'Статья', en: 'Article' },
  news: { ru: 'Новость', en: 'News' },
  meme: { ru: 'Мем', en: 'Meme' },
  page: { ru: 'Страница', en: 'Page' },
}

/** Темы как ссылки на отфильтрованный каталог соответствующего типа. */
function TopicChips({ doc, locale, basePath }: { doc: Content; locale: Locale; basePath: string }) {
  if (!doc.topics?.length) return null
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {doc.topics.map((slug) => (
        <Link
          key={slug}
          href={`${basePath}?topic=${slug}`}
          className="inline-flex min-h-6 items-center rounded-btn border border-border bg-surface px-3 py-1 text-sm text-muted hover:text-link"
        >
          {topicLabel(slug, locale)}
        </Link>
      ))}
    </div>
  )
}

/** Перелинковка на конкретный центр, если он привязан; иначе общий вход «что делать». */
function crossLinkPath(doc: Content): string {
  const c = doc.crossLink?.rescueCenter
  if (c && typeof c === 'object' && 'slug' in c && c.slug) return `/rescue-centers/${c.slug}`
  return '/what-to-do'
}

/**
 * Шаблоны рендера Content по type (M1-T01), RU/EN. Канонический URL — /[locale]/[slug];
 * сюда приходит уже найденный опубликованный документ в активной локали (depth>=1).
 */
export function ContentDetail({ doc, locale }: { doc: Content; locale: Locale }) {
  const date = formatDate(doc.updatedAt, locale)
  const typeLabel = typeLabels[doc.type][locale]

  // Мем — картинка + подпись, минимум хрома.
  if (doc.type === 'meme') {
    return (
      <article className="mx-auto max-w-2xl px-5 py-10">
        <Cover image={doc.coverImage} seed={1} label="MEME" className="rounded-card" />
        <h1 className="mt-6 text-3xl">{doc.title}</h1>
        <AiBadge locale={locale} provenance={doc.provenance} aiGenerated={doc.aiGenerated} />
        <TopicChips doc={doc} locale={locale} basePath={`/${locale}/memes`} />
      </article>
    )
  }

  // Страница — статичный материал (about и т.п.): заголовок + тело, без даты/перелинковки.
  if (doc.type === 'page') {
    return (
      <article className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-4xl">{doc.title}</h1>
        <AiBadge locale={locale} provenance={doc.provenance} aiGenerated={doc.aiGenerated} />
        {doc.body && (
          <div className="article-body mt-8">
            <RichText data={doc.body} />
          </div>
        )}
      </article>
    )
  }

  // Статья / новость — лонгрид/заметка с обложкой, датой, телом и перелинковкой.
  const basePath = `/${locale}/${doc.type === 'news' ? 'news' : 'articles'}`
  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <span className="font-mono text-xs uppercase tracking-wide text-muted">{typeLabel}</span>
      <h1 className="mt-2 text-4xl">{doc.title}</h1>
      <p className="mt-2 font-mono text-xs text-muted">{date}</p>
      <AiBadge locale={locale} provenance={doc.provenance} aiGenerated={doc.aiGenerated} />
      <Cover
        image={doc.coverImage}
        seed={doc.type === 'news' ? 2 : 1}
        className="mt-6 rounded-card"
      />
      {doc.excerpt && <p className="mt-6 text-xl text-muted">{doc.excerpt}</p>}
      {doc.body && (
        <div className="article-body mt-8">
          <RichText data={doc.body} />
        </div>
      )}
      <TopicChips doc={doc} locale={locale} basePath={basePath} />
      <CrossLink locale={locale} variant="curious" path={crossLinkPath(doc)} />
    </article>
  )
}
