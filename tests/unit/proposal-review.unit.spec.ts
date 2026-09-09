import { expect, it } from 'vitest'
import type { AgentProposal, RescueCenter } from '@/payload-types'
import type { PayloadRequest } from 'payload'
import { prepareResearcherProposal } from '@/agents/researcherContract'
import { centerDraftData, editProposal, storedResearcherProposal } from '@/agents/proposalReview'
import { APPLY_PROPOSAL, guardProposalLifecycle } from '@/hooks/proposalLifecycle'
import example from '../../docs/agents/researcher-example.json'
import snapshot from '../../docs/agents/researcher-example-snapshot.json'

const pending = prepareResearcherProposal(example, [snapshot])!
const doc = {
  ...pending,
  id: 1,
  createdAt: snapshot.checkedAt,
  updatedAt: snapshot.checkedAt,
  evidence: { ...(pending.evidence as object), snapshots: [snapshot] },
} as AgentProposal
const target = {
  id: 101,
  name: 'Test',
  slug: 'test',
  country: 'Test',
  address: null,
  verifiedByHumanAt: snapshot.checkedAt,
  status: 'active',
  sources: [2],
} as RescueCenter

it('revalidates stored evidence and builds an unpublished draft with verification reset', () => {
  const proposal = storedResearcherProposal(doc)
  expect(centerDraftData(proposal, target)).toMatchObject({
    address: example.diff[0].to,
    _status: 'draft',
    status: 'needs_check',
    verifiedByHumanAt: null,
    verifiedByAgentAt: null,
    verificationScore: null,
    sources: [2, 1],
  })
})
it.each([
  { evidence: {} },
  { diff: { _status: { from: 'draft', to: 'published' } } },
  { sources: [999] },
  { confidence: 2 },
])('refuses malformed or tampered persisted proposals', (change) => {
  expect(() => storedResearcherProposal({ ...doc, ...change })).toThrow(
    'unsupported_or_invalid_proposal',
  )
})
it('rejects stale before-values and an absent target', () => {
  const proposal = storedResearcherProposal(doc)
  expect(() => centerDraftData(proposal, { ...target, address: 'new human edit' })).toThrow(
    'target_changed',
  )
  expect(() => centerDraftData(proposal, null)).toThrow('target_mismatch')
})
it('allows human edits only to the existing, supported change fields', () => {
  expect(editProposal(doc, { address: 'Edited address' })).toEqual({
    address: { from: null, to: 'Edited address' },
  })
  for (const values of [
    undefined,
    {},
    { phone: 'x' },
    { address: 42 },
    { address: 'x', _status: 'published' },
  ]) {
    expect(() => editProposal(doc, values)).toThrow()
  }
})
it('normalizes generated social-link row IDs when comparing current data', () => {
  const proposal = {
    ...storedResearcherProposal(doc),
    diff: [
      {
        field: 'socialLinks' as const,
        from: [{ platform: 'facebook', url: 'https://example.com', id: 'old-row' }],
        to: [{ platform: 'facebook' as const, url: 'https://example.com/new' }],
      },
    ],
  }
  expect(() =>
    centerDraftData(proposal, {
      ...target,
      socialLinks: [{ platform: 'facebook', url: 'https://example.com', id: 'new-row' }],
    }),
  ).not.toThrow()
})
const hookArgs = {
  operation: 'update' as const,
  req: { user: { role: 'editor' } } as PayloadRequest,
  context: {},
  collection: {} as never,
}
it('blocks direct applied status and modification of an already applied record', () => {
  expect(() =>
    guardProposalLifecycle({ ...hookArgs, data: { status: 'applied' }, originalDoc: doc }),
  ).toThrow('Use the review queue')
  expect(() =>
    guardProposalLifecycle({ ...hookArgs, data: {}, originalDoc: { ...doc, status: 'applied' } }),
  ).toThrow('Applied proposals are immutable')
})
it('invalidates approval on native CMS edits and forces agent submissions to pending', async () => {
  expect(
    await guardProposalLifecycle({
      ...hookArgs,
      data: { summary: 'edit', status: 'approved' },
      originalDoc: { ...doc, status: 'approved' },
    }),
  ).toMatchObject({ status: 'pending' })
  expect(
    await guardProposalLifecycle({
      ...hookArgs,
      req: { user: { role: 'agent' } } as PayloadRequest,
      data: { status: 'approved', reviewerNotes: 'pretend review' },
      originalDoc: undefined,
    }),
  ).toMatchObject({ status: 'pending', reviewerNotes: null })
  expect(
    await guardProposalLifecycle({
      ...hookArgs,
      context: { [APPLY_PROPOSAL]: true },
      data: { status: 'applied' },
      originalDoc: doc,
    }),
  ).toMatchObject({ status: 'applied' })
})
