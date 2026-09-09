import { expect, test } from '@playwright/test'
import { extractSourceText, launchSourceBrowser } from '../../src/agents/sourceFetcher'

test('source parser uses a sandbox, ignores scripts and blocks external resources', async () => {
  const browser = await launchSourceBrowser()
  try {
    const text = await extractSourceText(
      browser,
      `<!doctype html><html><body>
      <h1>Centre contact</h1><p>Address &amp; phone</p>
      <script>document.body.textContent = 'SCRIPT EXECUTED'; fetch('http://127.0.0.1:3000/api/users')</script>
      <iframe src="http://169.254.169.254/latest/meta-data/"></iframe>
      <img src="http://127.0.0.1:3000/api/users" onerror="document.body.textContent='HANDLER EXECUTED'">
      <style>p::after { content: 'generated'; }</style>
      </body></html>`,
    )
    expect(text).toBe('Centre contact Address & phone')
    expect(await browser.contexts()).toHaveLength(0)
    await expect(
      extractSourceText(browser, '<body><script>hidden</script></body>'),
    ).rejects.toThrow('source_text_rejected')
  } finally {
    await browser.close()
  }
})
