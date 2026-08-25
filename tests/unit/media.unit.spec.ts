import path from 'path'
import { describe, it, expect } from 'vitest'
import { mediaStaticDir, isEphemeralMediaDir, mediaDirWarning } from '@/media/storage'
import { coverAlt } from '@/media/alt'

/**
 * **CR-04** — загруженные медиа должны переживать деплой, а alt не должен исчезать вместе с
 * выключенным locale-fallback (**CR-01**).
 */

const REPO = path.resolve('/srv/app')

describe('mediaStaticDir', () => {
  it('без MEDIA_DIR — каталог внутри репозитория (дев-дефолт)', () => {
    expect(mediaStaticDir(REPO, {})).toBe(path.resolve(REPO, 'media'))
  })

  it('MEDIA_DIR задан — используется как есть', () => {
    const dir = path.resolve('/opt/sealife/shared/media')
    expect(mediaStaticDir(REPO, { MEDIA_DIR: dir })).toBe(dir)
  })

  it('пустой/пробельный MEDIA_DIR игнорируется, а не даёт пустой путь', () => {
    expect(mediaStaticDir(REPO, { MEDIA_DIR: '   ' })).toBe(path.resolve(REPO, 'media'))
  })

  it('относительный MEDIA_DIR отвергается громко', () => {
    // Относительный путь резолвился бы от cwd процесса — то есть от симлинка на каталог релиза,
    // ровно от того, от чего эта задача и уходит. Молча принять его — вернуть баг под другим именем.
    expect(() => mediaStaticDir(REPO, { MEDIA_DIR: './media' })).toThrow(/абсолютным/i)
  })
})

describe('isEphemeralMediaDir', () => {
  it('каталог внутри releases/ распознаётся как эфемерный', () => {
    expect(isEphemeralMediaDir('/opt/sealife/releases/abc123/media')).toBe(true)
  })

  it('shared-каталог — не эфемерный', () => {
    expect(isEphemeralMediaDir('/opt/sealife/shared/media')).toBe(false)
  })

  it('дев-каталог репозитория — не эфемерный', () => {
    expect(isEphemeralMediaDir('/home/dev/sealife/media')).toBe(false)
  })
})

describe('coverAlt', () => {
  it('есть alt — берём его', () => {
    expect(coverAlt({ alt: 'Тюлень на камне' }, 'Заголовок')).toBe('Тюлень на камне')
  })

  it('alt пустой, картинка декоративная — пустая строка (WCAG 1.1.1)', () => {
    // Пустой alt="" КОРРЕКТЕН для декора: скринридер пропустит картинку. Отсутствие атрибута
    // заставило бы его читать имя файла.
    expect(coverAlt({ alt: null })).toBe('')
    expect(coverAlt(undefined)).toBe('')
  })

  it('alt пустой, но картинка несёт смысл — запасной текст', () => {
    // Случай мема: alt заполнен только на исходной локали, а страница на другой. Заголовок уже
    // прошёл гейт перевода, значит он гарантированно на языке страницы.
    expect(coverAlt({ alt: '' }, 'Когда услышал шелест пакета')).toBe('Когда услышал шелест пакета')
  })

  it('пробельные значения не считаются заполненными', () => {
    expect(coverAlt({ alt: '   ' }, '  ')).toBe('')
  })
})

/**
 * **CR-18** — предупреждение о каталоге загрузок.
 *
 * До этой правки решение принималось инлайном в `payload.config.ts` по ОТСУТСТВИЮ `MEDIA_DIR`,
 * из-за чего `isEphemeralMediaDir` не вызывалась ниоткуда (страховка без читателя, как
 * `localeStatus` в CR-15), а случай «MEDIA_DIR задан, но ведёт внутрь releases/» проходил молча.
 */
describe('mediaDirWarning', () => {
  const RELEASE = '/opt/sealife/releases/abc123/media'

  it('каталог релиза без MEDIA_DIR — предупреждаем и называем причину', () => {
    const msg = mediaDirWarning(RELEASE, {})
    expect(msg).toContain(RELEASE)
    expect(msg).toContain('MEDIA_DIR не задан')
  })

  it('MEDIA_DIR ЗАДАН, но ведёт внутрь releases/ — тоже предупреждаем', () => {
    // Ровно тот случай, который прежняя проверка пропускала: env есть, файлы всё равно исчезнут.
    const msg = mediaDirWarning(RELEASE, { MEDIA_DIR: RELEASE })
    expect(msg).toContain('указывает внутрь каталога релиза')
  })

  it('shared-каталог — молчим', () => {
    expect(mediaDirWarning('/opt/sealife/shared/media', { MEDIA_DIR: '/opt/sealife/shared/media' })).toBeNull()
  })

  it('дев-каталог репозитория — молчим', () => {
    expect(mediaDirWarning('/home/dev/sealife/media', {})).toBeNull()
  })

  it('во время next build молчим даже для каталога релиза', () => {
    // Конфиг грузится каждым воркером сборки, MEDIA_DIR там законно пуст: warning ×N приучает
    // его игнорировать — а именно этот warning и должен быть заметен на боксе.
    expect(mediaDirWarning(RELEASE, { NEXT_PHASE: 'phase-production-build' })).toBeNull()
  })
})
