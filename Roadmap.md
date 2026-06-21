# Roadmap — sealife-sealrescue

Детальный план работ. Привязан к `COMPLIANCE_EU_DE.md`, `DESIGN_BRIEF.md` и инвариантам `CLAUDE.md`.
Задачи имеют ID (`M2-T05`) — ссылайтесь на них в чате с Claude Code.

**Легенда:** `[ ]` to do · `[x]` done · `[~]` in progress · `[!]` blocked
**Размер:** `S` ≤ полдня · `M` ≈ 1–2 дня · `L` ≈ неделя+
**Фокус (мастер-план):** сайт с контентом → агенты → игры/квизы → монетизация.

> ⚠️ Жёсткие гарантии (агент не публикует/не удаляет, минимизация данных) — в КОДЕ.
> **Бренд:** sealife — игривый/умиляющийся с тюль-сленгом; sealrescue — серьёзный. «Тюлента» = сообщества VK/TG, НЕ имя сайта.
> **Вордмарки:** sealife = «Тюлень.Инфо»/«SeaLife.Info»; sealrescue = «Спасение тюленей»/«Seal Rescue».
> **Локали:** публичный контент — RU/EN. DE — только legal-shell (Impressum/Datenschutz/Cookies/Terms), НЕ контентная локаль. `/de/…` контент не генерировать.

---

## Состояние на сейчас

* [x] Контент-схема Payload (коллекции, RBAC, drafts, очередь `agent-proposals`, хуки).
* [x] `CLAUDE.md`, `Roadmap.md`, `DESIGN_BRIEF.md`, `COMPLIANCE_EU_DE.md` в корне.

**Следующая к старту:** `M0-T01`.

---

## M0 — Foundation / Setup (1–2 недели)

**DoD:** оба домена по HTTPS, RU/EN роутинг + DE legal-shell, cookie-consent + аналитика без cookies, секреты не в гите, бэкап БД, дизайн-токены подключены.

### Инфраструктура

* [x] **M0-T01** Postgres в EU/EEA (Neon, Frankfurt). *[S]*
* [ ] **M0-T02** Деплой Payload+Next (EU-регион), прод + staging. *[M]*
* [ ] **M0-T03** Домены (DNS, SSL, DDoS, кэш). *[M]*
* [ ] **M0-T04** Media delivery: Hetzner Object Storage + Bunny CDN Pull Zone + `assets.sealife.info` / `assets.sealrescue.info`; Sharp variants on upload; no provider URLs in CMS; AVIF/WebP/JPEG fallback; widths 320/640/960/1280/1920; game assets versioned; RU reachability test. *[M]* → PERF/SEO
* [ ] **M0-T05** Секреты в secret manager; `.env` в `.gitignore`. *[S]* → SEC
* [ ] **M0-T06** Ежедневный бэкап Postgres + проверка восстановления. *[S]* → SEC
* [ ] **M0-T07** CI: lint + typecheck + `generate:types` на PR. *[M]* → QA

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

* [ ] **M1-T01** Шаблоны `Content` по type (article/news/meme/page), RU/EN. *[M]*
* [ ] **M1-T02** Лента/каталог + мемная галерея с фильтрами. *[M]*
* [ ] **M1-T03** «Тюленепедия» (карточки видов) + «Факт дня». *[M]*
* [ ] **M1-T04** Блок перелинковки sealife → sealrescue (два регистра: «Как спасают тюленей?» / «Нашёл тюленя? Это не шутки»). *[S]*

### Дизайн / Фронтенд (см. DESIGN_BRIEF.md)

* [ ] **M1-T05** Главная sealife: bento-хаб с фикс-иерархией, кинетичный хэдлайн, дудл-маскот. Тон игривый/умиляющийся, тюль-сленг в микрокопии. *[L]* → DESIGN
* [ ] **M1-T19** Дудл-маскот (SVG) + ОДНА микрореакция (hover/load), без Lottie. *[M]* → DESIGN
* [ ] **M1-T20** Адаптив до мобайла, видимый focus, target size ≥24px, `prefers-reduced-motion`. *[M]* → DESIGN/EU

### Наполнение

* [ ] **M1-T06** Перенести лучший контент из VK/TG в CMS (RU). *[L]*
* [ ] **M1-T07** ~20 evergreen-статей (RU). *[L]*
* [ ] **M1-T08** Перевод **RU→EN → human review → publish.** Хранить provenance: `aiTranslated`, `humanReviewed`, `reviewedBy`, `reviewedAt`, `sourceContentHash`; показывать user-facing метку. (+ поля в Content/Translation.) См. **EU-11**. *[M]* → EU
* [ ] **M1-T09** Glossary/translation memory подключить к процессу перевода. *[S]*

### 🎮 Игры и вовлечение (эпик)

* [ ] **M1-T10** Квиз: рендер `Quizzes`, прохождение, результат, рейтинг. *[M]*
* [ ] **M1-T21** «Миф или правда?» — карточки с объяснением. *[M]*
* [ ] **M1-T22** «Угадай вид» — по силуэту/усам, варианты ответа. *[M]*
* [ ] **M1-T23** **Генераторы** — «какой ты тюлень сегодня», «тюлений гороскоп», «переведи фразу в тюлений стиль». «Тюлений переводчик» — фраза → тюль-сленг (вирусный генератор, share). *[M]*
* [ ] **M1-T24** «Тюлень дня» — daily-механика со streak (факт+мем+вопрос). *[M]*
* [ ] **M1-T25** Браузерная игра, браузерная аркада на **Phaser.js** (тюлень уворачивается от пластика, ловит рыбу) *[M]*
* [ ] **M1-T26** Пасхалки → бейджи.
* [ ] **M1-T11** Share-картинки (Open Graph) для статей/квизов/игр (VK/TG/X). *[M]*

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
* [ ] **M3-T11** 🎮 Лидерборд квизов/игр + бейджи + пасхалки. *[M]*

> Появятся донаты/платные продукты → нужны Terms/AGB + (для цифровых товаров) Widerrufsrecht; платёжные рельсы для RU проверить перед запуском.

---

## M4 — Масштаб

* [ ] **M4-T01** Telegram-бот / mini-app: квиз, донат, платные квесты. *[L]*
* [ ] **M4-T02** Платные цифровые продукты (PDF, карточки, материалы учителям). *[M]*
* [ ] **M4-T03** Print-on-demand мерч (Printful/Printify). *[M]*
* [ ] **M4-T04** Полноценная карта центров. *[M]*
* [ ] **M4-T05** 🎮 Phaser-игра + idle «собери лежбище». *[L]*
* [ ] **M4-T06** Поиск по сайту (Meilisearch/Typesense); позже pgvector/RAG. *[L]*
* [ ] **M4-T07** Агент-4 (SysAdmin) на полную: uptime, broken links, Lighthouse, очереди, алерты. *[M]* → SEC
* [ ] **M4-T08** Конфиг ниши (`Niche`) для клонирования на другие темы. *[L]*

---

## Сквозные треки (непрерывно)

### SEC — Безопасность (OWASP LLM + web)

* [ ] **SEC-01** Отдельный API-ключ на агента; ротация. *[S]*
* [ ] **SEC-02** Sandbox для парсинга внешних страниц. *[M]*
* [ ] **SEC-03** Анти-prompt-injection: внешний контент = данные, не инструкции. *[M]*
* [ ] **SEC-04** Audit log действий агентов. *[S]*
* [ ] **SEC-05** Rate-limiting форм и API. *[S]*
* [ ] **SEC-06** Проверка: только admin/editor имеют `delete`; `agent` не публикует. *[S]*

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
* [ ] **EU-10** **UGC / DSA readiness:** все submissions премодерируются; abuse/report-канал (notice-and-action); лог модерации; нет публичного UGC без ревью; appeals-процесс, если появятся публичные аккаунты/комментарии. *[M]*
* [ ] **EU-11** **AI Act transparency (Art. 50, к 08.2026):** метки AI-assisted / AI-translated / AI-checked / Human reviewed / Source verified; статус проверки человеком; disclosure, если появится чат-бот; маркировка дипфейков. *[M]*

### DESIGN — Дизайн-система

* [ ] **DESIGN-01** Держать токены едиными; уникальность — в signature-элементах, не в хаосе. *[S]*
* [ ] **DESIGN-02** Не перекрашивать админку Payload; dashboard агентов — плотный, без декора. *[S]*
* [ ] **DESIGN-03** Производительность: SVG-дудлы, self-host шрифты, бюджет Core Web Vitals. *[S]* → SEO

### QA — Качество

* [ ] **QA-01** Тесты access control (agent не может publish/delete). *[M]*
* [ ] **QA-02** E2E проверка ссылок (Playwright link checker). *[S]*
* [ ] **QA-03** Lighthouse в CI. *[S]*

---

## Принцип исполнения

Не запускать 6 агентов сразу. Сначала один конвейер:
`crawler → находки → dashboard → approve → publish → translate` (M2-T06…T13).
Игры добавлять кусочками по мере готовности bento-хаба, не блокируя запуск сайта.
Compliance-задачи (EU-07…EU-11) дешевле сделать в M0, чем переделывать после запуска.
