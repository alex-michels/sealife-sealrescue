// game.js — bootstrap + рендер-слой Seal Run (SR-05, vertical slice).
//
// Вся ИГРОВАЯ логика — в изоморфном core/sim.js (SR-03); здесь только:
//   • HTML-оверлеи (меню/HUD/результат — вне canvas, доступность),
//   • динамический import() vendored Phaser 4 ТОЛЬКО по «Старт» (бюджет CWV),
//   • тонкая Play-сцена: фикс-шаг аккумулятор → sim, спрайты позиционируются ИЗ sim-состояния
//     (predatorPos — та же чистая функция, что считает коллизии; второй физики нет),
//   • ввод (палец/мышь/клавиши → targetY) + guard от «залипшего тача» при уходе в фон.
//
// Арт (SR-06) — процедурные Canvas2D-текстуры render/art.js, палитра/контракт — core/theme.js
// (бренд-токены Foggy Coastal Utility); лидерборд/i18n/SW — SR-09..SR-11.

import { generateCourse } from './core/course.js';
import { createSim, applyInput, step, takeEvents, getResult, predatorPos } from './core/sim.js';
import { SIM_DT, FIELD_W, WORLD_H, SEAL_X, BAL } from './core/balance.js';
import { TEXTURES, PARALLAX, WATER, WATERLINE_Y } from './core/theme.js';
import { buildTextures } from './render/art.js';

const STEP_MS = SIM_DT * 1000;
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Сид трассы: ISO-неделя (= сезон лидерборда; серверный пиннинг в токен — SR-10).
// ⚠️ Тот же алгоритм, что currentSeason() в src/endpoints/leaderboard.ts.
function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(
    ((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
  );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const seedStr = new URLSearchParams(location.search).get('seed') || isoWeek();
const course = generateCourse(seedStr);

// — DOM
const $ = (id) => document.getElementById(id);
const ui = {
  menu: $('menu'), over: $('over'), hud: $('hud'), stage: $('stage'),
  start: $('start'), restart: $('restart'), fs: $('fs'), seed: $('seed-label'),
  lives: $('hud-lives'), stamFill: $('hud-stamina-fill'), stam: $('hud-stamina'), dist: $('hud-dist'),
  overTitle: $('over-title'), rDist: $('r-dist'), rFish: $('r-fish'), rLives: $('r-lives'), rScore: $('r-score'),
};
ui.seed.textContent = seedStr;

// — Ввод: «последний выигрывает» (спека §2.1). Клавиши двигают target в sim
// (KEY_TARGET_SPEED); указатель задаёт target напрямую. При уходе вкладки/iframe в фон
// сбрасываем ВСЁ (гочи «тач залип», Roadmap SR-05).
const input = { mode: 'none', pointerY: null, keyDir: 0, keys: new Set() };

function pointerToWorldY(clientY) {
  const canvas = ui.stage.querySelector('canvas');
  if (!canvas) return null;
  const r = canvas.getBoundingClientRect();
  if (r.height === 0) return null;
  return ((clientY - r.top) / r.height) * WORLD_H;
}
function onPointer(e) {
  // мышь ведёт всегда; палец/перо — только пока прижат (один инпут на мобильном)
  if (e.pointerType !== 'mouse' && e.buttons === 0) return;
  const y = pointerToWorldY(e.clientY);
  if (y == null) return;
  input.mode = 'pointer';
  input.pointerY = y;
}
const KEY_DIRS = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 };
function recomputeKeyDir() {
  let dir = 0;
  for (const code of input.keys) dir += KEY_DIRS[code];
  input.keyDir = Math.sign(dir);
}
function resetInput() {
  input.keys.clear();
  input.keyDir = 0;
  // pointerY не трогаем: target «замирает» — тюлень держит глубину (спека §2.1)
}
ui.stage.addEventListener('pointermove', onPointer);
ui.stage.addEventListener('pointerdown', onPointer);
window.addEventListener('pointercancel', resetInput);
window.addEventListener('keydown', (e) => {
  if (!(e.code in KEY_DIRS)) return;
  e.preventDefault();
  input.keys.add(e.code);
  input.mode = 'key';
  recomputeKeyDir();
});
window.addEventListener('keyup', (e) => {
  if (!(e.code in KEY_DIRS)) return;
  input.keys.delete(e.code);
  recomputeKeyDir();
});
window.addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) resetInput();
});

function currentCtrl() {
  if (input.mode === 'key') return input.keyDir === 0 ? null : { keyDir: input.keyDir };
  if (input.mode === 'pointer' && input.pointerY != null) return { targetY: input.pointerY };
  return null;
}

// — HUD (HTML, вне canvas)
function updateHud(state) {
  ui.lives.textContent = '❤'.repeat(Math.max(0, state.lives)) + '·'.repeat(BAL.STARTING_LIVES - Math.max(0, state.lives));
  const pct = Math.round((state.stamina / BAL.STAMINA_MAX) * 100);
  ui.stamFill.style.width = pct + '%';
  ui.stamFill.classList.toggle('low', pct <= 30 || state.status === 'exhausted');
  ui.stam.setAttribute('aria-valuenow', String(pct));
  ui.dist.textContent = Math.floor(state.d / 40) + ' м';
}

function showGameOver(state) {
  const r = getResult(state);
  ui.overTitle.textContent = r.phase === 'finished' ? 'Финиш! 🏁' : 'Заплыв окончен';
  ui.rDist.textContent = r.distanceM + ' м';
  ui.rFish.textContent = String(r.fishCollected);
  ui.rLives.textContent = String(r.livesRemaining);
  ui.rScore.textContent = String(r.score);
  ui.over.hidden = false;
  ui.restart.focus();
}

// — Phaser: динамический import по «Старт» + тонкая сцена
let game = null;
let state = null;

// Debug/e2e-ручка (SR-14): состояние доступно снаружи, никакой записи внутрь.
window.SealRun = {
  get state() { return state; },
  course,
  seedStr,
};

// Логические габариты спрайта (lu) — из арт-контракта core/theme.js. Тело хищника
// накрывает круглый хитбокс целиком (визуал ≥ хитбокса, спека §8; инвариант — unit-тест темы).
function texSize(kind) {
  const t = TEXTURES[kind];
  return { w: t.w, h: t.h };
}

// Скролл-слой фона: TileSprite (1 draw call), фолбэк — два image встык, если сборка
// Phaser 4 не включает TileSprite. factor = доля скорости мира (0 = статичный слой).
function addScrollLayer(scene, key, factor, depth, opts = {}) {
  const y = opts.y ?? 0;
  const h = opts.h ?? WORLD_H;
  if (typeof scene.add.tileSprite === 'function') {
    const ts = scene.add.tileSprite(0, y, FIELD_W, h, key).setOrigin(0, 0).setDepth(depth);
    return { scroll(d) { ts.tilePositionX = d * factor; } };
  }
  const texW = scene.textures.get(key).getSourceImage().width;
  const a = scene.add.image(0, y, key).setOrigin(0, 0).setDepth(depth);
  const b = scene.add.image(texW, y, key).setOrigin(0, 0).setDepth(depth);
  return {
    scroll(d) {
      const off = -((d * factor) % texW);
      a.x = off;
      b.x = off + texW;
    },
  };
}

function createPlayScene(Phaser) {
  return class PlayScene extends Phaser.Scene {
    constructor() { super('play'); }

    create() {
      buildTextures(this);
      // Пул спрайтов на тип + карта «сущность → спрайт» (object pooling, Roadmap SR-05)
      this.pools = new Map();
      this.bound = new Map();
      this.acc = 0;
      this.prev = { y: state.y, d: state.d };
      this.sealFrame = 0;
      this.seal = this.add.image(SEAL_X, state.y, 'seal_0').setDepth(10);
      this.seal.setDisplaySize(TEXTURES.seal.w, TEXTURES.seal.h);

      // Многослойный фон (SR-06): статичная толща воды → дальний/средний параллакс →
      // геймплей (спрайты, depth 5..10) → пена ватерлинии. При prefers-reduced-motion
      // параллакс глушится (factor 0); пена — НЕ параллакс (поверхность живёт в плане
      // геймплея, камни band 0 её пробивают), она скроллится со скоростью мира всегда.
      this.add.image(0, 0, 'bg_water').setOrigin(0, 0).setDepth(-10);
      this.layers = [
        addScrollLayer(this, 'bg_far', REDUCED_MOTION ? 0 : PARALLAX.far.factor, -8),
        addScrollLayer(this, 'bg_mid', REDUCED_MOTION ? 0 : PARALLAX.mid.factor, -6),
        addScrollLayer(this, 'foam', 1, 6, { y: 0, h: 20 }),
      ];
    }

    acquire(kind) {
      let pool = this.pools.get(kind);
      if (!pool) { pool = []; this.pools.set(kind, pool); }
      let spr = pool.pop();
      if (!spr) {
        // Декор-оверлеи (макушки кекуров) — НАД пеной (7 > 6), геймплей-спрайты — под ней.
        spr = this.add.image(0, 0, kind).setDepth(kind === 'skerry_cap' ? 7 : 5);
        const t = TEXTURES[kind];
        if (t && t.originY) spr.setOrigin(0.5, t.originY); // центр ТЕЛА = сим-координата
      }
      spr.setVisible(true);
      return spr;
    }
    release(kind, spr) {
      spr.setVisible(false);
      this.pools.get(kind).push(spr);
    }

    /** Спрайты видимого окна позиционируются ИЗ sim-состояния. */
    syncWorld(renderD) {
      const left = renderD - SEAL_X - 120;
      const right = renderD + (FIELD_W - SEAL_X) + 120;
      const sx = (worldX) => SEAL_X + (worldX - renderD);
      const seen = new Set();
      const place = (key, kind, x, y, dsz, flipX = false) => {
        seen.add(key);
        let rec = this.bound.get(key);
        if (!rec) {
          rec = { kind, spr: this.acquire(kind) };
          rec.spr.setDisplaySize(dsz.w, dsz.h);
          rec.spr.setFlipX(flipX);
          this.bound.set(key, rec);
        }
        rec.spr.setPosition(sx(x), y);
      };

      for (let i = 0; i < state.rocks.length; i++) {
        const r = state.rocks[i];
        if (r.x + r.halfW < left) continue;
        if (r.x - r.halfW > right) break;
        // flipX через один — бесплатная вариативность одной текстуры
        place('r' + i, 'rock', r.x, (r.yTop + r.yBot) / 2,
          { w: r.halfW * 2, h: r.yBot - r.yTop }, i % 2 === 1);
        if (r.yTop < WATERLINE_Y - 4) {
          // «Квази-суша»: кекур пробивает линию воды — сухая макушка + пенная юбка
          const capH = Math.min(26, WATERLINE_Y - r.yTop + 10);
          place('rc' + i, 'skerry_cap', r.x, WATERLINE_Y + 8 - capH / 2,
            { w: r.halfW * 2 * 0.98, h: capH });
        }
      }
      for (let i = 0; i < state.debris.length; i++) {
        const z = state.debris[i];
        if (z.x + z.halfW < left) continue;
        if (z.x - z.halfW > right) break;
        const kind = z.halfH > 70 ? 'ghost_net' : 'plastic_cluster';
        place('z' + i, kind, z.x, z.yc, texSize(kind));
      }
      for (let i = 0; i < state.fish.length; i++) {
        const f = state.fish[i];
        if (f.x < left) continue;
        if (f.x > right) break;
        if (f.taken) continue;
        place('f' + i, f.type, f.x, f.y, texSize(f.type));
      }
      for (let i = 0; i < state.predators.length; i++) {
        const o = state.predators[i];
        if (o.atLu < renderD - 2 * FIELD_W) continue;
        if (o.atLu > right) break;
        const p = predatorPos(o, state.d);
        if (p.x < left || p.x > right) continue;
        place('p' + i, o.type, p.x, p.y, texSize(o.type));
      }
      for (const [key, rec] of this.bound) {
        if (seen.has(key)) continue;
        this.release(rec.kind, rec.spr);
        this.bound.delete(key);
      }
    }

    update(_t, deltaMs) {
      if (!state || state.phase !== 'running') return;
      // Аккумулятор фикс-шага (спека §1.3); кламп дельты — после возврата вкладки
      // не наматываем «догоняющие» секунды.
      this.acc += Math.min(deltaMs, 100);
      while (this.acc >= STEP_MS) {
        this.prev.y = state.y;
        this.prev.d = state.d;
        applyInput(state, currentCtrl());
        step(state);
        this.acc -= STEP_MS;
      }
      for (const ev of takeEvents(state)) {
        if (ev.type === 'predator-hit' && !REDUCED_MOTION) this.cameras.main.shake(180, 0.012);
      }

      // Рендер: интерполяция между sim-состояниями
      const a = this.acc / STEP_MS;
      const renderY = this.prev.y + (state.y - this.prev.y) * a;
      const renderD = this.prev.d + (state.d - this.prev.d) * a;
      this.seal.setPosition(SEAL_X, renderY);
      const invuln = state.tMs < state.invulnUntilMs;
      this.seal.setAlpha(invuln ? (REDUCED_MOTION ? 0.55 : 0.35 + 0.4 * Math.abs(Math.sin(state.tMs / 90))) : 1);
      this.seal.setRotation(Math.atan2(state.vy, 300) * 0.5); // лёгкий наклон по курсу
      // Кадры гребка (render-only, функция от sim-времени/скорости — детерминизм не трогаем)
      const strokeMs = 300 - 140 * Math.min(1.2, state.effSpeed / BAL.SPEED_MAX);
      const frame = Math.floor(state.tMs / strokeMs) % 2;
      if (frame !== this.sealFrame) {
        this.sealFrame = frame;
        this.seal.setTexture('seal_' + frame);
        this.seal.setDisplaySize(TEXTURES.seal.w, TEXTURES.seal.h);
      }
      for (const l of this.layers) l.scroll(renderD);
      this.syncWorld(renderD);
      updateHud(state);

      if (state.phase !== 'running') {
        updateHud(state);
        showGameOver(state);
      }
    }
  };
}

async function boot() {
  ui.start.disabled = true;
  ui.start.textContent = 'Загрузка…';
  let Phaser;
  try {
    // Динамический import вендор-бандла (~1.4 МБ min / ~0.4 МБ gzip) — ТОЛЬКО здесь.
    Phaser = (await import('./vendor/phaser.esm.js')).default;
  } catch (err) {
    ui.start.disabled = false;
    ui.start.textContent = 'Не загрузилось — ещё раз?';
    console.error('phaser load failed', err);
    return;
  }

  state = createSim(course);
  const PlayScene = createPlayScene(Phaser);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: ui.stage,
    width: FIELD_W,
    height: WORLD_H,
    backgroundColor: WATER.floor, // виден только до create(); поле красит bg_water
    scale: {
      // Равный горизонт (спека §1.2): поле ровно 960×540 у ВСЕХ, contain-fit; бордюры
      // вокруг canvas — «глубокая вода» градиентом (style.css, SR-06).
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [PlayScene],
  });

  ui.menu.hidden = true;
  ui.hud.hidden = false;
  ui.fs.hidden = !document.documentElement.requestFullscreen;
}

function restart() {
  ui.over.hidden = true;
  state = createSim(course);
  const scene = game.scene.getScene('play');
  scene.scene.restart();
}

ui.start.addEventListener('click', boot);
ui.restart.addEventListener('click', restart);
// Fullscreen — на pointerUP, не down (iOS-гочи, Roadmap SR-05).
ui.fs.addEventListener('pointerup', () => {
  const el = document.getElementById('app');
  if (document.fullscreenElement) document.exitFullscreen();
  else el.requestFullscreen?.().catch(() => {});
});

// ——— SH-14: kill-switch standalone-версии (админ-тумблер games.standaloneComingSoon).
// Только standalone (прямой URL / будущий vanity-домен SR-12): во фрейме sealife.*
// игра живёт всегда. Сигнал заглушки — ТОЛЬКО явный `standalone:false` от
// /api/game-config; сетевые ошибки/таймаут → fail-open (игра). Слаг тот же, что
// подставляет страница-обёртка (?game=), дефолт — canonical slug игры.
const STANDALONE = (() => {
  try { return window.self === window.top; } catch { return false; }
})();
const CONFIG_SLUG = new URLSearchParams(location.search).get('game') || 'seal-run';

async function fetchStandaloneAllowed() {
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 2500);
    const r = await fetch('/api/game-config?game=' + encodeURIComponent(CONFIG_SLUG), { signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) return true;
    const j = await r.json();
    return !(j && j.standalone === false);
  } catch { return true; }
}

async function enterPlaceholder() {
  window.__placeholder = true; // e2e-ручка (game-placeholder.e2e.spec.ts)
  document.body.classList.add('placeholder'); // гасит меню/HUD/бар (style.css)
  const holder = document.getElementById('coming-soon');
  // Статичный подводный фон без Phaser и без сущностей (render/art.js, SR-06).
  const { paintPlaceholderBackdrop } = await import('./render/art.js');
  paintPlaceholderBackdrop(document.getElementById('coming-soon-bg'));
  holder.hidden = false;
}

if (STANDALONE) {
  // Вуаль до решения (в том же тике, что парс страницы) — меню не мигает перед заглушкой.
  document.body.classList.add('cfg-pending');
  fetchStandaloneAllowed().then((allowed) => {
    document.body.classList.remove('cfg-pending');
    if (!allowed) enterPlaceholder();
  });
}
