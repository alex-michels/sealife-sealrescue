# Design Brief — sealife / sealrescue

Одна дизайн-система, два поведенческих режима. Уникально, lightweight, доступно.
Кириллица обязательна. Уникальный дизайн — только в публичных фронтендах Next.js; админку Payload не перекрашиваем.

---

## 1. Направление: Foggy Coastal Utility

Общая база обоих сайтов — океаны и моря: туман, галька, мокрый камень, крап тюленьей шкуры, усы, буй, волны, линия прилива, штамп проверки. Тонкая ирония, **без инфантильного «милого зверинца»**.

- **sealife** = playful educational media: медиа, мемы, игры, тюль-сленг, умиление — под контролем.
- **sealrescue** = calm public-safety utility: emergency-first, проверяемые данные, минимум шума, быстрая и понятная навигация.

> Милота работает для тюленей, но в emergency-сценарии ясность важнее милоты.
> Если sealrescue выглядит как детский сайт — он теряет доверие.

---

## 2. Токены — fog + baltic + azure layering

Море добавляем **слоями**: azure в заголовках/ссылках/фонах карточек, лёгкий sea-mist градиент фона, холодные поверхности, усиленный «усатый» divider. Не делаем «blue wash». База светлая, body-текст тёмный, тёплое — только на критичном CTA и rescue-переходах.

Синий/azure даёт ощущение спокойствия, свежести и доверия, но светло-синий легко проваливает контраст. Поэтому azure разделён на три роли: доступный текстовый `--azure`, яркий декоративный `--azure-bright`, мягкая поверхность `--azure-soft`.

### 2a. Primitive-палитра

```css
--fog           #EDF1F3   /* база, морской туман */
--fog-blue      #E7EEF2   /* холодный верх sea-mist градиента */
--ink           #15303A   /* мягкий тёмный с синевой — body-текст, НЕ #000 */
--baltic        #1E5B5B   /* teal — бренд-якорь */
--azure         #2C6A8F   /* доступный azure — ссылки, H2/H3, интерактив */
--azure-bright  #3E7FA6   /* яркий azure — только декор/иконки/крупное */
--azure-soft    #DDEBF3   /* светлый azure — фон карточек/info, НЕ текст */
--pebble        #A99C8C   /* тёплый серо-бежевый, «шкура» */
--sandbank      #E7D9C0   /* тёплый песок — rescue-блок */
--buoy          #EE5A36   /* коралл — декор/акцент, НЕ фон под белый текст */
--buoy-dark     #BE3F22   /* коралл для белого текста: emergency CTA */
```

### 2b. Роли цветов

- `baltic` — бренд-якорь: wordmark, H1, primary-кнопки, active state.
- `azure` — интерактив и вторичная иерархия: ссылки, H2/H3, hover, мелкие акценты.
- `azure-bright` — только декор: иконки, divider, крупный hero-акцент. **Никогда body-текст.**
- `azure-soft` — поверхности: empty/info cards, карточки «Свежее», лёгкий тинт секций.
- `sandbank` / `pebble` — тёплый контраст, чтобы не уйти в моно-холод.
- `buoy-dark` — только критичный CTA, особенно rescue/emergency.

### 2c. Semantic-слой

В компонентах используем **только semantic-токены**, не raw primitive colors.

```css
:root {
  --color-bg:            var(--fog);
  --color-text:          var(--ink);
  --color-surface:       #F4F7F8;              /* прохладный near-white, НЕ #fff */
  --color-surface-info:  var(--azure-soft);
  --color-surface-warm:  var(--sandbank);
  --color-primary:       var(--baltic);
  --color-heading:       var(--baltic);        /* H1 / wordmark */
  --color-heading-sub:   var(--azure);         /* H2/H3 */
  --color-link:          var(--azure);
  --color-accent-cool:   var(--azure-bright);  /* decor only */
  --color-critical:      var(--buoy-dark);
  --color-accent:        var(--buoy);          /* warm decor only */
  --color-border:        rgba(21, 48, 58, .16);
  --color-border-cool:   rgba(46, 106, 143, .28);
  --color-muted:         rgba(21, 48, 58, .66);
}
```

### 2d. Режимы и фон

```css
[data-site="sealife"]    { --radius-card: 28px; --motion-level: playful; }
[data-site="sealrescue"] { --radius-card: 16px; --motion-level: calm; }

/* Очень слабый вертикальный градиент — воздух у моря, не синий фон */
body {
  background: linear-gradient(180deg, var(--fog-blue) 0%, var(--fog) 40%);
}
```

Допустимы очень слабые radial highlights и dapple-паттерн поверх фона, если они не мешают чтению и не создают визуальный шум.

### 2e. Контраст

Проверять контраст-чекером. Ориентиры на `--fog`:

```text
--ink + --fog              ≈ 12:1   ✅ body
--baltic + --fog           ≈ 6.9:1  ✅ H1 / wordmark
--azure + --fog            ≈ 5.0:1  ✅ ссылки, H2/H3, обычный текст AA
--azure-bright + --fog     ≈ 3.9:1  ⚠ только крупное/UI/decor, не body
--azure-soft               —        фон; текст на нём — ink / глубокий azure #173E54
--sandbank                 —        фон; текст — тёмно-тёплый #5A4A2E
--buoy + white             ≈ 3.4:1  ❌ не обычный текст
--buoy-dark + white        ✅        emergency CTA
```

Правила:
- Длинный/мелкий текст: `--color-text`, `--color-primary`, `--color-link`.
- `--azure-bright` и `--buoy`: только декор/иконки/крупные UI-акценты.
- `--azure-soft` и `--sandbank`: только фоны; текст на них — тёмный.
- Не использовать чистые `#fff`/`#000` как базу интерфейса.

---

## 3. Типографика

Кириллически-надёжная, self-host через `next/font`.

| Роль | sealife | sealrescue |
|---|---|---|
| Display | **Unbounded** или **Rubik** | декоративный display не использовать |
| Headings | Display выше | **Golos Text / Onest**, тяжёлый вес |
| Body | **Onest** | **Golos Text** или **Onest** |
| Mono | **JetBrains Mono** | **JetBrains Mono** |

- **Baloo 2 не использовать**: нет кириллицы.
- sealife может быть «пухлее», крупнее, игривее.
- sealrescue — civic/emergency: меньше декора, больше доверия.
- 1–2 variable-семейства, self-host; без внешних font-CDN.

---

## 4. Layout principles

### 4a. Общая сетка

- Максимальная ширина публичного контента: примерно `960–1120px` в зависимости от страницы.
- Воздух обязателен, но пустота не должна выглядеть как недогруженный сайт.
- Header и footer должны быть компактными, но полноценными: язык, legal links, cookie settings, cross-site links.
- **Header есть на КАЖДОЙ публичной странице, включая legal-страницы (RU/EN и legal-only `/de`).** В нём — кликабельный вордмарк-ссылка на главную страницу сайта (доступна с клавиатуры и screen reader), чтобы с любой страницы можно было вернуться домой одним кликом. Ссылка ведёт на главную текущей локали (`/ru` или `/en`); на немецких legal-страницах chrome английский, поэтому вордмарк ведёт на `/en`.
- Body-текст остаётся тёмным; цветная иерархия — в заголовках, ссылках, поверхностях и декоре.

### 4b. Карточки и responsive grid

На sealife карточки в основном контенте должны выглядеть как **ровная responsive-сетка**, а не как зажатые слева плитки.

Правила:
- На большом экране несколько карточек в одной строке имеют **одинаковую ширину**.
- Последняя строка не должна залипать слева: если карточек меньше, они растягиваются и занимают доступную ширину.
- Для mock / MVP допустим `flex-wrap` вместо CSS Grid, чтобы неполная последняя строка равномерно заполняла ряд.
- Не делать masonry-хаос. Bento — это иерархия контента, не визуальный беспорядок.
- Карточки могут отличаться по смыслу/цветовой поверхности, но базовая ширина в одной строке должна быть равной.

Пример поведения:

```css
.card-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 14px;
}

.card-grid > * {
  flex: 1 1 calc((100% - 28px) / 3);
  min-width: min(100%, 270px);
}

@media (max-width: 820px) {
  .card-grid > * {
    flex-basis: 100%;
    min-width: 100%;
  }
}
```

### 4c. Empty / loading / error states

Пустые состояния проектируем как настоящие UI-блоки, а не как одинокую строку текста.
- sealife empty state может быть на `--color-surface-info`.
- sealrescue empty state должен быть сухим, полезным, с альтернативным действием.
- Loading не должен ломать layout и создавать CLS.

---

## 5. Signature-элементы

### sealife

- **Усатый divider:** SVG-линия + 2–3 точки-«усы». Divider должен быть заметнее, чем обычный `<hr>`, но не спорить с контентом.
- **Маскот:** лёгкий SVG, один жест: моргание, банан-поза или взмах ластой. Без Lottie-зоопарка.
- **Dapple pattern:** CSS/SVG-паттерн, не растровая текстура.

```css
background-image:
  radial-gradient(circle at 20% 30%, rgba(21,48,58,.055) 0 1px, transparent 1.6px),
  radial-gradient(circle at 80% 70%, rgba(46,106,143,.045) 0 1.5px, transparent 2.2px);
```

### sealrescue

- **Штамп проверки** — центральный trust-паттерн, не декор.
- Моно-стиль, статус-точка + текст. Цвет не единственный носитель смысла.

```text
Проверено
агент: 12.06.2026 · человек: 14.06.2026 · статус: active
```

Статусы:
`active` зелёная · `needs_check` янтарная · `link_broken` красная · `unverified` серая. Всегда точка + слово.

---

## 6. Лейауты и вордмарки

**Вордмарки:**
- sealife.info — «Тюлень.Инфо» (RU) / «SeaLife.Info» (EN)
- sealrescue.info — «Спасение тюленей» (RU) / «Seal Rescue» (EN)

### 6a. sealife — media hub

Hero:
```text
Тюлень.Инфо
Всё о тюленях: факты, новости, мемы, квизы и тюленевая наука без занудства.
```

Порядок приоритета:
```text
1. Hero + маскот
2. Факт дня
3. Квиз дня
4. Мем дня
5. Мини-игра
6. Последняя новость
7. Тюленепедия
8. Cross-link → sealrescue.info
```

Карточки в основном контенте:
- равная ширина в строке;
- последняя строка заполняет ширину;
- `azure-soft` для info/empty;
- `surface` для обычных карточек;
- `sandbank + buoy-dark` только для rescue-перехода.

Cross-link регистры:
- информационный: «Как спасают тюленей?»
- экстренный: «Нашёл тюленя? Это не шутки.»

### 6b. sealrescue — emergency decision-interface

Первый экран — сценарий, не баннер:

```text
НАШЁЛ ТЮЛЕНЯ НА БЕРЕГУ?
1. Не подходите близко
2. Уберите собак
3. Не трогайте и не кормите
4. Оцените состояние с расстояния
5. Найдите ближайших специалистов →
```

CTA: `--color-critical` + белый текст. Декора минимум. Фото-forward, строгие карточки, быстрая навигация.

---

## 7. Emergency UX и локатор

Безопасную дистанцию не хардкодить одним универсальным числом. Нормы различаются по странам и организациям.

UI-копия:
> Держитесь на безопасном расстоянии. Точная норма зависит от страны и местных правил.

Локальную норму показывать на карточке страны/региона, если подтверждена.

База безопасности:
- держаться на расстоянии;
- не трогать и не кормить;
- собак — в сторону/на поводок;
- не возвращать тюленя в воду;
- при травме/болезни — к специалистам.

Локатор — **list-first**:
```text
1. Где вы находитесь?
2. Центры рядом
3. Список карточек
4. Карта как toggle
```

Карточка центра:
```text
Центр N · статус: active
Проверено: агент 12.06 · человек 14.06
[Позвонить tel:] [Сайт] [Соцсети] [Маршрут] [Сообщить об ошибке]
```

Фильтры:
страна, регион, статус, есть телефон, есть экстренный контакт. Чипы с числом результатов, активные фильтры всегда видны, есть «сбросить всё».

---

## 8. Микрокопия

| Состояние | sealife | sealrescue |
|---|---|---|
| Empty | «Тут пока тихо, как тюлень после обеда» | «Данных пока нет. Проверьте соседний регион или сообщите об ошибке.» |
| Error | «Что-то утонуло. Перезагрузим?» | «Не удалось загрузить данные. Обновите страницу или откройте список центров.» |
| CTA | «Погладить глазами» | «Что делать прямо сейчас» |
| Cross-link | «Нашёл тюленя? Это не шутки.» / «Как спасают тюленей?» | «Устали от серьёзного? К тюленям →» |

Копия — материал дизайна. Ошибки не извиняются бесконечно; пустые экраны приглашают к действию.

---

## 9. Компонентная библиотека

Shared:
`LanguageSwitcher` · `ThemeModeProvider` · `SiteHeader` · `SiteFooter` · `CrossSiteBanner` · `ContentCard` · `FactCard` · `StatusBadge` · `VerificationStamp` · `SourceList` · `UpdatedAt` · `ReportIssueButton` · `CookieSettingsLink`

sealife:
`Mascot` · `WhiskerDivider` · `EqualCardGrid` · `MemeCard` · `QuizCard` · `GameTile` · `SpeciesCard` · `DailySealCard` · `ReactionBar`

sealrescue:
`EmergencyHero` · `RescueSteps` · `CenterCard` · `CenterLocator` · `FilterChips` · `MapToggle` · `PhoneAction` · `RouteAction` · `SafetyNotice`

Для доступных интерактивных примитивов допустимы Radix Primitives. Labels, context и копия — ответственность проекта.

---

## 10. Язык и локали

Публичные контент-локали: **`/ru`, `/en`** — две равноправные.
**`/de` — legal-only route-локаль:** под ней живут ТОЛЬКО Impressum · Datenschutz · Cookies · Terms;
любой контентный роут под `/de` отдаёт 404. Немецкий убран как язык сайта решением владельца
2026-07-26; немецкие legal-документы сохранены, потому что оператор находится в Германии
(§5 DDG / §18 MStV не зависят от языков сайта).

Правила:
1. Стабильные URL: `/ru/...`, `/en/...` (контент) и `/de/<legal>` (только legal-страницы).
2. На корне `/`: `ru`-браузер → предложить RU, иначе → предложить EN (в т.ч. немецкому браузеру). Без forced-редиректа.
3. Выбрал язык вручную → сохранить preference после действия пользователя и больше не спорить.
4. Свитчер языка всегда виден в header/footer, **два названия текстом** (Русский / English), не флагами. `de` в свитчере НЕ показываем — это не язык сайта.
5. SEO: `hreflang` (контент — ru/en; legal-роуты — ru/en/de), `x-default`, canonical, sitemap по локалям.

Legal-роуты — общий slug для всех route-локалей, заголовок и подпись локализованы:

```text
/<locale>/legal-notice   (DE: «Impressum»)
/<locale>/privacy        (DE: «Datenschutz»)
/<locale>/cookies
/<locale>/terms
```

Footer каждой публичной страницы должен содержать ссылки на legal pages и cookie settings — на языке
страницы. Немецкие legal-страницы обязаны своим существованием юрисдикции оператора, а не набору
включённых языков; на `/de` chrome (header/nav/футер/cookie-баннер) рендерится по-английски —
немецких UI-строк больше нет, а сами документы остаются немецкими.
**TODO:** оставлять ли немецкие legal-страницы вообще — открытый вопрос, решается юрпроверкой
(Roadmap **EU-06**).

---

## 11. Design mock mode / sample pages

Перед наполнением реальным контентом нужен кликабельный дизайн-мок со sample data. Цель — проверить визуальную систему, навигацию, состояния, responsive, legal/footer и UX-сценарии без ожидания настоящих статей и центров.

Правила mock mode:
- Только sample texts / fake records / placeholder media.
- Sample content явно не выдаётся за реальные данные.
- Все ссылки и разделы кликабельны.
- Все route guards работают: контент- и legal-роуты есть на `/ru` и `/en`, под `/de` — только legal-роуты; неизвестные локали/slug и любой контент под `/de` → 404.
- Footer legal links и cookie settings видны на всех публичных страницах.
- RU/EN переключатель работает на sample pages.
- Используются те же компоненты, что пойдут в production.
- Никаких provider URLs и внешних картинок в mock; использовать локальные/placeholder ассеты.
- Mock должен покрывать empty, loading, error, populated states.

Минимальный охват mock pages:

sealife:
```text
/ru, /en
/ru/articles, /en/articles
/ru/articles/sample-article
/ru/news, /ru/news/sample-news
/ru/memes
/ru/rescue-centers, /ru/rescue-centers/<slug>
/ru/games, /ru/games/sample-game
/ru/species, /ru/species/sample-species
```

sealrescue:
```text
/ru, /en на домене sealrescue
/ru/what-to-do
/ru/rescue-centers
/ru/rescue-centers/sample-center
/ru/rescue-news
/ru/report
/ru/rescue-quest
```

legal-shell:
```text
/ru/legal-notice, /ru/privacy, /ru/cookies, /ru/terms
/en/legal-notice
/en/privacy
/en/cookies
/en/terms
/de/legal-notice   (заголовок: Impressum; chrome — по-английски)
/de/privacy        (заголовок: Datenschutz)
/de/cookies
/de/terms
```

---

## 12. Dashboard агентов = control room

Dashboard агентов — не бренд-лендинг. Плотный интерфейс: таблицы, diff-view, статусы, фильтры. Те же токены, но без декоративного слоя и маскота.

Экраны:
`Agent Runs` · `Proposals` · `Translation Integrity` · `Broken Links` · `Rescue Centers` · `News Queue` · `SEO Issues` · `Audit Log`

Карточка proposal:
```text
тип · центр · было → стало · источник · уверенность · риск
[Approve] [Edit] [Reject] [Open source]
```

---

## 13. Accessibility — WCAG 2.2 AA

Рабочий стандарт проекта — **WCAG 2.2 AA**. Overlay-плагины — не решение; чинить в самом интерфейсе.

Чек-лист:
- клавиатура для всех интерактивов;
- видимый focus;
- target size ≥ 24×24 px, лучше 44×44 для мобильных CTA;
- `prefers-reduced-motion`;
- `alt` для смысловых изображений;
- цвет не единственный носитель смысла;
- явные labels форм;
- ошибки текстом;
- emergency CTA не прятать в меню;
- телефоны `tel:`;
- свитчер языка доступен с клавиатуры и screen reader;
- canvas-игры имеют HTML-инструкции и HTML-результат вне canvas.

---

## 14. Performance-бюджет

| Метрика | Цель |
|---|---|
| JS на публичной странице | минимум; карта/игры lazy |
| LCP | hero/image optimized |
| CLS | размеры изображений заданы заранее |
| INP | тяжёлое не грузить на первичном interaction |
| Fonts | 1–2 variable-семейства, self-host через `next/font` |
| Motion | CSS-first, без тяжёлых runtime-анимаций |
| Media | AVIF/WebP/JPEG variants, не отдавать оригиналы |

Аудитория из VK/TG часто мобильная и не всегда с быстрым интернетом. Core Web Vitals важны не только для SEO, но и для удержания.

---

## 15. Trust / content-confidence UI

Уровни доверия:
`Verified` · `Agent checked` · `Human reviewed` · `Source linked` · `Needs check` · `Outdated`

AI-provenance:
`AI-assisted` · `AI-translated` · `AI-checked` · `Human reviewed` · `Source verified`

Примеры:
```text
Подготовлено с AI-помощью · Отредактировано человеком · Источники проверены 20.06.2026
Проверено агентом · ожидает человека
Проверено агентом и человеком
```

На новостях и карточках центров показывать источник, дату последней проверки и что именно изменилось. Это одновременно trust UX, AI Act readiness и защита от претензий.

---

## 16. Чего НЕ делать

- Не использовать Baloo 2 и любые шрифты без кириллицы.
- Не ставить `--buoy` фоном под белый текст; только `--buoy-dark`.
- Не использовать `--azure-bright` для обычного текста.
- Не делать blue wash; море добавляется слоями.
- Не делать forced-редирект по языку; не прятать language switcher; не использовать флаги вместо названий.
- Не показывать `de` в переключателе языка и не верстать немецкий UI: немецкий — не язык сайта, только legal-документы под `/de`.
- Немецкие legal pages нужны из-за юрисдикции оператора, а не из-за набора включённых языков (их судьба — на юрпроверке, Roadmap EU-06).
- Не хардкодить одну универсальную безопасную дистанцию.
- Не делать sealrescue милым в ущерб доверию.
- Не делать карту вместо списка; locator list-first.
- Не перегружать анимацией; маскот — один лёгкий жест.
- Не перекрашивать Payload admin.
- Не делать карточки главной зажатыми слева; сетка должна равномерно занимать ширину.
