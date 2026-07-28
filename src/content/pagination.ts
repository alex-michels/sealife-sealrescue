/**
 * Пагинация списков (Roadmap **CR-07**).
 *
 * ## Что было
 * У всех списочных запросов стоял `pagination: false` — то есть каждый показ раздела читал таблицу
 * целиком. На девяти черновиках это невидимо, а на 50–100 документах (горизонт M1-T07: 20
 * evergreen-статей плюс новости плюс мемы) страница начинает тянуть всё сразу. Хуже всего галерея
 * мемов: обложка каждого приезжает с `depth: 1` и рендерится полноразмерной картинкой.
 *
 * ## Почему номера страниц, а не «показать ещё»
 * «Показать ещё» — это клиентский JS и состояние, которого у нас нет и которое противоречит
 * бюджету («минимум client JS», CLAUDE.md). Номерная пагинация через `?page=` работает в server
 * components, переживает выключенный JS, даёт краулеру ссылки и делится ссылкой как есть.
 */

/** Сколько карточек на страницу. Одно число на все списки — сетка у них общая. */
export const PER_PAGE = 12

/**
 * Номер страницы из query. Всё, что не похоже на номер, — первая страница: параметр приходит
 * снаружи, и падать из-за `?page=abc` роут не должен.
 */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) return 1
  return n
}

/** Сколько всего страниц. Ноль документов — всё равно одна страница (с пустым состоянием). */
export function pageCount(totalDocs: number, perPage: number = PER_PAGE): number {
  return Math.max(1, Math.ceil(totalDocs / perPage))
}

/**
 * Ссылка на страницу списка с сохранением прочих параметров (например `?topic=`).
 * Первая страница — без `page` в URL: канонический адрес раздела не должен зависеть от того,
 * пришли на него по ссылке или пролистали назад.
 */
export function pageHref(
  basePath: string,
  page: number,
  params: Record<string, string | undefined> = {},
): string {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) q.set(key, value)
  }
  if (page > 1) q.set('page', String(page))
  const qs = q.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

/**
 * Окно номеров вокруг текущей страницы: 1 … n-1 n n+1 … last.
 * Без окна на сотне страниц пагинация сама становится стеной ссылок.
 * `null` — разрыв («…»).
 */
export function pageWindow(current: number, total: number, radius = 1): Array<number | null> {
  if (total <= 1) return [1]
  const wanted = new Set<number>([1, total])
  for (let p = current - radius; p <= current + radius; p++) {
    if (p >= 1 && p <= total) wanted.add(p)
  }

  const sorted = [...wanted].sort((a, b) => a - b)
  const out: Array<number | null> = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push(null)
    out.push(p)
    prev = p
  }
  return out
}
