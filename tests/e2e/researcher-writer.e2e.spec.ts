import { randomUUID } from 'node:crypto'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { test, expect } from '@playwright/test'
import { AgentCMSClient } from '../../src/agents/cmsClient'
import { runResearcher } from '../../src/agents/researcherWriter'
import example from '../../docs/agents/researcher-example.json'
import snapshot from '../../docs/agents/researcher-example-snapshot.json'

test('Researcher uses a real service key and can only queue pending proposals', async ({
  request,
}) => {
  test.setTimeout(120_000)
  const payload = await getPayload({ config })
  const prefix = `writer-${randomUUID()}`
  const apiKey = randomUUID()
  const user = await payload.create({
    collection: 'users',
    data: {
      email: `${prefix}@test.local`,
      password: randomUUID(),
      role: 'agent',
      enableAPIKey: true,
      apiKey,
    },
  })
  const source = await payload.create({
    collection: 'sources',
    data: { url: snapshot.url, type: 'official' },
  })
  const runIDs: number[] = []
  const proposalIDs: number[] = []
  let contentID: number | undefined
  try {
    const client = new AgentCMSClient('http://localhost:3000', apiKey)
    // Track failed runs too, so cleanup removes exactly this test's records.
    const create = client.create.bind(client)
    client.create = async (collection, data) => {
      const id = await create(collection, data)
      ;(collection === 'agent-runs' ? runIDs : proposalIDs).push(id)
      return id
    }
    const checkedAt = new Date().toISOString()
    const output = {
      ...example,
      summary: prefix,
      sources: example.sources.map((s) => ({ ...s, sourceId: source.id, checkedAt })),
      evidence: example.evidence.map((e) => ({ ...e, sourceId: source.id })),
    }
    const snapshots = [{ ...snapshot, sourceId: source.id, checkedAt }]
    const result = await runResearcher(client, async () => ({ output, snapshots }))
    expect(result.outcome).toBe('queued')
    const proposal = await payload.findByID({
      collection: 'agent-proposals',
      id: result.proposalId!,
      depth: 0,
    })
    expect(proposal.status).toBe('pending')
    expect(proposal.agentRun).toBe(result.runId)
    const run = await payload.findByID({ collection: 'agent-runs', id: result.runId })
    expect(run).toMatchObject({ status: 'success', proposalsCreated: 1 })

    await expect(runResearcher(client, async () => ({ output: {}, snapshots }))).rejects.toThrow()
    expect(proposalIDs).toHaveLength(1)
    const abstained = await runResearcher(client, async () => ({ output: null, snapshots: [] }))
    expect(abstained.outcome).toBe('abstained')
    expect(proposalIDs).toHaveLength(1)
    const headers = { Authorization: `users API-Key ${apiKey}` }
    expect(
      (
        await request.patch(`http://localhost:3000/api/agent-proposals/${proposal.id}`, {
          headers,
          data: { status: 'approved' },
        })
      ).status(),
    ).toBe(403)
    expect(
      (
        await request.delete(`http://localhost:3000/api/agent-proposals/${proposal.id}`, {
          headers,
        })
      ).status(),
    ).toBe(403)
    expect(
      (
        await request.post('http://localhost:3000/api/rescue-centers', {
          headers,
          data: { name: prefix, slug: prefix, country: 'test' },
        })
      ).status(),
    ).toBe(403)
    const contentResponse = await request.post('http://localhost:3000/api/content', {
      headers,
      data: { type: 'article', title: prefix, slug: prefix, _status: 'published' },
    })
    expect(contentResponse.ok()).toBe(true)
    const content = (await contentResponse.json()).doc
    contentID = content.id
    expect(content._status).toBe('draft')
    expect(
      (
        await request.delete(`http://localhost:3000/api/content/${content.id}`, { headers })
      ).status(),
    ).toBe(403)
  } finally {
    for (const id of proposalIDs) await payload.delete({ collection: 'agent-proposals', id })
    for (const id of runIDs) await payload.delete({ collection: 'agent-runs', id })
    if (contentID) await payload.delete({ collection: 'content', id: contentID })
    await payload.delete({ collection: 'sources', id: source.id })
    await payload.delete({ collection: 'users', id: user.id })
  }
})
