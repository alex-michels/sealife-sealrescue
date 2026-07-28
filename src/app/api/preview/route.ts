import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import config from '@payload-config'
import { safeRedirectPath } from '@/preview/paths'

/**
 * Включение предпросмотра черновика (**CR-08**).
 *
 * Живёт под `/api/...`, который прокси не переписывает (matcher в `src/proxy.ts`), поэтому путь
 * приходит сюда как есть — без подстановки сайта и локали.
 *
 * ## Что здесь важнее фичи — гейт
 * Draft-режим у Next это cookie: включив его, браузер начинает видеть черновики на детальных
 * страницах. Значит **весь контроль доступа сосредоточен в этом обработчике**, и он обязан:
 *  1. требовать сессию сотрудника (Payload-cookie того же origin, что и админка);
 *  2. принимать только относительный путь — иначе получаем открытый редирект с нашего домена.
 *
 * Роль проверяем по той же матрице, что и чтение черновиков в access control
 * (`readPublishedOrStaff`): аноним не должен получить draft-режим ни при каких аргументах.
 */
const STAFF = ['admin', 'editor', 'translator', 'viewer'] as const

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = safeRedirectPath(url.searchParams.get('path'))

  if (!path) {
    return new Response('Bad preview path', { status: 400 })
  }

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })

  // Агент сюда не ходит СОЗНАТЕЛЬНО: он служебный и работает по API-ключу, браузерного
  // предпросмотра ему не нужно, а лишняя роль в гейте — лишняя поверхность.
  if (!user || !(STAFF as readonly string[]).includes(String(user.role))) {
    return new Response('Unauthorized', { status: 401 })
  }

  const draft = await draftMode()
  draft.enable()
  redirect(path)
}
