/**
 * Стартовый набор глоссария/TM. Пополняется в админке; здесь — посевные данные.
 * `note` — на русском (исходная локаль); en-перевод термина — в `en`.
 *
 * `variants` — локализованные: отдельные списки для ru и en (поле variants в схеме
 * стало localized). У варианта может быть свой тег `category`; пусто = тег записи.
 */
type Category = 'term' | 'slang' | 'meme'

export type VariantSeed = { value: string; category?: Category }

export type GlossarySeed = {
  source: string
  en: string
  category: Category
  note?: string
  variants?: { ru?: VariantSeed[]; en?: VariantSeed[] }
  doNotTranslate?: boolean
}

export const glossaryTerms: GlossarySeed[] = [
  // — Термины —
  { source: 'тюлень', en: 'seal', category: 'term' },
  { source: 'морской котик', en: 'fur seal', category: 'term' },
  { source: 'морской лев', en: 'sea lion', category: 'term' },
  {
    source: 'морской слон',
    en: 'elephant seal',
    category: 'term',
    note: 'Род Mirounga (сем. Phocidae): северный и южный морские слоны — крупнейшие ластоногие.',
  },
  { source: 'ластоногие', en: 'pinnipeds', category: 'term' },
  {
    source: 'лежбище',
    en: 'haul-out / rookery',
    category: 'term',
    note: 'По контексту: haul-out (место отдыха на берегу) или rookery (лежбище для размножения).',
  },
  {
    source: 'детёныш тюленя',
    en: 'seal pup',
    category: 'term',
    variants: {
      ru: [{ value: 'тюль-малыш', category: 'slang' }],
      en: [{ value: 'seal baby' }],
    },
  },
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

  // — Семейства и группы (таксономия по Society for Marine Mammalogy; 34 совр. вида) —
  {
    source: 'настоящие тюлени',
    en: 'true seals',
    category: 'term',
    variants: { ru: [{ value: 'безухие тюлени' }], en: [{ value: 'earless seals' }] },
    note: 'Сем. Phocidae. Без наружных ушных раковин; на суше передвигаются гусеницеобразно. 18 видов.',
  },
  {
    source: 'ушастые тюлени',
    en: 'eared seals',
    category: 'term',
    note: 'Сем. Otariidae: морские львы и морские котики. С наружными ушными раковинами; опираются на ласты. 15 видов.',
  },
  {
    source: 'морж',
    en: 'walrus',
    category: 'term',
    note: 'Odobenus rosmarus, сем. Odobenidae (моржовые) — единственный современный вид семейства. IUCN: VU.',
  },

  // — Виды: ушастые тюлени (Otariidae) — морские котики —
  {
    source: 'северный морской котик',
    en: 'northern fur seal',
    category: 'term',
    note: 'Callorhinus ursinus, сем. Otariidae. IUCN: VU.',
  },
  {
    source: 'южноамериканский морской котик',
    en: 'South American fur seal',
    category: 'term',
    note: 'Arctocephalus australis, сем. Otariidae. IUCN: LC.',
  },
  {
    source: 'новозеландский морской котик',
    en: 'New Zealand fur seal',
    category: 'term',
    note: 'Arctocephalus forsteri, сем. Otariidae. IUCN: LC.',
  },
  {
    source: 'галапагосский морской котик',
    en: 'Galápagos fur seal',
    category: 'term',
    note: 'Arctocephalus galapagoensis, сем. Otariidae. IUCN: EN (вымирающий).',
  },
  {
    source: 'кергеленский морской котик',
    en: 'Antarctic fur seal',
    category: 'term',
    variants: { ru: [{ value: 'антарктический морской котик' }] },
    note: 'Arctocephalus gazella, сем. Otariidae. IUCN: LC.',
  },
  {
    source: 'фернандесский морской котик',
    en: 'Juan Fernández fur seal',
    category: 'term',
    variants: { ru: [{ value: 'морской котик Хуан-Фернандеса' }] },
    note: 'Arctocephalus philippii, сем. Otariidae. IUCN: LC.',
  },
  {
    source: 'капский морской котик',
    en: 'Cape fur seal',
    category: 'term',
    variants: {
      ru: [{ value: 'южноафриканский морской котик' }, { value: 'бурый морской котик' }],
      en: [{ value: 'brown fur seal' }],
    },
    note: 'Arctocephalus pusillus, сем. Otariidae. IUCN: LC.',
  },
  {
    source: 'гуадалупский морской котик',
    en: 'Guadalupe fur seal',
    category: 'term',
    note: 'Arctocephalus townsendi, сем. Otariidae. IUCN: LC.',
  },
  {
    source: 'субантарктический морской котик',
    en: 'Subantarctic fur seal',
    category: 'term',
    variants: { ru: [{ value: 'субтропический морской котик' }] },
    note: 'Arctocephalus tropicalis, сем. Otariidae. IUCN: LC.',
  },

  // — Виды: ушастые тюлени (Otariidae) — морские львы —
  {
    source: 'сивуч',
    en: 'Steller sea lion',
    category: 'term',
    variants: {
      ru: [{ value: 'морской лев Стеллера' }, { value: 'северный морской лев' }],
      en: [{ value: 'northern sea lion' }],
    },
    note: 'Eumetopias jubatus, сем. Otariidae — крупнейший из ушастых тюленей. IUCN: NT.',
  },
  {
    source: 'австралийский морской лев',
    en: 'Australian sea lion',
    category: 'term',
    note: 'Neophoca cinerea, сем. Otariidae. IUCN: EN (вымирающий).',
  },
  {
    source: 'южный морской лев',
    en: 'South American sea lion',
    category: 'term',
    variants: { ru: [{ value: 'южноамериканский морской лев' }] },
    note: 'Otaria flavescens, сем. Otariidae. IUCN: LC.',
  },
  {
    source: 'новозеландский морской лев',
    en: 'New Zealand sea lion',
    category: 'term',
    variants: { en: [{ value: "Hooker's sea lion" }] },
    note: 'Phocarctos hookeri, сем. Otariidae. IUCN: EN (вымирающий).',
  },
  {
    source: 'калифорнийский морской лев',
    en: 'California sea lion',
    category: 'term',
    note: 'Zalophus californianus, сем. Otariidae. IUCN: LC.',
  },
  {
    source: 'галапагосский морской лев',
    en: 'Galápagos sea lion',
    category: 'term',
    note: 'Zalophus wollebaeki, сем. Otariidae. IUCN: EN (вымирающий).',
  },

  // — Виды: настоящие тюлени (Phocidae) —
  {
    source: 'обыкновенный тюлень',
    en: 'harbour seal',
    category: 'term',
    variants: {
      ru: [{ value: 'пёстрая нерпа' }],
      en: [{ value: 'harbor seal' }, { value: 'common seal' }],
    },
    note: 'Phoca vitulina, сем. Phocidae. IUCN: LC. Чаще всего встречается людям на побережье.',
  },
  {
    source: 'ларга',
    en: 'spotted seal',
    category: 'term',
    variants: { ru: [{ value: 'пятнистый тюлень' }], en: [{ value: 'largha seal' }] },
    note: 'Phoca largha, сем. Phocidae. IUCN: LC.',
  },
  {
    source: 'кольчатая нерпа',
    en: 'ringed seal',
    category: 'term',
    note: 'Pusa hispida, сем. Phocidae. IUCN: LC. Делает снежные норы для детёнышей.',
  },
  {
    source: 'байкальская нерпа',
    en: 'Baikal seal',
    category: 'term',
    variants: { en: [{ value: 'nerpa' }] },
    note: 'Pusa sibirica, сем. Phocidae — единственный исключительно пресноводный тюлень. IUCN: LC.',
  },
  {
    source: 'каспийская нерпа',
    en: 'Caspian seal',
    category: 'term',
    note: 'Pusa caspica, сем. Phocidae. IUCN: EN (вымирающий).',
  },
  {
    source: 'серый тюлень',
    en: 'grey seal',
    category: 'term',
    variants: {
      ru: [{ value: 'длинномордый тюлень' }, { value: 'тевяк' }],
      en: [{ value: 'gray seal' }],
    },
    note: 'Halichoerus grypus, сем. Phocidae. IUCN: LC.',
  },
  {
    source: 'морской заяц',
    en: 'bearded seal',
    category: 'term',
    variants: { ru: [{ value: 'лахтак' }] },
    note: 'Erignathus barbatus, сем. Phocidae. IUCN: NT.',
  },
  {
    source: 'хохлач',
    en: 'hooded seal',
    category: 'term',
    variants: { ru: [{ value: 'тюлень-хохлач' }] },
    note: 'Cystophora cristata, сем. Phocidae. IUCN: EN (вымирающий).',
  },
  {
    source: 'гренландский тюлень',
    en: 'harp seal',
    category: 'term',
    variants: { ru: [{ value: 'лысун' }] },
    note: 'Pagophilus groenlandicus, сем. Phocidae. IUCN: NT. Детёныш-белёк — символ кампаний против промысла.',
  },
  {
    source: 'крылатка',
    en: 'ribbon seal',
    category: 'term',
    variants: { ru: [{ value: 'полосатый тюлень' }] },
    note: 'Histriophoca fasciata, сем. Phocidae. IUCN: LC.',
  },
  {
    source: 'морской леопард',
    en: 'leopard seal',
    category: 'term',
    note: 'Hydrurga leptonyx, сем. Phocidae — крупный антарктический хищник. IUCN: LC.',
  },
  {
    source: 'тюлень Уэдделла',
    en: 'Weddell seal',
    category: 'term',
    note: 'Leptonychotes weddellii, сем. Phocidae. IUCN: LC.',
  },
  {
    source: 'тюлень-крабоед',
    en: 'crabeater seal',
    category: 'term',
    note: 'Lobodon carcinophaga (= carcinophagus), сем. Phocidae — самый многочисленный тюлень планеты. IUCN: LC.',
  },
  {
    source: 'тюлень Росса',
    en: 'Ross seal',
    category: 'term',
    note: 'Ommatophoca rossii, сем. Phocidae. IUCN: LC.',
  },
  {
    source: 'северный морской слон',
    en: 'northern elephant seal',
    category: 'term',
    note: 'Mirounga angustirostris, сем. Phocidae. IUCN: LC.',
  },
  {
    source: 'южный морской слон',
    en: 'southern elephant seal',
    category: 'term',
    note: 'Mirounga leonina, сем. Phocidae — крупнейший из ластоногих. IUCN: LC.',
  },
  {
    source: 'тюлень-монах',
    en: 'Mediterranean monk seal',
    category: 'term',
    variants: {
      ru: [{ value: 'средиземноморский тюлень-монах' }, { value: 'белобрюхий тюлень' }],
    },
    note: 'Monachus monachus, сем. Phocidae — один из редчайших тюленей. IUCN: VU.',
  },
  {
    source: 'гавайский тюлень-монах',
    en: 'Hawaiian monk seal',
    category: 'term',
    note: 'Neomonachus schauinslandi, сем. Phocidae. IUCN: VU.',
  },

  // — Анатомия и биология —
  {
    source: 'вибриссы',
    en: 'vibrissae',
    category: 'term',
    variants: { ru: [{ value: 'усы' }], en: [{ value: 'whiskers' }] },
    note: 'Чувствительные усы: улавливают гидродинамический след добычи даже в темноте/мутной воде.',
  },
  {
    source: 'ласт',
    en: 'flipper',
    category: 'term',
    note: 'Видоизменённая конечность ластоногих для плавания.',
  },
  {
    source: 'подкожный жир',
    en: 'blubber',
    category: 'term',
    variants: { ru: [{ value: 'ворвань' }] },
    note: 'Толстый слой жира под кожей: теплоизоляция, плавучесть и запас энергии.',
  },
  {
    source: 'линька',
    en: 'moult',
    category: 'term',
    variants: { en: [{ value: 'molt' }] },
    note: 'Сезонная смена шёрстного покрова (у некоторых видов — катастрофическая линька с эпидермисом).',
  },
  {
    source: 'лануго',
    en: 'lanugo',
    category: 'term',
    note: 'Первичный эмбриональный мех детёныша (белая шубка белька у ряда видов).',
  },
  {
    source: 'бивни',
    en: 'tusks',
    category: 'term',
    note: 'Удлинённые верхние клыки моржа (Odobenus rosmarus).',
  },
  {
    source: 'секач',
    en: 'bull (adult male)',
    category: 'term',
    note: 'Крупный взрослый самец (особенно у морских котиков, львов, моржей).',
  },
  {
    source: 'гарем',
    en: 'harem',
    category: 'term',
    note: 'Группа самок вокруг одного самца-секача в сезон размножения (у полигамных видов).',
  },
  {
    source: 'реабилитация тюленей',
    en: 'seal rehabilitation',
    category: 'term',
    note: 'Выхаживание ослабленных/осиротевших тюленей с последующим возвращением в дикую природу.',
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
    variants: {
      ru: [
        { value: 'тюль-нос', category: 'slang' },
        { value: 'тюласты', category: 'slang' },
        { value: 'тюласточки', category: 'slang' },
        { value: 'тюль-ласты', category: 'slang' },
      ],
    },
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
