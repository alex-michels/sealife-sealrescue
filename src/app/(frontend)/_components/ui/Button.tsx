import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'accent' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-btn font-medium transition-opacity disabled:opacity-50 disabled:pointer-events-none'

const variants: Record<ButtonVariant, string> = {
  // primary — балтийский тил, основной CTA.
  primary: 'bg-primary text-fog hover:opacity-90',
  // accent — сигнальный коралл (--buoy). ТОЛЬКО критичные CTA («что делать»).
  // Текст светлый + крупный/жирный → контраст AA для large-text (DESIGN_BRIEF §6).
  accent: 'bg-accent text-fog font-semibold hover:opacity-90',
  // ghost — второстепенные действия.
  ghost: 'bg-transparent text-fg border border-line hover:bg-card',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
}

/** Классы кнопки для переиспользования на ссылках (`<a>` / `<Link>`). */
export const buttonClasses = (
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string => cx(base, variants[variant], sizes[size], className)

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: Props) {
  return <button className={buttonClasses(variant, size, className)} {...props} />
}
