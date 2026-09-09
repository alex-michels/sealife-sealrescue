import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { PayloadRequest, RequiredDataFromCollectionSlug } from 'payload'
import { APPLY_PROPOSAL, REVIEW_PROPOSAL } from '@/hooks/proposalLifecycle'
import {
  centerDraftData,
  editProposal,
  ReviewError,
  reviewRequestSchema,
  storedResearcherProposal,
} from './proposalReview'

/** All reads and writes share the same transaction; row locks serialize concurrent applications. */
export async function reviewProposal(req: PayloadRequest, id: number, input: unknown) {
  if (!req.user || !['admin', 'editor'].includes(req.user.role))
    throw new ReviewError('editor_required', 403)
  const parsed = reviewRequestSchema.safeParse(input)
  if (!parsed.success) throw new ReviewError('invalid_request', 400)
  const action = parsed.data
  const payload = req.payload
  if (req.transactionID) throw new ReviewError('nested_review_transaction', 409)
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new ReviewError('transactions_required', 503)
  req.transactionID = transactionID
  const previousLocale = req.locale
  req.locale = 'en'
  try {
    const db = payload.db.sessions?.[transactionID]?.db as
      | Pick<PostgresAdapter['drizzle'], 'execute'>
      | undefined
    if (!db) throw new ReviewError('transactions_required', 503)
    await db.execute(sql`SELECT id FROM agent_proposals WHERE id = ${id} FOR UPDATE`)
    const doc = await payload.findByID({
      collection: 'agent-proposals',
      id,
      req,
      overrideAccess: false,
      depth: 0,
    })
    const evidence =
      doc.evidence && typeof doc.evidence === 'object' && !Array.isArray(doc.evidence)
        ? doc.evidence
        : {}
    if (doc.status === 'applied' && action.action === 'apply') {
      await payload.db.commitTransaction(transactionID)
      return { status: 'applied', targetId: evidence.appliedTargetId ?? doc.targetId }
    }
    if (doc.updatedAt !== action.expectedUpdatedAt) throw new ReviewError('proposal_changed')
    if (doc.status === 'applied') throw new ReviewError('already_applied')
    const history = Array.isArray(evidence.reviewHistory) ? evidence.reviewHistory : []
    if (history.length >= 100) throw new ReviewError('review_history_limit')
    const reviewedEvidence = {
      ...evidence,
      reviewHistory: [
        ...history,
        {
          action: action.action,
          actorId: req.user.id,
          at: new Date().toISOString(),
          notes: action.notes,
          // Preserve the reviewed revision's diff even if a later edit supersedes it.
          diff: doc.diff ?? null,
        },
      ],
    }
    const common = { req, overrideAccess: false as const, depth: 0 }
    if (action.action !== 'apply') {
      if (action.action === 'approve' || action.action === 'reject') {
        if (doc.status !== 'pending') throw new ReviewError('pending_proposal_required')
        if (action.action === 'approve') storedResearcherProposal(doc)
      }
      const result = await payload.update({
        ...common,
        collection: 'agent-proposals',
        id,
        context: { ...req.context, [REVIEW_PROPOSAL]: true },
        data: {
          status:
            action.action === 'approve'
              ? 'approved'
              : action.action === 'reject'
                ? 'rejected'
                : 'pending',
          ...(action.action === 'edit' ? { diff: editProposal(doc, action.values) } : {}),
          reviewerNotes: action.notes,
          evidence: reviewedEvidence,
        },
      })
      await payload.db.commitTransaction(transactionID)
      return { status: result.status, targetId: result.targetId }
    }
    if (doc.status !== 'approved') throw new ReviewError('approved_proposal_required')
    const proposal = storedResearcherProposal(doc)
    let target = null
    if (proposal.targetId !== null) {
      const targetId = Number(proposal.targetId)
      if (!Number.isSafeInteger(targetId) || targetId <= 0)
        throw new ReviewError('invalid_target', 422)
      // Also blocks version inserts via the parent FK while the current draft is compared and written.
      await db.execute(sql`SELECT id FROM rescue_centers WHERE id = ${targetId} FOR UPDATE`)
      target = await payload.findByID({
        ...common,
        collection: 'rescue-centers',
        id: targetId,
        draft: true,
      })
    }
    const data = centerDraftData(proposal, target)
    const draft = target
      ? await payload.update({
          ...common,
          collection: 'rescue-centers',
          id: target.id,
          draft: true,
          data,
        })
      : await payload.create({
          ...common,
          collection: 'rescue-centers',
          draft: true,
          data: data as RequiredDataFromCollectionSlug<'rescue-centers'>,
        })
    await payload.update({
      ...common,
      collection: 'agent-proposals',
      id,
      context: { ...req.context, [APPLY_PROPOSAL]: true },
      data: {
        status: 'applied',
        targetId: String(draft.id),
        reviewerNotes: action.notes,
        evidence: { ...reviewedEvidence, appliedTargetId: draft.id },
      },
    })
    await payload.db.commitTransaction(transactionID)
    return { status: 'applied', targetId: draft.id }
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    if (error instanceof ReviewError) throw error
    throw new ReviewError('review_failed', 409)
  } finally {
    delete req.transactionID
    req.locale = previousLocale
  }
}
