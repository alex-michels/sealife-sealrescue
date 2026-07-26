import { describe, it, expect } from 'vitest'
import { contentSeed, speciesSeed } from '@/seed/m1SeedData'
import { glossaryTerms } from '@/seed/glossaryTerms'

/**
 * Трек BIO (аудит 2026-07-26): предметные ошибки в сеяной биологии не ловятся типами и
 * не ловятся int-тестом (тому всё равно, ЧТО написано). Здесь — чистые проверки данных,
 * без БД: они не дают вернуть исправленные ошибки обратно, в том числе «улучшением» текста
 * или регенерацией сида агентом.
 *
 * Проверяется факт, а не формулировка: тесты ищут смысловые маркеры, чтобы редактура
 * оставалась возможной.
 */

const bySlug = (slug: string) => {
  const item = contentSeed.find((c) => c.slug === slug)
  if (!item) throw new Error(`нет записи сида ${slug}`)
  return item
}

const noteOf = (source: string) => {
  const term = glossaryTerms.find((t) => t.source === source)
  if (!term) throw new Error(`нет термина глоссария «${source}»`)
  return term.note ?? ''
}

/** Код IUCN из заметки вида: «… IUCN: LC …». */
const iucnCode = (source: string) => /IUCN:\s*([A-Z]{2})/.exec(noteOf(source))?.[1]

describe('BIO-08: однополушарный сон — признак ушастых, не фоцид', () => {
  const sleep = bySlug('how-seals-sleep')

  it('ru: сон одним полушарием отнесён к ушастым, фоцидам — оба полушария', () => {
    const body = sleep.body!.ru
    const unihemispheric = body.filter((p) => /одн(им|ого) полушари/.test(p))
    expect(unihemispheric.length, 'тема сна одним полушарием должна быть раскрыта').toBeGreaterThan(
      0,
    )
    // Каждое упоминание — только рядом с ушастыми (котик/сивуч/Otariidae).
    for (const p of unihemispheric) expect(p).toMatch(/ушаст|котик|сивуч|Otariidae/)
    expect(body.join(' ')).toMatch(/обоими полушариями/)
    // Ключевые фоцидные приёмы сна на месте.
    expect(body.join(' ')).toMatch(/на дно|дне/)
    expect(body.join(' ')).toMatch(/дрейфов/)
    expect(body.join(' ')).toMatch(/столбиком/)
  })

  it('en: same claim, same attribution', () => {
    const body = sleep.body!.en
    const unihemispheric = body.filter((p) => /one hemisphere|unihemispheric/i.test(p))
    expect(unihemispheric.length).toBeGreaterThan(0)
    for (const p of unihemispheric) expect(p).toMatch(/eared|fur seal|sea lion|otariid/i)
    expect(body.join(' ')).toMatch(/both hemispheres/i)
    expect(body.join(' ')).toMatch(/drift dive/i)
    expect(body.join(' ')).toMatch(/bottling/i)
  })

  it('локали не противоречат друг другу по числу абзацев', () => {
    expect(sleep.body!.en.length).toBe(sleep.body!.ru.length)
  })

  it('глоссарий держит правило для агента-переводчика', () => {
    const note = noteOf('однополушарный сон')
    expect(note).toMatch(/Otariidae|ушаст/)
    expect(note).toMatch(/двуполушарн/)
  })
})

describe('BIO-09: статус балтийской нерпы — оценка подвида', () => {
  const ringed = speciesSeed.find((s) => s.slug === 'baltic-ringed-seal')!

  it('VU помечен как оценка подвида, с годом и ссылкой на Red List', () => {
    expect(ringed.conservationStatus).toBe('VU')
    expect(ringed.conservationAssessment?.scope).toBe('subspecies')
    expect(ringed.conservationAssessment?.assessedEntity).toBe('Pusa hispida botnica')
    expect(ringed.conservationAssessment?.listingSystem).toBe('iucn')
    expect(ringed.conservationAssessment?.assessmentYear).toBeGreaterThan(1990)
    expect(ringed.conservationAssessment?.sourceUrl).toMatch(/^https:\/\/www\.iucnredlist\.org\//)
  })

  it('текст карточки объясняет расхождение с глоссарием (вид = LC)', () => {
    expect(ringed.body!.ru.join(' ')).toMatch(/LC/)
    expect(ringed.body!.en.join(' ')).toMatch(/Least Concern/)
    expect(iucnCode('кольчатая нерпа')).toBe('LC') // вид целиком
  })

  it('ареал сужен до реального: заливы, а не «Балтийское море»', () => {
    expect(ringed.region!.ru).toMatch(/Ботнич/)
    expect(ringed.region!.ru).not.toMatch(/^Балтийское море$/)
    expect(ringed.region!.en).toMatch(/Bothnia/)
  })
})

describe('BIO-10: коды IUCN в глоссарии', () => {
  // Значения проверены аудитом. Три первых — исправления, монах средиземноморский
  // зафиксирован как ВЕРНЫЙ, чтобы его не «поправили» заодно.
  const expected: Record<string, string> = {
    'гренландский тюлень': 'LC',
    хохлач: 'VU',
    'морской заяц': 'LC',
    'гавайский тюлень-монах': 'EN',
    'тюлень-монах': 'VU',
  }

  for (const [source, code] of Object.entries(expected)) {
    it(`${source} → ${code}`, () => {
      expect(iucnCode(source)).toBe(code)
    })
  }

  it('«Threatened» морского зайца назван инструментом US ESA, а не кодом IUCN', () => {
    expect(noteOf('морской заяц')).toMatch(/ESA/)
  })

  it('у гавайского монаха указан порядок численности (занижение статуса опаснее всего)', () => {
    expect(noteOf('гавайский тюлень-монах')).toMatch(/1600|1 600/)
  })
})

describe('BIO-11: серый тюлень — греческая этимология и размер по полу', () => {
  const grey = speciesSeed.find((s) => s.slug === 'grey-seal')!

  it('этимология греческая и одинаковая в ru/en', () => {
    expect(grey.excerpt!.ru).toMatch(/греческ/)
    expect(grey.excerpt!.en).toMatch(/Greek/)
    expect(grey.excerpt!.ru).toMatch(/свинья/)
    expect(grey.excerpt!.en).toMatch(/sea pig/i)
    expect(grey.excerpt!.ru).not.toMatch(/латын|латинск/i)
    expect(grey.excerpt!.en).not.toMatch(/Latin/i)
    expect(grey.body!.ru.join(' ')).toMatch(/hali-.*choiros.*grypos/s)
  })

  it('«тевяк» и «лошадиная морда» помечены как прозвища, а не перевод', () => {
    const nickname = grey.facts.find((f) => /тевяк/.test(f.ru))
    expect(nickname, 'прозвища должны быть названы отдельным фактом').toBeDefined()
    expect(nickname!.ru).toMatch(/прозвищ/i)
  })

  it('размер — диапазон по полу, а не одно число', () => {
    expect(grey.size!.ru).toMatch(/самки/)
    expect(grey.size!.ru).toMatch(/самцы/)
    expect(grey.size!.en).toMatch(/females/)
    expect(grey.size!.en).toMatch(/males/)
  })
})

describe('BIO-12: haul-out терминология', () => {
  const texts = contentSeed.flatMap((c) => [
    c.title.ru,
    c.title.en,
    c.excerpt?.ru ?? '',
    c.excerpt?.en ?? '',
    ...(c.body?.ru ?? []),
    ...(c.body?.en ?? []),
  ])

  it('в контенте нет «rookery», «лежбища» и «бутылкования»', () => {
    for (const t of texts) {
      expect(t, 'rookery — про ушастых и птиц').not.toMatch(/rookery/i)
      expect(t, 'у фоцид залёжка, не лежбище').not.toMatch(/лежбищ/i)
      expect(t, '«бутылкование» — сырая калька с bottling').not.toMatch(/бутылков/i)
    }
  })

  it('новость использует «залёжку» / haul-out', () => {
    const news = bySlug('new-rookery-spotted')
    expect(news.title.ru).toMatch(/залёжк/i)
    expect(news.title.en).toMatch(/haul-out/i)
  })

  it('в глоссарии есть «залёжка», а у «лежбища» — предупреждение про rookery', () => {
    expect(glossaryTerms.find((t) => t.source === 'залёжка')?.en).toBe('haul-out')
    expect(noteOf('залёжка')).toMatch(/фоцид/)
    expect(noteOf('лежбище')).toMatch(/ушаст/i)
    expect(noteOf('лежбище')).toMatch(/rookery/i)
  })

  it('«зависание столбиком» есть с английским bottling', () => {
    const bottling = glossaryTerms.find((t) => t.source === 'зависание столбиком')
    expect(bottling?.en).toBe('bottling')
    expect(bottling?.note).toMatch(/калька|не использовать/)
  })
})

describe('BIO-16: сид не выдаёт себя за проверенный контент', () => {
  it('ни одна запись не обещает источников, которых нет', () => {
    // Коллекция sources пуста: сид сознательно не заполняет связь и не ставит
    // sourceVerified. Проверка формальная — в данных сида таких полей просто нет.
    for (const sp of speciesSeed) expect(Object.keys(sp)).not.toContain('sources')
    for (const c of contentSeed) expect(Object.keys(c)).not.toContain('sources')
  })

  it('у каждого вида с кодом IUCN есть контекст оценки (иначе код непроверяем)', () => {
    for (const sp of speciesSeed) {
      if (!sp.conservationStatus) continue
      expect(sp.conservationAssessment?.scope, `${sp.slug}`).toBeTruthy()
      expect(sp.conservationAssessment?.sourceUrl, `${sp.slug}`).toMatch(/iucnredlist\.org/)
    }
  })
})
