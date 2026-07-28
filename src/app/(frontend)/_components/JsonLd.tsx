import { jsonLdScript, type JsonLd as JsonLdData } from '@/site/jsonLd'

/**
 * Вставка schema.org-разметки (M1-T16 / CR-10).
 *
 * `dangerouslySetInnerHTML` здесь — единственный способ отдать JSON внутри тега script: React
 * иначе экранирует содержимое, и разметка перестаёт парситься. Данные наши собственные и
 * сериализуются через `JSON.stringify`, пользовательский ввод сюда не попадает.
 */
export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />
  )
}
