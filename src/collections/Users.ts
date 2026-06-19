import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn } from '../access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Агенты аутентифицируются по API-ключу (свой ключ на каждого агента).
    useAPIKey: true,
  },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'role', 'displayName'] },
  access: {
    create: isAdmin,
    read: isLoggedIn,
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
