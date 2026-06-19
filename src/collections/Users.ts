import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Агенты аутентифицируются по API-ключу (свой ключ на каждого агента).
    useAPIKey: true,
  },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'role', 'displayName'] },
  access: {
    create: isAdmin,
    // Минимизация/least-privilege: список аккаунтов (email, API-ключи) видит только admin;
    // остальные роли видят лишь себя.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { id: { equals: user.id } }
    },
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'viewer',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Translator', value: 'translator' },
        { label: 'Viewer', value: 'viewer' },
        { label: 'Agent (service account)', value: 'agent' },
      ],
    },
    { name: 'displayName', type: 'text' },
  ],
}
