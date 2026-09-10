import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { leaderboardRead, leaderboardStart, leaderboardSubmit } from '@/endpoints/leaderboard'

const payload = { find: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }
let ip = 0
const request = (url: string, init: RequestInit = {}) =>
  Object.assign(
    new Request('http://localhost/api/' + url, {
      ...init,
      headers: { 'x-forwarded-for': 'sr-test-' + ++ip, ...init.headers },
    }),
    { payload },
  ) as unknown as PayloadRequest
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-06T23:59:55Z'))
  vi.clearAllMocks()
  payload.find.mockImplementation(async ({ collection }) =>
    collection === 'games'
      ? { docs: [{ id: 17 }] }
      : { docs: [], totalDocs: 0, hasNextPage: false },
  )
  payload.count.mockResolvedValue({ totalDocs: 0 })
  payload.create.mockResolvedValue({ id: 9 })
})
afterEach(() => vi.useRealTimers())
async function ticket() {
  const response = await leaderboardStart.handler(request('leaderboard/start?game=seal-run'))
  return { data: await response.json(), cookie: response.headers.get('set-cookie')!, response }
}
async function submit(token: string, seed: number, patch: Record<string, unknown> = {}) {
  const body = {
    game: 'seal-run',
    token,
    seed,
    score: 1400,
    durationMs: 10000,
    rounds: [
      { distanceM: 5, fishCollected: 0, fishPoints: 0, livesRemaining: 3, durationMs: 10000 },
    ],
    ...patch,
  }
  return leaderboardSubmit.handler(
    request('leaderboard', { method: 'POST', body: JSON.stringify(body) }),
  )
}
describe('SR-10 endpoint dispatch and season boundary', () => {
  it('pins a late Sunday run to its issued season, persists derived fields and consumes the token', async () => {
    const { data, response } = await ticket()
    expect(response.headers.get('cache-control')).toBe('no-store')
    vi.setSystemTime(Date.now() + 10000)
    const accepted = await submit(data.token, data.seed)
    expect(accepted.status).toBe(200)
    const result = await accepted.json()
    expect(result.season).toBe(data.season)
    expect(result.resetAt).toBe('2026-09-07T00:00:00.000Z')
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          game: 17,
          score: 1400,
          distance: 5,
          livesRemaining: 3,
          fishCollected: 0,
          levelsCompleted: 0,
          courseSeed: 'expedition-1:' + data.season,
          season: data.season,
        }),
      }),
    )
    expect((await submit(data.token, data.seed)).status).toBe(409)
  })
  it('rejects identity substitution, fabricated course budgets and Hunter-shaped runner submissions', async () => {
    const { data } = await ticket()
    vi.setSystemTime(Date.now() + 10000)
    expect((await submit(data.token, (data.seed + 1) >>> 0)).status).toBe(401)
    expect((await submit(data.token, data.seed, { rounds: undefined })).status).toBe(422)
    expect((await submit(data.token, data.seed, { score: 2000 })).status).toBe(422)
    expect(payload.create).not.toHaveBeenCalled()
  })
  it('reads the personal best using the functional cookie and sends no public cache headers', async () => {
    const { data, cookie } = await ticket()
    payload.find.mockImplementation(async ({ collection }) =>
      collection === 'games'
        ? { docs: [{ id: 17 }] }
        : {
            docs: [{ score: 1400, alias: 'Seal', nameParts: { noun: 0 }, suffix: 0 }],
            totalDocs: 1,
            hasNextPage: false,
          },
    )
    const response = await leaderboardRead.handler(
      request('leaderboard?game=seal-run', { headers: { cookie: cookie.split(';')[0] } }),
    )
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ personalBest: 1400, season: data.season })
  })
  it('preserves the 50–70 second Hunter window', async () => {
    const response = await leaderboardStart.handler(
      request('leaderboard/start?game=seal-the-hunter'),
    )
    const data = await response.json()
    vi.setSystemTime(Date.now() + 65000)
    expect(
      (
        await submit(data.token, 1, {
          game: 'seal-the-hunter',
          score: 42,
          durationMs: 10000,
          rounds: undefined,
        })
      ).status,
    ).toBe(422)
    expect(
      (
        await submit(data.token, 1, {
          game: 'seal-the-hunter',
          score: 42,
          durationMs: 60000,
          rounds: undefined,
        })
      ).status,
    ).toBe(200)
  })
})
