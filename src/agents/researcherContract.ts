import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { AgentProposal } from '@/payload-types'

const text = z.string().min(1).max(2000).regex(/\S/)
const httpUrl = z
  .string()
  .url()
  .max(2048)
  .regex(/^https?:\/\//)
const sourceId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)

// Explicit field allowlist: no lifecycle, permissions, provenance, or human verification fields.
export const researcherFields = [
  'name',
  'slug',
  'country',
  'region',
  'website',
  'email',
  'phone',
  'address',
  'location',
  'socialLinks',
  'operatingLanguages',
  'status',
] as const
const field = z.enum(researcherFields)
const change = <F extends string, T extends z.ZodType>(name: F, value: T) =>
  z.strictObject({ field: z.literal(name), from: z.json(), to: value })

const changeSchema = z.discriminatedUnion('field', [
  change('name', text),
  change(
    'slug',
    z
      .string()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ),
  change('country', text),
  change('region', text.nullable()),
  change('website', httpUrl.nullable()),
  change('email', z.string().email().max(320).nullable()),
  change('phone', text.nullable()),
  change('address', text.nullable()),
  change(
    'location',
    z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]).nullable(),
  ),
  change(
    'socialLinks',
    z
      .array(
        z.strictObject({
          platform: z.enum([
            'instagram',
            'facebook',
            'tiktok',
            'linkedin',
            'youtube',
            'vk',
            'telegram',
            'x',
            'other',
          ]),
          url: httpUrl,
        }),
      )
      .max(30),
  ),
  change('operatingLanguages', z.array(z.enum(['ru', 'en', 'de', 'other'])).max(4)),
  change('status', z.enum(['active', 'unconfirmed', 'link_broken', 'needs_check'])),
])

const common = {
  schemaVersion: z.literal(1),
  // Proposals are written in the source locale; centre names and contacts stay verbatim.
  locale: z.literal('en'),
  targetCollection: z.literal('rescue-centers'),
  summary: z.string().min(1).max(500).regex(/\S/),
  diff: z.array(changeSchema).min(1).max(researcherFields.length),
  sources: z
    .array(
      z.strictObject({
        sourceId,
        url: httpUrl,
        checkedAt: z.iso.datetime(),
        snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .min(1)
    .max(30),
  evidence: z
    .array(z.strictObject({ field, sourceId, quote: text }))
    .min(1)
    .max(64),
  confidence: z.number().min(0).max(1),
}

/** M2-T06: structural output contract, also exported as provider-neutral JSON Schema. */
export const researcherProposalSchema = z.discriminatedUnion('proposalType', [
  z.strictObject({ ...common, proposalType: z.literal('new_center'), targetId: z.null() }),
  z.strictObject({ ...common, proposalType: z.literal('center_update'), targetId: text }),
  z.strictObject({ ...common, proposalType: z.literal('broken_link'), targetId: text }),
])

export type ResearcherProposal = z.infer<typeof researcherProposalSchema>
/** null is an explicit abstention: no supported change or insufficient evidence. */
export const researcherOutputSchema = researcherProposalSchema.nullable()

export function researcherJSONSchema() {
  return z.toJSONSchema(researcherOutputSchema, { target: 'draft-2020-12', reused: 'ref' })
}

/** Supplied by the trusted fetcher, separately from model output. Hash the exact extracted text. */
export interface SourceSnapshot {
  sourceId: number
  url: string
  checkedAt: string
  text: string
}

/** Structural validation alone cannot prove that a model actually quoted a fetched source. */
export function validateResearcherProposal(
  input: unknown,
  snapshots: readonly SourceSnapshot[],
  now: Date = new Date(),
): ResearcherProposal | null {
  const proposal = researcherOutputSchema.parse(input)
  if (proposal === null) return null
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid verification clock')
  const changes = new Map(proposal.diff.map((entry) => [entry.field, entry]))
  if (changes.size !== proposal.diff.length) throw new Error('Duplicate diff field')
  for (const entry of proposal.diff) {
    if (JSON.stringify(entry.from) === JSON.stringify(entry.to)) throw new Error('Empty change')
  }
  if (proposal.proposalType === 'new_center') {
    if (!['name', 'slug', 'country'].every((key) => proposal.diff.some((d) => d.field === key))) {
      throw new Error('A new centre requires name, slug and country')
    }
    if (proposal.diff.some((d) => d.from !== null))
      throw new Error('A new centre has no previous values')
  }

  const sources = new Map(proposal.sources.map((source) => [source.sourceId, source]))
  if (sources.size !== proposal.sources.length) throw new Error('Duplicate source ID')
  const trusted = new Map(snapshots.map((snapshot) => [snapshot.sourceId, snapshot]))
  if (trusted.size !== snapshots.length) throw new Error('Ambiguous trusted snapshots')
  for (const source of proposal.sources) {
    const snapshot = trusted.get(source.sourceId)
    const url = new URL(source.url)
    if (url.username || url.password) throw new Error('Source URL contains credentials')
    if (!snapshot || snapshot.url !== source.url || snapshot.checkedAt !== source.checkedAt) {
      throw new Error('Source does not match trusted fetch metadata')
    }
    if (Date.parse(source.checkedAt) > now.getTime())
      throw new Error('Source check is in the future')
    const hash = createHash('sha256').update(snapshot.text, 'utf8').digest('hex')
    if (source.snapshotHash !== hash) throw new Error('Source snapshot hash mismatch')
  }

  const citedFields = new Set<string>()
  const citedSources = new Set<number>()
  for (const evidence of proposal.evidence) {
    if (!changes.has(evidence.field)) throw new Error('Evidence refers to an absent change')
    if (!sources.has(evidence.sourceId)) throw new Error('Evidence refers to an undeclared source')
    const snapshot = trusted.get(evidence.sourceId)!
    if (!snapshot.text.includes(evidence.quote))
      throw new Error('Quote is not verbatim in the snapshot')
    citedFields.add(evidence.field)
    citedSources.add(evidence.sourceId)
  }
  if (citedFields.size !== changes.size) throw new Error('Every change requires quoted evidence')
  if (citedSources.size !== sources.size) throw new Error('Every source must be cited')
  return proposal
}

type PendingProposal = Pick<
  AgentProposal,
  | 'summary'
  | 'proposalType'
  | 'targetCollection'
  | 'targetId'
  | 'diff'
  | 'evidence'
  | 'sources'
  | 'confidence'
> & { status: 'pending' }

/** Pure adapter for M2-T09. Does not fetch, write, publish, apply, or change access control. */
export function prepareResearcherProposal(
  input: unknown,
  snapshots: readonly SourceSnapshot[],
  now?: Date,
): PendingProposal | null {
  const proposal = validateResearcherProposal(input, snapshots, now)
  if (proposal === null) return null
  return {
    summary: proposal.summary,
    proposalType: proposal.proposalType,
    targetCollection: proposal.targetCollection,
    targetId: proposal.targetId,
    diff: Object.fromEntries(proposal.diff.map(({ field, from, to }) => [field, { from, to }])),
    evidence: {
      schemaVersion: proposal.schemaVersion,
      locale: proposal.locale,
      sources: proposal.sources,
      claims: proposal.evidence,
    },
    sources: proposal.sources.map((source) => source.sourceId),
    confidence: proposal.confidence,
    status: 'pending',
  }
}
