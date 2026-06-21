import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isSite, sites, siteBaseUrl } from '@/site/config'
import { CookieControls } from '@/app/(frontend)/_components/consent/CookieControls'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>
}): Promise<Metadata> {
  const { site } = await params
  if (!isSite(site)) return {}
  return {
    title: 'Cookies',
    alternates: { canonical: `${siteBaseUrl(sites[site])}/de/cookies` },
  }
}

export default async function DeCookiesPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  if (!isSite(site)) notFound()

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-4xl">Cookies &amp; Analyse</h1>
      <div className="article-body mt-6">
        <p>
          Diese Website nutzt Plausible Analytics — einen datenschutzfreundlichen Analysedienst.
          Er verwendet keine Cookies, erhebt keine personenbezogenen Daten und identifiziert
          Besucher nicht. Besuchsdaten werden aggregiert verarbeitet und nicht an Dritte
          weitergegeben.
        </p>
        <p>
          Die Analyse wird nur mit Ihrer ausdrücklichen Einwilligung (Opt-in) aktiviert: vor der
          Einwilligung wird kein Skript geladen. Ihre Einwilligungsentscheidung wird in einem
          unbedingt erforderlichen Cookie gespeichert.
        </p>
        <p>Sie können Ihre Entscheidung jederzeit unten ändern oder widerrufen.</p>
      </div>
      <CookieControls lang="de" />
    </div>
  )
}
