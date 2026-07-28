import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { safeRedirectPath } from '@/preview/paths'

/**
 * Выход из предпросмотра (**CR-08**). Без него редактор остаётся в draft-режиме и видит сайт не
 * тем, чем его видит читатель, — а понять это по внешнему виду невозможно.
 *
 * Гейта здесь нет намеренно: выключение режима ничего не раскрывает, а требовать сессию значит
 * запереть человека в предпросмотре, если сессия истекла.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const draft = await draftMode()
  draft.disable()
  redirect(safeRedirectPath(url.searchParams.get('path')) ?? '/')
}
