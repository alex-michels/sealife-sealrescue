import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, expect, it } from 'vitest'
import type { User } from '@/payload-types'

let payload: Payload
let agent: User
let translator: User
const ids: number[] = []
beforeAll(async () => {
  payload = await getPayload({ config })
  agent = await payload.create({
    collection: 'users',
    data: {
      role: 'agent',
      email: `trust-agent-${randomUUID()}@test.local`,
      password: randomUUID(),
    },
  })
  translator = await payload.create({
    collection: 'users',
    data: {
      role: 'translator',
      email: `trust-translator-${randomUUID()}@test.local`,
      password: randomUUID(),
    },
  })
}, 120_000)
afterAll(async () => {
  if (!payload) return
  for (const id of ids) await payload.delete({ collection: 'sources', id })
  if (agent) await payload.delete({ collection: 'users', id: agent.id })
  if (translator) await payload.delete({ collection: 'users', id: translator.id })
  await payload.db.destroy?.()
})
it('rejects self-approval and destination substitution through real Payload hooks', async () => {
  const candidate = await payload.create({
    collection: 'sources',
    user: agent,
    overrideAccess: false,
    data: { url: 'https://centre.example/contact', type: 'official', trustLevel: 1 },
  })
  ids.push(candidate.id)
  expect(candidate.trustLevel).toBe(0)
  // Privileged fixture simulates an editor's independent approval.
  await payload.update({ collection: 'sources', id: candidate.id, data: { trustLevel: 0.9 } })
  for (const actor of [agent, translator]) {
    for (const data of [
      { trustLevel: 1 },
      { url: 'https://attacker.example' },
      { type: 'manual' as const },
    ]) {
      await expect(
        payload.update({
          collection: 'sources',
          id: candidate.id,
          data,
          user: actor,
          overrideAccess: false,
        }),
      ).rejects.toThrow('Source approval fields require an editor')
    }
  }
  await payload.update({
    collection: 'sources',
    id: candidate.id,
    data: { lastFetchedAt: new Date().toISOString() },
    user: agent,
    overrideAccess: false,
  })
  const stored = await payload.findByID({ collection: 'sources', id: candidate.id })
  expect(stored).toMatchObject({
    trustLevel: 0.9,
    url: 'https://centre.example/contact',
    type: 'official',
  })
})
