import { lookup } from 'node:dns/promises'
import ipaddr from 'ipaddr.js'
import { z } from 'zod'
import { AgentError } from './cmsClient'

export const sourceSchema = z.object({
  id: z.number().int().positive(),
  url: z.string().url().max(2048),
  type: z.enum(['official', 'news', 'social', 'manual']),
  trustLevel: z.number().min(0).max(1).nullable().optional(),
})
export type ResearchSource = z.infer<typeof sourceSchema>
export const MIN_SOURCE_TRUST = 0.8

export function sourceURL(value: string): URL {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash) {
    throw new AgentError('source_url_forbidden')
  }
  return url
}

export function allowedSources(input: unknown): ResearchSource[] {
  const sources = z.array(sourceSchema).max(1000).parse(input)
  const ids = new Set<number>()
  const urls = new Set<string>()
  return sources.filter((source) => {
    if ((source.trustLevel ?? 0) < MIN_SOURCE_TRUST) return false
    const url = sourceURL(source.url).href
    if (ids.has(source.id) || urls.has(url)) throw new AgentError('ambiguous_source_allowlist')
    ids.add(source.id)
    urls.add(url)
    return true
  })
}

export function isPublicAddress(address: string): boolean {
  try {
    // process() also converts IPv4-mapped IPv6 before checking private/reserved ranges.
    return ipaddr.process(address).range() === 'unicast'
  } catch {
    return false
  }
}

export type ResolveHost = (host: string) => Promise<{ address: string; family: number }[]>

/** Validate every DNS answer and pin the chosen IP in the subsequent TLS request. */
export async function resolvePublicSource(
  url: URL,
  resolve: ResolveHost = (host) => lookup(host, { all: true, verbatim: true }),
) {
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const answers = ipaddr.isValid(host)
    ? [{ address: host, family: ipaddr.parse(host).kind() === 'ipv4' ? 4 : 6 }]
    : await resolve(host)
  if (!answers.length || answers.some((answer) => !isPublicAddress(answer.address))) {
    throw new AgentError('source_address_forbidden')
  }
  return answers[0]
}
