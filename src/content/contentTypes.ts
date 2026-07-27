import type { Content } from '@/payload-types'
import type { Locale } from '@/i18n/config'

/**
 * Что такое каждый тип `Content` и попадает ли он в редакционную ленту (Roadmap **CR-06**).
 *
 * ## Что было сломано
 * Лента «Свежее» на главной sealife фильтровала только по `_status`, поэтому в неё попадал любой
 * опубликованный документ — включая `page`. Первая же публикация статической страницы (`about`,
 * а дальше контакты, редакционная политика, ответственный по §18 MStV) поставила бы её карточкой
 * НАВЕРХ главной. Плюс кикер карточки печатал `doc.type` сырым: читатель видел `article` вместо
 * «Статья», причём только в ленте — на детальной странице подпись была локализована.
 *
 * ## Почему таблица, а не массив `['article','news','meme']`
 * Ключ записи — union `Content['type']`, поэтому таблица **обязана быть исчерпывающей**. Добавили
 * новый тип в коллекцию → TypeScript не соберётся, пока здесь не появится решение: он редакционный
 * или служебный, и как называется на двух языках. Именно это и не даёт классу ошибки повториться —
 * массив «разрешённых» типов молча пропустил бы новый тип в ленту (или молча выкинул из неё).
 */
export const contentTypes: Record<
  Content['type'],
  { inFeed: boolean; label: Record<Locale, string> }
> = {
  article: { inFeed: true, label: { ru: 'Статья', en: 'Article' } },
  news: { inFeed: true, label: { ru: 'Новость', en: 'News' } },
  meme: { inFeed: true, label: { ru: 'Мем', en: 'Meme' } },
  // Служебная страница (about, контакты, редполитика): живёт по прямой ссылке и в футере,
  // в потоке «что нового» ей делать нечего — она не новость и не устаревает.
  page: { inFeed: false, label: { ru: 'Страница', en: 'Page' } },
}

/** Типы редакционной ленты — для `where` в запросе. */
export const feedTypes = (Object.keys(contentTypes) as Content['type'][]).filter(
  (type) => contentTypes[type].inFeed,
)

/** Локализованная подпись типа (кикер карточки, мета детальной страницы). */
export const typeLabel = (type: Content['type'], locale: Locale): string =>
  contentTypes[type].label[locale]
