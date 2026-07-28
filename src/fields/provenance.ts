import type { Field } from 'payload'

/**
 * Provenance-шкала происхождения контента (CLAUDE.md инвариант №5, EU AI Act Art. 50,
 * Roadmap **M1-T08 / EU-11**). Одна фабрика на все коллекции — чтобы шкала не разъехалась
 * между `content`, `species` и `quizzes`.
 *
 * ## Почему часть полей локализована, а часть нет
 * Разделение принципиальное, а не косметическое:
 *
 * - **Локализованные** (`aiAssisted`/`aiTranslated`/`aiChecked`/`humanReviewed`/`reviewedBy`/
 *   `reviewedAt`) описывают КОНКРЕТНЫЙ ТЕКСТ на конкретном языке. Именно этот случай прямо
 *   называет Art. 50(4): русский оригинал написан человеком, а английский — машинный перевод.
 *   Один общий флаг на документ соврал бы на одной из локалей — ровно та дыра, из-за которой
 *   старый одиночный `aiGenerated` был недостаточен.
 * - **Нелокализованные** (`sourceVerified`/`lastAgentCheckedAt`/`lastHumanVerifiedAt`) описывают
 *   ФАКТЫ, а не язык: если телефон центра или охранный статус вида подтверждён источником, он
 *   подтверждён независимо от языка карточки.
 *
 * ## Чего здесь намеренно НЕТ: `sourceContentHash`
 * EU-11 перечисляет его, но заводить отдельное поле — значит завести ВТОРОЙ механизм рядом с уже
 * работающим: хук `trackTranslationStatus` (`src/hooks/contentHooks.ts`) считает sha256 исходной
 * локали и хранит его в `localeStatus[].sourceHash`. Две копии одного хэша неизбежно разъедутся
 * (тот же класс проблемы, что дублирование списков слов между `alias.js` и `leaderboard.ts`).
 * Поэтому источником правды остаётся `localeStatus[].sourceHash`.
 * ⚠️ Следствие: у коллекций без `localeStatus` (`species`, `quizzes`) хэша исходника сегодня нет
 * вообще — расширение `trackTranslationStatus` на них остаётся в M1-T08.
 *
 * Поля заполняются человеком в админке и агентом (M2-T09); `agent` физически не может выставить
 * `humanReviewed` — ему закрыт доступ на уровне поля (`isEditorField`).
 */
import { isEditorField } from '../access/roles'

export function provenanceField(): Field {
  return {
    name: 'provenance',
    type: 'group',
    admin: {
      description:
        'Происхождение материала (AI Act Art. 50). Часть флагов — на локаль: русский оригинал ' +
        'и его машинный перевод маркируются по-разному.',
    },
    fields: [
      {
        name: 'aiAssisted',
        type: 'checkbox',
        localized: true,
        admin: { description: 'Черновик этого текста готовил AI (человек редактировал).' },
      },
      {
        name: 'aiTranslated',
        type: 'checkbox',
        localized: true,
        admin: { description: 'Эта локаль — машинный перевод с исходной локали.' },
      },
      {
        name: 'aiChecked',
        type: 'checkbox',
        localized: true,
        admin: { description: 'Факты этого текста перепроверял агент по внешним источникам.' },
      },
      {
        name: 'humanReviewed',
        type: 'checkbox',
        localized: true,
        // Человек-в-контуре: агент НЕ может пометить свой текст проверенным человеком.
        access: { create: isEditorField, update: isEditorField },
        admin: { description: 'Человек вычитал именно эту локаль. Ставит только editor/admin.' },
      },
      {
        name: 'reviewedBy',
        type: 'relationship',
        relationTo: 'users',
        localized: true,
        access: { create: isEditorField, update: isEditorField },
        admin: { description: 'Кто вычитал эту локаль.' },
      },
      {
        name: 'reviewedAt',
        type: 'date',
        localized: true,
        access: { create: isEditorField, update: isEditorField },
        admin: { description: 'Когда вычитана эта локаль.' },
      },
      {
        name: 'sourceVerified',
        type: 'checkbox',
        admin: {
          description:
            'Фактура подтверждена внешними источниками (см. поле «sources»). Не зависит от языка.',
        },
      },
      {
        name: 'lastAgentCheckedAt',
        type: 'date',
        admin: { description: 'Когда агент последний раз сверял факты с источниками.' },
      },
      {
        name: 'lastHumanVerifiedAt',
        type: 'date',
        access: { create: isEditorField, update: isEditorField },
        admin: { description: 'Когда человек последний раз подтверждал фактуру.' },
      },
    ],
  }
}

/**
 * Ссылки на источники (Roadmap **BIO-14**). До этого связь `sources` была только у
 * `rescue-centers` — то есть агенту, который ходит в интернет (требование владельца 2026-07-26),
 * было НЕКУДА записать, что он прочитал для статьи или карточки вида, а читателю — негде это
 * увидеть. Без этого поля правило «агент обязан перепроверять факты» неисполнимо by design.
 *
 * Не локализуется: источник — это источник, независимо от языка текста.
 */
export function sourcesField(description: string): Field {
  return {
    name: 'sources',
    type: 'relationship',
    relationTo: 'sources',
    hasMany: true,
    admin: { description },
  }
}
