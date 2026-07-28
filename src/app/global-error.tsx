'use client'

/**
 * Последний рубеж обработки ошибок (Roadmap **CR-12**).
 *
 * ## Зачем он нужен отдельно от `error.tsx`
 * `[site]/[locale]/layout.tsx` — это КОРНЕВОЙ layout группы `(frontend)`: он рендерит `<html>` и
 * `<body>`, и layout'а выше него нет. А `error.tsx` по устройству Next не ловит ошибки layout'а
 * СВОЕГО сегмента. Значит падение в самом layout, `SiteHeader`, `SiteFooter` или компонентах
 * consent не попадало никуда и отдавало дефолтную неоформленную страницу Next — при том, что
 * спроектированный `ErrorBlock` в проекте есть и используется на уровень ниже.
 *
 * ## Почему разметка здесь примитивная и без наших компонентов
 * Этот boundary заменяет собой корневой layout целиком, поэтому обязан сам отдать `<html>`/`<body>`.
 * И срабатывает он именно тогда, когда layout сломан, — тянуть сюда шапку, футер, шрифты или
 * токены темы значит рисковать вторым падением в обработчике первого. Стили — инлайновые,
 * зависимостей ноль.
 *
 * Локаль здесь недоступна (мы вне сегмента `[locale]`), поэтому текст двуязычный: показать оба
 * языка честнее, чем угадать неверный.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#edf1f3',
          color: '#15303a',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <main>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.5rem' }}>
            Что-то пошло не так · Something went wrong
          </h1>
          <p style={{ margin: '0 0 1.5rem', color: '#4a6470' }}>
            Мы уже знаем об ошибке. Попробуйте обновить страницу.
            <br />
            We know about this error. Try reloading the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: '44px',
              padding: '0 1.25rem',
              borderRadius: '8px',
              border: '1px solid #1e5b5b',
              background: '#1e5b5b',
              color: '#edf1f3',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            Обновить · Reload
          </button>
        </main>
      </body>
    </html>
  )
}
