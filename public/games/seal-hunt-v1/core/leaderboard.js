// core/leaderboard.js — клиент анонимного лидерборда (SH-07).
// Источник правды — сервер. Локально храним только opaque-seed (см. alias.js).
// Имена приходят как индексы и рисуются на языке зрителя. Доска недельная и ЕДИНАЯ
// (деление desktop/mobile снято 2026-07-03 — консистентность с Seal Run), пагинация
// (скролл + «показать ещё»).
import { getSeed, renderName } from './alias.js';

const ROUND_MS = 60000; // раунд всегда 60с
const PAGE_SIZE = 50; // = серверный лимит страницы (для расчёта страницы игрока)
const MAX_ROWS = 500; // сколько максимум подгружаем при скролле

function lang() {
  return (window.SealI18n && window.SealI18n.lang) || 'ru';
}

// Play-token (анти-чит): берём на СТАРТЕ раунда, чтобы серверу было видно реально
// отыгранное время.
let pending = null;
export async function startRound(gameSlug) {
  // Ретрай один раз: одиночный сетевой блип на старте раунда не должен лишать
  // игрока сабмита (иначе доска покажет «недоступно» за весь раунд).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`/api/leaderboard/start?game=${encodeURIComponent(gameSlug)}`);
      if (!res.ok) throw new Error('start ' + res.status);
      const data = await res.json();
      pending = { token: data.token };
      return;
    } catch {
      pending = null;
    }
  }
}

async function submitScore(gameSlug, score) {
  if (!pending) throw new Error('no token'); // без токена сервер всё равно отклонит
  const res = await fetch('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      game: gameSlug,
      score,
      durationMs: ROUND_MS,
      seed: getSeed(),
      token: pending.token,
    }),
  });
  pending = null; // токен одноразовый
  if (!res.ok) throw new Error('submit ' + res.status);
  return res.json();
}

async function fetchPage(gameSlug, pageNum) {
  const res = await fetch(`/api/leaderboard?game=${encodeURIComponent(gameSlug)}&page=${pageNum}`);
  if (!res.ok) throw new Error('read ' + res.status);
  return res.json();
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Оставшееся время до сброса, две крупнейшие единицы, локализовано.
function fmtRemaining(ms, l) {
  if (ms <= 0) return l === 'ru' ? 'обновляется…' : 'refreshing…';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60), sec = s % 60;
  const ru = l === 'ru';
  if (d > 0) return ru ? `${d} д ${h} ч` : `${d}d ${h}h`;
  if (h > 0) return ru ? `${h} ч ${m} мин` : `${h}h ${m}m`;
  if (m > 0) return ru ? `${m} мин ${sec} с` : `${m}m ${sec}s`;
  return ru ? `${sec} с` : `${sec}s`;
}

function startCountdown(container, resetMs, t) {
  if (container._lbTimer) { clearInterval(container._lbTimer); container._lbTimer = null; }
  const el = container.querySelector('.lb-reset');
  if (!el || !resetMs) return;
  const tick = () => {
    const target = container.querySelector('.lb-reset');
    if (!target) { clearInterval(container._lbTimer); container._lbTimer = null; return; }
    target.textContent = t('lbResetIn', { t: fmtRemaining(resetMs - Date.now(), lang()) });
  };
  tick();
  container._lbTimer = setInterval(tick, 1000);
}

// Локализованное имя + суффикс уникальности при коллизии («… 2»).
function displayName(parts, suffix, l) {
  const base = renderName(parts, l);
  return suffix && suffix >= 2 ? `${base} ${suffix}` : base;
}

// Прокрутить список так, чтобы строка игрока («me») оказалась по центру видимой области.
// ВАЖНО: на финальном экране доску сначала рендерят СКРЫТОЙ — интерстишл держит
// `#overlay.is-waiting .board { display:none }`, пока идёт сабмит и минимальная пауза. У display:none
// нет лейаута, поэтому scrollTop там не применяется (getBoundingClientRect = нули) — раньше это
// «съедало» прыжок к игроку, и доска открывалась на топе. Поэтому ждём (через rAF), пока доска реально
// станет видимой (`clientHeight > 0`), и только тогда центрируем. Дедлайн — на случай, если доску так
// и не показали (например, начали новый раунд): тогда `.me` исчезает и мы просто выходим.
function scrollToMe(container) {
  const deadline = performance.now() + 8000;
  const attempt = () => {
    const list = container.querySelector('.lb-list');
    const me = container.querySelector('.lb-row.me');
    if (!list || !me) return; // доску очистили / нет строки игрока — нечего центрировать
    if (list.clientHeight === 0) { // ещё скрыта интерстишлом — ждём показа
      if (performance.now() < deadline) requestAnimationFrame(attempt);
      return;
    }
    const lr = list.getBoundingClientRect();
    const mr = me.getBoundingClientRect();
    list.scrollTop += mr.top - lr.top - (list.clientHeight / 2 - mr.height / 2);
  };
  requestAnimationFrame(attempt);
}

function rowHtml(r, you) {
  const me = you && r.alias === you.alias;
  return (
    `<li class="lb-row${me ? ' me' : ''}">` +
    `<span class="lb-rk">#${r.rank}</span>` +
    `<span class="lb-al">${esc(displayName(r.parts, r.suffix, lang()))}</span>` +
    `<span class="lb-sc">${r.score}</span></li>`
  );
}

function render(container, st, t) {
  const { you, view, gameSlug } = st;
  const rows = view.rows.length
    ? view.rows.map((r) => rowHtml(r, you)).join('')
    : `<li class="lb-empty">${esc(t('lbEmpty'))}</li>`;

  const youLine = you
    ? `<div class="lb-you">${esc(t('lbYouLine', { rank: you.rank, total: you.total, pct: you.percentile }))}</div>`
    : '';

  const more =
    view.hasMore && view.rows.length < MAX_ROWS
      ? `<button type="button" class="lb-more">${esc(t('lbMore'))}</button>`
      : '';

  container.innerHTML =
    `<div class="lb">` +
    `<div class="lb-head"><span class="lb-title">${esc(t('lbTitle'))}</span>` +
    `<span class="lb-note">${esc(t('lbPlayers', { n: view.total }))}</span></div>` +
    `<div class="lb-reset"></div>` +
    youLine +
    `<ol class="lb-list">${rows}</ol>` +
    more +
    `</div>`;

  startCountdown(container, st.resetMs, t);

  const moreBtn = container.querySelector('.lb-more');
  if (moreBtn) {
    moreBtn.addEventListener('click', async () => {
      moreBtn.disabled = true;
      try {
        const r = await fetchPage(gameSlug, view.page + 1);
        const list = container.querySelector('.lb-list');
        if (list) list.insertAdjacentHTML('beforeend', r.top.map((x) => rowHtml(x, you)).join(''));
        view.rows = view.rows.concat(r.top);
        view.page = r.page;
        view.hasMore = r.hasMore && view.rows.length < MAX_ROWS;
        if (!view.hasMore) moreBtn.remove();
        else moreBtn.disabled = false;
      } catch {
        moreBtn.disabled = false;
      }
    });
  }
}

/** Submit the just-finished score, then render the board (with the player highlighted). */
export async function mountAfterPlay(container, gameSlug, score, t) {
  container.hidden = false;
  container.innerHTML = `<div class="lb"><div class="lb-load">${esc(t('lbLoading'))}</div></div>`;
  try {
    const r = await submitScore(gameSlug, score);
    // Догружаем страницы до позиции игрока, чтобы открыть доску на его строке.
    let rows = r.top.slice();
    let page = r.page;
    let hasMore = r.hasMore;
    const targetPage = Math.min(Math.ceil(r.rank / PAGE_SIZE), Math.ceil(MAX_ROWS / PAGE_SIZE));
    while (page < targetPage && hasMore) {
      const more = await fetchPage(gameSlug, page + 1);
      rows = rows.concat(more.top);
      page = more.page;
      hasMore = more.hasMore;
    }
    const st = {
      gameSlug,
      resetMs: Date.parse(r.resetAt) || 0,
      you: { alias: r.alias, rank: r.rank, total: r.total, percentile: r.percentile },
      view: { total: r.total, page, rows, hasMore },
    };

    // Keep the "Вы: #N из M" line consistent with the table. The server's `rank` is
    // COMPETITION-ranked (count of strictly-higher scores + 1 → ties share a rank), while the
    // table rows are ORDINAL (sequential, ties broken by createdAt). So whenever someone with the
    // SAME score sat above the player, the summary said #4 while their highlighted row said #5.
    // Make the rendered board the single source of truth: read the player's rank straight off
    // their own row. (total is guarded so it never reads below the rows actually shown.)
    const meRow = rows.find((x) => x.alias === r.alias);
    const total = Math.max(r.total, rows.length);
    if (meRow) {
      st.you.rank = meRow.rank;
      st.you.total = total;
      st.you.percentile = Math.max(1, Math.round((meRow.rank / total) * 100));
      st.view.total = total;
    }

    container._lbState = st; // для relocalizeBoard при смене языка (standalone)
    render(container, st, t);
    scrollToMe(container); // открыть доску на позиции игрока, не на топе
  } catch {
    // Сабмит не прошёл (напр. play-token потерялся на старте раунда). Всё равно
    // показываем доску в режиме чтения — лучше реальные стендинги, чем «недоступно».
    try {
      const r = await fetchPage(gameSlug, 1);
      const st = {
        gameSlug,
        resetMs: Date.parse(r.resetAt) || 0,
        you: null,
        view: { total: r.total, page: r.page, rows: r.top, hasMore: r.hasMore },
      };
      container._lbState = st; // для relocalizeBoard при смене языка (standalone)
      render(container, st, t);
    } catch {
      container.innerHTML = `<div class="lb"><div class="lb-off">${esc(t('lbOffline'))}</div></div>`;
    }
  }
}

/**
 * Перерисовать уже показанную доску на текущем языке зрителя (после смены языка в standalone),
 * БЕЗ повторного сабмита. Имена строятся из частей через renderName на актуальном lang().
 */
export function relocalizeBoard(container, t) {
  if (container && container._lbState) render(container, container._lbState, t);
}
