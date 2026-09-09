import { APIError, type CollectionBeforeChangeHook } from 'payload'

// Symbols cannot be supplied through REST/GraphQL request JSON.
export const APPLY_PROPOSAL = Symbol('apply-proposal')
export const REVIEW_PROPOSAL = Symbol('review-proposal')

export const guardProposalLifecycle: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
  context,
}) => {
  const internal = context as Record<symbol, unknown>
  if (originalDoc?.status === 'applied') throw new APIError('Applied proposals are immutable.', 409)
  if (data.status === 'applied' && internal[APPLY_PROPOSAL] !== true) {
    throw new APIError('Use the review queue to apply a proposal.', 403)
  }
  if (
    originalDoc?.status === 'approved' &&
    internal[APPLY_PROPOSAL] !== true &&
    internal[REVIEW_PROPOSAL] !== true
  ) {
    // An ordinary CMS edit invalidates approval even when its payload repeats status=approved.
    data.status = 'pending'
  }
  if (req.user?.role === 'agent') {
    data.status = 'pending'
    data.reviewerNotes = null
  }
  return data
}
