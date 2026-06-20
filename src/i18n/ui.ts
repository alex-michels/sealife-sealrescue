import type { Locale } from './config'

/**
 * Строки интерфейса фронтенда. Контент (статьи/мемы) хранится в Payload и
 * переводится заранее; здесь только статичные подписи UI.
 * Бренд и tagline у каждого сайта свои — см. `src/site/config.ts`.
 *
 * При добавлении локали TypeScript потребует заполнить все ключи — намеренно,
 * чтобы перевод интерфейса не забыли.
 */
type UIKey =
  // sealife
  | 'latest'
  | 'empty'
  | 'aiGenerated'
  | 'language'
  | 'crossRescue'
  | 'crossRescueCta'
  // sealrescue
  | 'rescueHeadline'
  | 'rescueLead'
  | 'rescueCta'
  | 'centersTitle'
  | 'centersSoon'
  | 'crossLife'
  | 'crossLifeCta'

const dict: Record<Locale, Record<UIKey, string>> = {
  ru: {
    latest: 'Свежее',
    empty: 'Пока нет опубликованных материалов.',
    aiGenerated: 'Черновик подготовлен AI и проверен редактором.',
    language: 'Язык',
    crossRescue: 'Нашёл тюленя на берегу? Это серьёзно.',
    crossRescueCta: 'Что делать →',
    rescueHeadline: 'Нашёл тюленя на берегу?',
    rescueLead: 'Не трогай и не корми. Сначала разберись, что делать.',
    rescueCta: 'Что делать прямо сейчас →',
    centersTitle: 'Центры рядом',
    centersSoon: 'Каталог реабилитационных центров появится здесь (M2).',
    crossLife: 'Хочешь узнать больше о тюленях?',
    crossLifeCta: 'На sealife.info →',
  },
  en: {
    latest: 'Latest',
    empty: 'No published content yet.',
    aiGenerated: 'Draft prepared by AI and reviewed by an editor.',
    language: 'Language',
    crossRescue: 'Found a seal on the beach? This is serious.',
    crossRescueCta: 'What to do →',
    rescueHeadline: 'Found a seal on the beach?',
    rescueLead: 'Do not touch or feed it. First, learn what to do.',
    rescueCta: 'What to do right now →',
    centersTitle: 'Centers nearby',
    centersSoon: 'The directory of rehabilitation centers will appear here (M2).',
    crossLife: 'Want to learn more about seals?',
    crossLifeCta: 'Go to sealife.info →',
  },
}

export const t = (locale: Locale, key: UIKey): string => dict[locale]?.[key] ?? dict.ru[key]
