/**
 * Loading-граница раздела (M0-T19 / DESIGN_BRIEF §4c): скелет без сдвига layout (CLS-safe).
 * Показывается во время навигации, которая ждёт данные (напр. лента главной из Payload).
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10" aria-hidden="true">
      <div className="h-9 w-1/3 rounded bg-border" />
      <div className="mt-4 h-4 w-2/3 rounded bg-border opacity-60" />
      <ul className="card-grid mt-8">
        {Array.from({ length: 6 }).map((_, i) => (
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
