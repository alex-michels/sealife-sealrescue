import type { CollectionConfig } from 'payload'
import { isStaff, isEditor } from '../access/roles'
import { sourcesField } from '../fields/provenance'

// Категории/теги глоссария — общий список для записи и для отдельных вариантов.
const categoryOptions = [
  { label: 'Термин', value: 'term' }, // тюлень, ластоногие, лежбище
  { label: 'Сленг (тюль-)', value: 'slang' }, // тюль-нос, тюль-центр
  { label: 'Мем', value: 'meme' }, // жрун
]

/**
 * Translation memory + глоссарий (masterplan §7).
 *
 * Ключ — `source`: канонический РУССКИЙ термин, общий для всех локалей. Перевод —
 * локализованный `translation` (контент-локали ru/en; немецкого контента нет с 2026-07-26).
 *
 * ⚠️ RU-ключ НЕ связан с исходной локалью контента. После **CR-14** исходник пишется на en, а
 * ключ TM остаётся русским — и это осознанное решение, а не забытая правка: `source` служит
 * ключом upsert'а сида и объявлен `index: true`, но НЕ `unique`. Перекладка ключа на английский
 * не переименует записи, а создаст 62 новых рядом с 62 осиротевшими русскими, причём тест
 * идемпотентности останется зелёным (он считает только строки из нового списка). Вопрос о
 * перекладке принадлежит M3-T02 — единственному потребителю, которому это важно, — и он ещё
 * не существует. Пополняется людьми по мере роста;
 * агент-переводчик (Агент 3) ЧИТАЕТ глоссарий, но НЕ пишет в него напрямую —
 * предложения изменений идут через `agent-proposals` (инвариант human-in-the-loop).
 */
export const Glossary: CollectionConfig = {
  slug: 'glossary',
  admin: {
    useAsTitle: 'source',
    defaultColumns: ['source', 'translation', 'category', 'updatedAt'],
    description:
      'Словарь терминов и тюль-сленга: канонический RU-ключ → перевод. Для переводчиков и Агента 3.',
    group: 'Локализация',
  },
  access: {
    read: () => true, // справочные данные; можно показать публичной страницей-словариком
    create: isStaff, // admin / editor / translator (агент — через agent-proposals)
    update: isStaff,
    delete: isEditor, // агент удалять не может
  },
  fields: [
    {
      name: 'source',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description:
          'Канонический RU-ключ translation memory (общий для всех локалей). Не переводится и НЕ связан с исходной локалью контента — она en.',
      },
    },
    {
      name: 'translation',
      type: 'text',
      localized: true,
      admin: { description: 'Эквивалент в текущей локали.' },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'term',
      options: categoryOptions,
    },
    {
      name: 'variants',
      type: 'array',
      localized: true, // варианты зависят от языка: на ru — русские формы, на en — английские.
      labels: { singular: 'Вариант', plural: 'Варианты' },
      admin: {
        description:
          'Альтернативные формы текущей локали (на ru: тюласты, тюль-малыш; на en: seal baby). Переключай локаль в админке — список свой для каждого языка.',
      },
      fields: [
        { name: 'value', type: 'text', required: true },
        {
          name: 'category',
          type: 'select',
          options: categoryOptions,
          admin: {
            description: 'Тег варианта. Пусто = берётся тег всей записи (category выше).',
          },
        },
      ],
    },
    {
      name: 'note',
      type: 'textarea',
      localized: true,
      admin: { description: 'Контекст/пояснение: «по контексту», «уточнять вид», смысл жаргона.' },
    },
    {
      name: 'doNotTranslate',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Не переводить (имена/бренды/телефоны). Подсказка для integrity-проверки Агента 3.',
      },
    },
    sourcesField(
      'Источник термина/статуса. Охранные статусы в заметках непроверяемы — при переносе ' +
        'в структурные поля указывайте ссылку (BIO-10/BIO-13).',
    ),
  ],
}
