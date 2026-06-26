import {
  requireSection,
  sectionMetadata,
  type RouteParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { SectionShell } from '@/app/(frontend)/_components/mock/SectionShell'
import { RescueQuest } from '@/app/(frontend)/_components/mock/RescueQuest'

const SLUG = 'rescue-quest'

export function generateMetadata({ params }: { params: RouteParams }) {
  return sectionMetadata(params, SLUG)
}

export default async function RescueQuestPage({ params }: { params: RouteParams }) {
  const { locale, section } = await requireSection(params, SLUG)
  return (
    <SectionShell locale={locale} title={section.title[locale]} intro={section.intro[locale]} narrow>
      <RescueQuest locale={locale} />
    </SectionShell>
  )
}
