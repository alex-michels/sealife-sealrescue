// Local, read-only preview. No Payload, database connection or public listener.
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve('public'),
  port = Number(process.env.PORT || 4173)
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
}
http
  .createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
      if (pathname.startsWith('/api/')) {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end('{"error":"preview_offline"}')
        return
      }
      if (pathname.endsWith('/')) pathname += 'index.html'
      const file = path.resolve(root, '.' + pathname)
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403)
        res.end()
        return
      }
      const data = await readFile(file)
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      })
      res.end(data)
    } catch {
      res.writeHead(404)
      res.end()
    }
  })
  .listen(port, '127.0.0.1', () =>
    process.stdout.write('Seal Run preview: http://127.0.0.1:' + port + '/games/seal-run-v1/\n'),
  )
