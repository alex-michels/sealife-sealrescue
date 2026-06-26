'use client'

import { useState } from 'react'
import type { Locale } from '@/i18n/config'
import { m } from '@/mock/copy'
import { buttonClasses } from '../ui/Button'

/** Карта — toggle поверх list-first локатора (DESIGN_BRIEF §7). Сам список всегда виден. */
export function MapToggle({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false)
  const c = m(locale)
  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="map-region"
        className={buttonClasses('ghost', 'sm')}
      >
        {c.mapToggle}
      </button>
      {open && (
        <div
          id="map-region"
          className="mt-3 flex aspect-[16/7] items-center justify-center rounded-card border border-border bg-surface-info p-6 text-center text-sm text-muted"
        >
          {c.mapPlaceholder}
        </div>
      )}
    </div>
  )
}
