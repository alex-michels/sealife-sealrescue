import {
  requireSection,
  sectionMetadata,
  type RouteParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { SectionShell } from '@/app/(frontend)/_components/mock/SectionShell'
import { ReportForm } from '@/app/(frontend)/_components/mock/ReportForm'

const SLUG = 'report'

export function generateMetadata({ params }: { params: RouteParams }) {
  return sectionMetadata(params, SLUG)
}

export default async function ReportPage({ params }: { params: RouteParams }) {
  const { locale, section } = await requireSection(params, SLUG)
  return (
    <SectionShell locale={locale} title={section.title[locale]} intro={section.intro[locale]} narrow>
      <ReportForm locale={locale} />
    </SectionShell>
  )
}
