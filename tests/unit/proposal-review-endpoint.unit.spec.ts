import { expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
const mocks = vi.hoisted(() => ({ review: vi.fn() }))
vi.mock('@/agents/reviewService', () => ({ reviewProposal: mocks.review }))
import { proposalReview } from '@/endpoints/proposalReview'
import { ReviewError } from '@/agents/proposalReview'

const request = (overrides: Record<string, unknown> = {}) =>
  ({
    user: { role: 'editor' },
    routeParams: { id: '1' },
    url: 'https://cms.example/api/agent-proposals/1/review',
    headers: new Headers({ Origin: 'https://cms.example' }),
    text: async () => '{}',
    ...overrides,
  }) as unknown as PayloadRequest
it.each(['agent', 'translator', 'viewer', null])(
  'rejects non-editors before reading bodies (%s)',
  async (role) => {
    const text = vi.fn()
    const result = await proposalReview.handler(request({ user: role ? { role } : null, text }))
    expect(result.status).toBe(403)
    expect(text).not.toHaveBeenCalled()
  },
)
it('rejects cross-origin requests, malformed IDs and oversized/invalid bodies', async () => {
  expect(
    (
      await proposalReview.handler(
        request({ headers: new Headers({ Origin: 'https://attacker.example' }) }),
      )
    ).status,
  ).toBe(403)
  expect((await proposalReview.handler(request({ routeParams: { id: 'x' } }))).status).toBe(400)
  expect(
    (await proposalReview.handler(request({ text: async () => 'x'.repeat(50_001) }))).status,
  ).toBe(413)
  expect((await proposalReview.handler(request({ text: async () => 'no-json' }))).status).toBe(400)
})
it('returns typed conflict codes without internal exception details', async () => {
  mocks.review.mockRejectedValueOnce(new ReviewError('target_changed'))
  const result = await proposalReview.handler(request())
  expect(result.status).toBe(409)
  expect(await result.json()).toEqual({ error: 'target_changed' })
  mocks.review.mockRejectedValueOnce(new Error('secret database details'))
  expect(await (await proposalReview.handler(request())).json()).toEqual({
    error: 'invalid_request',
  })
})
it('returns successful review results without caching', async () => {
  mocks.review.mockResolvedValueOnce({ status: 'applied', targetId: 5 })
  const response = await proposalReview.handler(request())
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(await response.json()).toEqual({ status: 'applied', targetId: 5 })
})
