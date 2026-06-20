/**
 * Стартовый набор глоссария/TM. Пополняется в админке; здесь — посевные данные.
 * `note` — на русском (исходная локаль); en-перевод термина — в `en`.
 */
export type GlossarySeed = {
  source: string
  en: string
  category: 'term' | 'slang' | 'meme'
  note?: string
  variants?: string[]
  doNotTranslate?: boolean
}

export const glossaryTerms: GlossarySeed[] = [
  // — Термины —
  { source: 'тюлень', en: 'seal', category: 'term' },
  { source: 'морской котик', en: 'fur seal', category: 'term' },
  { source: 'морской лев', en: 'sea lion', category: 'term' },
  { source: 'ластоногие', en: 'pinnipeds', category: 'term' },
  {
    source: 'лежбище',
    en: 'haul-out / rookery',
    category: 'term',
    note: 'По контексту: haul-out (место отдыха на берегу) или rookery (лежбище для размножения).',
  },
  { source: 'детёныш тюленя', en: 'seal pup', category: 'term' },
  {
    source: 'белёк',
    en: 'whitecoat (seal pup)',
    category: 'term',
    note: 'Новорождённый тюленёнок в белой эмбриональной шубке (лануго).',
  },
  {
    source: 'нерпа',
    en: '(Baikal/ringed) seal',
    category: 'term',
    note: 'Уточнять вид: байкальская нерпа = Baikal seal, кольчатая = ringed seal.',
  },

  // — Сленг «тюль-» —
  {
    source: 'реабилитационный тюль-центр',
    en: 'seal rescue center',
    category: 'slang',
    note: 'Каламбур «тюль-»: реабилитационный центр для тюленей. На en — нейтральное seal rescue center.',
  },
  {
    source: 'тюль-',
    en: 'seal- (prefix wordplay)',
    category: 'slang',
    variants: ['тюль-нос', 'тюласты', 'тюласточки', 'тюль-ласты'],
    note: 'Приставка-каламбур: добавляется к чему угодно для «тюленьего» оттенка. тюль-нос = нос тюленя; тюль-ласты/тюласты/тюласточки = уменьш. от тюленьих ласт. На английский передаётся по смыслу, дословно не переводится.',
  },

  // — Мем —
  {
    source: 'жрун',
    en: 'chonky seal / chonker',
    category: 'meme',
    note: 'Очень толстый молодой тюлень, отъевшийся на материнском молоке: либо толстый белёк, либо недавно перелинявший детёныш, сменивший белую шубку на серую.',
  },
]
