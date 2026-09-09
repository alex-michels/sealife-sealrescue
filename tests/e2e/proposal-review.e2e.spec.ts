import { randomUUID } from 'node:crypto'
import { getPayload } from 'payload'
import { expect, test } from '@playwright/test'
import config from '../../src/payload.config'
import { prepareResearcherProposal } from '../../src/agents/researcherContract'
import { login } from '../helpers/login'
import example from '../../docs/agents/researcher-example.json'
import snapshot from '../../docs/agents/researcher-example-snapshot.json'

test('editor reviews, edits, approves and applies a proposal without publishing', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000)
  const payload = await getPayload({ config })
  const unique = `review-ui-${randomUUID()}`
  const user = { email: `${unique}@test.local`, password: randomUUID(), role: 'editor' as const }
  const account = await payload.create({ collection: 'users', data: user })
  const agentKey = randomUUID()
  const agent = await payload.create({
    collection: 'users',
    data: {
      role: 'agent',
      email: `agent-${unique}@test.local`,
      password: randomUUID(),
      enableAPIKey: true,
      apiKey: agentKey,
    },
  })
  const source = await payload.create({
    collection: 'sources',
    data: { url: snapshot.url, type: 'official', trustLevel: 0.9 },
  })
  const centre = await payload.create({
    collection: 'rescue-centers',
    data: {
      name: unique,
      slug: unique,
      country: 'Test',
      status: 'needs_check',
      address: null,
      _status: 'published',
    },
  })
  const checkedAt = new Date().toISOString()
  const snapshots = [{ ...snapshot, sourceId: source.id, checkedAt }]
  const prepared = prepareResearcherProposal(
    {
      ...example,
      summary: unique,
      targetId: String(centre.id),
      sources: example.sources.map((s) => ({ ...s, sourceId: source.id, checkedAt })),
      evidence: example.evidence.map((e) => ({ ...e, sourceId: source.id })),
    },
    snapshots,
  )!
  const proposal = await payload.create({
    collection: 'agent-proposals',
    data: { ...prepared, evidence: { ...(prepared.evidence as object), snapshots } },
  })
  try {
    expect(
      (
        await request.post(`http://localhost:3000/api/agent-proposals/${proposal.id}/review`, {
          headers: { Authorization: `users API-Key ${agentKey}` },
          data: { action: 'approve', expectedUpdatedAt: proposal.updatedAt },
        })
      ).status(),
    ).toBe(403)
    await login({ page, user })
    await page.goto('http://localhost:3000/admin/agent-review')
    await expect(page.getByRole('heading', { name: 'Agent review', exact: true })).toBeVisible()
    const card = page.getByRole('article', { name: unique })
    await expect(card).toBeVisible()
    await expect(
      card.getByRole('cell', { name: JSON.stringify(example.diff[0].to), exact: true }),
    ).toBeVisible()
    await card.getByText('Edit proposed values (JSON)', { exact: true }).click()
    await card
      .getByRole('textbox', { name: 'Edit proposed values (JSON)' })
      .fill(JSON.stringify({ address: 'Human edited test address' }))
    await card.getByRole('button', { name: 'Save changes for review' }).click()
    await expect(
      card.getByRole('cell', { name: '"Human edited test address"', exact: true }),
    ).toBeVisible()
    await card.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(card).toHaveCount(0)
    await page.getByRole('combobox', { name: 'Queue status' }).selectOption('approved')
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Apply as draft' }).click()
    await expect(card.getByRole('link', { name: 'Open centre draft' })).toHaveAttribute(
      'href',
      `/admin/collections/rescue-centers/${centre.id}`,
    )
    const publicResponse = await request.get(
      `http://localhost:3000/api/rescue-centers/${centre.id}`,
    )
    expect(publicResponse.ok()).toBe(true)
    expect((await publicResponse.json()).address).toBeNull()
    const draft = await payload.findByID({
      collection: 'rescue-centers',
      id: centre.id,
      draft: true,
    })
    expect(draft).toMatchObject({
      address: 'Human edited test address',
      _status: 'draft',
      status: 'needs_check',
    })
    await page.getByRole('combobox', { name: 'Queue status' }).selectOption('rejected')
    await expect(page.getByText('No proposals in this queue.')).toBeVisible()
  } finally {
    await payload.delete({ collection: 'agent-proposals', id: proposal.id })
    await payload.delete({ collection: 'rescue-centers', id: centre.id })
    await payload.delete({ collection: 'sources', id: source.id })
    await payload.delete({ collection: 'users', id: agent.id })
    await payload.delete({ collection: 'users', id: account.id })
  }
})
