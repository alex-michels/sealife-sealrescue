import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Деплой на VPS: сборка в CI кладёт самодостаточный сервер в .next/standalone
  // (трассировка node_modules), systemd запускает `node server.js`. См. docs/DEPLOYMENT.md.
  // `public/` и `.next/static` Next в standalone НЕ копирует — это делает деплой-пайплайн.
  output: 'standalone',
  outputFileTracingRoot: path.resolve(dirname),
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
