import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ request: vi.fn(), resolve: vi.fn() }))
vi.mock('node:https', () => ({ request: mocks.request }))
vi.mock('@/agents/sourcePolicy', async (original) => ({
  ...(await original<typeof import('@/agents/sourcePolicy')>()),
  resolvePublicSource: mocks.resolve,
}))
import { downloadSource } from '@/agents/sourceFetcher'

beforeEach(() => {
  mocks.request.mockReset()
  mocks.resolve.mockResolvedValue({ address: '93.184.216.34', family: 4 })
})
function response(status = 200, type = 'text/html', content = '<p>Contact</p>', encoding?: string) {
  mocks.request.mockImplementation((_options, callback) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void }
    req.end = () =>
      callback(
        Object.assign(Readable.from([Buffer.from(content)]), {
          statusCode: status,
          headers: { 'content-type': type, 'content-encoding': encoding },
        }),
      )
    return req
  })
}

it('pins the checked address while preserving certificate identity and Host', async () => {
  response()
  await expect(downloadSource(new URL('https://centre.example/contact?q=1'))).resolves.toBe(
    '<p>Contact</p>',
  )
  expect(mocks.request.mock.calls[0][0]).toMatchObject({
    hostname: '93.184.216.34',
    servername: 'centre.example',
    family: 4,
    path: '/contact?q=1',
    headers: { Host: 'centre.example', 'Accept-Encoding': 'identity' },
  })
})
it('escapes text responses before HTML parsing', async () => {
  response(200, 'text/plain', '<script> & contact')
  await expect(downloadSource(new URL('https://centre.example'))).resolves.toBe(
    '<pre>&lt;script> &amp; contact</pre>',
  )
})
it.each([
  [302, 'text/html', undefined],
  [500, 'text/html', undefined],
  [200, 'application/json', undefined],
  [200, 'text/html', 'gzip'],
])(
  'rejects status/type/encoding %s %s %s without following redirects',
  async (status, type, encoding) => {
    response(status as number, type as string, '', encoding)
    await expect(downloadSource(new URL('https://centre.example'))).rejects.toThrow(
      'source_download_failed',
    )
    expect(mocks.request).toHaveBeenCalledTimes(1)
  },
)
it('bounds streaming bytes', async () => {
  response(200, 'text/html', 'x'.repeat(2_000_001))
  await expect(downloadSource(new URL('https://centre.example'))).rejects.toThrow(
    'source_download_failed',
  )
})
it('redacts transport errors', async () => {
  mocks.request.mockImplementation(() => {
    const req = new EventEmitter() as EventEmitter & { end: () => void }
    req.end = () => req.emit('error', new Error('private connection details'))
    return req
  })
  await expect(downloadSource(new URL('https://centre.example'))).rejects.toThrow(
    'source_download_failed',
  )
})
it('does not connect if DNS is rejected', async () => {
  mocks.resolve.mockRejectedValue(new Error('source_address_forbidden'))
  await expect(downloadSource(new URL('https://centre.example'))).rejects.toThrow(
    'source_address_forbidden',
  )
  expect(mocks.request).not.toHaveBeenCalled()
})
