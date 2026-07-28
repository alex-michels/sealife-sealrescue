import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Metadata } from 'next'

import { isLocale, type Locale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { translatedWhere, localesWithContent } from '@/i18n/translated'
import { isPreview } from '@/preview/state'
import { ContentDetail } from '@/app/(frontend)/_components/content/ContentDetail'

async function getDoc(locale: Locale, slug: string) {
  const payload = await getPayload({ config })
  // CR-08: в предпросмотре отдаём и черновик. Гейт доступа — в /api/preview (там проверяется
  // сессия сотрудника), сюда draft-режим приходит уже подтверждённым cookie Next.
  const preview = await isPreview()
  const { docs } = await payload.find({
    collection: 'content',
    locale,
    draft: preview,
    // CR-01: без перевода документа в этой локали НЕ существует — 404, а не исходный язык
    // под чужим `<html lang>`. Рендер «с пометкой» здесь неверен: страница осталась бы
    // индексируемой и повторила бы ровно то нарушение инварианта №3, которое мы убираем.
    fallbackLocale: false,
    where: {
      and: [
        // В предпросмотре статус не фильтруем — иначе черновик, ради которого всё и затевалось,
        // не найдётся. Гейт перевода (CR-01) остаётся: показывать русскую страницу английским
        // текстом неверно и в предпросмотре тоже.
        preview
          ? { slug: { equals: slug } }
          : { slug: { equals: slug }, _status: { equals: 'published' } },
        translatedWhere('title'),
      ],
    },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}

/** В каких локалях документ реально существует — для честного hreflang (CR-01). */
async function availableLocales(slug: string): Promise<Locale[]> {
  const payload = await getPayload({ config })
  const map = await localesWithContent(payload, 'content', {
    slug: { equals: slug },
    _status: { equals: 'published' },
  })
  return [...(map.get(slug) ?? [])]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; locale: string; slug: string }>
}): Promise<Metadata> {
  const { site, locale, slug } = await params
  if (!isSite(site) || !isLocale(locale)) return {}

  const doc = await getDoc(locale, slug)
  if (!doc) return {}

  return {
    title: doc.seo?.metaTitle || doc.title,
    description: doc.seo?.metaDescription || doc.excerpt || undefined,
    // hreflang перечисляет только те локали, где документ реально есть (CR-01): рекламировать
    // альтернативу, которая отдаёт 404, хуже, чем не рекламировать ничего.
    alternates: buildAlternates(`/${slug}`, locale, sites[site], await availableLocales(slug)),
  }
}

export default async function ContentPage({
  params,
}: {
  params: Promise<{ site: string; locale: string; slug: string }>
}) {
  const { site, locale, slug } = await params
  if (!isSite(site) || !isLocale(locale)) notFound()

  const doc = await getDoc(locale, slug)
  if (!doc) notFound()

  return <ContentDetail doc={doc} locale={locale} />
}
