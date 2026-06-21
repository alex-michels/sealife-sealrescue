import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'critical' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

// min-h-11 (≈44px) для md/lg — комфортная цель на мобиле; sm ≥ 24px (WCAG 2.2 §2.5.8).
const base =
  'inline-flex items-center justify-center gap-2 rounded-btn font-medium transition-opacity disabled:opacity-50 disabled:pointer-events-none'

const variants: Record<ButtonVariant, string> = {
  // primary — балтийский тил (baltic + white ≈ 7.8:1 ✅).
  primary: 'bg-primary text-white hover:opacity-90',
  // critical — emergency CTA. --buoy-dark + white (✅), НЕ --buoy (3.4:1 ❌).
  critical: 'bg-critical text-white font-semibold hover:opacity-90',
  // ghost — второстепенные действия.
  ghost: 'border border-border bg-transparent text-text hover:bg-surface',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-6 px-3 py-1.5 text-sm',
  md: 'min-h-11 px-4 py-2 text-base',
  lg: 'min-h-11 px-6 py-3 text-lg',
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
