import { describe, it, expect } from 'vitest'
import { provenanceMarks } from '@/content/provenance'
import { t } from '@/i18n/ui'
import { formatDate } from '@/i18n/date'

/**
 * EU-11 / AI Act Art. 50 — provenance-шкала, которую видит читатель.
 *
 * Проверяем не вёрстку (это e2e), а выбор меток: именно здесь живут обещания, за которые
 * отвечает Art. 50, и именно здесь их можно нарушить молча. Ключевые инварианты:
 *  1. пусто → ни одной метки (отсутствие утверждения, а не «написано человеком»);
 *  2. легаси-булев не теряется, но и не дублирует конкретику;
 *  3. «машинный перевод» и «проверено человеком» уживаются в одной шкале и различимы.
 */

describe('provenanceMarks: пусто — значит молчим', () => {
  it('ничего не выставлено → ни одной метки', () => {
    expect(provenanceMarks('ru')).toEqual([])
    expect(provenanceMarks('ru', {})).toEqual([])
    expect(provenanceMarks('ru', null, false)).toEqual([])
  })

  it('явные false и пустые даты — тоже молчание, а не «проверено»', () => {
    const marks = provenanceMarks('ru', {
      aiAssisted: false,
      aiTranslated: false,
      aiChecked: false,
      humanReviewed: false,
      sourceVerified: false,
      reviewedAt: null,
    })
    expect(marks).toEqual([])
  })
})

describe('provenanceMarks: легаси aiGenerated', () => {
  it('старый булев без группы → общая метка (на ней держатся засеянные строки)', () => {
    const marks = provenanceMarks('ru', undefined, true)
    expect(marks).toHaveLength(1)
    expect(marks[0]).toMatchObject({ key: 'legacy', tone: 'ai', label: t('ru', 'aiGenerated') })
  })

  it('конкретика вытесняет обобщение: с заполненной группой легаси-метки нет', () => {
    const marks = provenanceMarks('ru', { aiAssisted: true }, true)
    expect(marks.map((m) => m.key)).toEqual(['aiAssisted'])
  })
})

describe('provenanceMarks: шкала, а не булев', () => {
  it('машинный перевод + человеческая вычитка показываются оба и различимы', () => {
    const marks = provenanceMarks('ru', { aiTranslated: true, humanReviewed: true })

    expect(marks.map((m) => m.key)).toEqual(['aiTranslated', 'humanReviewed'])
    // Ровно случай Art. 50(4): «это перевод машиной» и «это вычитал человек» — разные
    // утверждения, и второе сильнее. Тон различает их без опоры на цвет.
    expect(marks.find((m) => m.key === 'aiTranslated')?.tone).toBe('ai')
    expect(marks.find((m) => m.key === 'humanReviewed')?.tone).toBe('human')
    expect(new Set(marks.map((m) => m.label)).size).toBe(2)
  })

  it('все пять состояний сразу — в порядке жизни материала, человек последний', () => {
    const marks = provenanceMarks('en', {
      aiAssisted: true,
      aiTranslated: true,
      aiChecked: true,
      sourceVerified: true,
      humanReviewed: true,
    })
    expect(marks.map((m) => m.key)).toEqual([
      'aiAssisted',
      'aiTranslated',
      'aiChecked',
      'sourceVerified',
      'humanReviewed',
    ])
    expect(marks.map((m) => m.tone)).toEqual(['ai', 'ai', 'ai', 'verified', 'human'])
  })

  it('sourceVerified — не AI-утверждение: свой тон, живёт без единого AI-флага', () => {
    const marks = provenanceMarks('ru', { sourceVerified: true })
    expect(marks).toHaveLength(1)
    expect(marks[0]?.tone).toBe('verified')
  })
})

describe('provenanceMarks: дата ревью', () => {
  const iso = '2026-07-14T10:00:00.000Z'

  it('валидная reviewedAt попадает в метку человека (формат — общий formatDate)', () => {
    const label = provenanceMarks('ru', { humanReviewed: true, reviewedAt: iso })[0]?.label
    expect(label).toBe(`${t('ru', 'provHumanReviewed')} · ${formatDate(iso, 'ru')}`)
    expect(label).toContain('2026')
  })

  it('en получает свою локализацию и своё написание даты', () => {
    const label = provenanceMarks('en', { humanReviewed: true, reviewedAt: iso })[0]?.label
    expect(label?.startsWith(t('en', 'provHumanReviewed'))).toBe(true)
    expect(label).toBe(`${t('en', 'provHumanReviewed')} · ${formatDate(iso, 'en')}`)
  })

  it('битая дата = метка без даты, а не «Invalid Date» рядом со словом «проверено»', () => {
    const label = provenanceMarks('ru', { humanReviewed: true, reviewedAt: 'позавчера' })[0]?.label
    expect(label).toBe(t('ru', 'provHumanReviewed'))
    expect(label).not.toMatch(/Invalid/i)
  })

  it('reviewedAt без humanReviewed ничего не заявляет', () => {
    expect(provenanceMarks('ru', { reviewedAt: iso })).toEqual([])
  })
})
