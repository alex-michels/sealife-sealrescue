// game.js — bootstrap + рендер-слой Seal Run (SR-05, vertical slice).
//
// Вся ИГРОВАЯ логика — в изоморфном core/sim.js (SR-03); здесь только:
//   • HTML-оверлеи (меню/HUD/результат — вне canvas, доступность),
//   • динамический import() vendored Phaser 4 ТОЛЬКО по «Старт» (бюджет CWV),
//   • тонкая Play-сцена: фикс-шаг аккумулятор → sim, спрайты позиционируются ИЗ sim-состояния
//     (predatorPos — та же чистая функция, что считает коллизии; второй физики нет),
//   • ввод (палец/мышь/клавиши → targetY) + guard от «залипшего тача» при уходе в фон.
//
// Плейсхолдер-арт — процедурные текстуры (SR-06 заменит); лидерборд/i18n/SW — SR-09..SR-11.

import { generateCourse } from './core/course.js';
import { createSim, applyInput, step, takeEvents, getResult, predatorPos } from './core/sim.js';
import {
  SIM_DT,
  FIELD_W,
  WORLD_H,
  SEAL_X,
  OBSTACLE_DIMS,
  STAMINA_MAX,
  STARTING_LIVES,
} from './core/balance.js';

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
  ui.lives.textContent = '❤'.repeat(Math.max(0, state.lives)) + '·'.repeat(STARTING_LIVES - Math.max(0, state.lives));
  const pct = Math.round((state.stamina / STAMINA_MAX) * 100);
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

const COLORS = {
  water: 0x0e3340,
  seal: 0xb8d9e6,
  sealBelly: 0xe6f2f7,
  fish_small: 0x59c1a0,
  fish_rare: 0xe8b64a,
  orca: 0x14181c,
  orcaPatch: 0xe8eef1,
  shark_white: 0x7b8fa0,
  shark_big: 0x5a6d7d,
  rock: 0x4a5560,
  ghost_net: 0x9fd0a8,
  plastic_cluster: 0xd9a0c7,
};

function makeTextures(scene) {
  if (scene.textures.exists('seal')) return; // scene.restart() не перегенерирует
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const tex = (key, w, h, draw) => {
    g.clear();
    draw(g, w, h);
    g.generateTexture(key, w, h);
  };
  // Тюлень — торпедообразный силуэт (профиль сбоку, спека §1.1)
  tex('seal', 96, 48, (gg, w, h) => {
    gg.fillStyle(COLORS.seal).fillEllipse(w / 2, h / 2, w, h * 0.82);
    gg.fillStyle(COLORS.sealBelly).fillEllipse(w / 2, h * 0.66, w * 0.8, h * 0.4);
    gg.fillStyle(COLORS.seal).fillTriangle(4, h / 2, 20, h * 0.2, 20, h * 0.8); // хвост слева
    gg.fillStyle(0x22303a).fillCircle(w * 0.82, h * 0.38, 3); // глаз
  });
  // Рыба: силуэт-капля с хвостом; редкая — крупнее и с «кольцом»
  tex('fish_small', 28, 18, (gg, w, h) => {
    gg.fillStyle(COLORS.fish_small).fillEllipse(w * 0.58, h / 2, w * 0.7, h * 0.85);
    gg.fillTriangle(2, h / 2, w * 0.3, h * 0.15, w * 0.3, h * 0.85);
  });
  tex('fish_rare', 36, 24, (gg, w, h) => {
    gg.lineStyle(2, COLORS.fish_rare, 0.6).strokeCircle(w * 0.58, h / 2, h * 0.48);
    gg.fillStyle(COLORS.fish_rare).fillEllipse(w * 0.58, h / 2, w * 0.66, h * 0.7);
    gg.fillTriangle(2, h / 2, w * 0.28, h * 0.2, w * 0.28, h * 0.8);
  });
  // Хищники — РАЗНЫЕ силуэты (различимость не только цветом, спека §6/§11-5)
  tex('orca', 100, 60, (gg, w, h) => {
    gg.fillStyle(COLORS.orca).fillEllipse(w / 2, h / 2, w * 0.95, h * 0.75);
    gg.fillTriangle(w * 0.42, h * 0.28, w * 0.58, h * 0.28, w * 0.5, 0); // спинной плавник вверх
    gg.fillStyle(COLORS.orcaPatch).fillEllipse(w * 0.68, h * 0.42, 14, 8); // «очко» орки
    gg.fillStyle(COLORS.orcaPatch).fillEllipse(w * 0.45, h * 0.72, w * 0.4, h * 0.2);
  });
  // Чарджеры плывут ВЛЕВО (навстречу тюленю) — нос-клин слева, хвост справа.
  tex('shark_white', 68, 36, (gg, w, h) => {
    gg.fillStyle(COLORS.shark_white).fillEllipse(w * 0.55, h * 0.58, w * 0.8, h * 0.62);
    gg.fillTriangle(w * 0.44, h * 0.34, w * 0.66, h * 0.34, w * 0.55, 2); // спинной плавник
    gg.fillTriangle(2, h * 0.58, w * 0.3, h * 0.34, w * 0.3, h * 0.82); // нос
    gg.fillTriangle(w - 2, h * 0.3, w - 2, h * 0.86, w * 0.78, h * 0.58); // хвост
  });
  tex('shark_big', 92, 50, (gg, w, h) => {
    gg.fillStyle(COLORS.shark_big).fillEllipse(w * 0.55, h * 0.58, w * 0.8, h * 0.66);
    gg.fillTriangle(w * 0.42, h * 0.3, w * 0.68, h * 0.3, w * 0.55, 0);
    gg.fillTriangle(2, h * 0.58, w * 0.3, h * 0.3, w * 0.3, h * 0.86);
    gg.fillTriangle(w - 2, h * 0.26, w - 2, h * 0.9, w * 0.76, h * 0.58);
  });
  // Камень/мусор — статичные формы
  tex('rock', 100, 100, (gg, w, h) => {
    gg.fillStyle(COLORS.rock);
    gg.fillPoints([
      { x: w * 0.1, y: h }, { x: 0, y: h * 0.45 }, { x: w * 0.3, y: h * 0.08 },
      { x: w * 0.72, y: 0 }, { x: w, y: h * 0.5 }, { x: w * 0.9, y: h },
    ], true);
  });
  tex('ghost_net', 80, 100, (gg, w, h) => {
    gg.lineStyle(2, COLORS.ghost_net, 0.55);
    for (let x = 0; x <= w; x += 16) gg.lineBetween(x, 0, x, h);
    for (let y = 0; y <= h; y += 16) gg.lineBetween(0, y, w, y);
  });
  tex('plastic_cluster', 70, 60, (gg, w, h) => {
    gg.fillStyle(COLORS.plastic_cluster, 0.5).fillRoundedRect(0, 0, w * 0.55, h * 0.5, 6);
    gg.fillStyle(COLORS.plastic_cluster, 0.4).fillRoundedRect(w * 0.35, h * 0.4, w * 0.6, h * 0.55, 6);
  });
  g.destroy();
}

// Габариты отображения сущностей (визуал ≥ хитбокса — хитбокс прощающий, спека §8)
function displaySize(kind, e) {
  switch (kind) {
    case 'rock': return { w: e.halfW * 2, h: e.yBot - e.yTop };
    case 'ghost_net': return { w: OBSTACLE_DIMS.ghost_net.w, h: OBSTACLE_DIMS.ghost_net.h };
    case 'plastic_cluster': return { w: OBSTACLE_DIMS.plastic_cluster.w, h: OBSTACLE_DIMS.plastic_cluster.h };
    case 'orca': return { w: 100, h: 60 };
    case 'shark_white': return { w: 68, h: 36 };
    case 'shark_big': return { w: 92, h: 50 };
    case 'fish_small': return { w: 28, h: 18 };
    case 'fish_rare': return { w: 36, h: 24 };
    default: return { w: 32, h: 32 };
  }
}

function createPlayScene(Phaser) {
  return class PlayScene extends Phaser.Scene {
    constructor() { super('play'); }

    create() {
      makeTextures(this);
      // Пул спрайтов на тип + карта «сущность → спрайт» (object pooling, Roadmap SR-05)
      this.pools = new Map();
      this.bound = new Map();
      this.acc = 0;
      this.prev = { y: state.y, d: state.d };
      this.seal = this.add.image(SEAL_X, state.y, 'seal').setDepth(10);
      // фон-полосы: слабая сетка глубин, чтобы движение читалось до арта SR-06
      const bg = this.add.graphics().setDepth(0);
      bg.lineStyle(1, 0x1b4a5c, 0.5);
      for (let k = 0; k < 6; k++) bg.lineBetween(0, k * 108, FIELD_W, k * 108);
      this.waterline = this.add.graphics().setDepth(1);
      this.waterline.lineStyle(3, 0x9fd0e0, 0.7).lineBetween(0, 2, FIELD_W, 2);
    }

    acquire(kind) {
      let pool = this.pools.get(kind);
      if (!pool) { pool = []; this.pools.set(kind, pool); }
      const spr = pool.pop() || this.add.image(0, 0, kind).setDepth(5);
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
      const place = (key, kind, x, y, e) => {
        seen.add(key);
        let rec = this.bound.get(key);
        if (!rec) {
          rec = { kind, spr: this.acquire(kind) };
          const dsz = displaySize(kind, e);
          rec.spr.setDisplaySize(dsz.w, dsz.h);
          this.bound.set(key, rec);
        }
        rec.spr.setPosition(sx(x), y);
      };

      for (let i = 0; i < state.rocks.length; i++) {
        const r = state.rocks[i];
        if (r.x + r.halfW < left) continue;
        if (r.x - r.halfW > right) break;
        place('r' + i, 'rock', r.x, (r.yTop + r.yBot) / 2, r);
      }
      for (let i = 0; i < state.debris.length; i++) {
        const z = state.debris[i];
        if (z.x + z.halfW < left) continue;
        if (z.x - z.halfW > right) break;
        place('z' + i, z.halfH > 70 ? 'ghost_net' : 'plastic_cluster', z.x, z.yc, z);
      }
      for (let i = 0; i < state.fish.length; i++) {
        const f = state.fish[i];
        if (f.x < left) continue;
        if (f.x > right) break;
        if (f.taken) continue;
        place('f' + i, f.type, f.x, f.y, f);
      }
      for (let i = 0; i < state.predators.length; i++) {
        const o = state.predators[i];
        if (o.atLu < renderD - 2 * FIELD_W) continue;
        if (o.atLu > right) break;
        const p = predatorPos(o, state.d);
        if (p.x < left || p.x > right) continue;
        place('p' + i, o.type, p.x, p.y, o);
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
    backgroundColor: '#0e3340',
    scale: {
      // Равный горизонт (спека §1.2): поле ровно 960×540 у ВСЕХ, contain-fit; бордюры
      // вокруг canvas — декоративная «глубокая вода» (style.css), арт-бордюр — SR-06.
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
