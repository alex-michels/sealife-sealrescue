import { BENTO_SLOTS } from '@/content/bento'

/**
 * Скелет bento-хаба главной (M1-T05) — Suspense-fallback для `BentoToday`.
 *
 * Использует ТУ ЖЕ сетку `.bento` и те же `data-slot`, поэтому плитки встают в те же области и
 * подмена скелета контентом не сдвигает layout (CLS-safe, §4c/§14). Отдельный скелет с
 * «примерными» размерами дал бы прыжок ровно в момент прихода данных.
 *
 * Граница живёт вокруг блока, а не вокруг страницы: `loading.tsx` на уровне `[site]/[locale]`
 * заставил бы Next стримить `notFound()` со статусом 200 (soft-404) — см. CardGridSkeleton.
 */
export function BentoSkeleton() {
  return (
    <ul className="bento" aria-hidden="true">
      {BENTO_SLOTS.map((slot) => (
        <li key={slot} data-slot={slot}>
          <div className="flex h-full flex-col gap-3 rounded-card border border-border bg-surface p-6">
            <div className="h-3 w-24 rounded bg-border" />
            <div className="h-5 w-3/4 rounded bg-border opacity-60" />
            <div className="h-4 w-1/2 rounded bg-border opacity-40" />
          </div>
        </li>
      ))}
    </ul>
  )
}
