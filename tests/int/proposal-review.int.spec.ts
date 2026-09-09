import { randomUUID } from 'node:crypto'
import { createLocalReq, getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import config from '@/payload.config'
import type { AgentProposal, User } from '@/payload-types'
import { reviewProposal } from '@/agents/reviewService'
import { prepareResearcherProposal } from '@/agents/researcherContract'
import example from '../../docs/agents/researcher-example.json'
import snapshot from '../../docs/agents/researcher-example-snapshot.json'

let payload: Payload
let editor: User
let agent: User
let sourceID: number
const proposals: number[] = []
const centres: number[] = []
beforeAll(async () => {
  payload = await getPayload({ config })
  editor = await payload.create({
    collection: 'users',
    data: {
      role: 'editor',
      email: `review-editor-${randomUUID()}@test.local`,
      password: randomUUID(),
    },
  })
  agent = await payload.create({
    collection: 'users',
    data: {
      role: 'agent',
      email: `review-agent-${randomUUID()}@test.local`,
      password: randomUUID(),
    },
  })
  sourceID = (
    await payload.create({
      collection: 'sources',
      data: { url: snapshot.url, type: 'official', trustLevel: 0.9 },
    })
  ).id
}, 120_000)
afterAll(async () => {
  if (!payload) return
  for (const id of proposals) await payload.delete({ collection: 'agent-proposals', id })
  for (const id of [...new Set(centres)]) await payload.delete({ collection: 'rescue-centers', id })
  if (sourceID) await payload.delete({ collection: 'sources', id: sourceID })
  if (editor) await payload.delete({ collection: 'users', id: editor.id })
  if (agent) await payload.delete({ collection: 'users', id: agent.id })
  await payload.db.destroy?.()
}, 120_000)

async function fixture(newCentre = false) {
  const slug = `review-${randomUUID()}`
  const target = newCentre
    ? null
    : await payload.create({
        collection: 'rescue-centers',
        data: {
          name: 'Review test centre',
          slug,
          country: 'Test',
          address: null,
          _status: 'published',
          status: 'active',
          verifiedByHumanAt: snapshot.checkedAt,
          verificationScore: 1,
        },
      })
  if (target) centres.push(target.id)
  const checkedAt = new Date().toISOString()
  const snapshots = [{ ...snapshot, sourceId: sourceID, checkedAt }]
  const fields = newCentre
    ? [
        { field: 'name', from: null, to: 'New review centre' },
        { field: 'slug', from: null, to: slug },
        { field: 'country', from: null, to: 'Test' },
      ]
    : example.diff
  const prepared = prepareResearcherProposal(
    {
      ...example,
      proposalType: newCentre ? 'new_center' : 'center_update',
      targetId: target ? String(target.id) : null,
      diff: fields,
      sources: example.sources.map((s) => ({ ...s, sourceId: sourceID, checkedAt })),
      evidence: fields.map((field) => ({
        field: field.field,
        sourceId: sourceID,
        quote: snapshot.text,
      })),
    },
    snapshots,
  )!
  const doc = await payload.create({
    collection: 'agent-proposals',
    data: { ...prepared, evidence: { ...(prepared.evidence as object), snapshots } },
  })
  proposals.push(doc.id)
  return { doc, target }
}
async function act(doc: AgentProposal, action: string, extra = {}, user = editor) {
  return reviewProposal(await createLocalReq({ user, locale: 'ru' }, payload), doc.id, {
    action,
    expectedUpdatedAt: doc.updatedAt,
    notes: 'Fixture review',
    ...extra,
  })
}
const current = (id: number) => payload.findByID({ collection: 'agent-proposals', id, depth: 0 })
async function approve(doc: AgentProposal) {
  await act(doc, 'approve')
  return current(doc.id)
}

it('applies an approved change to a draft and preserves the published centre', async () => {
  const { doc, target } = await fixture()
  const approved = await approve(doc)
  await expect(act(approved, 'apply')).resolves.toMatchObject({
    status: 'applied',
    targetId: target!.id,
  })
  const publicDoc = await payload.findByID({
    collection: 'rescue-centers',
    id: target!.id,
    draft: false,
    overrideAccess: false,
  })
  expect(publicDoc).toMatchObject({ address: null, _status: 'published', status: 'active' })
  const draft = await payload.findByID({
    collection: 'rescue-centers',
    id: target!.id,
    draft: true,
    user: editor,
    overrideAccess: false,
  })
  expect(draft).toMatchObject({
    address: example.diff[0].to,
    _status: 'draft',
    status: 'needs_check',
    verifiedByHumanAt: null,
  })
  const applied = await current(doc.id)
  expect(applied.status).toBe('applied')
  expect(JSON.stringify(applied.evidence)).toContain('actorId')
  // Retry after a lost response is idempotent even with the previous updatedAt.
  await expect(act(approved, 'apply')).resolves.toMatchObject({ targetId: target!.id })
  await expect(
    payload.update({ collection: 'agent-proposals', id: doc.id, data: { summary: 'tamper' } }),
  ).rejects.toThrow('immutable')
})
it('creates exactly one unpublished centre under concurrent application', async () => {
  const { doc } = await fixture(true)
  const approved = await approve(doc)
  const results = await Promise.all([act(approved, 'apply'), act(approved, 'apply')])
  const id = Number(results[0].targetId)
  centres.push(id)
  expect(results[1].targetId).toBe(id)
  const visible = await payload.find({
    collection: 'rescue-centers',
    where: { id: { equals: id } },
    overrideAccess: false,
  })
  expect(visible.docs).toHaveLength(0)
})
it('refuses stale target values without applying the proposal', async () => {
  const { doc, target } = await fixture()
  const approved = await approve(doc)
  await payload.update({
    collection: 'rescue-centers',
    id: target!.id,
    draft: true,
    data: { address: 'newer human draft', _status: 'draft' },
  })
  await expect(act(approved, 'apply')).rejects.toThrow('target_changed')
  expect((await current(doc.id)).status).toBe('approved')
})
it('rolls back the centre draft when updating the proposal fails', async () => {
  const { doc, target } = await fixture()
  const approved = await approve(doc)
  const original = payload.update.bind(payload)
  const spy = vi.spyOn(payload, 'update').mockImplementation(async (args) => {
    if (
      args.collection === 'agent-proposals' &&
      'status' in args.data &&
      args.data.status === 'applied'
    )
      throw new Error('Injected failure')
    return original(args)
  })
  try {
    await expect(act(approved, 'apply')).rejects.toThrow('review_failed')
  } finally {
    spy.mockRestore()
  }
  expect((await current(doc.id)).status).toBe('approved')
  const targetAfter = await payload.findByID({
    collection: 'rescue-centers',
    id: target!.id,
    draft: true,
  })
  expect(targetAfter.address).toBeNull()
})
it('supports reject/edit/re-review and detects stale review submissions', async () => {
  const { doc } = await fixture()
  await act(doc, 'reject')
  await expect(act(doc, 'approve')).rejects.toThrow('proposal_changed')
  const rejected = await current(doc.id)
  await act(rejected, 'edit', { values: { address: 'Human-edited address' } })
  const edited = await current(doc.id)
  expect(edited.status).toBe('pending')
  expect(edited.diff).toEqual({ address: { from: null, to: 'Human-edited address' } })
  const approved = await approve(edited)
  await payload.update({
    collection: 'agent-proposals',
    id: approved.id,
    data: { summary: 'Native CMS edit' },
    user: editor,
    overrideAccess: false,
  })
  expect((await current(doc.id)).status).toBe('pending')
})
it('blocks agent decisions, premature apply, and direct applied status', async () => {
  const { doc } = await fixture()
  for (const action of ['approve', 'reject', 'edit', 'apply'])
    await expect(act(doc, action, {}, agent)).rejects.toThrow('editor_required')
  await expect(act(doc, 'apply')).rejects.toThrow('approved_proposal_required')
  await expect(
    payload.update({
      collection: 'agent-proposals',
      id: doc.id,
      data: { status: 'applied' },
      user: editor,
      overrideAccess: false,
    }),
  ).rejects.toThrow('Use the review queue')
})
