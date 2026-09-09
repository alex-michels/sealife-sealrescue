'use client'
import Link from 'next/link'
import { useAuth, useTranslation } from '@payloadcms/ui'

export function ProposalReviewLink() {
  const { user } = useAuth()
  const { i18n } = useTranslation()
  if (!user || !['admin', 'editor'].includes(user.role)) return null
  return (
    <Link className="nav__link" href="/admin/agent-review">
      {i18n.language === 'ru' ? 'Предложения агентов' : 'Agent review'}
    </Link>
  )
}
