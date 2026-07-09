import type { Endpoint } from 'payload'

/**
 * Публичная конфигурация игры для её standalone-оболочки (SH-14, kill-switch альфы).
 *
 * Статические игры в /public не рендерятся сервером, поэтому standalone-страница
 * (sealthehunter.online, прямой /games/<...>/index.html) сама спрашивает этот эндпоинт
 * и при `standalone: false` показывает заглушку «Coming soon» вместо игры.
 * iframe-встраивание на sealife.info флаг НЕ читает — оно живёт за страницей сайта.
 *
 * Контракт с клиентами (game.js обеих игр):
 *  - `standalone: false` — ЕДИНСТВЕННЫЙ сигнал «показать заглушку», и он требует
 *    ЯВНОГО действия: опубликованная строка games с включённым флагом;
 *  - сетевая ошибка/недоступный API → клиент fail-open (показывает игру);
 *  - неизвестный slug → { standalone: true } — «нет строки» = «нет сигнала», тот же
 *    fail-open (иначе любое окружение без сида — CI e2e, свежая БД — глушит игры).
 *
 * Источник правды — поле `standaloneComingSoon` коллекции `games` (тумблер в админке);
 * null у строк, созданных до появления поля, читается как «игра доступна».
 */
export const gameConfigRead: Endpoint = {
  path: '/game-config',
  method: 'get',
  handler: async (req) => {
    const url = new URL(req.url ?? '')
    const slug = url.searchParams.get('game') ?? ''
    if (!slug) return Response.json({ error: 'bad_request' }, { status: 400 })

    const res = await req.payload.find({
      collection: 'games',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      // Только опубликованная версия: черновой тумблер не должен влиять на прод до Publish.
      draft: false,
    })
    const doc = res.docs[0]
    const standalone = doc ? doc.standaloneComingSoon !== true : true

    return Response.json(
      { standalone },
      // Небольшой кэш: разгружает API, а переключение в админке доезжает ≤ минуты.
      { headers: { 'Cache-Control': 'public, max-age=60' } },
    )
  },
}
