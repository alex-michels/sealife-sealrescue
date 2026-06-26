import type { Locale } from '@/i18n/config'

/**
 * Тематические метки контента (M1-T02 «фильтры»). Фиксированная таксономия:
 * value (slug) — общий для локалей и стабильный для URL-фильтра (?topic=biology);
 * label — локализуется здесь, а не в content-локализации Payload (метка не контент).
 *
 * Используется и схемой (опции select в Content), и UI (бар фильтров, подписи карточек).
 * Добавить тему = одна строка ниже. Slug'и не переименовывать (ломает старые ссылки/фильтры).
 */
export const topicSlugs = [
  'biology',
  'behavior',
  'conservation',
  'rescue',
  'humor',
  'science',
] as const

export type TopicSlug = (typeof topicSlugs)[number]

const topicLabels: Record<TopicSlug, Record<Locale, string>> = {
  biology: { ru: 'Биология', en: 'Biology' },
  behavior: { ru: 'Поведение', en: 'Behaviour' },
  conservation: { ru: 'Охрана', en: 'Conservation' },
  rescue: { ru: 'Спасение', en: 'Rescue' },
  humor: { ru: 'Юмор', en: 'Humour' },
  science: { ru: 'Наука', en: 'Science' },
}

export const isTopicSlug = (value: string): value is TopicSlug =>
  (topicSlugs as readonly string[]).includes(value)

export const topicLabel = (slug: string, locale: Locale): string =>
  isTopicSlug(slug) ? topicLabels[slug][locale] : slug

/** Опции для select-поля Payload (admin-подписи — на исходной локали ru). */
export const topicSelectOptions = topicSlugs.map((value) => ({
  value,
  label: topicLabels[value].ru,
}))
