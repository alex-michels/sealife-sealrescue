import type { Media } from '@/payload-types'
import { PlaceholderMedia } from '../mock/PlaceholderMedia'
import { cx } from '../ui/cx'

/**
 * Обложка контента: реальная картинка из Payload media (depth>=1) или, если её нет,
 * декоративная PlaceholderMedia. Аспект фиксирован заранее → без CLS (DESIGN_BRIEF §14).
 * alt берётся из media (он обязателен в схеме) — пустой только для декор-заглушки.
 */
export function Cover({
  image,
  seed = 0,
  label,
  className,
}: {
  image?: number | Media | null
  seed?: number
  label?: string
  className?: string
}) {
  if (image && typeof image === 'object' && image.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- media-домены не сконфигурированы под next/image; CLS закрыт aspect + width/height.
      <img
        src={image.url}
        // alt локализован; при чтении без locale-fallback'а (напр. section-content
        // c fallbackLocale:false) может прийти пустым — тогда alt="" (декоративная),
        // а не отсутствующий атрибут (скринридер прочёл бы имя файла).
        alt={image.alt ?? ''}
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        loading="lazy"
        className={cx('aspect-[16/10] w-full object-cover', className)}
      />
    )
  }
  return <PlaceholderMedia seed={seed} label={label} className={className} />
}
