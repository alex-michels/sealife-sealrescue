import type { HTMLAttributes } from 'react'
import { cx } from './cx'

/** Базовая карточка: cool-поверхность темы, радиус (per-site) и тонкая линия. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-card border border-border bg-surface p-6', className)} {...props} />
  )
}
