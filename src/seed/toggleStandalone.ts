// SH-14: entry-скрипт kill-switch'а standalone-версий — для случаев, когда админка
// недоступна (alpha-прокси sealthehunter.online пропускает только игровые endpoints).
// Запуск (Node 22, tsx): npm run game:standalone -- <coming_soon|live> [slug]
// Без slug — обе игры. Логика — в lib.ts (setGameStandaloneComingSoon), тонкая обёртка
// с ТОП-ЛЕВЕЛ await (floating promise умирает до записи в БД — см. seedBaseline.ts).
import { getPayload } from 'payload'
import config from '../payload.config'
import { setGameStandaloneComingSoon } from './lib'

const args = process.argv.slice(2).filter((a) => a !== '--')
const mode = args[0]
if (mode !== 'coming_soon' && mode !== 'live') {
  console.error('Usage: npm run game:standalone -- <coming_soon|live> [slug]')
  process.exit(1)
}
const slugs = args[1] ? [args[1]] : ['seal-the-hunter', 'seal-run']

const payload = await getPayload({ config })
for (const slug of slugs) {
  const found = await setGameStandaloneComingSoon(payload, slug, mode === 'coming_soon')
  console.log(found ? `${slug} → standaloneComingSoon = ${mode === 'coming_soon'}` : `${slug} — не найдена, пропуск`)
}
process.exit(0)
