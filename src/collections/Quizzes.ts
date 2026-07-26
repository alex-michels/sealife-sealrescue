import type { CollectionConfig } from 'payload'
import { readPublishedOrStaff, canCreateContent, canUpdateContent, isEditor } from '../access/roles'
import { forceAgentDrafts } from '../hooks/contentHooks'
import { provenanceField } from '../fields/provenance'

export const Quizzes: CollectionConfig = {
  slug: 'quizzes',
  admin: { useAsTitle: 'title', defaultColumns: ['title', '_status', 'updatedAt'] },
  versions: { drafts: true },
  access: {
    read: readPublishedOrStaff,
    create: canCreateContent,
    update: canUpdateContent,
    delete: isEditor,
  },
  hooks: { beforeChange: [forceAgentDrafts] },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea', localized: true },
    {
      name: 'questions',
      type: 'array',
      minRows: 1,
      labels: { singular: 'Вопрос', plural: 'Вопросы' },
      fields: [
        { name: 'question', type: 'text', required: true, localized: true },
        {
          name: 'options',
          type: 'array',
          minRows: 2,
          labels: { singular: 'Вариант', plural: 'Варианты' },
          fields: [
            { name: 'text', type: 'text', required: true, localized: true },
            { name: 'isCorrect', type: 'checkbox', defaultValue: false },
          ],
        },
        { name: 'explanation', type: 'textarea', localized: true },
      ],
    },
    {
      name: 'aiGenerated',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Устаревший одиночный флаг: не различает язык. Заполняйте группу «provenance» ' +
          '(M1-T08/EU-11).',
      },
    },
    provenanceField(),
  ],
}
