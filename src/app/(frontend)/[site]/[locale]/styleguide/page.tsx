import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { isSite } from '@/site/config'
import { Button } from '@/app/(frontend)/_components/ui/Button'
import { Card } from '@/app/(frontend)/_components/ui/Card'
import { WhiskerDivider } from '@/app/(frontend)/_components/ui/WhiskerDivider'
import { StatusDot, type CenterStatus } from '@/app/(frontend)/_components/ui/StatusDot'

// Внутренняя страница-референс дизайн-системы — не индексируем.
export const metadata: Metadata = { title: 'Styleguide', robots: { index: false, follow: false } }

const palette = [
  ['--fog', '#E9ECEC', 'bg-fog'],
  ['--ink', '#16262B', 'bg-ink'],
  ['--baltic', '#1E5B5B', 'bg-baltic'],
  ['--pebble', '#A99C8C', 'bg-pebble'],
  ['--buoy', '#EE5A36', 'bg-buoy'],
  ['--sandbank', '#E7D9C0', 'bg-sandbank'],
] as const

const statuses: CenterStatus[] = ['active', 'needs_check', 'link_broken', 'unconfirmed']

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-8">
      <h2 className="mb-4 text-2xl">{title}</h2>
      {children}
    </section>
  )
}

function ThemeDemo({ theme }: { theme: 'sealife' | 'sealrescue' }) {
  return (
    <div data-theme={theme} className="flex-1 rounded-card bg-canvas p-5">
      <p className="mb-3 font-mono text-xs uppercase tracking-wide text-muted">
        data-theme=&quot;{theme}&quot;
      </p>
      <Card className="mb-3">
        <h3 className="text-xl">Карточка</h3>
        <p className="mt-1 text-muted">Радиус и поверхность зависят от темы.</p>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary">Primary</Button>
        <Button variant="accent">Что делать</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </div>
  )
}

export default async function StyleguidePage({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}) {
  const { site, locale } = await params
  if (!isSite(site) || !isLocale(locale)) notFound()

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-4xl text-primary">Дизайн-система</h1>
      <p className="mt-2 text-muted">Токены и примитивы — DESIGN_BRIEF v1 (M0-T16…T18).</p>

      <Section title="Палитра">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {palette.map(([name, hex, bg]) => (
            <div key={name} className="overflow-hidden rounded-card border border-line">
              <div className={`${bg} h-16`} />
              <div className="p-3 font-mono text-xs">
                <div>{name}</div>
                <div className="text-muted">{hex}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Тип-шкала">
        <div className="space-y-1">
          <p className="text-5xl">Тюлень-Инфо 5xl</p>
          <p className="text-4xl">Заголовок 4xl</p>
          <p className="text-3xl">Заголовок 3xl</p>
          <p className="text-2xl">Подзаголовок 2xl</p>
          <p className="text-xl">Крупный текст xl</p>
          <p className="text-base">Основной текст — жрун, лежбище, ластоногие. base</p>
          <p className="font-mono text-sm text-muted">Моно: Проверено · агент 12.06 · sm</p>
        </div>
      </Section>

      <Section title="Кнопки">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg">
            Primary lg
          </Button>
          <Button variant="primary">Primary md</Button>
          <Button variant="primary" size="sm">
            Primary sm
          </Button>
          <Button variant="accent" size="lg">
            Что делать →
          </Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </Section>

      <Section title="«Усатый» разделитель (signature sealife)">
        <WhiskerDivider />
      </Section>

      <Section title="Статус-точки центров (sealrescue)">
        <div className="flex flex-wrap gap-5">
          {statuses.map((s) => (
            <StatusDot key={s} status={s} locale={locale} showLabel />
          ))}
        </div>
      </Section>

      <Section title="Два режима">
        <div className="flex flex-col gap-4 sm:flex-row">
          <ThemeDemo theme="sealife" />
          <ThemeDemo theme="sealrescue" />
        </div>
      </Section>
    </div>
  )
}
