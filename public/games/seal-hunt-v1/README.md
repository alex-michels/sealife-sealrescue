# Тюльохота / Seal The Hunter — v1

Vanilla HTML/CSS/Canvas2D, без сборки — файлы отдаются статикой как есть. Полное техническое описание
(fairness-модель, лидерборд, анти-чит, бэкдроп, service worker) — [`docs/game-seal-hunter.md`](../../../docs/game-seal-hunter.md).
Журнал работ по фичам — [`docs/game-seal-hunter-worklog.md`](../../../docs/game-seal-hunter-worklog.md).

```
seal-hunt-v1/
├─ index.html                # разметка: HUD, canvas, overlay, board
├─ style.css
├─ game.js                   # игровой цикл, состояние, ввод-вывод
├─ i18n.js                   # словарь ru/en/de; язык из ?lang=, window.SealI18n
├─ manifest.webmanifest      # PWA-манифест
├─ sw.js                     # service worker (network-first, версия CACHE бампается на каждый релиз)
├─ favicon.svg
├─ core/
│  ├─ alias.js                # анонимная идентичность игрока (seed) + рендер имени
│  ├─ leaderboard.js          # клиент лидерборда (fetch к /api/leaderboard*)
│  ├─ sim.js                  # DOM-free ядро симуляции (общее с fairness-харнессом)
│  ├─ balance.js              # тюнинг темпа/баланса + VIEW_CFG (фикс. поле 16:9 / 9:16)
│  ├─ input.js                # клавиатура/тач
│  └─ theme.js                # цвета/токены под бренд
├─ entities/
│  ├─ seal.js                 # тюлень
│  └─ prey.js                 # добыча (рыбы/кальмар/звезда)
├─ render/
│  └─ scenery.js              # процедурная сцена + опц. статический бэкдроп + бордюр
├─ assets/                    # опц. бэкдроп/обложки: backdrop-*, cover*.{avif,webp,jpg} + README
└─ tools/                     # dev-only, не грузятся игрой: fairness-sim, compare-variants,
                               #   encode-image, make-placeholder-backdrop
```

Правки ассетов/рендера → **бампнуть `CACHE`** в `sw.js` (иначе игроки залипают на старой версии через
service worker). Актуальные тонкости (честность, анти-чит, имена игроков, standalone-режим и т.д.) —
только в `docs/game-seal-hunter.md`, этот файл не дублирует их, чтобы не расходиться.
