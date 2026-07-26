import type { Field } from 'payload'

/**
 * Охранный статус IUCN как СТРУКТУРА, а не строка (Roadmap **BIO-13**).
 *
 * Зачем: предметный аудит 2026-07-26 нашёл на сайте два разных статуса у одного животного —
 * балтийская нерпа посеяна как `VU`, а глоссарий утверждает, что `Pusa hispida` = `LC`. Оба
 * утверждения по-своему верны: `VU` — оценка БАЛТИЙСКОГО ПОДВИДА, `LC` — вида в целом. Без поля
 * «что именно оценено» противоречие неразличимо и живёт незамеченным.
 *
 * Второе (и более важное) следствие: агент, которому предписано перепроверять факты в интернете,
 * **не может сверить текстовую заметку** — ему нужны машиночитаемые год оценки и ссылка на
 * первоисточник, чтобы сравнить с актуальной страницей Red List. Поэтому это предпосылка для
 * M2-T08, а не косметика.
 *
 * `code` остаётся отдельным полем коллекции (не ломаем существующие данные и сортировку);
 * здесь — только контекст оценки.
 */
export function conservationAssessmentField(): Field {
  return {
    name: 'conservationAssessment',
    type: 'group',
    admin: {
      description:
        'Контекст охранного статуса. Без него «VU» невозможно отличить от «VU у подвида» — ' +
        'и невозможно перепроверить.',
    },
    fields: [
      {
        name: 'scope',
        type: 'select',
        options: [
          { label: 'Вид целиком (global)', value: 'species' },
          { label: 'Подвид', value: 'subspecies' },
          { label: 'Субпопуляция', value: 'subpopulation' },
          { label: 'Региональная оценка (HELCOM и т.п.)', value: 'regional' },
        ],
        admin: {
          description:
            'ЧТО именно оценено. Обязателен по смыслу: глобальный статус вида и статус ' +
            'подвида/субпопуляции часто различаются на несколько ступеней.',
        },
      },
      {
        name: 'assessedEntity',
        type: 'text',
        admin: {
          description:
            'Что стоит в оценке, если это не сам вид: напр. «Pusa hispida botnica» ' +
            '(балтийский подвид). Латынь не локализуется.',
        },
      },
      {
        name: 'assessmentYear',
        type: 'number',
        min: 1960,
        max: 2100,
        admin: { description: 'Год оценки. Статусы пересматриваются — без года они непроверяемы.' },
      },
      {
        name: 'sourceUrl',
        type: 'text',
        admin: {
          description:
            'Ссылка на первоисточник оценки (страница IUCN Red List). По ней агент сверяет ' +
            'статус при перепроверке.',
        },
      },
      {
        name: 'listingSystem',
        type: 'select',
        defaultValue: 'iucn',
        options: [
          { label: 'IUCN Red List', value: 'iucn' },
          { label: 'HELCOM', value: 'helcom' },
          { label: 'Национальная красная книга', value: 'national' },
          { label: 'US ESA', value: 'esa' },
        ],
        admin: {
          description:
            'Какой это реестр. Разные системы путают: «Threatened» у морского зайца — это US ESA, ' +
            'а не код IUCN (в IUCN он LC).',
        },
      },
    ],
  }
}
