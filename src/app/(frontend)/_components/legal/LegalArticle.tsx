import { draftNote, type LegalDoc, type LegalLang } from '@/site/legal'

/** Единый рендер legal-страницы (Impressum/Privacy/Terms) — RU/EN/DE. */
export function LegalArticle({ doc, lang }: { doc: LegalDoc; lang: LegalLang }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-4xl">{doc.title}</h1>

      {/* Плейсхолдер-контент нельзя выдавать за финальный. */}
      <p className="mt-4 rounded-card border border-border-cool bg-surface-info px-4 py-3 text-sm text-text">
        ⚠ {draftNote[lang]}
      </p>

      <div className="article-body mt-8">
        {doc.sections.map((section, i) => (
          <section key={i}>
            {section.heading && <h2 className="text-xl">{section.heading}</h2>}
            {section.paragraphs.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </section>
        ))}
        <p className="mt-8 font-mono text-xs text-muted">
          {lang === 'de' ? 'Stand' : lang === 'en' ? 'Last updated' : 'Обновлено'}: {doc.updated}
        </p>
      </div>
    </div>
  )
}
