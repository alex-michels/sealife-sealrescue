/**
 * Legal-shell (M0-T13 / EU-07). Публичный контент остаётся RU/EN; DE — отдельный
 * legal-shell (Impressum/Datenschutz/Cookies/Terms), НЕ контентная локаль.
 *
 * ⚠️ ВСЁ НИЖЕ — ПЛЕЙСХОЛДЕРЫ. Заменить `[…]` на реальные данные оператора
 * (имя, ladungsfähige Anschrift, email, USt-IdNr, §18-ответственный) и пройти
 * юридическую проверку (IT-/Datenschutzrecht) перед публичным запуском.
 * Орган надзора — ULD Schleswig-Holstein. OS-Plattform-ссылку НЕ ставить.
 */
export type LegalLang = 'ru' | 'en' | 'de'

/** Ссылки в футере — фиксированный allowlist на язык страницы (DE-ссылки только на /de). */
export const legalNav: Record<LegalLang, Array<{ slug: string; label: string }>> = {
  ru: [
    { slug: 'legal-notice', label: 'Правовая информация' },
    { slug: 'privacy', label: 'Конфиденциальность' },
    { slug: 'cookies', label: 'Cookie' },
    { slug: 'terms', label: 'Условия' },
  ],
  en: [
    { slug: 'legal-notice', label: 'Legal notice' },
    { slug: 'privacy', label: 'Privacy' },
    { slug: 'cookies', label: 'Cookies' },
    { slug: 'terms', label: 'Terms' },
  ],
  de: [
    { slug: 'impressum', label: 'Impressum' },
    { slug: 'datenschutz', label: 'Datenschutz' },
    { slug: 'cookies', label: 'Cookies' },
    { slug: 'terms', label: 'Nutzungsbedingungen' },
  ],
}

export const legalHref = (lang: LegalLang, slug: string): string => `/${lang}/${slug}`

/** Виден на каждой legal-странице — placeholder-контент нельзя выдавать за финальный. */
export const draftNote: Record<LegalLang, string> = {
  ru: 'Черновик: шаблон с плейсхолдерами. До публичного запуска заменить данные оператора и пройти юридическую проверку.',
  en: 'Draft: placeholder template. Operator data must be filled in and legally reviewed before public launch.',
  de: 'Entwurf: Platzhalter-Vorlage. Betreiberdaten sind einzusetzen und vor Veröffentlichung rechtlich zu prüfen.',
}

export type LegalSection = { heading?: string; paragraphs: string[] }
export type LegalDoc = { title: string; updated: string; sections: LegalSection[] }

export type LegalDocKey = 'legalNotice' | 'privacy' | 'terms'

const UPDATED = '2026-06-21'

export const legalDocs: Record<LegalDocKey, Record<LegalLang, LegalDoc>> = {
  legalNotice: {
    ru: {
      title: 'Правовая информация',
      updated: UPDATED,
      sections: [
        { heading: 'Оператор', paragraphs: ['[Имя или название]', '[Улица, дом]', '[Индекс, город], Германия'] },
        {
          heading: 'Контакт',
          paragraphs: [
            'E-Mail: [email@example.org]',
            'Это контактная точка оператора (в т.ч. point of contact по DSA), а не сбор данных пользователей.',
          ],
        },
        { heading: 'НДС-номер (USt-IdNr.)', paragraphs: ['[DE… — если присвоен; иначе удалить раздел]'] },
        {
          heading: 'Ответственный за редакционный контент',
          paragraphs: ['Verantwortlich i.S.d. § 18 Abs. 2 MStV: [Имя], адрес — как выше.'],
        },
      ],
    },
    en: {
      title: 'Legal notice',
      updated: UPDATED,
      sections: [
        { heading: 'Operator', paragraphs: ['[Name or company]', '[Street, no.]', '[Postcode, city], Germany'] },
        {
          heading: 'Contact',
          paragraphs: [
            'E-mail: [email@example.org]',
            "This is the operator's contact point (incl. DSA point of contact), not a collection of user data.",
          ],
        },
        { heading: 'VAT ID (USt-IdNr.)', paragraphs: ['[DE… — if assigned; otherwise remove this section]'] },
        {
          heading: 'Responsible for editorial content',
          paragraphs: ['Verantwortlich i.S.d. § 18 Abs. 2 MStV: [Name], address as above.'],
        },
      ],
    },
    de: {
      title: 'Impressum',
      updated: UPDATED,
      sections: [
        { heading: 'Angaben gemäß § 5 DDG', paragraphs: ['[Name oder Firma]', '[Straße, Nr.]', '[PLZ, Ort], Deutschland'] },
        { heading: 'Kontakt', paragraphs: ['E-Mail: [email@example.org]'] },
        { heading: 'Umsatzsteuer-ID', paragraphs: ['[DE… — falls vorhanden; sonst Abschnitt entfernen]'] },
        {
          heading: 'Redaktionell Verantwortlicher',
          paragraphs: ['Verantwortlich i.S.d. § 18 Abs. 2 MStV: [Name], Anschrift wie oben.'],
        },
      ],
    },
  },

  privacy: {
    ru: {
      title: 'Политика конфиденциальности',
      updated: UPDATED,
      sections: [
        { heading: 'Контролёр', paragraphs: ['Оператор — см. «Правовую информацию». Запросы: [email@example.org].'] },
        {
          heading: 'Минимизация данных',
          paragraphs: [
            'У публичных пользователей мы НЕ собираем email — нигде, в том числе в формах обратной связи. Реакции анонимны, личных кабинетов нет.',
          ],
        },
        {
          heading: 'Получатели / суб-процессоры',
          paragraphs: [
            'Хостинг БД: Neon (Postgres, регион EU/Франкфурт). Аналитика: Plausible (без cookies, только после согласия). [CDN/хранилище — добавить при подключении.]',
          ],
        },
        { heading: 'Сроки хранения', paragraphs: ['Технические логи — минимально необходимый срок. [Уточнить.]'] },
        {
          heading: 'Ваши права',
          paragraphs: [
            'Доступ, исправление, удаление, ограничение, переносимость, возражение, отзыв согласия. Запрос — на контакт оператора из «Правовой информации».',
          ],
        },
        {
          heading: 'Надзорный орган',
          paragraphs: [
            'ULD — Unabhängiges Landeszentrum für Datenschutz Schleswig-Holstein, Kiel (datenschutzzentrum.de).',
          ],
        },
      ],
    },
    en: {
      title: 'Privacy policy',
      updated: UPDATED,
      sections: [
        { heading: 'Controller', paragraphs: ['Operator — see the legal notice. Requests: [email@example.org].'] },
        {
          heading: 'Data minimisation',
          paragraphs: [
            'We do NOT collect email from public users — anywhere, including contact forms. Reactions are anonymous; there are no user accounts.',
          ],
        },
        {
          heading: 'Recipients / sub-processors',
          paragraphs: [
            'Database hosting: Neon (Postgres, EU/Frankfurt region). Analytics: Plausible (no cookies, only after consent). [CDN/storage — add once configured.]',
          ],
        },
        { heading: 'Retention', paragraphs: ['Technical logs — for the minimum necessary period. [Specify.]'] },
        {
          heading: 'Your rights',
          paragraphs: [
            'Access, rectification, erasure, restriction, portability, objection, withdrawal of consent. Send requests to the operator contact in the legal notice.',
          ],
        },
        {
          heading: 'Supervisory authority',
          paragraphs: [
            'ULD — Unabhängiges Landeszentrum für Datenschutz Schleswig-Holstein, Kiel (datenschutzzentrum.de).',
          ],
        },
      ],
    },
    de: {
      title: 'Datenschutzerklärung',
      updated: UPDATED,
      sections: [
        { heading: 'Verantwortlicher', paragraphs: ['Betreiber — siehe Impressum. Anfragen: [email@example.org].'] },
        {
          heading: 'Datenminimierung',
          paragraphs: [
            'Von öffentlichen Nutzern erheben wir KEINE E-Mail — auch nicht in Kontaktformularen. Reaktionen sind anonym; es gibt keine Nutzerkonten.',
          ],
        },
        {
          heading: 'Empfänger / Auftragsverarbeiter',
          paragraphs: [
            'Datenbank-Hosting: Neon (Postgres, Region EU/Frankfurt). Analyse: Plausible (ohne Cookies, nur nach Einwilligung). [CDN/Speicher — bei Nutzung ergänzen.]',
          ],
        },
        { heading: 'Speicherdauer', paragraphs: ['Technische Logs — nur so lange wie nötig. [Konkretisieren.]'] },
        {
          heading: 'Ihre Rechte',
          paragraphs: [
            'Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch, Widerruf der Einwilligung. Anfragen an den Kontakt im Impressum.',
          ],
        },
        {
          heading: 'Aufsichtsbehörde',
          paragraphs: [
            'ULD — Unabhängiges Landeszentrum für Datenschutz Schleswig-Holstein, Kiel (datenschutzzentrum.de).',
          ],
        },
      ],
    },
  },

  terms: {
    ru: {
      title: 'Условия использования',
      updated: UPDATED,
      sections: [
        { heading: 'Назначение', paragraphs: ['Контент носит информационный характер. [Минимальные условия для MVP — расширить перед монетизацией/UGC.]'] },
        {
          heading: 'Спасение тюленей',
          paragraphs: [
            'Rescue-информация — общие ориентиры, а не замена помощи специалистов. В экстренной ситуации обращайтесь в официальные центры/службы.',
          ],
        },
        { heading: 'Ответственность', paragraphs: ['Без гарантий точности/доступности. За внешние ссылки отвечают их владельцы.'] },
      ],
    },
    en: {
      title: 'Terms of use',
      updated: UPDATED,
      sections: [
        { heading: 'Purpose', paragraphs: ['Content is for information only. [Minimal MVP terms — expand before monetisation/UGC.]'] },
        {
          heading: 'Seal rescue',
          paragraphs: [
            'Rescue information is general guidance, not a substitute for professional help. In an emergency, contact official centers/authorities.',
          ],
        },
        { heading: 'Liability', paragraphs: ['No warranty of accuracy/availability. External links are the responsibility of their owners.'] },
      ],
    },
    de: {
      title: 'Nutzungsbedingungen',
      updated: UPDATED,
      sections: [
        { heading: 'Zweck', paragraphs: ['Inhalte dienen der Information. [Minimale MVP-Bedingungen — vor Monetarisierung/UGC erweitern.]'] },
        {
          heading: 'Robbenrettung',
          paragraphs: [
            'Rettungsinformationen sind allgemeine Hinweise, kein Ersatz für fachliche Hilfe. Im Notfall offizielle Stellen/Zentren kontaktieren.',
          ],
        },
        { heading: 'Haftung', paragraphs: ['Keine Gewähr für Richtigkeit/Verfügbarkeit. Für externe Links haften deren Betreiber.'] },
      ],
    },
  },
}
