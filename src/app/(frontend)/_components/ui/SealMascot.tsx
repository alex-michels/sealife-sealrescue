import { cx } from './cx'

/**
 * Маскот-тюлень — общий иконочный логотип ОБОИХ сайтов (DESIGN_BRIEF §5: усы, крап,
 * тонкая ирония, без «милого зверинца»). Один компонент, без дублирования SVG. Чистый
 * SVG, никакого client JS. Декоративный (aria-hidden): смысл несёт текстовый вордмарк рядом.
 *
 * `animated` включает CSS-анимации (иногда моргает / показывает язык «blep»). Применяем
 * только на hero sealife. Маленький логотип в header и весь sealrescue (calm-тон) —
 * статичные. Анимации висят на `[data-site='sealife'] .seal-mascot--animated` (globals.css)
 * и гасятся prefers-reduced-motion. Сам SVG не двигается.
 *
 * Цвета: шкура = --seal-coat (очень светлый whitecoat-серый, см. globals.css),
 * глаза/нос = text(ink), язык = accent(buoy, декор), мордочка = surface.
 */
export function SealMascot({
  size = 32,
  animated = false,
  className,
}: {
  size?: number
  animated?: boolean
  className?: string
}) {
  return (
    <svg
      className={cx('seal-mascot', animated && 'seal-mascot--animated', className)}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Голова (шкура = очень светлый whitecoat-серый); тёмный ink-контур держит контраст с фоном. */}
      <path
        d="M32 7C17.5 7 8 17 8 31c0 14 10.5 26 24 26s24-12 24-26C56 17 46.5 7 32 7Z"
        fill="var(--seal-coat)"
        stroke="var(--color-text)"
        strokeWidth="2"
      />
      {/* Мягкий белый блик на макушке — намёк на пушистую whitecoat-шерсть. */}
      <ellipse cx="25" cy="16" rx="7" ry="3.6" fill="#ffffff" opacity="0.4" />

      {/* Мордочка — светлая подушечка под нос/усы/язык. */}
      <ellipse cx="32" cy="41" rx="13" ry="9" fill="var(--color-surface)" />

      {/* Язык (buoy/accent, декор). Растёт вниз изо рта — см. seal-tongue в globals.css. */}
      <g className="seal-tongue">
        <path
          d="M29 46c0-1 6-1 6 0v4c0 3-6 3-6 0v-4Z"
          fill="var(--color-accent)"
          stroke="var(--color-text)"
          strokeWidth="1"
        />
        <line
          x1="32"
          y1="47"
          x2="32"
          y2="51"
          stroke="var(--color-critical)"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>

      {/* Глаза (ink) + блик (surface). Каждый глаз моргает (seal-blink, scaleY). */}
      <g className="seal-eye">
        <ellipse cx="23" cy="29" rx="4.6" ry="5.6" fill="var(--color-text)" />
        <circle cx="21.3" cy="26.8" r="1.5" fill="var(--color-surface)" />
      </g>
      <g className="seal-eye">
        <ellipse cx="41" cy="29" rx="4.6" ry="5.6" fill="var(--color-text)" />
        <circle cx="39.3" cy="26.8" r="1.5" fill="var(--color-surface)" />
      </g>

      {/* Нос + желобок + лёгкий рот (ink), поверх языка. */}
      <path
        d="M27 37.5c0-1.8 10-1.8 10 0 0 2.7-3.5 4.7-5 4.7s-5-2-5-4.7Z"
        fill="var(--color-text)"
      />
      <path
        d="M32 42.2v3.3M32 45.5c-3 1.5-5 1-6.5-0.5M32 45.5c3 1.5 5 1 6.5-0.5"
        stroke="var(--color-text)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Усы (muted) — фирменный «усатый» мотив (ср. WhiskerDivider). */}
      <g
        stroke="var(--color-muted)"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M20 38.5C14 37.5 11 37 7 36.5" />
        <path d="M20 41C13.5 41 10 41 6 41.5" />
        <path d="M20 43.5C14 44.5 11 45.5 8 47" />
        <path d="M44 38.5C50 37.5 53 37 57 36.5" />
        <path d="M44 41C50.5 41 54 41 58 41.5" />
        <path d="M44 43.5C50 44.5 53 45.5 56 47" />
      </g>
    </svg>
  )
}
