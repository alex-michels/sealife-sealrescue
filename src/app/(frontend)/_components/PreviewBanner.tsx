import { chromeLocale, type RouteLocale } from '@/i18n/config'
import { isPreview } from '@/preview/state'

const copy = {
  ru: { note: 'Предпросмотр черновика — читатели этого не видят', exit: 'Выйти' },
  en: { note: 'Draft preview — readers do not see this', exit: 'Exit' },
} as const

/**
 * Плашка режима предпросмотра (**CR-08**).
 *
 * Обязательная часть фичи, а не украшение: draft-режим живёт в cookie и внешне неотличим от
 * обычного сайта. Без явной плашки и кнопки выхода редактор остаётся в нём и принимает черновики
 * за опубликованное — то есть инструмент, сделанный ради честной картинки, начинает врать.
 *
 * Ничего не рендерит, когда режим выключен, поэтому висит в layout без вреда для читателя.
 */
export async function PreviewBanner({ locale }: { locale: RouteLocale }) {
  if (!(await isPreview())) return null
  const t = copy[chromeLocale(locale)]

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-3 bg-buoy-dark px-4 py-2 text-center font-mono text-xs text-white"
    >
      <span>{t.note}</span>
      {/*
        eslint-disable-next-line @next/next/no-html-link-for-pages -- это route handler, а не
        страница: он снимает cookie draft-режима и редиректит. Клиентская навигация <Link> не
        применила бы Set-Cookie (и вдобавок префетчила бы эндпоинт), поэтому нужен полноценный
        переход документа.
      */}
      <a href="/api/preview/exit" className="underline underline-offset-2 hover:no-underline">
        {t.exit}
      </a>
    </div>
  )
}
