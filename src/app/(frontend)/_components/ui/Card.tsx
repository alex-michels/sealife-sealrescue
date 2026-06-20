import type { HTMLAttributes } from 'react'
import { cx } from './cx'

/** Базовая карточка: поверхность темы, радиус и тонкая линия. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('bg-card rounded-card border border-line p-6', className)} {...props} />
}
