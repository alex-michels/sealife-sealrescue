import { request } from 'node:https'
import { chromium, type Browser } from 'playwright'
import { AgentError } from './cmsClient'
import {
  resolvePublicSource,
  sourceURL,
  MIN_SOURCE_TRUST,
  type ResearchSource,
} from './sourcePolicy'
import type { SourceSnapshot } from './researcherContract'

const MAX_HTML_BYTES = 2_000_000
export const MAX_SNAPSHOT_CHARS = 100_000

/** Browser never accesses the network. TLS uses the checked IP and original SNI/Host. */
export async function downloadSource(url: URL): Promise<string> {
  const address = await resolvePublicSource(url)
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: address.address,
        family: address.family,
        servername: url.hostname,
        port: 443,
        method: 'GET',
        path: url.pathname + url.search,
        headers: {
          Host: url.host,
          Accept: 'text/html,application/xhtml+xml,text/plain',
          'Accept-Encoding': 'identity',
          'User-Agent': 'SeaLife-Researcher/1.0',
        },
        signal: AbortSignal.timeout(15_000),
      },
      async (response) => {
        try {
          // Redirects require a new, explicitly approved canonical source URL.
          if (
            response.statusCode !== 200 ||
            !/^(text\/html|application\/xhtml\+xml|text\/plain)(;|$)/i.test(
              response.headers['content-type'] ?? '',
            ) ||
            (response.headers['content-encoding'] &&
              response.headers['content-encoding'] !== 'identity')
          ) {
            throw new AgentError('source_response_rejected')
          }
          const chunks: Buffer[] = []
          let size = 0
          for await (const chunk of response) {
            const bytes = Buffer.from(chunk)
            size += bytes.length
            if (size > MAX_HTML_BYTES) throw new AgentError('source_too_large')
            chunks.push(bytes)
          }
          const text = Buffer.concat(chunks).toString('utf8')
          // Escape plain text before passing it to the HTML parser.
          resolve(
            response.headers['content-type']?.startsWith('text/plain')
              ? `<pre>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`
              : text,
          )
        } catch {
          response.destroy()
          reject(new AgentError('source_download_failed'))
        }
      },
    )
    req.on('error', () => reject(new AgentError('source_download_failed')))
    req.end()
  })
}

export async function extractSourceText(browser: Browser, html: string): Promise<string> {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    serviceWorkers: 'block',
    acceptDownloads: false,
  })
  try {
    await context.route('**/*', (route) => route.abort())
    const page = await context.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await page
      .locator('script,style,noscript,template,iframe,object,embed')
      .evaluateAll((elements) => elements.forEach((element) => element.remove()))
    const text = (await page.locator('body').innerText({ timeout: 5_000 }))
      .replace(/\s+/g, ' ')
      .trim()
    if (!text || text.length > MAX_SNAPSHOT_CHARS) throw new AgentError('source_text_rejected')
    return text
  } finally {
    await context.close()
  }
}

/** Chromium's OS sandbox is mandatory; failure does not fall back to --no-sandbox. */
export const launchSourceBrowser = () => chromium.launch({ headless: true, chromiumSandbox: true })

export async function fetchSourceSnapshot(
  source: ResearchSource,
  extract: (html: string) => Promise<string>,
  download = downloadSource,
  now: () => Date = () => new Date(),
): Promise<SourceSnapshot> {
  if ((source.trustLevel ?? 0) < MIN_SOURCE_TRUST) throw new AgentError('source_not_allowlisted')
  const url = sourceURL(source.url)
  const text = await extract(await download(url))
  if (!text || text.length > MAX_SNAPSHOT_CHARS) throw new AgentError('source_text_rejected')
  return { sourceId: source.id, url: source.url, checkedAt: now().toISOString(), text }
}
