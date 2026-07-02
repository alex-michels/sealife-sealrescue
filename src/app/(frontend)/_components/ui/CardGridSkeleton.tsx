/**
 * Скелет карточной сетки без сдвига layout (CLS-safe, DESIGN_BRIEF §4c).
 * Используется в loading.tsx списочных разделов и как Suspense-fallback ленты главной.
 *
 * NB (M0-T19): скелеты живут ТОЛЬКО на списочных страницах (loading.tsx раздела
 * или route-группы `(list)`) и во внутренних <Suspense>. У детальных роутов
 * loading-границы НЕТ намеренно: границей выше notFound() страница стримится
 * со статусом 200 (soft-404), а без неё отдаёт настоящий HTTP 404.
 */
export function CardGridSkeleton({
  header = false,
  count = 6,
}: {
  /** Плейсхолдер заголовка/подводки раздела (для loading.tsx целой страницы). */
  header?: boolean
  count?: number
}) {
  return (
    <div className={header ? 'mx-auto max-w-5xl px-5 py-10' : undefined} aria-hidden="true">
      {header && (
        <>
          <div className="h-9 w-1/3 rounded bg-border" />
          <div className="mt-4 h-4 w-2/3 rounded bg-border opacity-60" />
        </>
      )}
      <ul className={header ? 'card-grid mt-8' : 'card-grid'}>
        {Array.from({ length: count }).map((_, i) => (
          <li key={i}>
            <div className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface">
              <div className="aspect-[16/10] bg-surface-info opacity-60" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-border" />
                <div className="h-3 w-full rounded bg-border opacity-60" />
                <div className="h-3 w-5/6 rounded bg-border opacity-60" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
