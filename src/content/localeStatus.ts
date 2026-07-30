import crypto from 'crypto'

/**
 * Трекинг актуальности перевода (Roadmap **CR-15**).
 *
 * ## Что было сломано
 * Хук считал sha256 исходного текста и тут же его выбрасывал: в строку писалось
 * `sourceHash: prev?.sourceHash ?? null`, а второго писателя — того, кто зафиксировал бы факт
 * перевода, — не существовало. Поэтому `prev.sourceHash` всегда оставался `null`, сравнение
 * `prev.sourceHash !== hash` всегда было истинным, и КАЖДЫЙ документ в базе вечно числился `stale`.
 * Живая проверка перед этой правкой: после создания EN — `stale/null`, после сохранения перевода
 * RU — снова `stale/null`, а запрос «покажи устаревшие» возвращал все документы разом.
 *
 * ## Как устроено теперь
 * Два писателя вместо одного:
 *  - **запись исходной локали** пересчитывает хэш и сравнивает его с тем, ОТ КАКОЙ версии
 *    исходника был сделан перевод (`row.sourceHash`);
 *  - **запись целевой локали** этот `sourceHash` наконец сохраняет — «перевод сделан вот отсюда».
 *
 * `sourceHash` намеренно принадлежит переводу, а не исходнику: он отвечает на вопрос «от какой
 * версии оригинала перевод», и запись исходника его не трогает. Именно поэтому одного писателя
 * было мало — записывать его должен тот, кто переводит.
 *
 * ## Чего это НЕ делает
 * Не гейтит публичную выдачу. «Перевода нет» и «перевод устарел» — разные утверждения: скрывать
 * страницу можно только по первому, и этим занимается `translatedWhere()` (CR-01). Устаревший
 * перевод показывается как есть — он всё ещё лучше пустоты, а редактор видит пометку в админке.
 */

/**
 * Поля, которые переводит переводчик, — они же считаются в хэш.
 *
 * `seo.*` сознательно не входит: правка meta-описания не делает перевод текста устаревшим, а вот
 * ложный `stale` на всём разделе после SEO-подкрутки был бы обиднее пользы.
 */
export const TRANSLATED_FIELDS = ['title', 'excerpt', 'body'] as const

export type TranslatableDoc = Partial<Record<(typeof TRANSLATED_FIELDS)[number], unknown>>

/**
 * Состояние перевода одной локали.
 *  - `missing` — перевода нет вовсе (его же прячет CR-01 из публичной выдачи);
 *  - `stale` — перевод есть, но исходник с тех пор изменился;
 *  - `review` — перевод есть, но неизвестно, от какой версии исходника (частичный перевод либо
 *    документ, заведённый до появления трекинга); требует человеческого взгляда;
 *  - `current` — перевод сделан от текущей версии исходника.
 */
export type LocaleState = 'missing' | 'stale' | 'review' | 'current'

/** Порядок «что чинить раньше»: нет перевода → устарел → неизвестно → всё хорошо. */
const SEVERITY: LocaleState[] = ['missing', 'stale', 'review', 'current']

export type LocaleStatusRow = {
  locale: string
  status: LocaleState
  sourceHash: string | null
  translatedAt: string | null
}

/** Насколько локаль покрыта переводом относительно исходника. */
export type Coverage = 'none' | 'partial' | 'full'

/**
 * Есть ли в значении осмысленный текст.
 *
 * Для lexical важно смотреть внутрь: пустой редактор — это не `null`, а полноценное дерево с одним
 * пустым параграфом. Проверка «объект существует» считала бы такой документ переведённым.
 */
export function hasText(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.some(hasText)
  if (typeof value !== 'object') return false

  const node = value as { text?: unknown; children?: unknown; root?: unknown }
  if (typeof node.text === 'string' && node.text.trim() !== '') return true
  // Смотрим ТОЛЬКО в text/children/root: у пустого редактора есть и `version: 1`, и `indent: 0`,
  // и обход «любого непустого поля» посчитал бы пустой параграф переведённым текстом.
  return hasText(node.children) || hasText(node.root)
}

/** sha256 переводимых полей. Стабилен по составу полей — см. `TRANSLATED_FIELDS`. */
export function sourceHashOf(doc: TranslatableDoc): string {
  const payload = TRANSLATED_FIELDS.map((f) => JSON.stringify(doc[f] ?? null)).join('\n')
  return crypto.createHash('sha256').update(payload).digest('hex')
}

/**
 * Покрытие перевода: заполнено ли в целевой локали то же, что заполнено в исходной.
 *
 * Сравниваем ПОЛЕ В ПОЛЕ, а не «есть хоть что-то»: у мема нет body ни в одном языке, и требовать
 * его от перевода — значит навсегда оставить все мемы недопереведёнными.
 */
export function coverageOf(source: TranslatableDoc, target: TranslatableDoc): Coverage {
  const needed = TRANSLATED_FIELDS.filter((f) => hasText(source[f]))
  if (needed.length === 0) return 'full' // переводить нечего
  const done = needed.filter((f) => hasText(target[f]))
  if (done.length === 0) return 'none'
  return done.length === needed.length ? 'full' : 'partial'
}

const rowFor = (rows: LocaleStatusRow[], locale: string): LocaleStatusRow | undefined =>
  rows.find((r) => r.locale === locale)

/**
 * Пересчёт после записи ИСХОДНОЙ локали: перевод не трогали, но исходник мог уехать вперёд.
 * `sourceHash` перевода здесь только читается — переписывать его записью оригинала нельзя,
 * иначе перевод немедленно объявит себя актуальным, ничего не переводя.
 */
export function onSourceChanged(
  existing: LocaleStatusRow[],
  hash: string,
  targets: Array<{ locale: string; translated: boolean }>,
): LocaleStatusRow[] {
  return targets.map(({ locale, translated }) => {
    const prev = rowFor(existing, locale)
    if (!translated) return { locale, status: 'missing', sourceHash: null, translatedAt: null }
    if (!prev?.sourceHash) {
      return { locale, status: 'review', sourceHash: null, translatedAt: prev?.translatedAt ?? null }
    }
    return {
      locale,
      status: prev.sourceHash === hash ? 'current' : 'stale',
      sourceHash: prev.sourceHash,
      translatedAt: prev.translatedAt ?? null,
    }
  })
}

/**
 * Запись факта перевода — тот самый недостающий писатель.
 * Только полный перевод вправе назваться `current`: наполовину переведённый документ,
 * объявленный актуальным, — это ровно та ложная уверенность, которой быть не должно.
 */
export function onTranslationSaved(
  existing: LocaleStatusRow[],
  locale: string,
  sourceHash: string,
  coverage: Coverage,
  now: string,
  targets: string[],
): LocaleStatusRow[] {
  const next: LocaleStatusRow =
    coverage === 'full'
      ? { locale, status: 'current', sourceHash, translatedAt: now }
      : coverage === 'partial'
        ? { locale, status: 'review', sourceHash: null, translatedAt: now }
        : { locale, status: 'missing', sourceHash: null, translatedAt: null }

  // Остальные локали не трогаем: перевод на русский ничего не сообщает о немецком.
  return targets.map((l) =>
    l === locale
      ? next
      : (rowFor(existing, l) ?? { locale: l, status: 'missing', sourceHash: null, translatedAt: null }),
  )
}

/**
 * Сводка по документу для колонки в списке админки.
 *
 * Нужна отдельным полем, потому что `localeStatus` — массив, а массив Payload колонкой в списке не
 * показывает и сортировать по нему нельзя. Без сводки «что осталось перевести» пришлось бы
 * открывать документы по одному.
 */
export function summarizeTranslation(rows: LocaleStatusRow[], targets: string[]): LocaleState {
  if (targets.length === 0) return 'current'
  const states = targets.map((l) => rowFor(rows, l)?.status ?? 'missing')
  return SEVERITY.find((s) => states.includes(s)) ?? 'current'
}
