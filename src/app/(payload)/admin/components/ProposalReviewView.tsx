import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { notFound } from 'next/navigation'
import { ProposalQueue } from './ProposalQueue'

export async function ProposalReviewView(props: AdminViewServerProps) {
  const { req, visibleEntities } = props.initPageResult
  if (!req.user || !['admin', 'editor'].includes(req.user.role)) notFound()
  return (
    <DefaultTemplate {...props} req={req} visibleEntities={visibleEntities}>
      <Gutter>
        <ProposalQueue language={req.i18n.language === 'ru' ? 'ru' : 'en'} />
      </Gutter>
    </DefaultTemplate>
  )
}
