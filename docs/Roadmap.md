# Roadmap — sealife-sealrescue

Детальный план работ. Привязан к `COMPLIANCE_EU_DE.md`, `DESIGN_BRIEF.md` и инвариантам `CLAUDE.md`.
Задачи имеют ID (`M2-T05`) — ссылайтесь на них в чате с Claude Code.

**Легенда:** `[ ]` to do · `[x]` done · `[~]` in progress · `[!]` blocked
**Размер:** `S` ≤ полдня · `M` ≈ 1–2 дня · `L` ≈ неделя+
**Фокус (мастер-план):** сайт с контентом → агенты → игры/квизы → монетизация.

> ⚠️ Жёсткие гарантии (агент не публикует/не удаляет, минимизация данных) — в КОДЕ.
> **Бренд:** sealife — игривый/умиляющийся с тюль-сленгом; sealrescue — серьёзный. «Тюлента» = сообщества VK/TG, НЕ имя сайта.
> **Вордмарки:** sealife = «Тюлень.Инфо» (RU) / «SeaLife.Info» (EN) / «Robben.Info» (DE); sealrescue = «Спасение тюленей» (RU) / «Seal Rescue» (EN) / «Robbenrettung» (DE).
> **Локали:** публичный контент — RU/EN/DE (три равноправные контент-локали). Legal-роуты локализованы (DE: Impressum/Datenschutz/Cookies/Terms). German/EU legal pages обязательны независимо от набора языков.

---

## Состояние на сейчас

* [x] Контент-схема Payload (коллекции, RBAC, drafts, очередь `agent-proposals`, хуки).
* [x] `CLAUDE.md`/`AGENTS.md` в корне; доки проекта (`Roadmap.md`, `DESIGN_BRIEF.md`, `COMPLIANCE_EU_DE.md`, `DEPLOYMENT.md`, `INFRA.md` + тех-доки) в `docs/`.
* [x] **Публичный alpha игры — live:** https://sealthehunter.online (Contabo VPS, Caddy, авто-деплой из `main`, Neon EU). Инфра-as-code: `deploy/` (cloud-init, Caddyfile, systemd), `infra/ansible/`, `.github/workflows/` (deploy/configure/seed). Последовательность go-live + troubleshooting — `DEPLOYMENT.md` §8–9; стратегия — `INFRA.md`.

**Следующее:** наполнение контентом (M1); перед запуском prod-сайтов/PII — self-hosted Postgres +
off-box бэкапы, Environment-секреты + staging (см. `DEPLOYMENT.md` §6–9).

> **Аудит документации 2026-07-01:** полный проход по всей кодовой базе против всех доков в `docs/` +
> корневых `.md`. Найденные расхождения исправлены прямо в тех-доках (`data-model.md`, `agents.md`,
> `api.md`, `localization.md`, `architecture.md`, `local-development.md`, `game-seal-hunter*.md`,
> `DEPLOYMENT.md`, `INFRA.md`); найденные пробелы в коде/тестах/инфре сведены сюда новыми пунктами
> (**SEC-05/07**, **QA-04…07**, уточнения **M0-T04/T05/T07**, **M1-T08**, **M2-T02**, **SH-06/SH-10**).
> Полные протоколы аудита — в истории PR этой ветки.

---

## M0 — Foundation / Setup (1–2 недели)

**DoD:** оба домена по HTTPS, RU/EN/DE роутинг (legal-роуты локализованы), cookie-consent + аналитика без cookies, секреты не в гите, бэкап БД, дизайн-токены подключены.

### Инфраструктура

* [x] **M0-T01** Postgres в EU/EEA (Neon, Frankfurt). *[S]*
* [~] **M0-T02** Деплой Payload+Next (EU-регион), прод + staging. *[M]* — alpha-пайплайн готов:
  CI собирает Next standalone → VPS (Contabo, EU) → Caddy + systemd, авто-деплой из `main`
  (`.github/workflows/deploy.yml`, `deploy/`). Остаётся: staging + prod-домены sealife/sealrescue. См. DEPLOYMENT.md.
  — попутно решить судьбу корневого `Dockerfile`: неиспользуемый Vercel-example boilerplate, реальный
  деплой (standalone + systemd) его не задействует нигде; либо пометить как reference-only, либо убрать
  (см. пометку в `DEPLOYMENT.md` §1, добавленную аудитом 2026-07-01).
* [~] **M0-T03** Домены (DNS, SSL, DDoS, кэш). *[M]* — `sealthehunter.online` (alpha): DNS + авто-HTTPS Caddy.
  Остальные домены (sealife/sealrescue) + DDoS/кэш — позже.
* [ ] **M0-T04** Media delivery: **Contabo Object Storage** (переплан с 2026-06-30, см. `INFRA.md` §4; было Hetzner+Bunny) + CDN Pull Zone + `assets.sealife.info` / `assets.sealrescue.info`; Sharp variants on upload; no provider URLs in CMS; AVIF/WebP/JPEG fallback; widths 320/640/960/1280/1920; game assets versioned; RU reachability test. *[M]* → PERF/SEO
* [~] **M0-T05** Секреты в secret manager; `.env` в `.gitignore`. *[S]* → SEC — `.env`/`.env*.local` уже в `.gitignore` (готово); секрет-менеджер (Vault/SOPS/облачный) — не подключён, секреты сейчас в GitHub Repository secrets + `/etc/sealife/.env` на боксе (см. `INFRA.md` §6).
* [ ] **M0-T06** Ежедневный бэкап Postgres + проверка восстановления. *[S]* → SEC — на alpha БД =
  **Neon EU** (бэкапы покрывает PITR Neon; данные анонимны, без PII). Собственный `pg_dump`-бэкап —
  **гейт перед self-hosted prod / любым PII** (DEPLOYMENT.md §7).
* [~] **M0-T07** CI: lint + typecheck + `generate:types` на PR. *[M]* → QA — lint + typecheck +
  `test:int` гейтят PR с QA-08 (`.github/workflows/test.yml`, 2026-07-02). Осталось: drift-чек
  `generate:types` (сгенерированные типы не разошлись со схемой) и pre-commit хук
  (husky/lint-staged) — либо снять формулировку хука из `CLAUDE.md`/`local-development.md`.

### Роутинг и i18n

* [x] **M0-T08** Мультидомен в одном Next: sealife и sealrescue из общей CMS. *[M]*
* [x] **M0-T09** Локализованный роутинг `/ru/…`, `/en/…` (дефолт `ru`), БЕЗ forced-редиректа; текстовый свитчер; legal-страницы могут иметь DE-версию без `/de`-контента. *[M]* → DESIGN
* [x] **M0-T10** `hreflang` + `x-default` + canonical + sitemap по локалям. *[S]* → SEO

### Дизайн-фундамент (см. DESIGN_BRIEF.md)

* [x] **M0-T16** Токены в Tailwind + CSS-переменные: primitive → **semantic-слой** (используем в компонентах только его) → два режима через data-атрибут. *[M]* → DESIGN
* [x] **M0-T17** Шрифты через `next/font` (self-host, все с кириллицей): sealife Display = Unbounded/Rubik; sealrescue = без декор-display (заголовки тяжёлым Golos Text/Onest); Body = Onest/Golos Text; Mono = JetBrains Mono. НЕ Baloo 2. *[S]* → DESIGN
* [x] **M0-T18** Базовые примитивы: типошкала, кнопки, карточка, «усатый» разделитель, статус-точка, штамп проверки. *[M]* → DESIGN
* [x] **M0-T19** Кликабельный design mock / sample shell для ВСЕХ публичных страниц и разделов без реального контента: sample texts/fake records/placeholder media; sealife + sealrescue RU/EN; legal-shell EN/DE; empty/loading/error/populated states; footer legal links + cookie settings; language switcher; route guards (`/de` content → 404); равномерная card grid на sealife; smoke-test навигации ссылок. [L] → DESIGN/QA

### EU compliance (базис) — см. сквозной трек EU

* [x] **M0-T11** Cookie-consent баннер (opt-in, reject как accept, настройки из footer). См. **EU-08**. *[M]* → EU
* [x] **M0-T12** Аналитика: **no-cookie режим**, без localStorage/fingerprinting, IP-анонимизация, без cross-site, задокументировано в Privacy; любой non-essential трекинг — только после opt-in. (Plausible/Umami; self-host сам по себе НЕ делает законным без consent.) *[S]* → EU
* [x] **M0-T13** **Legal-страницы (DE + EN shell, контент остаётся RU/EN):** Impressum/Anbieterkennzeichnung · Privacy Policy · Cookie Policy + Cookie-Settings · Terms · AI-Transparency note · контакт для запросов субъекта данных. См. **EU-07**. *[M]* → EU
* [ ] **M0-T14** AVV/DPA-реестр под-процессоров: хостинг, БД, email, аналитика, AI-провайдеры, платежи, CDN/хранилище. См. **EU-09**. *[S]* → EU
* [ ] **M0-T15** MFA на админку Payload. *[S]* → SEC

---

## M1 — Сайт с контентом (sealife.info) (4–6 недель)

**DoD:** ~20 evergreen + новости + мемы (RU/EN), уникальный дизайн применён, квизы и мини-игры работают, реакции, share-картинки, sitemap, перелинковка на sealrescue.

### Контент-рендеринг

* [x] **M1-T01** Шаблоны `Content` по type (article/news/meme/page), RU/EN. *[M]*
* [x] **M1-T02** Лента/каталог + мемная галерея с фильтрами. *[M]*
* [x] **M1-T03** «Тюленепедия» (карточки видов) + «Факт дня». *[M]*
* [x] **M1-T04** Блок перелинковки sealife → sealrescue (два регистра: «Как спасают тюленей?» / «Нашёл тюленя? Это не шутки»). *[S]*
* [x] **M1-T27** Редактируемый контент разделов (global `SectionContent`): editor может переопределять `title`/`intro`/обложку карточек разделов из админки, НЕ трогая роутинг. **Структура (`slug`/`site`/`nav`/`hasDetail`) остаётся в коде (`src/site/sections.ts`) — единственный источник правды для роутинга и route-guard'ов.** Реализация: Payload **global** (не коллекция); `slug` — `select` с опциями из `sectionDefs` (не свободный ввод); рендер берёт структуру из кода и накладывает overrides по slug, fallback на код при пустом значении → БД может только дополнять, не создавать/ломать разделы (рассинхрон невозможен). ~~Локали RU/EN~~ **все контент-локали (ru/en/de, native localized)**. Access: read public; update — editor/admin (create/delete у globals нет; агенту никогда). *[M]* → DESIGN — сделано 2026-07-02: global `section-content` + резолвер `src/site/sectionContent.ts` (чтение с `fallbackLocale: false` — пустая локаль берёт код, не русский текст); подключено в `requireSection`/`sectionMetadata`/`requireDetail` (все section-страницы) и в хаб разделов на главной (обложки карточек). **Заодно: admin-обложки карточек игр** — `games.coverImage` (upload) + `showCardCover` (выкл → плейсхолдер, картинка сохраняется), список игр и заставка страницы игры используют загруженную обложку; CDN/geo-отдача — **M0-T04**. Тесты: unit (мерж/`cardCover`) + int (access глобала, независимость локалей). Проверено в браузере: override intro + обложки на ru/en/de, hide-тумблер, cleanup.

### Дизайн / Фронтенд (см. DESIGN_BRIEF.md)

* [ ] **M1-T05** Главная sealife: bento-хаб с фикс-иерархией, кинетичный хэдлайн, дудл-маскот. Тон игривый/умиляющийся, тюль-сленг в микрокопии. *[L]* → DESIGN
* [ ] **M1-T19** Дудл-маскот (SVG) + ОДНА микрореакция (hover/load), без Lottie. *[M]* → DESIGN
* [ ] **M1-T20** Адаптив до мобайла, видимый focus, target size ≥24px, `prefers-reduced-motion`. *[M]* → DESIGN/EU

### Наполнение

* [ ] **M1-T06** Перенести лучший контент из VK/TG в CMS (RU). *[L]*
* [ ] **M1-T07** ~20 evergreen-статей (RU). *[L]*
* [ ] **M1-T08** Перевод **RU→EN → human review → publish.** Хранить provenance: `aiTranslated`, `humanReviewed`, `reviewedBy`, `reviewedAt`, `sourceContentHash`; показывать user-facing метку. (+ поля в Content/Translation.) См. **EU-11**. *[M]* → EU
  — по пути учесть: хук `markTranslationsStale` (`src/hooks/contentHooks.ts`) сейчас подключён
  ТОЛЬКО к `Content`, но не к `Species`/`Quizzes`/`Games` (у них тоже локализованные поля + drafts);
  расширить на все коллекции с переводимым контентом или явно задокументировать, почему не нужно.
* [ ] **M1-T09** Glossary/translation memory подключить к процессу перевода. *[S]*

### 🎮 Игры и вовлечение (эпик)

* [ ] **M1-T10** Квиз: рендер `Quizzes`, прохождение, результат, рейтинг. *[M]*
* [ ] **M1-T21** «Миф или правда?» — карточки с объяснением. *[M]*
* [ ] **M1-T22** «Угадай вид» — по силуэту/усам, варианты ответа. *[M]*
* [ ] **M1-T23** **Генераторы** — «какой ты тюлень сегодня», «тюлений гороскоп», «переведи фразу в тюлений стиль». «Тюлений переводчик» — фраза → тюль-сленг (вирусный генератор, share). *[M]*
* [ ] **M1-T24** «Тюлень дня» — daily-механика со streak (факт+мем+вопрос). *[M]*
* [ ] **M1-T25** Браузерная аркада «лови рыбу» (Seal Hunter). *[M]* — реализуется framework-free на **Canvas2D** (лёгкая, бюджет CWV, DESIGN-03); см. эпик **SH-** ниже. Phaser НЕ нужен именно для этой аркады, но остаётся в стеке для более «тяжёлых» игр — см. **SR-01..SR-15** (Seal Run, Phaser 4) и **M4-T05**.
* [ ] **M1-T26** Пасхалки → бейджи.
* [ ] **M1-T11** Share-картинки (Open Graph) для статей/квизов/игр (VK/TG/X). *[M]*

#### 🦭 Seal Hunter — редизайн мини-игры (Canvas2D, без Phaser)

> Игра «Тюль-Охотник / Seal The Hunter» (slug `seal-the-hunter`, рантайм в `public/games/seal-hunt-v1`).
> Решения: рендер — vanilla Canvas2D; честность — нормализация по короткой оси + балансовые
> инварианты, две грубые доски (mobile/desktop); счёт — server-authoritative и анонимный.
> Best practices: см. обсуждение (game-dev scaling + safe area; server-authoritative anti-cheat; DSA-премодерация).

* **Фаза 1 — Уборка и честность**
  * [x] **SH-01** Привести vendored-игру в порядок: убрать вложенную дублирующую `dist/`, починить/удалить `sw.js` (root-absolute пути не работают под subpath), сделать файлы в репо линтируемым источником правды. *[S]*
  * [x] **SH-02** Фиксированная симуляция: мир в логических единицах с **константной короткой осью** и клампом длинной (без «extend view»-преимущества); масштабируется только рендер. Баланс как device-independent инварианты: плотность добычи на площадь, время жизни рыбы на экране, время пересечения поля тюленем. Убирает зависимость скорости/очков от размера экрана. *[M]*
  * [x] **SH-03** HUD в safe-area (≈90% бокса), сохранить WCAG 2.2 AA: focus, target ≥24px, `prefers-reduced-motion`. *[S]* → DESIGN/EU
* **Фаза 2 — Арт**
  * [x] **SH-04** SVG-редизайн: векторные тюлень и рыбы/добыча через `Path2D`, тинт из **semantic-токенов** (Foggy Coastal Utility, оба режима). Заменить текущие примитивы. *[M]* → DESIGN
* **Фаза 3 — Лидерборды**
  * [x] **SH-05** Коллекция Payload `game-scores`: анонимное имя + score + durationMs + deviceClass (грубо mobile/desktop, без пиксельных размеров — анти-fingerprint) + статус модерации. Явный access: публичная запись НЕ напрямую; `delete` — никогда `agent`. *[M]* → EU
  * [x] **SH-06** Server-authoritative submit-API (Next route): Zod-валидация, плаузибилити-капы (catches/сек, длительность ≈60с), rate-limit; запись через Payload local API; без PII в логах. *[M]* → SEC/EU
    — ⚠️ **уточнение (аудит 2026-07-01):** отдельного profanity-фильтра/лога модерации в коде нет —
    премодерация фактически не нужна, т.к. имя игрока НЕ свободный текст, а собирается из закрытого
    списка слов (`ADJ_EN`/`MOD_EN`/`NOUN_EN`/… в `src/endpoints/leaderboard.ts`), UGC там отсутствует.
    Формулировка задачи выше упрощена относительно исходной (убран несуществующий пункт).
  * [x] **SH-07** UI лидербордов: две грубые доски (mobile/desktop), показ **перцентиля/ранга**, недельный/сезонный сброс, прозрачные правила подсчёта; полностью анонимно. *[M]* → DESIGN
  * [x] **SH-08** Анти-чит-харднинг и подстройка баланса по анонимизированным распределениям очков (итеративно). *[S]* → SEC
* **Фаза 4 — Публичный alpha (sealthehunter.online)**
  * [x] **SH-09** Standalone-лендинг игры: определение «не во фрейме», переключатель языка RU/EN/DE на
    стартовом экране (стартовый язык: `?lang=`→сохранённый→браузер; запись в `localStorage` только после
    явного выбора), пометка альфа-теста + контакт `feedback@sealthehunter.online` на старте и финале;
    встраиваемая версия не меняется. Деплой/Caddy-allowlist — DEPLOYMENT.md §4–7. *[M]* → EU/DESIGN
  * [ ] **SH-10** Legal-доступность alpha-домена (sealthehunter.online). Сейчас Caddy-allowlist отдаёт
    только игру + `/api/leaderboard`, поэтому Impressum/Datenschutz **недостижимы**, а на стартовом
    экране нет legal-ссылок (только `feedback@`). Сделать:
    1. **Футер в игре** (стартовый + финальный экран) со ссылками «Impressum · Datenschutz».
    2. **Расширить allowlist** в `deploy/Caddyfile` на legal-роуты (`/[locale]/legal-notice`, `/privacy`,
       `/cookies`, `/terms`) — чтобы страницы открывались с alpha-домена.
    3. **Impressum** — реальные имя + почтовый адрес + email (§5 DDG; `feedback@` недостаточно).
       Обновить `§5 TMG`→`§5 DDG`, если встречается.
    4. **Datenschutz** — секция про игру: `localStorage` (`seal_hunt_seed/best/sound/lang`), transient
       IP-rate-limit лидерборда (**не хранится**, legitimate interest), EU-хостинг (Contabo/Neon),
       серверные логи + ретеншн, аналитики нет.
    Cookie-баннер пока **НЕ нужен** (storage strictly-necessary/functional, аналитика выключена) —
    включить вместе с Plausible. Основание: §5 DDG + GDPR (IP = перс. данные); см. `COMPLIANCE_EU_DE.md`. *[M]* → EU
    — подтверждено аудитом (2026-07-01): ни один из 4 пунктов не реализован (нет footer/legal-ссылок
    в `index.html`, `deploy/Caddyfile` legal-роуты не аллоулистит, `src/site/legal.ts` — плейсхолдеры,
    Datenschutz не описывает `localStorage`/rate-limit игры). Статус `[ ]` верен.

#### 🕹 Phaser — «Seal Run» (референс: когда и как подключать Phaser)

> Phaser остаётся в стеке как осознанный выбор для игр со сценами/физикой/тайлмапами/множеством
> спрайтов. Правило выбора: лёгкая аркада (как Seal Hunter) → Canvas2D; богатая механика → Phaser.
> «Seal Run» (side-scroll раннер: тюлень уворачивается от хищников/мусора/камней, ловит рыбу,
> дистанция = очки) — эталонная **Phaser 4**-игра проекта. Обязательно: **lazy-load бандла**
> (динамический `import()` внутри статической игры, НЕ в общий Next-чанк — бюджет CWV/DESIGN-03),
> изоляция как у Canvas2D-игры (iframe/route на `sealife.info/[locale]/games/seal-run` + vanity-
> редирект `sealrun.sealife.info` → этот путь, БЕЗ отдельного standalone-домена в v1 — см.
> `docs/game-seal-run.md` §2.5), переиспользование анонимного server-authoritative лидерборда
> (SH-05/06/07, расширение полей — SR-09). Полный дизайн (биология/баланс/архитектура + аудит
> 2026-07-01) — [`docs/game-seal-run.md`](game-seal-run.md).
>
> **Порядок работ:** сначала **играбельный vertical slice** — SR-05 (минимальная сцена) + SR-03
> (sim-core) + один тип препятствия + одна рыба, **без арта / без лидерборда / без анти-чита** —
> чтобы проверить шов «Phaser 4 ↔ изоморфный sim-core» ДО вложений в SR-06 (арт) и SR-10 (анти-чит).

* **Фаза 1 — Дизайн и harness баланса**
  * [ ] **SR-01** Спека механик: **управление — непрерывное свободное движение по Y** (тюлень плывёт
    к целевому Y со сглаживанием; касание/перетаскивание на мобильном, указатель/↑↓ на десктопе),
    контент авторится по дискретным Y-«полосам» (bands); 3 яруса препятствий (хищники −жизнь /
    сети-мусор−замедление / камни−отскок), **ростер v1 биом-точный** (`coastal`: орка + белая акула +
    крупная акула-вариант; белый медведь/морской леопард — v2 с их биомами); единый стамина/кислород-
    метр (восстановление рыбой); сид-детерминированная трасса (`courseSeed = hash(season)`, общая на
    неделю); фиксированная по дистанции сессия (не бесконечная). *[M]* → DESIGN
  * [ ] **SR-02** **Изоморфный** `core/course.js` + `core/chunks/*.js` (dependency-free ESM, без DOM/
    Phaser, целочисленный `mulberry32` — одни файлы для браузера И для Node-адаптера анти-чита SR-10):
    формат чанка (difficultyScore/biome/**bands**/obstacles/fish) + библиотека 15–25 авторских чанков
    (один biome `coastal` в v1) + `generateCourse(seed, biome)` сид-детерминированный сборщик. *[M]*
  * [ ] **SR-03** `core/sim.js`+`core/balance.js` (DOM-free): физика тюленя по Y (**eased target-Y
    follow**, описать на собственных условиях), стамина/жизни/баффы/дебаффы как в спеке SR-01,
    константы из таблицы балансировки первого прохода. *[M]*
  * [ ] **SR-04** `tools/fairness-sim.mjs` + `tools/compare-variants.mjs`: headless-бот (фикс.
    политика **непрерывного Y-контроля**: держаться безопасной полосы, заходить за рыбой, если путь
    чист) по матрице устройств (как у Seal Hunter) × N сидов трассы; отчёт по разбросу дистанции/
    жизней/улова — и по девайсам, и по сидам. Гейт перед тюнингом баланса. *[M]*
* **Фаза 2 — Core-механика + Phaser-интеграция**
  * [ ] **SR-05** Vendored **Phaser 4** (≥4.1.0 «Salusa», ESM-билд; `public/games/seal-run-v1/vendor/
    phaser.esm.js`, статический файл, БЕЗ нового бандлера) + сцены Boot→Preload→MainMenu→Play→
    GameOver; Play-сцена — тонкий рендер-слой над `core/sim.js`/`core/course.js` (object pooling для
    рыбы/препятствий, Arcade Physics). Динамический `import()` вендор-бандла (~400–500 КБ gzip) ТОЛЬКО
    по нажатию «Старт». **iframe-гочи:** `allowfullscreen`; fullscreen-запрос на `pointerup` (iOS);
    guard против залипания тача при уходе iframe в фон. *[L]* → PERF
  * [ ] **SR-06** Арт: спрайт-атлас тюленя (профиль сбоку — свободное плавание с лёгким наклоном;
    задел под будущую «галумпинг»-анимацию, не для v1) + хищники **v1 биом-точные (орка/белая акула +
    крупная акула-вариант; белый медведь/морской леопард отложены со своими биомами)** + мусор (сеть-
    призрак/пластик) + камни/водоросли/рыба; тинт из **semantic-токенов** (Foggy Coastal Utility),
    параллакс-фон (2–3 слоя). *[L]* → DESIGN
  * [ ] **SR-07** HUD (жизни/стамина-бар/дистанция) в safe-area, HTML-инструкции и HTML-результат
    ВНЕ canvas (доступность), WCAG 2.2 AA (focus/target≥24px/`prefers-reduced-motion` глушит
    параллакс/вспышки), ярусы препятствий различимы НЕ только цветом (силуэт). *[M]* → DESIGN/EU
* **Фаза 3 — Лидерборд/бэкенд**
  * [ ] **SR-08** Документ `games` (`slug: seal-run`, `embed`, `how`) — без изменений схемы. *[S]*
  * [ ] **SR-09** Расширить `game-scores`: опциональные поля `distance`/`livesRemaining`/
    `fishCollected`/`courseSeed` (обратная совместимость с Seal Hunter — все null/omitted для
    существующих строк; `courseSeed` выводится сервером из токена SR-10, не от клиента); `score`
    остаётся required сорт-ключом (производная формула от дистанции+улова+жизней, **ДОЛЖНА оставаться
    ≤100000** — текущий Zod-кап `SubmitBody`; иначе бампнуть кап здесь же), код ранжирования в
    `leaderboard.ts` не меняется. `generate:types` + обновить `data-model.md`. *[M]*
  * [ ] **SR-10** Anti-cheat под раннер (текущий submit-хендлер `leaderboard.ts` ~L269–307 — единый
    путь с зашитым окном 50–70с), три части:
    1. **Per-game dispatch:** `SubmitBody` получает опц. поля; ветвление правдоподобия по слагу —
       Hunter оставляет фикс-окно, Run считает `minPlausibleMs = distance / MAX_SPEED_UNITS_PER_MS`;
       порог token-age (`MIN_PLAY_MS`) тоже per-game (Run допускает ~3с при ранней смерти).
    2. **Пиннинг курса в токен:** на `/start` добавить в подписанный токен `cs` (courseSeed) + сезон
       (сервер выводит `courseSeed = hash(сезон-выдачи)`, клиент не поставляет как истину); валидация
       и запись — против сезона/трассы ТОКЕНА. Чинит ложный отказ на границе ISO-недели и блокирует
       грайнд лёгкого исторического сида.
    3. **Серверная пересборка трассы** через изоморфный `core/course.js` (SR-02, тонкий адаптер в
       `src/`) → сверка `fishCollected`/`distance` с бюджетом рыбы этой трассы. Основной гейт;
       статистические капы Seal Hunter — предфильтр. Возможно ТОЛЬКО благодаря сид-детерминированной
       трассе. *[M]* → SEC
  * [ ] **SR-11** `core/alias.js`+`i18n.js`+`sw.js` для seal-run-v1 — копии структуры Seal Hunter
    (свой словарь строк, свой `CACHE`-конст, свои `localStorage`-ключи `seal_run_seed`/`_best`/
    `_lang`/`_sound`), синхронно с серверным `makeParts`/word-lists (тот же общий сервер-эндпоинт,
    только новый `game`-slug). *[S]*
* **Фаза 4 — Доступность/compliance/публикация**
  * [ ] **SR-12** Встраивание на `sealife.info` (и, если уместно тону, `sealrescue.info`) через
    существующий `/[site]/[locale]/games/[slug]` роут (канонический origin) **+ vanity-редирект 301
    `sealrun.sealife.info` → этот путь** (~5 строк Caddy/хоста; один origin → legal достижим, без
    повтора SH-10). БЕЗ отдельного standalone-домена в v1 (см. `docs/game-seal-run.md` §2.5:
    `sealife.info` ещё не в проде). Промоушен поддомена в standalone-origin — ревью ПОСЛЕ прод-запуска
    `sealife.info` и ПОСЛЕ SH-10. *[S]*
  * [ ] **SR-13** Datenschutz: добавить секцию про `localStorage`-ключи Seal Run (по аналогии с
    SH-10 п.4 для Seal Hunter) — т.к. игра на основном домене, отдельный legal-allowlist/футер НЕ
    нужен (страницы и так достижимы). *[S]* → EU
  * [ ] **SR-14** E2E (`tests/e2e/game-seal-run.e2e.spec.ts` по конвенции `game-standalone.e2e.spec.ts`,
    без standalone-ветки) + **determinism/parity юнит-тест `generateCourse(seed)`**: golden-hash
    трассы совпадает (а) при повторе и (б) **между Node и браузерным билдом** — кросс-рантайм-свойство,
    на которое опирается серверная пересборка SR-10 п.3; CI-страж против дрейфа изоморфного модуля. *[M]* → QA
  * [ ] **SR-15** Аудио: SFX (подбор рыбы / удар / бафф / game-over) + опц. фоновый луп; тумблер
    звука, muted-by-default, persist в `seal_run_sound` только после явного действия пользователя. *[S]* → DESIGN

### Реакции (без авторизации)

* [ ] **M1-T12** Эндпоинт инкремента реакций: атомарный +1, rate-limit, дедуп localStorage. Прямую запись держать за staff. *[M]* → SEC *(CLAUDE.md шаг 1)*
* [ ] **M1-T13** UI реакций (🦭 ❤️ 😂 😭). *[S]*

### SEO (база)

* [ ] **M1-T15** `sitemap.xml` по языкам, `robots.txt`. *[S]* → SEO
* [ ] **M1-T16** schema.org + meta из поля `seo`. *[S]* → SEO
* [ ] **M1-T17** SEO-кластеры (мастер-план §12) как контент-план. *[S]* → SEO

---

## M2 — Справочник спасения + Агент-1 (4–6 недель)

**DoD:** 20–50 центров с датами проверки, форма правок, rescue-квест, Агент-1 кладёт находки в очередь, кнопка «Применить предложение».

### sealrescue.info (emergency-first + витрина центров, см. DESIGN_BRIEF §5–6)

* [ ] **M2-T01** «Нашёл тюленя — что делать / чего НЕ делать» (RU/EN), дистанция не хардкодится. *[M]*
* [ ] **M2-T02** Каталог центров: **list-first** + карта (toggle), фильтр-чипы с числом результатов, «штамп проверки», `socialLinks`, `tel:`, маршрут. *[L]* → DESIGN
  — коллекция `rescue-centers` в Payload уже существует с нужными полями (`location`, `socialLinks`,
  `operatingLanguages`, `verificationScore`, `verifiedByAgentAt/HumanAt`); фронтенд
  (`rescue-centers/page.tsx` и `[slug]/page.tsx`) сейчас на 100% на моках (`@/mock/sample`), не читает
  из Payload — эта задача включает и перевод фронтенда с mock на реальные данные.
* [ ] **M2-T03** Наполнить 20–50 центров (RU/EN). *[L]*
* [ ] **M2-T04** Форма «Сообщить об ошибке / предложить центр» → `user-submissions` (премодерация, без email). См. **EU-10**. *[M]* → EU
* [ ] **M2-T05** Блок перелинковки sealrescue → sealife. *[S]*
* [ ] **M2-T15** 🎮 «Что делать, если нашёл тюленя?» — интерактивный rescue-квест (игра+обучение, ведёт в каталог). *[M]* → DESIGN

### Агент-1 (Researcher / факт-чекер)

* [ ] **M2-T06** Контракт вывода Агента-1: JSON-схема предложения (diff+evidence+confidence+sources) + промпт + пример. *[M]* *(CLAUDE.md шаг 2)*
* [ ] **M2-T07** Оркестрация (LangGraph) + поиск (Tavily/Perplexity) + парсинг (Playwright в sandbox). *[L]* → SEC
* [ ] **M2-T08** Логика проверки центров: ссылки, телефон/email/адрес, новые центры, новости; confidence + снапшот. *[L]*
* [ ] **M2-T09** Запись в `agent-proposals`/`agent-runs` по API-ключу `agent`. Проверить: нет publish/delete. *[M]* → SEC
* [ ] **M2-T10** Cron + бюджет-лимит AI API + лог `cost`. *[M]* → SEC
* [ ] **M2-T11** Allowlist источников через `Source.trustLevel`. *[S]* → SEC

### Дашборд (ревью)

* [ ] **M2-T12** «Очередь изменений»: карточки, diff было→стало, Approve/Reject/Edit. *[M]*
* [ ] **M2-T13** «Применить предложение»: diff → обновить документ КАК ЧЕРНОВИК, proposal `applied`. *[M]* *(CLAUDE.md шаг 3)*
* [ ] **M2-T14** Turnstile на формы. *[S]* → SEC/EU

---

## M3 — Остальные агенты, дашборд, монетизация (6+ недель)

**DoD:** агенты 2/3/5 через очередь, дайджест, донаты, лидерборд.

### Агенты

* [ ] **M3-T01** Агент-2 (Content Admin): находки → черновики + внутренние ссылки + версии для VK/TG. *[L]*
* [ ] **M3-T02** Агент-3 (Translator integrity): RU→EN по glossary, stale через `content_hash`, provenance-поля. *[L]*
* [ ] **M3-T03** Агент-5 (SEO): title/meta/alt/hreflang/schema, каннибализация, страницы без перевода. *[M]*
* [ ] **M3-T04** Агент-6 (Security and Compliance): два раза в месяц проверяет актуальные законы, акты и нормы, требования безопасности и следует ли сайт им, нужно ли выполнять, что можно убрать, что нужно добавить или поменять. *[M]*
* [ ] **M3-T05** Daily digest в личный Telegram. *[S]*

### Дашборд (полный)

* [ ] **M3-T05** «Переводы»: RU/EN рядом, diff, статус, provenance. *[M]*
* [ ] **M3-T06** «SEO»: страницы без meta/hreflang/canonical. *[S]*
* [ ] **M3-T07** «Модерация» UGC (лог модерации, см. EU-10). *[S]*

### Монетизация (мастер-план §12)

* [ ] **M3-T08** Донаты RU: Boosty / Telegram Stars / VK Донат / ЮKassa. *[M]*
* [ ] **M3-T09** Донаты EN/EU: Buy Me a Coffee / Ko-fi / Patreon. *[S]*
* [ ] **M3-T10** Прозрачные прогресс-бары целей. *[M]*
* [ ] **M3-T11** 🎮 Лидерборд квизов/игр + бейджи + пасхалки. *[M]* — анонимно (SH-05…07); кросс-девайс идентичность (общая позиция везде) — опционально через эпик **ACC** (ACC-T10).

> Появятся донаты/платные продукты → нужны Terms/AGB + (для цифровых товаров) Widerrufsrecht; платёжные рельсы для RU проверить перед запуском.

---

## M4 — Масштаб

* [ ] **M4-T01** Telegram-бот / mini-app: квиз, донат, платные квесты. *[L]*
* [ ] **M4-T02** Платные цифровые продукты (PDF, карточки, материалы учителям). *[M]*
* [ ] **M4-T03** Print-on-demand мерч (Printful/Printify). *[M]*
* [ ] **M4-T04** Полноценная карта центров. *[M]*
* [ ] **M4-T05** 🎮 idle «собери лежбище» (Phaser-игра — «Seal Run» уже расписана отдельно, см. **SR-01..SR-15**). *[L]*
* [ ] **M4-T06** Поиск по сайту (Meilisearch/Typesense); позже pgvector/RAG. *[L]*
* [ ] **M4-T07** Агент-4 (SysAdmin) на полную: uptime, broken links, Lighthouse, очереди, алерты. *[M]* → SEC
* [ ] **M4-T08** Конфиг ниши (`Niche`) для клонирования на другие темы. *[L]*

---

## ACC — Публичные аккаунты / кросс-скоуп идентичность (опционально, пост-MVP)

> **Статус: не в MVP.** Включается только когда понадобится кросс-девайс идентичность: общая позиция
> в лидербордах, ачивки, кастомные тюлени/hero-SVG, новые локации/прогресс в играх. Правовой режим и
> обоснования — `COMPLIANCE_EU_DE.md` §9. **Ключ:** основание аккаунта — **договор** (DSGVO Art. 6(1)(b)),
> НЕ согласие; согласие нужно только под newsletter. Аккаунт всегда **опционален** — аноним продолжает
> играть (SH-05…07). Память: [[accounts-contract-vs-consent]].

**Кросс-доменный SSO (почему так):** cookie не шарится между разными корневыми доменами
(`sealife.info` ↔ `sealthehunter.online`), поэтому «один username везде» = центральный IdP.

```
                       ┌──────────────────────────────────────────────┐
                       │      accounts.sealife.info  (central IdP)      │
                       │   ─ единая таблица `players` (source of truth) │
                       │   ─ magic-link / passkeys / (опц.) пароль      │
                       │   ─ выдаёт сессию (cookie) + OIDC-токены        │
                       └───────────────┬──────────────────┬────────────┘
        cookie  .sealife.info          │                  │   OIDC (Auth Code + PKCE)
   (общая для всех поддоменов)         │                  │   redirect-login + токен
        ┌──────────────┬──────────────┘                  └────────┬───────────────┐
        ▼              ▼                                           ▼               ▼
  sealife.info   game.sealife.info                        sealrescue.info   sealthehunter.online
  (тот же root —  quizzes.sealife.info                    (другой root —    (другой root —
  cookie работает) (заводить игры сюда →                  OIDC redirect)    OIDC redirect)
                    cookie бесплатно)
```

> Правило: что можно — заводим как `*.sealife.info` (cookie бесплатно). Отдельные бренд-/игровые домены
> — через redirect-SSO. Username уникален глобально через `UNIQUE` на `players`.

### Фаза 0 — сейчас (без аккаунтов)

* [x] **ACC-T00** Анонимные device-bound идентификаторы (лидерборд SH-05/06/07). *(текущее состояние)*

### Фаза 1 — минимальные аккаунты

* [ ] **ACC-T01** Коллекция `players` (Payload `auth`, **отдельная** от admin `users`) — схема ниже (b). *[M]* → SEC/EU
* [ ] **ACC-T02** Аутентификация = **magic-link only** (без паролей → без reset-флоу и хранения секрета): одноразовый токен (короткий TTL, single-use) + email-верификация. Сессия — httpOnly/Secure/SameSite cookie на `.sealife.info`; rate-limit на login и выдачу ссылки; защита от email-enumeration. *[L]* → SEC/EU
* [ ] **ACC-T03** Кросс-доменный SSO: cookie для `*.sealife.info`; **OIDC (Auth Code + PKCE)** для sealrescue.info и игровых доменов (`accounts.sealife.info` как IdP). *[L]* → SEC
* [ ] **ACC-T04** Self-service права субъекта: экспорт (JSON, Art. 15/20), правка username/email (Art. 16), **удаление аккаунта (Art. 17)** с анонимизацией публичного вклада (username → «удалённый тюлень»; строки лидерборда/комментариев не удаляются). *[M]* → EU
* [ ] **ACC-T05** Миграция анонима: при первом логине с устройства — «забрать очки этого устройства» (merge anon-id **текущего** устройства, с подтверждением; без авто-merge между устройствами). *[M]* → SEC
* [ ] **ACC-T06** Возрастной гейт: самодекларация **«16+»** (хранить boolean, не дату; Art. 8 DSGVO + §§104–113 BGB; согласуется с EU-05). *[S]* → EU
* [ ] **ACC-T07** Обновить Datenschutz (RU/EN/DE), Terms (становятся обязательными), реестр Art. 30, DPA email-провайдера (EU: Brevo/Mailjet/Scaleway TEM/self-host Postfix). *[M]* → EU

### Фаза 2 — расширение

* [ ] **ACC-T08** Passkeys (WebAuthn) + опциональный пароль (**Argon2id**, соль; никогда plaintext). *[M]* → SEC
* [ ] **ACC-T09** Newsletter: отдельный неотмеченный opt-in + **Double-Opt-In** (DE/UWG) + таблица `consents` (тип, версия текста, время, метод; Art. 7(1)); отзыв так же прост, как согласие (Art. 7(3)). *[M]* → EU
* [ ] **ACC-T10** Привязать к аккаунту фичи **на основании-договора** (без нового согласия): кросс-девайс лидерборд (поверх анонимного SH-07 / M3-T11), ачивки/бейджи, кастомные тюлени/hero-SVG, прогресс по локациям. *[L]* → DESIGN

### (b) Схема коллекции `players` + access control

> **Отдельная** от admin `users` (Payload поддерживает `auth` на нескольких коллекциях): публичные
> пользователи НЕ получают доступ в админку. Поля минимальны (COMPLIANCE §9.4).

```
players (auth: true)
  id             uuid     — внутренний ключ; единственное, по чему джойним
  email          email    — auth/reset/security (рассмотреть encrypt-at-rest)
  emailVerified  date
  passwordHash   text     — NULL при magic-link-only
  username       text     — публичный, ГЛОБАЛЬНО уникальный (citext / UNIQUE); ЕДИНСТВЕННОЕ публичное поле
  locale         select   — ru | en | de
  ageConfirmed   checkbox — «16+» boolean (НЕ дата рождения)
  lastLoginAt    date
  createdAt / updatedAt
  — согласия: ОТДЕЛЬНАЯ коллекция `consents` (player, type, textVersion, grantedAt, method)
НЕ хранить: имя, адрес, телефон, дату рождения, пол.
```

**Access (явный, как у всех коллекций):** `read` — себя; публично доступен ТОЛЬКО `username` через
санитизированный endpoint (никогда email); `create` — публичный (через auth-флоу регистрации);
`update` — только своя запись; `delete` — только своя запись, **НИКОГДА `agent`**. Поля `email`/`passwordHash`
скрыты от чужого read. Публичные джойны (лидерборд/комментарии) — только по `id` → `username`.
**После изменения схемы:** `npm run generate:types`; отразить в `data-model.md` (`players`, `consents`).

### (c) Копирайтинг регистрации + тексты согласий (RU/EN/DE)

> Цель: **один** обязательный контрол (Terms + Datenschutz) + **один** отдельный opt-in (newsletter).
> Никаких преднастроенных галочек, никакого бандлинга (Art. 7(4)). Финальные формулировки — на
> юр-сверку (EU-06).

* [ ] **ACC-T11** Тексты экрана регистрации и согласий, локализованные RU/EN/DE:
  * **Обязательный чек-бокс (Terms + Datenschutz, НЕ предотмечен):**
    * RU: «Я принимаю [Условия использования] и ознакомился(-ась) с [Политикой конфиденциальности].»
    * EN: «I accept the [Terms of Use] and have read the [Privacy Policy].»
    * DE: «Ich akzeptiere die [Nutzungsbedingungen] und habe die [Datenschutzerklärung] gelesen.»
  * **Опциональный newsletter-opt-in (отдельный, НЕ предотмечен; Double-Opt-In):**
    * RU: «Присылайте мне новости SeaLife на email. Отписаться можно в любой момент.»
    * EN: «Send me occasional SeaLife news by email. You can unsubscribe anytime.»
    * DE: «Schickt mir gelegentlich SeaLife-News per E-Mail. Jederzeit abbestellbar.»
  * **Age-gate (16+):**
    * RU: «Мне 16 лет или больше.» · EN: «I am 16 or older.» · DE: «Ich bin 16 Jahre oder älter.»
  * **Verification email:** короткий single-use link; текст «подтвердите, что адрес ваш»; TTL в минутах.
    Логировать версию текста согласия (Art. 7(1)).
  * *[M]* → EU/DESIGN

---

## Сквозные треки (непрерывно)

### SEC — Безопасность (OWASP LLM + web)

* [ ] **SEC-01** Отдельный API-ключ на агента; ротация. *[S]*
* [ ] **SEC-02** Sandbox для парсинга внешних страниц. *[M]*
* [ ] **SEC-03** Анти-prompt-injection: внешний контент = данные, не инструкции. *[M]*
* [ ] **SEC-04** Audit log действий агентов. *[S]*
* [ ] **SEC-05** Rate-limiting форм и API. *[S]* — `user-submissions.create` сейчас публичный
  (`() => true`) БЕЗ rate-limit/CAPTCHA, в отличие от лидерборда (HMAC+Zod+rate-limit); реальный
  вектор спама модерационной очереди до **M2-T14** (Turnstile). Приоритизировать перед M2-T04 идёт в прод.
* [x] **SEC-06** Проверка: только admin/editor имеют `delete`; `agent` не публикует. *[S]* —
  закреплено автотестом (QA-13, 2026-07-02): `tests/int/access-matrix.int.spec.ts` гоняет всю
  матрицу и отдельными ассертами проверяет «delete нигде не содержит agent» +
  `forceAgentDrafts` (create/update агентом с `_status: published` сохраняется draft'ом).
* [x] **SEC-07** Явный access (create/update/delete) для коллекции `media`. *[S]* — сделано в
  QA-13 (2026-07-02): inline `Media` в `payload.config.ts` получил `create/update/delete: isEditor`
  (до этого Payload-дефолт пускал ЛЮБОГО залогиненного, включая agent); мёртвый
  `src/collections/Media.ts` удалён; матрица в `data-model.md` обновлена и закреплена тестом.

### EU — Compliance (GDPR / TDDDG / DDG / BFSG / DSA / AI Act) — см. `COMPLIANCE_EU_DE.md`

* [ ] **EU-01** Аудит собираемых персональных данных (цель — почти ноль). *[S]*
* [ ] **EU-02** Процедура «право на удаление/доступ». *[S]*
* [ ] **EU-03** Маркировка AI-контента видна пользователю (база; полная схема — EU-11). *[S]*
* [ ] **EU-04** **WCAG 2.2 AA:** контраст, alt, клавиатура, семантика, видимый focus, target size, reduced motion. *[M]* → DESIGN
* [ ] **EU-05** Детские разделы: без форм с PII; без поведенческой рекламы на детей. *[S]*
* [ ] **EU-06** Перед EN/EU-запуском — сверка с юристом (IT-/Datenschutzrecht). *[S]*
* [ ] **EU-07** **DDG Impressum / Anbieterkennzeichnung:** `/impressum` доступен с каждой страницы; DE+EN текст; контактный email; ответственное лицо/legal entity + адрес; для новостей — «§18 MStV»-ответственный; без скрытых legal-ссылок; OS-Plattform-ссылку не ставить. *[M]*
* [ ] **EU-08** **§25 TDDDG consent:** non-essential cookies/storage только после opt-in; «Reject all» так же доступен, как «Accept all»; отзыв так же прост, как согласие; Cookie-Settings из footer; CMP логирует согласия. *[M]*
* [ ] **EU-09** **AVV/DPA-реестр** (= M0-T14): hosting · БД · email · аналитика · AI-провайдеры · платежи · CDN/хранилище; трансферы в третьи страны + гарантии. *[S]*
* [ ] **EU-10** **UGC / DSA readiness:** все submissions премодерируются; abuse/report-канал (notice-and-action); лог модерации; нет публичного UGC без ревью; appeals-процесс, если появятся публичные аккаунты/комментарии (см. эпик **ACC**). *[M]*
* [ ] **EU-11** **AI Act transparency (Art. 50, к 08.2026):** метки AI-assisted / AI-translated / AI-checked / Human reviewed / Source verified; статус проверки человеком; disclosure, если появится чат-бот; маркировка дипфейков. *[M]*

### DESIGN — Дизайн-система

* [ ] **DESIGN-01** Держать токены едиными; уникальность — в signature-элементах, не в хаосе. *[S]*
* [ ] **DESIGN-02** Не перекрашивать админку Payload; dashboard агентов — плотный, без декора. *[S]*
* [ ] **DESIGN-03** Производительность: SVG-дудлы, self-host шрифты, бюджет Core Web Vitals. *[S]* → SEO

### QA — Качество (расширенный план тестирования)

> **Правило проекта: любая фича без теста — баг** (закреплено в `CLAUDE.md` → Dev best practices
> и `docs/local-development.md` § Тесты). Сайт активно развивается, и изменения регулярно ломают
> соседний функционал; единственная защита — чтобы каждый контракт был закреплён зелёным тестом,
> падающим при поломке ИЛИ при устаревании самого контракта.
>
> **Модель — test trophy, слои снизу вверх:**
> 1. **Unit** (Vitest, без БД/DOM, < 5 c): чистая логика — i18n, alias/PRNG, season-математика, хуки.
> 2. **Integration** (Vitest + Payload local API + тестовая БД): access-матрица, хуки на записи,
>    endpoints (лидерборд), сиды.
> 3. **E2E** (Playwright против `next build && next start`): роутинг/страницы/UI-контракты/игра.
> 4. **Специальные слои:** a11y (axe), визуальная регрессия (скриншоты styleguide), перф (Lighthouse
>    CI + CWV-бюджеты), детерминированная симуляция для игр (seeded golden runs).
>
> **Конвенции:** тесты детерминированы (фиксированный seed, замороженное время где надо); никаких
> sleep-ожиданий — только web-first assertions; сетевые зависимости в e2e мокируются
> (`tests/e2e/helpers/mock-leaderboard.ts` — образец); фикстуры не зависят от dev-данных.
> Порядок внедрения: **A (гейт) → B (инварианты бэкенда) → C/E (пользовательские контракты) → D/F**.

#### QA-A — Фундамент: CI-гейт и слои тестов

* [x] **QA-08** CI-workflow `test.yml`: `lint` + `tsc --noEmit` + `test:int` на каждый PR и push в
  `main`; тестовая БД — ephemeral Postgres (service container, образ **postgis/postgis** — поле
  `point` у RescueCenters требует PostGIS), схему создаёт push-режим Payload. Сделано 2026-07-02.
  Required check `test` на `main` ВКЛЮЧЁН (branch protection; репо стало public 2026-07-02):
  мерж в `main` невозможен на красном `test`; strict=false (PR не обязан быть up-to-date),
  enforce_admins=false. Шаг `test:unit` добавится при разнесении слоёв (**QA-10**); drift-чек
  `generate:types` остался в **M0-T07**. Закрывает **QA-06**. *[M]*
* [x] **QA-09** Playwright в CI: job `e2e` в `test.yml` — схема через `scripts/push-dev-schema.mts`
  → `next build` → Playwright сам поднимает `next start` (webServer, ветка CI) → полный e2e-прогон
  на chromium headless shell (channel-пин снят); трейсы/скриншоты — артефакты при фейле; retries=2
  и `reuseExistingServer:false` только в CI; кэш браузеров по версии Playwright. Включает обратно
  game-leaderboard-scroll (**QA-07**). Заодно починен локальный `test:e2e`: webServer теперь
  `npm run dev` (был `pnpm dev` — не поднимался без pnpm). Сделано 2026-07-02. *[M]*
* [x] **QA-10** Разнести Vitest на `test:unit` (чистая логика, без БД, секунды) и `test:int`
  (Payload+БД); coverage (V8) с порогом на `src/` — старт 40%, повышать по мере покрытия. *[M]* —
  сделано 2026-07-02: vitest `projects` (unit: node-env `tests/unit/`, int: jsdom `tests/int/`);
  скрипты `test:unit`/`test:int`/`test:coverage`; в CI job `test` гоняет `test:coverage`.
  Стартовый unit-слой — 6 спеков (~50 тестов): access-матрица ролей (срез QA-13), resolveSiteId,
  инварианты локалей + t() + buildAlternates, alias-рендер лидерборда (срез QA-16), factOfDay,
  sections/legal/formatDate. Пороги (ratchet, только вверх): lines/statements/functions 40,
  branches 18 (ветвление в endpoint-ветках leaderboard.ts — поднять до 40 с **QA-15**).
  Coverage include: `src/**` без `src/app` (e2e-территория), payload-types, seed, mock.
* [x] **QA-11** Изоляция тестовой БД: отдельная схема/БД на прогон + сид фикстур в `beforeAll`;
  int-тесты не читают и не портят dev-данные. *[M]* — сделано 2026-07-02: в CI — ephemeral
  Postgres на прогон (с QA-08); локально int-тесты идут в `DATABASE_URI_TEST` (отдельная
  БД/Neon-ветка, `.env.example`), подмена в `vitest.setup.ts` с громким предупреждением при
  фолбэке на dev-БД. E2e сознательно вне механизма (сид и сервер должны смотреть в одну БД).
  Сид фикстур: паттерн `tests/helpers/seedUser.ts`; полные фикстуры придут с QA-13/15/18.
* [x] **QA-12** Политика флаки: quarantine-тег, запрет `waitForTimeout` в пользу assertions,
  максимум 2 ретрая в CI, флаки-тест чинится или удаляется в течение недели. Задокументировать
  в `local-development.md`. *[S]* — сделано 2026-07-02: `waitForTimeout` запрещён ESLint-правилом
  (`no-restricted-syntax` для `tests/**`); тег `@quarantine` исключается в CI (`grepInvert` в
  playwright.config.ts), локально бежит; retries=2 CI-only (было с QA-09); политика —
  `local-development.md` § Тесты → Конвенции.

#### QA-B — Бэкенд: access control, хуки, endpoints, сиды

* [x] **QA-13** Access-матрица ВСЕХ коллекций (14 шт.) параметризованным int-тестом: роли
  (anon/viewer/translator/editor/admin/agent) × операции (create/read draft+published/update/delete/
  publish) × ожидание из `data-model.md`. Инварианты №1–2 CLAUDE.md (agent никогда publish/delete)
  — отдельные явные ассерты. Расширяет **QA-01**, закрывает проверочную часть **SEC-06**. *[L]* —
  сделано 2026-07-02: `tests/int/access-matrix.int.spec.ts`, 110 тестов (матрица C/U/D по 14
  коллекциям, boolean-read группы, read-фильтр черновиков, least-privilege `users`,
  `forceAgentDrafts` create+update, контроль «editor публикует»). Заодно закрыт **SEC-07**
  (явный access у `media` — тест иначе падал) и поднят coverage-ratchet
  (lines 45 / stmts 46 / funcs 55 / branches 25). Int-файлы сериализованы
  (`fileParallelism: false`) — параллельный boot Payload гонял drizzle push наперегонки.
* [x] **QA-14** Хуки контента: `forceAgentDrafts` (запись от роли agent всегда `_status: draft`,
  даже при явном `published` в data) и `markTranslationsStale` (смена RU помечает en/de stale;
  partial-update не теряет `localeStatus`; hash стабилен при no-op записи). Unit + int. *[M]* —
  сделано 2026-07-02: `tests/unit/content-hooks.unit.spec.ts` (8) + `tests/int/content-hooks.int.spec.ts`
  (5, live Payload: create→stale, фиксация перевода hash'ем, no-op, partial, EN-запись не трогает).
  Тест выявил и починил баг: partial-update без `title`/`body` (напр. только topics) считал hash
  от пустых строк и ложно помечал переводы stale — теперь значения подставляются из `originalDoc`.
* [x] **QA-15** Контракт лидерборда (int, все ветки `src/endpoints/leaderboard.ts`):
  happy-path start→submit→read; Zod-отказы (400); `invalid_token`(401), `token_age`(422),
  `duration_mismatch`(422), `implausible_duration/score`(422), `token_used`(409, одноразовость
  nonce), `rate_limited`(429), `unknown_game`(404); upsert-max одного игрока; смена name-списков →
  освежение alias; suffix-дедуп при коллизии base двух игроков; пагинация GET (`page`/`limit`/
  `hasMore`); прунинг прошлых сезонов. *[L]* — сделано 2026-07-02:
  `tests/int/leaderboard.int.spec.ts` (17 тестов, все перечисленные ветки + lazy prune через
  expect.poll + GET-дефолты на кривых параметрах). Хендлеры вызываются напрямую с Web Request;
  возраст токена — фейк ТОЛЬКО Date (`vi.useFakeTimers({ toFake: ['Date'] })`), без sleep;
  rate-limit изолирован уникальным `x-forwarded-for` на запрос. Coverage-ratchet поднят до
  lines/stmts/funcs 80, branches 65 (актуалы 88/87/88/74 — план «branches 40» перевыполнен).
* [x] **QA-16** Alias-контракт server↔client (страховка «KEEP IN SYNC» в `leaderboard.ts` ↔
  `core/alias.js`): golden-вектор `(seed, game) → canonical EN alias`, прогоняемый обоими
  движками; расхождение списков/PRNG/порядка бросков валит тест. *[M]* — сделано 2026-07-02:
  `tests/unit/alias-contract.unit.spec.ts` — 6 golden-векторов (EN + RU/DE с правилами рода:
  ж.р. «Брызгучая Русалочка», DE-род от суффикса «Spritziger…Klops»/«Glitschiges…Brötchen»)
  + sweep 300 (seed,game)-пар по всему uint32-диапазону: parts и EN-рендер движков идентичны.
  Клиентский JS импортируется в vitest напрямую (node-safe).
* [x] **QA-17** Unit season-математики: `currentSeason`/`seasonEnd` на граничных датах (смена года,
  ISO-неделя 52/53, вс→пн UTC); детерминизм `mulberry32`/`hashStr`. *[S]* — сделано 2026-07-02:
  `tests/unit/season.unit.spec.ts` — вс→пн, декабрь→W01 следующего ISO-года (2025-12-29 →
  2026-W01), 53-недельный 2026 (W53 до 2027-01-03), ведущий ноль недели, инварианты на 60 днях
  (конец всегда будущий понедельник; сезон стабилен до конца и меняется ровно в него);
  `currentSeason`/`seasonEnd` экспортированы. Детерминизм PRNG — в alias-спеках (QA-10/16).
* [x] **QA-18** Сиды: `seed:baseline`/`seed:glossary`/`seed:m1` идемпотентны (повторный прогон не
  дублирует записи); после сида выполняются инварианты (все 3 локали заполнены, slug каноничны). *[M]* —
  сделано 2026-07-02: логика сидов вынесена в `src/seed/lib.ts` (экспортируемые функции; общий
  games-цикл baseline/m1 дедуплицирован), entry-скрипты — тонкие `payload run`-обёртки (пути/скрипты
  не менялись). `tests/int/seeds.int.spec.ts` (7, state-agnostic — работает и на свежей CI-БД, и на
  посеянной dev): второй прогон created=0 и counts стабильны; games/content — title в 3 локалях,
  published, slug канонический; species — факты не размножаются, id-matching en/de↔ru; glossary —
  ровно одна строка на source, translation ru=термин/en=перевод (DE глоссария — с агентом-переводчиком).
  **Блок QA-B закрыт целиком.**

#### QA-C — Фронтенд: роутинг, i18n, страницы, consent

* [x] **QA-19** Unit `proxy.ts`: `pickLocale` (cookie > Accept-Language с q-весами > fallback `en`;
  неподдерживаемый язык → `en`) и `resolveSiteId` (host/override); `x-site`/`x-locale` ставятся
  при rewrite. *[S]* — сделано 2026-07-02: `tests/unit/proxy.unit.spec.ts` (13 тестов на реальном
  `NextRequest`): cookie>header>fallback, q-веса против порядка, региональные теги, первый
  ПОДДЕРЖИВАЕМЫЙ из ранжированных; redirect-контракт (307 + Vary + сохранение пути/query);
  rewrite-контракт через x-middleware-заголовки (rewrite-цель /[site]/…, x-site/x-locale,
  host→sealrescue, ?site=override, «прокси не ставит NEXT_LOCALE»). `pickLocale` экспортирован;
  `resolveSiteId` был закрыт в QA-10.
* [x] **QA-20** hreflang/canonical/sitemap: unit на `buildAlternates`; e2e-ассерты альтернатов на
  3 локалях (перекрёстные + x-default); контракт `sitemap.xml` (только published; пока только
  sealife — ассерт текущего поведения, обновить при M2). *[M]* — сделано 2026-07-02:
  `tests/e2e/seo.e2e.spec.ts` (7): canonical+alternates на главных ×3 локали, странице раздела и
  контентной странице (прод-домены, x-default→en, canonical slug общий); sitemap — главная ×3,
  published-контент с hreflang, черновик исключён, sealrescue-вариант только с главной и своим
  доменом. Фикстуры (published+draft) сидятся Payload'ом из спека. `buildAlternates` — с QA-10.
* [ ] **QA-21** Контент-страницы по seeded-данным (e2e): деталь article/news/meme/species рендерится
  на 3 локалях; AiBadge/provenance видимы; TopicFilter фильтрует и держит URL-параметр;
  FactOfDay детерминирован по дате (заморозить clock). *[M]*
* [ ] **QA-22** Legal-shell (e2e): 4 legal-роута × 3 локали отвечают 200; DE рендерит «Impressum»/
  «Datenschutz»; legal-ссылки присутствуют в футере каждой публичной страницы. *[S]*
* [x] **QA-23** Consent/аналитика (e2e, КРИТИЧНО — §25 TDDDG): до opt-in скрипт Plausible НЕ
  загружается (network-ассерт); Accept подгружает; Reject/отзыв отключает; выбор хранится только
  в consent-cookie (не в localStorage); кнопки Accept/Reject равнозначны; Cookie-Settings
  доступна из футера и реально переключает состояние. *[M]* — сделано 2026-07-02:
  `tests/e2e/consent.e2e.spec.ts` (5 тестов): network-перехват фиктивного
  `NEXT_PUBLIC_PLAUSIBLE_SRC=https://plausible.test/...` (задаётся в CI-job `e2e`; без переменной
  спек пропускается — CI остаётся точкой принуждения); равнозначность кнопок ассертится
  computed-стилями (font/bg/height); отзыв через футер → Cookie-Settings → reload выгружает
  скрипт; повторное включение без перезагрузки; localStorage пуст после выбора.
* [ ] **QA-24** LanguageSwitcher (e2e): открытие/закрытие (клик вне, Esc, уход фокуса);
  выбор ставит `NEXT_LOCALE` ТОЛЬКО по явному клику; путь сохраняется при переключении локали;
  aria-атрибуты (haspopup/expanded/current). *[S]*
* [ ] **QA-25** Report/notice-форма (e2e): поля email НЕТ (ассерт отсутствия — инвариант №4);
  сабмит уходит в премодерацию (submission со статусом pending); empty/error/success-состояния.
  Дополнить rate-limit-тестом после **SEC-05**. *[M]*

#### QA-D — Дизайн-система, доступность, визуальная регрессия

* [ ] **QA-26** A11y-автоматизация: `@axe-core/playwright` на ключевых страницах (обе главные,
  список, деталь, legal, 404, styleguide) в обоих `data-site`-режимах; serious/critical
  нарушения = fail. Ручной чек-лист WCAG 2.2 AA поверх — остаётся в **EU-04**. *[M]*
* [ ] **QA-27** Визуальная регрессия: `toHaveScreenshot` по styleguide (все компоненты в обоих
  режимах) + главные обоих сайтов + 404; маскировать динамический контент; baseline в git;
  прогон в CI на фиксированном viewport/шрифтах. *[M]*
* [ ] **QA-28** Токен-инварианты как статический тест: в компонентах только semantic-токены
  (запрет raw `--baltic` и др. primitive), `--buoy` не используется под белым текстом,
  Baloo 2 отсутствует в кодовой базе. Скрипт/ESLint-правило в CI. *[S]*
* [ ] **QA-29** Состояния UI (e2e): loading/empty/error/populated через `StateSwitcher` на
  mock-разделах; скелеты списков реально показываются (CPU/network throttle) и не вызывают
  layout shift (CLS-ассерт). *[M]*

#### QA-E — Игры (Seal The Hunter сейчас; шаблон для всех будущих)

* [ ] **QA-30** Sim-детерминизм (golden run): фиксированный seed → идентичный лог состояний и
  финальный счёт `core/sim.js`; любые изменения физики/спавна осознанно обновляют golden-файл.
  Прогон как `test:unit` (sim DOM-free — уже готов к этому). *[M]*
* [ ] **QA-31** Fairness-регрессия: сокращённый прогон `tools/fairness-sim.mjs` в CI с ассертом
  порогов (desktop/mobile catch-rate в допуске 2:1 clamp из `balance.js`); полный прогон — вручную
  при изменении баланса. *[M]*
* [ ] **QA-32** Game e2e (полный цикл, mock-leaderboard): старт → ввод (клавиатура+тач-эмуляция) →
  конец раунда → interstitial (3 c) → board с автоскроллом к строке игрока (поглощает **QA-07**);
  standalone vs embedded (есть база); `visibilitychange`-пауза; resize/fullscreen с сохранением
  2:1 clamp. *[L]*
* [ ] **QA-33** Service worker: смена версии `CACHE` в `sw.js` подхватывает новую версию по
  network-first (e2e с двумя «релизами»); `manifest.webmanifest` валиден. *[S]*
* [ ] **QA-34** Перф-бюджет игры: FPS-замер в e2e (метки rAF, порог на CI-профиле), суммарный
  размер статики игры < бюджета (ассерт в CI); без регрессий при добавлении ассетов. *[M]*
* [ ] **QA-35** Шаблон QA для новых игр (Seal Run и далее): DOM-free sim-ядро + seeded harness +
  golden run + контракт лидерборда + e2e-смоук + fairness-пороги обязательны **с первого PR**
  (зеркалит SR-аудит: изоморфный course-модуль, token-pinned courseSeed). Задокументировать как
  чек-лист в `docs/local-development.md` § Тесты. *[S]*

#### QA-F — Перф, SEO, ссылки, прод-смоук

* [ ] **QA-36** Lighthouse CI с бюджетами (расширяет **QA-03**): perf ≥ 90, a11y ≥ 95, LCP/CLS/INP
  бюджеты на главных + деталях обоих сайтов; отчёт как артефакт PR. *[M]*
* [ ] **QA-37** Link checker (реализует **QA-02**): обход по sitemap + навигации, включая
  hreflang-альтернаты и футер-ссылки; битые внутренние ссылки = fail; внешние — warning. *[S]*
* [ ] **QA-38** Пост-деплой smoke в `deploy.yml`: healthcheck, критические роуты (главные ×3 локали,
  legal, игра, `/api/leaderboard` GET) отвечают 200, security-заголовки на месте; фейл = алерт. *[S]*

#### Задел (сделано / унаследовано)

* [x] **QA-01** Тесты access control (agent не может publish/delete). *[M]* — сделано в **QA-13**
  (2026-07-02, `tests/int/access-matrix.int.spec.ts`)
* [ ] **QA-02** E2E проверка ссылок (Playwright link checker). *[S]* → реализуется в **QA-37**
* [ ] **QA-03** Lighthouse в CI. *[S]* → реализуется в **QA-36**
* [x] **QA-04** E2E-тест мультилокальных route guards (`/ru`,`/en`,`/de` рендерятся; неизвестная
  локаль/slug → 404). *[S]* — сделано в `tests/e2e/frontend.e2e.spec.ts` (PR #39 + real-404 fix
  2026-07-02): брендинг/`<html lang>`/свитчер по локалям, redirect-политика, настоящие HTTP 404
  для несуществующих slug и чужих разделов, локализованная `not-found.tsx`.
* [x] **QA-05** Переписать или удалить `tests/e2e/frontend.e2e.spec.ts`. *[S]* — переписан (PR #39):
  boilerplate-ассерты заменены контрактными тестами брендинга/роутинга; в CI по-прежнему не
  выполняется (см. QA-06).
* [x] **QA-06** Подключить хотя бы `test:int` в CI (PR-гейт). *[S]* — сделано в **QA-08**
  (`.github/workflows/test.yml`, 2026-07-02)
* [~] **QA-07** Расширить + подключить в CI `tests/e2e/game-leaderboard-scroll.e2e.spec.ts`. *[S]* —
  в CI снова гоняется с **QA-09** (2026-07-02, job `e2e`); расширение обвязки — **QA-32**.

---

## Принцип исполнения

Не запускать 6 агентов сразу. Сначала один конвейер:
`crawler → находки → dashboard → approve → publish → translate` (M2-T06…T13).
Игры добавлять кусочками по мере готовности bento-хаба, не блокируя запуск сайта.
Compliance-задачи (EU-07…EU-11) дешевле сделать в M0, чем переделывать после запуска.
