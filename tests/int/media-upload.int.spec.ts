// @vitest-environment node
// Payload проверяет тип файла через file-type, а тот в jsdom-окружении падает на проверке
// буфера («Could not read uploaded file for type detection») — артефакт среды, а не продукта:
// в реальном Node (сервер Next, payload run) загрузка проходит. Прочие int-спеки остаются
// на jsdom, поэтому окружение переопределяется точечно, этим файлом.
import fs from 'fs'
import path from 'path'
import os from 'os'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import config from '@payload-config'
import { defaultLocale } from '@/i18n/config'

/**
 * **CR-04** на живом Payload: загрузка реально пишется в НАСТРОЕННЫЙ каталог, производные
 * генерируются, а EXIF не переживает пережатие.
 *
 * Unit-тест закрывает выбор пути; здесь проверяется, что Payload этот путь действительно
 * использует, — иначе `staticDir` мог бы оказаться правильным и проигнорированным.
 */

describe('CR-04: загрузка медиа', () => {
  let payload: Payload
  let staticDir: string
  const createdIds: (number | string)[] = []
  let tmpFile: string

  beforeAll(async () => {
    payload = await getPayload({ config })
    const upload = payload.collections.media.config.upload
    staticDir = typeof upload === 'object' && upload.staticDir ? upload.staticDir : ''

    // Картинка с EXIF-полем, которое sharp обязан не пронести в вывод.
    tmpFile = path.join(os.tmpdir(), `cr04-${Date.now()}.jpg`)
    await sharp({
      create: { width: 1200, height: 800, channels: 3, background: { r: 20, g: 80, b: 120 } },
    })
      .withExifMerge({ IFD0: { ImageDescription: 'cr04-exif-marker' } })
      .jpeg()
      .toFile(tmpFile)
  }, 120_000)

  afterAll(async () => {
    for (const id of createdIds) {
      await payload.delete({ collection: 'media', id }).catch(() => {})
    }
    fs.rmSync(tmpFile, { force: true })
    await payload.db.destroy?.()
  }, 60_000)

  it('staticDir задан абсолютным путём и НЕ внутри каталога релиза', () => {
    // Каталог релиза деплой пересоздаёт с --delete и подчищает rm -rf: загрузки внутри него
    // исчезли бы на следующем деплое — это и есть исходный баг CR-04.
    expect(staticDir).toBeTruthy()
    expect(path.isAbsolute(staticDir)).toBe(true)
    expect(staticDir.split(path.sep).join('/')).not.toMatch(/\/releases\//)
  })

  it('файл действительно пишется в этот каталог, с производными размерами', async () => {
    const doc = await payload.create({
      collection: 'media',
      locale: defaultLocale,
      data: { alt: 'CR-04 test image' },
      filePath: tmpFile,
    })
    createdIds.push(doc.id)

    expect(doc.filename, 'filename').toBeTruthy()
    expect(fs.existsSync(path.join(staticDir, doc.filename!)), 'оригинал на диске').toBe(true)

    // Производные: без них нет srcset, и каждая карточка тянет полноразмерный файл.
    const sizes = doc.sizes ?? {}
    for (const name of ['thumbnail', 'card', 'hero'] as const) {
      const size = (sizes as Record<string, { filename?: string | null } | undefined>)[name]
      expect(size?.filename, `размер ${name}`).toBeTruthy()
      expect(fs.existsSync(path.join(staticDir, size!.filename!)), `${name} на диске`).toBe(true)
    }
  }, 120_000)

  it('оригинал пережат в webp — вместе с EXIF уезжает и GPS с телефона', async () => {
    const doc = await payload.create({
      collection: 'media',
      locale: defaultLocale,
      data: { alt: 'CR-04 exif image' },
      filePath: tmpFile,
    })
    createdIds.push(doc.id)

    expect(doc.mimeType).toBe('image/webp')

    const stored = path.join(staticDir, doc.filename!)
    const meta = await sharp(stored).metadata()
    expect(meta.format).toBe('webp')
    // Маркер, записанный в исходный JPEG, не должен встречаться в сохранённом файле.
    expect(fs.readFileSync(stored).includes('cr04-exif-marker')).toBe(false)
  }, 120_000)
})
