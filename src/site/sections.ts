import type { Locale } from '@/i18n/config'
import type { SiteId } from './config'

/**
 * Разделы публичных сайтов (M0-T19 design-mock). Единый источник для:
 *  - навигации в header (nav: true),
 *  - route-guard'ов: раздел рендерится ТОЛЬКО на своём сайте (sealife-раздел на
 *    sealrescue → 404 и наоборот; см. getSection в route-файлах),
 *  - заголовков/intro страниц-оболочек.
 *
 * Это каркас под sample-данные (M0-T19). Реальные ленты/каталог придут в M1/M2
 * (тогда страницы переключатся с mock на Payload, компоненты остаются те же).
 */
export interface SectionDef {
  slug: string
  site: SiteId
  nav: boolean // показывать в header-навигации
  hasDetail: boolean // есть ли вложенный /[slug]
  label: Record<Locale, string> // короткая подпись для nav
  title: Record<Locale, string> // H1 страницы
  intro: Record<Locale, string> // лид-абзац
}

export const sectionDefs: SectionDef[] = [
  // — sealife (медиа-хаб) —
  {
    slug: 'articles',
    site: 'sealife',
    nav: true,
    hasDetail: true,
    label: { ru: 'Статьи', en: 'Articles' },
    title: { ru: 'Статьи', en: 'Articles' },
    intro: {
      ru: 'Лонгриды и факты о тюленях — без занудства.',
      en: 'Long reads and facts about seals — without the boredom.',
    },
  },
  {
    slug: 'news',
    site: 'sealife',
    nav: true,
    hasDetail: true,
    label: { ru: 'Новости', en: 'News' },
    title: { ru: 'Новости', en: 'News' },
    intro: {
      ru: 'Что происходит у ластоногих и тех, кто их спасает.',
      en: 'What’s happening with pinnipeds and the people who rescue them.',
    },
  },
  {
    slug: 'memes',
    site: 'sealife',
    nav: true,
    hasDetail: false,
    label: { ru: 'Мемы', en: 'Memes' },
    title: { ru: 'Мемы', en: 'Memes' },
    intro: {
      ru: 'Галерея тюленьего юмора.',
      en: 'A gallery of seal humour.',
    },
  },
  {
    slug: 'quizzes',
    site: 'sealife',
    nav: true,
    hasDetail: true,
    label: { ru: 'Квизы', en: 'Quizzes' },
    title: { ru: 'Квизы', en: 'Quizzes' },
    intro: {
      ru: 'Проверь, насколько ты тюлень.',
      en: 'Find out how much of a seal you are.',
    },
  },
  {
    slug: 'games',
    site: 'sealife',
    nav: true,
    hasDetail: true,
    label: { ru: 'Игры', en: 'Games' },
    title: { ru: 'Мини-игры', en: 'Mini-games' },
    intro: {
      ru: 'Маленькие игры про тюленей и море.',
      en: 'Small games about seals and the sea.',
    },
  },
  {
    slug: 'species',
    site: 'sealife',
    nav: true,
    hasDetail: true,
    label: { ru: 'Тюленепедия', en: 'Species' },
    title: { ru: 'Тюленепедия', en: 'Seal species' },
    intro: {
      ru: 'Виды ластоногих: кто есть кто.',
      en: 'Pinniped species: who’s who.',
    },
  },

  // — sealrescue (справочник спасения) —
  {
    slug: 'what-to-do',
    site: 'sealrescue',
    nav: true,
    hasDetail: false,
    label: { ru: 'Что делать', en: 'What to do' },
    title: {
      ru: 'Нашёл тюленя — что делать',
      en: 'Found a seal — what to do',
    },
    intro: {
      ru: 'Спокойно. Несколько простых шагов.',
      en: 'Stay calm. A few simple steps.',
    },
  },
  {
    slug: 'rescue-centers',
    site: 'sealrescue',
    nav: true,
    hasDetail: true,
    label: { ru: 'Центры', en: 'Centers' },
    title: { ru: 'Центры реабилитации', en: 'Rehabilitation centers' },
    intro: {
      ru: 'Список центров рядом. Карта — переключателем.',
      en: 'A list of nearby centers. Map as a toggle.',
    },
  },
  {
    slug: 'report',
    site: 'sealrescue',
    nav: true,
    hasDetail: false,
    label: { ru: 'Сообщить', en: 'Report' },
    title: {
      ru: 'Сообщить об ошибке или предложить центр',
      en: 'Report an error or suggest a center',
    },
    intro: {
      ru: 'Без email. Нужен ответ — контакт оператора в правовой информации.',
      en: 'No email. If you need a reply, use the operator contact in the legal notice.',
    },
  },
  {
    slug: 'rescue-quest',
    site: 'sealrescue',
    nav: false, // достижим из «Что делать» и с главной, не грузим основную навигацию
    hasDetail: false,
    label: { ru: 'Квест', en: 'Quest' },
    title: {
      ru: 'Что делать, если нашёл тюленя?',
      en: 'What to do if you found a seal?',
    },
    intro: {
      ru: 'Интерактивный сценарий: пройди шаги и попади в каталог.',
      en: 'An interactive scenario: walk the steps and reach the directory.',
    },
  },
]

export const sectionsForSite = (site: SiteId): SectionDef[] =>
  sectionDefs.filter((s) => s.site === site)

export const navSectionsForSite = (site: SiteId): SectionDef[] =>
  sectionsForSite(site).filter((s) => s.nav)

/** Раздел по сайту+slug. undefined ⇒ раздел не принадлежит сайту ⇒ route-guard даёт 404. */
export const getSection = (site: SiteId, slug: string): SectionDef | undefined =>
  sectionDefs.find((s) => s.site === site && s.slug === slug)
