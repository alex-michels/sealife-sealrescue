import type { CollectionConfig } from 'payload'
import { isStaff, isEditor } from '../access/roles'

/**
 * Translation memory + глоссарий (masterplan §7).
 *
 * Источник — ru (`source`, общий для всех локалей), перевод — локализованный
 * (`translation`: en сейчас, de позже). Пополняется людьми по мере роста;
 * агент-переводчик (Агент 3) ЧИТАЕТ глоссарий, но НЕ пишет в него напрямую —
 * предложения изменений идут через `agent-proposals` (инвариант human-in-the-loop).
 */
export const Glossary: CollectionConfig = {
  slug: 'glossary',
  admin: {
    useAsTitle: 'source',
    defaultColumns: ['source', 'translation', 'category', 'updatedAt'],
    description: 'Словарь терминов и тюль-сленга: ru → перевод. Для переводчиков и Агента 3.',
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
      admin: { description: 'Исходный термин на ru (ключ, общий для всех локалей). Не переводится.' },
    },
    {
      name: 'translation',
      type: 'text',
      localized: true,
      admin: { description: 'Эквивалент в текущей локали (en сейчас, de позже).' },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'term',
      options: [
        { label: 'Термин', value: 'term' }, // тюлень, ластоногие, лежбище
        { label: 'Сленг (тюль-)', value: 'slang' }, // тюль-нос, тюль-центр
        { label: 'Мем', value: 'meme' }, // жрун
      ],
    },
    {
      name: 'variants',
      type: 'array',
      labels: { singular: 'Вариант', plural: 'Варианты' },
      admin: { description: 'Альтернативные формы (напр. тюласты, тюласточки, тюль-ласты).' },
      fields: [{ name: 'value', type: 'text', required: true }],
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
  ],
}
