import type { Media } from '@/payload-types'
import { PlaceholderMedia } from '../mock/PlaceholderMedia'
import { cx } from '../ui/cx'
import { coverAlt } from '@/media/alt'

/**
 * Обложка контента: реальная картинка из Payload media (depth>=1) или, если её нет,
 * декоративная PlaceholderMedia. Аспект фиксирован заранее → без CLS (DESIGN_BRIEF §14).
 *
 * **CR-04.** Два режима кадрирования, и разница смысловая, а не косметическая:
 *  - `crop` (по умолчанию) — обложка как декор: жёсткий `16/10`, ровная сетка карточек;
 *  - `natural` — картинка И ЕСТЬ содержание (детальная страница мема). Резать её в `16/10`
 *    значит отрезать верх и низ у портретного скриншота на странице, весь смысл которой —
 *    показать эту картинку.
 *
 * `alt` считает `coverAlt()`: после CR-01 locale-fallback выключен, поэтому alt, заполненный
 * только на исходной локали, на другой приходит пустым. Для декора пустой `alt=""` корректен по
 * WCAG 1.1.1, для смысловой картинки передаётся запасной текст (см. `src/media/alt.ts`).
 */
export function Cover({
  image,
  seed = 0,
  label,
  className,
  fit = 'crop',
  altFallback,
}: {
  image?: number | Media | null
  seed?: number
  label?: string
  className?: string
  /** 'crop' — фиксированный 16/10 (декор-обложка); 'natural' — своё соотношение сторон. */
  fit?: 'crop' | 'natural'
  /** Запасной alt, когда картинка несёт смысл, а переведённого alt нет. */
  altFallback?: string | null
}) {
  if (image && typeof image === 'object' && image.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- media-домены не сконфигурированы под next/image; CLS закрыт aspect + width/height.
      <img
        src={image.url}
        alt={coverAlt(image, altFallback)}
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        loading="lazy"
        className={cx(
          fit === 'crop' ? 'aspect-[16/10] w-full object-cover' : 'h-auto w-full',
          className,
        )}
      />
    )
  }
  return <PlaceholderMedia seed={seed} label={label} className={className} />
}
