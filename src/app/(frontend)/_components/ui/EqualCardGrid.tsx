import type { HTMLAttributes } from 'react'
import { cx } from './cx'

/**
 * Равномерная сетка карточек (DESIGN_BRIEF §4b): равная ширина в строке, последняя
 * строка заполняет доступную ширину (не зажата слева, не masonry). Дети — элементы
 * списка. Стили в `.card-grid` (globals.css), чтобы неполный ряд растягивался.
 */
export function EqualCardGrid({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cx('card-grid', className)} {...props} />
}
