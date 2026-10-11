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
    /*
     * Снять блокировку после неудачных входов — только admin (Dependabot #54, GHSA-jg8r-5jh2-v2xj).
     *
     * По умолчанию у Payload здесь `Boolean(user)`, то есть ЛЮБОЙ вошедший пользователь может
     * сбросить блокировку ЧУЖОГО аккаунта. Блокировка включена (`maxLoginAttempts` = 5 по
     * умолчанию) и защищает от перебора пароля — а значит дефолт её обнуляет: утёкший API-ключ
     * агента (самая «выставленная» учётка — его отдают автоматике) позволил бы снимать блокировку
     * с admin между попытками и перебирать пароль без ограничения.
     *
     * Патча нет: уязвимы все версии до 3.88.0 включительно, а в 3.89–3.90 фикса этого места нет
     * (3.90.0 меняет соседнее — сброс пароля снимает блокировку). Поэтому закрываем явным правилом
     * доступа, которое от версии не зависит.
     */
    unlock: isAdmin,
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
