// core/leaderboard.js — клиент анонимного лидерборда (SH-07).
// Шлёт результат на server-authoritative endpoint и рисует доску в оверлее.
// Никаких персональных данных: храним локально только opaque-seed (целое число),
// из которого сервер собирает курируемый псевдоним. Доска недельная, две доски
// (desktop/mobile). Источник правды — сервер; localStorage только мирроринг seed.

const SEED_KEY = 'seal_hunt_seed';
const ROUND_MS = 60000; // раунд всегда 60с

function getSeed() {
  try {
    const v = localStorage.getItem(SEED_KEY);
    if (v && /^\d+$/.test(v)) return Number(v);
  } catch {}
  const s = Math.floor(Math.random() * 1e9);
  try { localStorage.setItem(SEED_KEY, String(s)); } catch {}
  return s;
}

// Грубая доска по типу указателя (touch → mobile). Без пиксельных размеров (анти-fingerprint).
function detectBoard() {
  try {
    return window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';
  } catch {
    return 'desktop';
  }
}

async function submitScore(gameSlug, score) {
  const res = await fetch('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: gameSlug, score, durationMs: ROUND_MS, board: detectBoard(), seed: getSeed() }),
  });
  if (!res.ok) throw new Error('submit ' + res.status);
  return res.json();
}

async function fetchBoard(gameSlug, board) {
  const res = await fetch(`/api/leaderboard?game=${encodeURIComponent(gameSlug)}&board=${board}`);
  if (!res.ok) throw new Error('read ' + res.status);
  return res.json();
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function render(container, state, t, gameSlug) {
  const { you, view } = state;
  const tab = (b) =>
    `<button type="button" class="lb-tab${view.board === b ? ' on' : ''}" data-b="${b}">` +
    `${esc(b === 'desktop' ? t('lbDesktop') : t('lbMobile'))}</button>`;

  const rows = view.top.length
    ? view.top
        .map((r) => {
          const me = you && view.board === you.board && r.alias === you.alias && r.score === you.score;
          return (
            `<li class="lb-row${me ? ' me' : ''}">` +
            `<span class="lb-rk">#${r.rank}</span>` +
            `<span class="lb-al">${esc(r.alias)}</span>` +
            `<span class="lb-sc">${r.score}</span></li>`
          );
        })
        .join('')
    : `<li class="lb-empty">${esc(t('lbEmpty'))}</li>`;

  const youLine = you
    ? `<div class="lb-you">${esc(t('lbYouLine', { rank: you.rank, total: you.total, pct: you.percentile }))}</div>`
    : '';

  container.innerHTML =
    `<div class="lb">` +
    `<div class="lb-head"><span class="lb-title">${esc(t('lbTitle'))}</span>` +
    `<span class="lb-note">${esc(t('lbResetNote'))}</span></div>` +
    youLine +
    `<div class="lb-tabs">${tab('desktop')}${tab('mobile')}</div>` +
    `<ol class="lb-list">${rows}</ol></div>`;

  container.querySelectorAll('.lb-tab').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const b = btn.getAttribute('data-b');
      if (b === view.board) return;
      try {
        const r = await fetchBoard(gameSlug, b);
        render(container, { you, view: { board: b, total: r.total, top: r.top } }, t, gameSlug);
      } catch {
        /* keep current view on failure */
      }
    });
  });
}

/** Submit the just-finished score, then render the board (with the player highlighted). */
export async function mountAfterPlay(container, gameSlug, score, t) {
  container.hidden = false;
  container.innerHTML = `<div class="lb"><div class="lb-load">${esc(t('lbLoading'))}</div></div>`;
  try {
    const r = await submitScore(gameSlug, score);
    const you = { alias: r.alias, board: r.board, rank: r.rank, total: r.total, percentile: r.percentile, score: r.score };
    render(container, { you, view: { board: r.board, total: r.total, top: r.top } }, t, gameSlug);
  } catch {
    container.innerHTML = `<div class="lb"><div class="lb-off">${esc(t('lbOffline'))}</div></div>`;
  }
}
