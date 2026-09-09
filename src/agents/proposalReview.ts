import { isDeepStrictEqual } from 'node:util'
import { z } from 'zod'
import type { AgentProposal, RescueCenter } from '@/payload-types'
import { validateResearcherProposal, type ResearcherProposal } from './researcherContract'

export class ReviewError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 409,
  ) {
    super(code)
  }
}

export const reviewRequestSchema = z.strictObject({
  action: z.enum(['approve', 'reject', 'edit', 'apply']),
  expectedUpdatedAt: z.iso.datetime(),
  notes: z.string().max(2000).default(''),
  values: z.record(z.string(), z.json()).optional(),
})
export type ReviewRequest = z.infer<typeof reviewRequestSchema>

/** Legacy/unstructured proposals remain visible but cannot be automatically applied. */
export function storedResearcherProposal(doc: AgentProposal): ResearcherProposal {
  try {
    const diff = z
      .record(z.string(), z.strictObject({ from: z.json(), to: z.json() }))
      .parse(doc.diff)
    const evidence = z
      .object({
        schemaVersion: z.literal(1),
        locale: z.literal('en'),
        sources: z.array(z.unknown()),
        claims: z.array(z.unknown()),
        snapshots: z
          .array(
            z.strictObject({
              sourceId: z.number().int().positive(),
              url: z.string().url(),
              checkedAt: z.iso.datetime(),
              text: z.string().min(1).max(100_000),
            }),
          )
          .min(1)
          .max(30),
      })
      .parse(doc.evidence)
    const proposal = validateResearcherProposal(
      {
        schemaVersion: 1,
        locale: 'en',
        summary: doc.summary,
        proposalType: doc.proposalType,
        targetCollection: doc.targetCollection,
        targetId: doc.targetId ?? null,
        diff: Object.entries(diff).map(([field, change]) => ({ field, ...change })),
        sources: evidence.sources,
        evidence: evidence.claims,
        confidence: doc.confidence,
      },
      evidence.snapshots,
    )
    if (!proposal) throw new Error('empty')
    const ids = doc.sources
      .map((source) => (typeof source === 'number' ? source : source.id))
      .sort((a, b) => a - b)
    if (
      !isDeepStrictEqual(
        ids,
        proposal.sources.map((source) => source.sourceId).sort((a, b) => a - b),
      )
    )
      throw new Error('sources')
    return proposal
  } catch {
    throw new ReviewError('unsupported_or_invalid_proposal', 422)
  }
}

function fieldValue(field: string, value: unknown): unknown {
  if (field === 'socialLinks') {
    if (!Array.isArray(value)) return value ?? []
    return value.map((item: unknown) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item
      const link = item as Record<string, unknown>
      return { platform: link.platform, url: link.url }
    })
  }
  if (field === 'operatingLanguages') return value ?? []
  return value ?? null
}

export function centerDraftData(proposal: ResearcherProposal, target: RescueCenter | null) {
  if ((proposal.proposalType === 'new_center') !== (target === null))
    throw new ReviewError('target_mismatch')
  if (target) {
    for (const change of proposal.diff) {
      if (
        !isDeepStrictEqual(
          fieldValue(change.field, target[change.field]),
          fieldValue(change.field, change.from),
        )
      ) {
        throw new ReviewError('target_changed')
      }
    }
  }
  const changes = Object.fromEntries(proposal.diff.map(({ field, to }) => [field, to]))
  const previousSources =
    target?.sources?.map((source) => (typeof source === 'number' ? source : source.id)) ?? []
  return {
    ...changes,
    _status: 'draft' as const,
    // Approval to draft is not a factual verification. Never carry old verification stamps to changed facts.
    status: (changes.status === 'link_broken' || changes.status === 'unconfirmed'
      ? changes.status
      : 'needs_check') as RescueCenter['status'],
    verificationScore: null,
    lastCheckedAt: null,
    verifiedByAgentAt: null,
    verifiedByHumanAt: null,
    sources: [
      ...new Set([...previousSources, ...proposal.sources.map((source) => source.sourceId)]),
    ],
  }
}

export function editProposal(doc: AgentProposal, input: unknown): AgentProposal['diff'] {
  const proposal = storedResearcherProposal(doc)
  const parsed = z.record(z.string(), z.json()).safeParse(input)
  if (!parsed.success) throw new ReviewError('invalid_edit', 422)
  const values = parsed.data
  if (
    Object.keys(values).length !== proposal.diff.length ||
    proposal.diff.some((change) => !Object.hasOwn(values, change.field))
  )
    throw new ReviewError('invalid_edit', 422)
  const diff = Object.fromEntries(
    proposal.diff.map((change) => [change.field, { from: change.from, to: values[change.field] }]),
  )
  storedResearcherProposal({ ...doc, diff })
  return diff
}
