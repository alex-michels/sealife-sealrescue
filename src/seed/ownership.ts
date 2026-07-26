/**
 * «Эта запись всё ещё принадлежит сиду?» (Roadmap **CR-03**).
 *
 * ## Что было сломано
 * `seedM1` делает upsert **по slug** и всегда перезаписывает title/excerpt/topics/body, сбрасывая
 * `_status` в draft и провенанс в «черновик писал AI». Занятых slug'ов 12 — среди них
 * `why-seals-cry`, `about`, `grey-seal`. Первая же настоящая статья, написанная под таким slug'ом,
 * умирала при следующем `npm run seed:m1`: текст заменён, публикация снята, авторство переписано
 * на AI. Причём без единой ошибки в логе — сид отчитался бы «updated».
 *
 * ## Правило
 * Сид обновляет запись, только если она всё ещё выглядит так, как он её оставил. Любой след
 * человека — стоп. Три независимых признака, и достаточно одного:
 *
 * | признак | почему это стоп |
 * |---|---|
 * | `_status === 'published'` | публикация — человеческое действие (инвариант №1); снять её сидом значит удалить материал с сайта |
 * | `provenance.humanReviewed` | текст вычитан человеком; перезапись стёрла бы и текст, и сам факт вычитки |
 * | заголовок отличается от сидового | запись отредактировали — что бы там ни было, это уже не демо-строка |
 *
 * Проверка заголовка нарочно сравнивает с тем, что сид **собирался** записать: сид точно знает
 * своё содержимое, поэтому расхождение однозначно означает чужую правку. Это дешевле и честнее,
 * чем хранить отдельный флаг «сеяно», который рассинхронизируется с реальностью.
 *
 * ## Чего это правило НЕ делает
 * Не защищает от `--force` (он для того и есть) и не восстанавливает уже затёртое. Это гейт на
 * запись, а не бэкап.
 */

export type SeedSkipReason = 'published' | 'humanReviewed' | 'edited'

export type SeedOwnershipInput = {
  _status?: string | null
  provenance?: { humanReviewed?: boolean | null } | null
}

export type SeedOwnership = { owned: true } | { owned: false; reason: SeedSkipReason }

/**
 * ⚠️ Заголовок передаётся ДВУМЯ явными аргументами, а не читается с документа. У коллекций поле
 * называется по-разному (`content.title`, `species.name`), и первая версия читала `existing.title`
 * — у видов его нет, поэтому сравнение всегда шло с `undefined`, и сид молча пропускал ВСЕ виды
 * как «отредактированные». Ошибка тихая ровно в ту же сторону, что и исходный баг, поэтому API
 * теперь не позволяет её повторить.
 *
 * @param existing      запись из БД в ИСХОДНОЙ локали (в ней сид пишет общие поля)
 * @param currentTitle  текущее значение заголовка/имени в БД
 * @param seedTitle     значение, которое сид записал бы в исходной локали
 */
export function seedOwnership(
  existing: SeedOwnershipInput,
  currentTitle: string | null | undefined,
  seedTitle: string,
): SeedOwnership {
  if (existing._status === 'published') return { owned: false, reason: 'published' }
  if (existing.provenance?.humanReviewed) return { owned: false, reason: 'humanReviewed' }
  if ((currentTitle ?? '') !== seedTitle) return { owned: false, reason: 'edited' }
  return { owned: true }
}

/** Человекочитаемое объяснение для лога сида — чтобы пропуск был виден, а не молчалив. */
export const skipExplanation: Record<SeedSkipReason, string> = {
  published: 'опубликована человеком',
  humanReviewed: 'вычитана человеком',
  edited: 'отредактирована (заголовок не совпадает с сидовым)',
}
