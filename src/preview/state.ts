import { draftMode } from 'next/headers'

/**
 * Включён ли предпросмотр черновиков в этом запросе (**CR-08**).
 *
 * Обёртка над `draftMode()` нужна по двум причинам. Во-первых, вызов делает роут динамическим —
 * это надо держать на виду, а не разбрасывать по страницам (у нас всё и так SSR per-request,
 * см. `docs/localization.md`). Во-вторых, вне запроса (сборка, сид, тесты) `draftMode()` бросает,
 * а «предпросмотра нет» — единственный безопасный ответ по умолчанию: fail-closed, черновик
 * скорее не покажем, чем покажем случайно.
 */
export async function isPreview(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled
  } catch {
    return false
  }
}
