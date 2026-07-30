import { describe, it, expect } from 'vitest'
import {
  coverageOf,
  hasText,
  onSourceChanged,
  onTranslationSaved,
  sourceHashOf,
  summarizeTranslation,
  type LocaleStatusRow,
} from '@/content/localeStatus'

/**
 * **CR-15** — трекинг актуальности перевода.
 *
 * Баг, ради которого всё это писалось: `sourceHash` считался, но никогда не сохранялся, поэтому
 * сравнение «от какой версии исходника сделан перевод» всегда било в `null` и КАЖДЫЙ документ
 * вечно числился `stale`. Ниже зафиксированы обе стороны обмена — запись исходника и запись
 * перевода, — потому что баг был именно в том, что вторая сторона отсутствовала.
 */

/** Минимальное lexical-дерево; `lex('')` — пустой редактор, а НЕ отсутствие поля. */
const lex = (text: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        version: 1,
        children: text ? [{ type: 'text', text, version: 1 }] : [],
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
})

describe('hasText', () => {
  it('пустые значения', () => {
    for (const v of [null, undefined, '', '   ']) expect(hasText(v), String(v)).toBe(false)
  })

  it('непустая строка', () => {
    expect(hasText('Seal')).toBe(true)
  })

  it('lexical: текст внутри дерева виден', () => {
    expect(hasText(lex('Тюлень'))).toBe(true)
  })

  it('lexical: пустой редактор НЕ считается текстом', () => {
    // Ключевой случай: пустой редактор — это дерево с `version: 1` и `indent: 0`, и обход
    // «есть хоть какое-то непустое поле» объявил бы его переведённым текстом.
    expect(hasText(lex(''))).toBe(false)
  })
})

describe('sourceHashOf', () => {
  it('одинаковый текст — одинаковый хэш', () => {
    expect(sourceHashOf({ title: 'Seal', body: lex('a') })).toBe(
      sourceHashOf({ title: 'Seal', body: lex('a') }),
    )
  })

  it('правка любого переводимого поля меняет хэш', () => {
    const base = { title: 'Seal', excerpt: 'short', body: lex('a') }
    expect(sourceHashOf({ ...base, title: 'Walrus' })).not.toBe(sourceHashOf(base))
    expect(sourceHashOf({ ...base, excerpt: 'other' })).not.toBe(sourceHashOf(base))
    expect(sourceHashOf({ ...base, body: lex('b') })).not.toBe(sourceHashOf(base))
  })

  it('непереводимые поля на хэш не влияют', () => {
    // Иначе смена обложки или темы объявляла бы перевод устаревшим.
    const withExtras = { title: 'Seal', topics: ['biology'], coverImage: 7 }
    expect(sourceHashOf(withExtras)).toBe(sourceHashOf({ title: 'Seal' }))
  })
})

describe('coverageOf', () => {
  const source = { title: 'Seal', body: lex('en body') }

  it('переведено всё, что заполнено в исходнике', () => {
    expect(coverageOf(source, { title: 'Тюлень', body: lex('ru') })).toBe('full')
  })

  it('переведён только заголовок — частично', () => {
    expect(coverageOf(source, { title: 'Тюлень' })).toBe('partial')
  })

  it('ничего не переведено', () => {
    expect(coverageOf(source, {})).toBe('none')
    expect(coverageOf(source, { title: '  ', body: lex('') })).toBe('none')
  })

  it('пустое в исходнике не требуется в переводе', () => {
    // У мема нет body ни в одном языке; требовать его — значит навсегда оставить мемы
    // недопереведёнными.
    expect(coverageOf({ title: 'Meme' }, { title: 'Мем' })).toBe('full')
  })

  it('переводить нечего — полное покрытие', () => {
    expect(coverageOf({}, {})).toBe('full')
  })
})

describe('onSourceChanged', () => {
  const hash = sourceHashOf({ title: 'Seal' })
  const row = (over: Partial<LocaleStatusRow> = {}): LocaleStatusRow => ({
    locale: 'ru',
    status: 'current',
    sourceHash: hash,
    translatedAt: '2026-07-01',
    ...over,
  })

  it('перевода нет — missing, ссылаться не на что', () => {
    const out = onSourceChanged([], hash, [{ locale: 'ru', translated: false }])
    expect(out).toEqual([{ locale: 'ru', status: 'missing', sourceHash: null, translatedAt: null }])
  })

  it('перевод от текущей версии — current', () => {
    expect(onSourceChanged([row()], hash, [{ locale: 'ru', translated: true }])[0].status).toBe(
      'current',
    )
  })

  it('исходник уехал вперёд — stale, но происхождение перевода сохраняется', () => {
    const out = onSourceChanged([row()], sourceHashOf({ title: 'Walrus' }), [
      { locale: 'ru', translated: true },
    ])
    expect(out[0].status).toBe('stale')
    // sourceHash принадлежит переводу и отвечает на «от какой версии он сделан». Перезаписать его
    // записью исходника — значит немедленно объявить перевод актуальным, ничего не переведя.
    expect(out[0].sourceHash).toBe(hash)
    expect(out[0].translatedAt).toBe('2026-07-01')
  })

  it('перевод есть, происхождение неизвестно — review, а не «всё хорошо»', () => {
    // Документы, заведённые до трекинга: текст есть, но от какой версии — неизвестно.
    const out = onSourceChanged([row({ sourceHash: null })], hash, [
      { locale: 'ru', translated: true },
    ])
    expect(out[0].status).toBe('review')
  })

  it('перевод удалили — статус возвращается в missing', () => {
    const out = onSourceChanged([row()], hash, [{ locale: 'ru', translated: false }])
    expect(out[0]).toEqual({ locale: 'ru', status: 'missing', sourceHash: null, translatedAt: null })
  })
})

describe('onTranslationSaved', () => {
  const hash = sourceHashOf({ title: 'Seal' })
  const NOW = '2026-07-28T10:00:00.000Z'

  it('полный перевод фиксирует версию исходника — тот самый недостающий писатель', () => {
    // Регрессия CR-15: раньше здесь не записывалось НИЧЕГО, поэтому статус вечно залипал в stale.
    const out = onTranslationSaved([], 'ru', hash, 'full', NOW, ['ru'])
    expect(out).toEqual([
      { locale: 'ru', status: 'current', sourceHash: hash, translatedAt: NOW },
    ])
  })

  it('половина перевода не имеет права называться актуальной', () => {
    const out = onTranslationSaved([], 'ru', hash, 'partial', NOW, ['ru'])
    expect(out[0].status).toBe('review')
    expect(out[0].sourceHash).toBeNull()
  })

  it('пустой перевод — missing', () => {
    expect(onTranslationSaved([], 'ru', hash, 'none', NOW, ['ru'])[0].status).toBe('missing')
  })

  it('чужие локали не трогаются', () => {
    // Перевод на русский ничего не сообщает о немецком.
    const de: LocaleStatusRow = {
      locale: 'de',
      status: 'current',
      sourceHash: 'deadbeef',
      translatedAt: '2026-01-01',
    }
    const out = onTranslationSaved([de], 'ru', hash, 'full', NOW, ['ru', 'de'])
    expect(out.find((r) => r.locale === 'de')).toEqual(de)
  })
})

describe('summarizeTranslation', () => {
  const r = (locale: string, status: LocaleStatusRow['status']): LocaleStatusRow => ({
    locale,
    status,
    sourceHash: null,
    translatedAt: null,
  })

  it('одна локаль — её статус', () => {
    expect(summarizeTranslation([r('ru', 'current')], ['ru'])).toBe('current')
  })

  it('показываем самое срочное: нет перевода → устарел → нужна проверка', () => {
    expect(summarizeTranslation([r('ru', 'missing'), r('de', 'stale')], ['ru', 'de'])).toBe('missing')
    expect(summarizeTranslation([r('ru', 'review'), r('de', 'stale')], ['ru', 'de'])).toBe('stale')
    expect(summarizeTranslation([r('ru', 'review'), r('de', 'current')], ['ru', 'de'])).toBe('review')
  })

  it('локали без строки считаются непереведёнными', () => {
    expect(summarizeTranslation([r('ru', 'current')], ['ru', 'de'])).toBe('missing')
  })

  it('целевых локалей нет — переводить нечего', () => {
    expect(summarizeTranslation([], [])).toBe('current')
  })
})
