// game.js (ESM entrypoint)
import { BAL, STAR, recomputeBalance, computeWorld } from './core/balance.js';
import { ROUND_MS, stepSeal, spawnTick } from './core/sim.js';
import { attachPointer, attachKeyboard } from './core/input.js';
import { initScenery, drawBackground, initBorder, drawDeepBackdrop, drawBorderBack, drawBorderFront, initBackdrop, isBackdropActive, drawBackdropFullscreen, drawWaterGradient } from './render/scenery.js';
import { PREY, updatePrey, drawPrey, scheduleStar } from './entities/prey.js';
import { makeSeal } from './entities/seal.js';
import { mountAfterPlay, startRound, relocalizeBoard } from './core/leaderboard.js';
import { getAlias } from './core/alias.js';

const { sin, cos, hypot, min, max, PI } = Math;

// Локализация: словарь и язык приходят из i18n.js (классический скрипт, выполнен раньше).
const t = (key, vars) => window.SealI18n.t(key, vars);

// Какой игре принадлежит результат (slug в Payload). Передаётся страницей-обёрткой (?game=).
const GAME_SLUG = new URLSearchParams(location.search).get('game') || 'seal-the-hunter';

// Приветствие с анонимным псевдонимом игрока (локализуется: «Привет, Солёный Тюлень!»).
// Текст заполняет renderOverlayText() — чтобы он перерисовывался при смене языка (standalone).
const HELLO = document.getElementById('hello');

// ——— DOM/Canvas
const CANVAS = document.getElementById('game');
const CTX = CANVAS.getContext('2d', { alpha:false });
const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

const UI = {
  time: document.getElementById('time'),
  score: document.getElementById('score'),
  best: document.getElementById('best'),
  overlay: document.getElementById('overlay'),
  message: document.getElementById('message'),
  btnStart: document.getElementById('btnStart'),
  btnAgain: document.getElementById('btnAgain'),
  btnPause: document.getElementById('btnPause'),
  btnShareEnd: document.getElementById('btnShareEnd'),
  btnSound: document.getElementById('btnSound'),
  board: document.getElementById('board'),
  // — standalone-альфа (sealthehunter.online): переключатель языка, заметка, контакт
  langSwitch: document.getElementById('langSwitch'),
  alphaNotice: document.getElementById('alphaNotice'),
  feedbackInvite: document.getElementById('feedbackInvite'),
};

const GAME_DURATION = ROUND_MS;
const WORLD = { w:0, h:0 };
// Viewport mapping: logical world → display (CSS px). Letterboxed on extreme aspects.
const VIEW = { scale:1, ox:0, oy:0, dispW:0, dispH:0 };
const STATE = { running:false, over:false, paused:false };
const SCORE = { now:0, best:0 };
const POINTER = { x:0, y:0, active:false };

// — Dev FPS check: rolling FPS + frame WORK time (ms in update+draw) exposed as window.__fps /
// window.__frameMs; on-screen readout only with ?fps=1. workMs is the true render cost — if it's far
// below 16.7 ms while fps sits ~60, the cap is vsync (display refresh), not a slowdown.
const SHOW_FPS = new URLSearchParams(location.search).get('fps') === '1';
const FPS = { frames: 0, acc: 0, value: 0, workAcc: 0, workMs: 0 };

// ——— Standalone-альфа (sealthehunter.online): язык переключается на стартовом/финальном экране,
// показываем заметку про альфа-тест и отображаемый контакт для фидбэка. Во фрейме (встраивание на
// sealife.*) ничего этого нет — поведение прежнее (язык из ?lang=, переключателя нет).
const STANDALONE = !!(window.SealI18n && window.SealI18n.standalone);
const FRIEND = (() => {
  const p = new URLSearchParams(location.search);
  if (!p.has('s')) return null;
  const s = Number(p.get('s'));
  return { score: s, best: Number(p.get('b') || s) };
})();

// Динамический текст оверлея храним как функции от ТЕКУЩЕГО языка, чтобы перерисовать при смене.
let overlayMsg = () => t('intro');
let overlayBtn = () => t('btnPlay');

function renderOverlayText() {
  if (HELLO) HELLO.textContent = t('helloLine', { alias: getAlias(GAME_SLUG, window.SealI18n.lang) });
  UI.message.innerHTML = overlayMsg();
  UI.btnAgain.textContent = overlayBtn();
  refreshSoundButton();
  if (STANDALONE) {
    if (UI.alphaNotice) UI.alphaNotice.innerHTML = t('alphaNotice');
    if (UI.feedbackInvite) UI.feedbackInvite.innerHTML = t('feedbackInvite');
  }
}

function syncLangButtons() {
  if (!UI.langSwitch) return;
  const cur = window.SealI18n.lang;
  UI.langSwitch.querySelectorAll('.lang-btn').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === cur));
  });
}

// ——— Audio (gentle pop) — warm up on first user gesture to avoid hitch
const FX = { enabled: (localStorage.getItem('seal_hunt_sound') ?? '1') === '1' };
let audioCtx = null;
let audioReady = false;

async function initAudio() {
  if (audioReady || !FX.enabled) return;
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC({ latencyHint: 'interactive' });
    }
    // Some browsers need an explicit resume() within a gesture
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    // Warm up: start/stop a nearly silent node so the graph is “hot”
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    g.gain.value = 0.00001;      // effectively silent
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.05);

    audioReady = true;
  } catch {}
}

function pop() {
  if (!FX.enabled) return;
  // If not warmed yet, do it asynchronously and fire the pop next tick
  if (!audioReady) { initAudio().then(() => setTimeout(pop, 0)); return; }
  try {
    const ctx = audioCtx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 660 + Math.random() * 60;
    g.gain.value = 0.12;
    o.connect(g); g.connect(ctx.destination);
    const t0 = ctx.currentTime;
    o.start(t0);
    o.frequency.exponentialRampToValueAtTime(120, t0 + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
    o.stop(t0 + 0.13);
  } catch {}
}

// ⚡ «Вуаля» — магический звук поимки молниевой звезды (SH-13). Пикап-практика: у редкого
// баффа СВОЙ звук, не обычный pop, — сигнал «произошло волшебство». Рецепт: быстрое
// восходящее арпеджио (пентатоника — «взмах палочки») + высокий колокольчик-шиммер сверху.
// Детерминирован (без Math.random) и короткий (~0.6 с), чтобы не перекрывать игру.
function magic() {
  if (!FX.enabled) return;
  if (!audioReady) { initAudio().then(() => setTimeout(magic, 0)); return; }
  try {
    const ctx = audioCtx;
    const t0 = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.16;
    out.connect(ctx.destination);
    // 1) взмах: четыре ноты вверх (C6 E6 G6 C7), треугольник — мягкое «фейри»-звучание
    const notes = [1046.5, 1318.5, 1568.0, 2093.0];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      const at = t0 + i * 0.07;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
      o.connect(g); g.connect(out);
      o.start(at); o.stop(at + 0.3);
    });
    // 2) шиммер: высокий «колокольчик» с лёгким глиссандо вверх — послевкусие волшебства
    const s = ctx.createOscillator();
    const sg = ctx.createGain();
    s.type = 'sine';
    s.frequency.setValueAtTime(2637, t0 + 0.16); // E7
    s.frequency.exponentialRampToValueAtTime(4186, t0 + 0.5); // → C8
    sg.gain.setValueAtTime(0.0001, t0 + 0.16);
    sg.gain.exponentialRampToValueAtTime(0.22, t0 + 0.2);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.62);
    s.connect(sg); sg.connect(out);
    s.start(t0 + 0.16); s.stop(t0 + 0.65);
  } catch {}
}

// ——— Helpers
const lerp=(a,b,t)=>a+(b-a)*t;
function makeSpots(seed=1,count=28){ let x=seed;
  const rnd=()=> (x=(x*1664525+1013904223)%2**32, (x/2**32));
  const arr=[]; for(let i=0;i<count;i++){
    const rx=(rnd()*1.6-0.8), ry=(rnd()*1.2-0.6), r=0.05+rnd()*0.08;
    arr.push({rx,ry,r,a:0.45+rnd()*0.25});
  } return arr;
}

// ——— Seal
const seal = makeSeal(makeSpots);

// ——— Resize + scenery
function applyWorldTransform(){
  // Map logical world units → display px (scaled + centered), times DPR for crispness.
  CTX.setTransform(VIEW.scale * DPR, 0, 0, VIEW.scale * DPR, VIEW.ox * DPR, VIEW.oy * DPR);
}

function resize(){
  // read the CSS size (style.css already sets 100vw/100vh)
  const cssW = CANVAS.clientWidth || window.innerWidth;
  const cssH = CANVAS.clientHeight || window.innerHeight;
  VIEW.dispW = cssW;
  VIEW.dispH = cssH;

  // Фиксированное поле (SH-12): 960×540 в ландшафте / 540×960 в портрете — у всех одинаковый
  // мир («равный горизонт», как у Seal Run). См. core/balance.js.
  const world = computeWorld(cssW, cssH);
  WORLD.w = world.w;
  WORLD.h = world.h;

  // Contain-fit поля в экран; остаток (любая ось) одевается диегетическим бордюром
  // (render/scenery.js: initBorder ветвится по РЕАЛЬНЫМ зазорам ox/oy, не по ориентации).
  VIEW.scale = Math.min(cssW / WORLD.w, cssH / WORLD.h);
  VIEW.ox = (cssW - WORLD.w * VIEW.scale) / 2;
  VIEW.oy = (cssH - WORLD.h * VIEW.scale) / 2;

  // set the backing store size for high-DPI rendering
  CANVAS.width  = Math.floor(cssW * DPR);
  CANVAS.height = Math.floor(cssH * DPR);
  applyWorldTransform();

  recomputeBalance(WORLD.w, WORLD.h);
  initScenery(WORLD, CTX);
  initBorder(VIEW, WORLD, CTX);
}

// Convert a canvas-relative point (CSS px) into logical world coordinates.
function toLogical(p){
  return { x: (p.x - VIEW.ox) / VIEW.scale, y: (p.y - VIEW.oy) / VIEW.scale };
}

let resizePend = false;
window.addEventListener('resize', () => {
  if (resizePend) return;
  resizePend = true;
  requestAnimationFrame(() => { resizePend = false; resize(); });
}, { passive: true });

resize();

// Start loading the optional static backdrop image (best-effort; procedural scene until ready).
initBackdrop();

// ——— Input
attachPointer(CANVAS,
  p=>{ const q=toLogical(p); POINTER.x=q.x; POINTER.y=q.y; },
  p=>{ const q=toLogical(p); POINTER.active=true; POINTER.x=q.x; POINTER.y=q.y; },
  ()=>{ POINTER.active=false; }
);
// Keyboard (Arrow keys + WASD), shared handler from input.js
const KB = attachKeyboard(window);

let didWarmAudio = false;
const warmOnce = () => { if (!didWarmAudio) { didWarmAudio = true; initAudio(); } };
CANVAS.addEventListener('touchstart', warmOnce, { passive: true });
CANVAS.addEventListener('mousedown',  warmOnce);

// ——— UI
function refreshSoundButton(){
  if(!UI.btnSound) return;
  UI.btnSound.textContent = FX.enabled ? '🔊' : '🔈';
  UI.btnSound.setAttribute('aria-pressed', String(!FX.enabled));
  UI.btnSound.title = FX.enabled ? t('soundOn') : t('soundOff');
}
if(UI.btnSound){
  refreshSoundButton();
  UI.btnSound.addEventListener('click', ()=>{
    FX.enabled = !FX.enabled;
    localStorage.setItem('seal_hunt_sound', FX.enabled?'1':'0');
    refreshSoundButton();
    if (FX.enabled) initAudio();   // warm immediately when turning sound back on
  });
}

SCORE.best = Number(localStorage.getItem('seal_hunt_best')||0);
UI.best.textContent = SCORE.best;

// ——— Стартовый оверлей. «Вызов от друга» (?s=) меняет только сообщение; кнопка — «Играть».
if (FRIEND) overlayMsg = () => t('friendChallenge', { score: FRIEND.score, best: FRIEND.best });
UI.overlay.hidden = false;
UI.btnShareEnd.hidden = true;

if (STANDALONE) {
  if (UI.langSwitch) {
    UI.langSwitch.hidden = false;
    UI.langSwitch.querySelectorAll('.lang-btn').forEach((b) => {
      // persist=true: запоминаем язык ТОЛЬКО после явного выбора пользователя (COMPLIANCE).
      b.addEventListener('click', () => window.SealI18n.setLang(b.getAttribute('data-lang'), true));
    });
  }
  if (UI.alphaNotice) UI.alphaNotice.hidden = false;
  if (UI.feedbackInvite) UI.feedbackInvite.hidden = false;
}

renderOverlayText();
syncLangButtons();

// Смена языка (standalone-переключатель) → перерисовать динамику оверлея и доску, если показана.
window.SealI18n.onLangChange(() => {
  renderOverlayText();
  syncLangButtons();
  if (STANDALONE && UI.board && !UI.board.hidden) relocalizeBoard(UI.board, t);
});

// Старт/Играть: один обработчик (initAudio + startGame), чтобы раунд и play-token не брались дважды.
const onStartClick = () => { initAudio(); startGame(); };
UI.btnStart.addEventListener('click', onStartClick);
UI.btnAgain.addEventListener('click', onStartClick);
UI.btnPause.addEventListener('click', ()=>{
  if(!STATE.running) return;
  STATE.paused = !STATE.paused;
  UI.btnPause.textContent = STATE.paused ? t('btnResume') : t('btnPause');
  UI.btnPause.setAttribute('aria-pressed', String(STATE.paused));
  if(!STATE.paused) lastTime = performance.now();
  loop();
});
UI.btnShareEnd.addEventListener('click', shareScore);


// ——— Game loop state
let lastTime=0, timeLeft=GAME_DURATION, spawnTimer=0;

function startGame(){
  STATE.running=true; STATE.over=false; STATE.paused=false;
  UI.overlay.hidden=true; UI.btnShareEnd.hidden=true;
  UI.overlay.classList.remove('is-waiting'); // clear any leftover transition state
  if (UI.board) { UI.board.hidden = true; UI.board.innerHTML = ''; }
  startRound(GAME_SLUG); // взять play-token на старте (анти-чит, SH-08)
  UI.btnPause.textContent=t('btnPause');
  SCORE.now=0; UI.score.textContent='0';
  timeLeft=GAME_DURATION; spawnTimer=0; PREY.length=0;
  scheduleStar(WORLD); // ⚡ SH-13: раундовое расписание молниевой звезды (ровно 4 RNG-броска)

  // apply balance
  recomputeBalance(WORLD.w,WORLD.h);
  seal.maxSpeed = BAL.sealSpeed;
  seal.accel    = BAL.sealAccel;
  seal.buffT    = 0; // сброс баффа звезды между раундами

  // place seal
  seal.x = WORLD.w*0.3; seal.y = WORLD.h*0.5;
  seal.px=seal.x; seal.py=seal.y; seal.vx=seal.vy=0;
  POINTER.active=false;

  lastTime = performance.now();
  loop();
}

// A fixed-minimum "time's up" interstitial plays before the result screen, so the score + board
// never flash in — they appear once they're actually ready. UX best practice: a transition/loading
// state shown for a MINIMUM duration shouldn't be yanked the instant data arrives. 3s gives the
// "let's see your catch" beat room to land (1.2s felt too quick).
const MIN_TRANSITION_MS = 3000;

function endGame(){
  STATE.running=false; STATE.over=true;
  const finalScore = SCORE.now;
  const isNew = finalScore > SCORE.best;
  if(isNew){
    SCORE.best=finalScore; localStorage.setItem('seal_hunt_best', String(SCORE.best));
    UI.best.textContent=SCORE.best;
  }
  const finalBest = SCORE.best;

  // — Phase 1: a friendly, stable interstitial ("Привет, <имя>!" via the hello line + "считаем
  //   улов…"). The score is submitted and the board loaded in the BACKGROUND while the result UI
  //   (score line, buttons, board, notes) is hidden via `.is-waiting`. We reveal only when BOTH the
  //   board is ready AND the min time has elapsed — no loading flash, no abrupt cut to results.
  overlayMsg = () => t('transitionWait');
  overlayBtn = () => t('btnAgain');
  UI.overlay.hidden=false;
  UI.overlay.classList.add('is-waiting');
  UI.btnShareEnd.hidden=true;
  renderOverlayText();

  const boardReady = UI.board
    ? mountAfterPlay(UI.board, GAME_SLUG, finalScore, t).catch(() => {})
    : Promise.resolve();
  const minWait = new Promise((res) => setTimeout(res, MIN_TRANSITION_MS));

  Promise.all([boardReady, minWait]).then(() => {
    if (STATE.over) revealResult(finalScore, isNew, finalBest); // skip if a new round already began
  });
}

// — Phase 2: the result screen (score line + leaderboard + buttons), shown once data is ready.
//   Message/button stay functions of the current language so they re-render on a language switch.
function revealResult(finalScore, isNew, finalBest){
  overlayMsg = isNew
    ? () => t('timeUpNewRecord', { score: finalScore })
    : () => t('timeUp', { score: finalScore, best: finalBest });
  overlayBtn = () => t('btnAgain');
  UI.btnShareEnd.hidden=false;
  UI.overlay.classList.remove('is-waiting');
  renderOverlayText();
}

function loop(){
  if(!STATE.running){ drawFrame(0); return; }
  const now=performance.now(); const rawDt=(now-lastTime)/1000; lastTime=now;
  if(STATE.paused){ drawFrame(0); return; }
  const dt=Math.min(rawDt,0.033);
  const w0 = performance.now();
  update(dt); drawFrame(dt);
  FPS.workAcc += performance.now() - w0; // real work this frame (ms), independent of vsync
  // FPS over the real frame delta (before the sim dt clamp); refresh ~2×/s.
  FPS.frames++; FPS.acc += rawDt;
  if (FPS.acc >= 0.5) {
    FPS.value = Math.round(FPS.frames / FPS.acc);
    FPS.workMs = FPS.workAcc / FPS.frames;
    window.__fps = FPS.value; window.__frameMs = Math.round(FPS.workMs * 10) / 10;
    FPS.frames = 0; FPS.acc = 0; FPS.workAcc = 0;
  }
  if(STATE.running) requestAnimationFrame(loop);
}

function update(dt){
  // ——— timer
  timeLeft -= dt*1000;
  if(timeLeft<=0){ UI.time.textContent='0'; endGame(); return; }
  UI.time.textContent = Math.ceil(timeLeft/1000);

  // ——— spawn control (shared sim core)
  spawnTimer = spawnTick(spawnTimer, dt, timeLeft, WORLD);

  // ——— seal physics (shared sim core) — unify pointer + keyboard into one control input.
  // Falls back to "no input" if KB isn’t defined yet.
  const ks = (typeof KB !== 'undefined' && KB.state) ? KB.state
           : {left:false,right:false,up:false,down:false};
  const kx = (ks.right ? 1 : 0) - (ks.left ? 1 : 0);
  const ky = (ks.down  ? 1 : 0) - (ks.up   ? 1 : 0);
  stepSeal(seal, { px: POINTER.x, py: POINTER.y, active: POINTER.active, kx, ky }, dt, WORLD);

  // ——— prey update + collision
  updatePrey(dt, seal, WORLD, (f)=>{
    // ⚡ SH-13: молниевая звезда = 5 очков + магический «вуаля» вместо обычного pop;
    // бафф скорости применяет сим (updatePrey → seal.buffT), тут только счёт и фидбэк.
    SCORE.now += (f && f.sp.points) || 1;
    UI.score.textContent=SCORE.now;
    if (f && f.sp.lightning) magic(); else pop();
  });
}

function drawFrame(dt){
  const reduced = PREFERS_REDUCED.matches;
  const t = performance.now()/1000;

  const hasBorder = VIEW.ox > 0.5 || VIEW.oy > 0.5;
  const bd = isBackdropActive(WORLD);

  // BEHIND the field. With a backdrop image: ONE image spans the whole viewport (field + border),
  // then the border draws only its ANIMATED markers over it (kelp-walls / boat / seabed grass).
  // Without: the deep gradient + full diegetic border (seabed, sky + boats, kelp walls), >2:1 only.
  CTX.save();
  CTX.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (bd) drawBackdropFullscreen(CTX, VIEW, WORLD, DPR);
  else drawDeepBackdrop(CTX, VIEW);
  if (hasBorder) drawBorderBack(CTX, VIEW, WORLD, t, reduced, bd);
  if (bd) drawWaterGradient(CTX, VIEW); // game's depth tint over the whole viewport (field + border)
  CTX.restore();

  // In backdrop mode, root the seabed flora at the screen bottom (extend it below the field through
  // the bottom border) so kelp grows from the real seabed on >1:2 screens, not the floating field edge.
  const bottomExtra = (bd && VIEW.oy > 0.5) ? VIEW.oy / VIEW.scale : 0;
  drawBackground(CTX, WORLD, t, reduced, bottomExtra);
  // Видимая поверхность над полем (верхний бордюр = воздух): добыча клипается по ватерлинии и
  // фейдится, «ныряя» под воду (drawPrey), а рябь маркирует пересечение. Рыба не «летит» в воздух
  // и не рисуется ловимым фантомом под водой. Рендер-only: физика/спавн/кулл/поимка не меняются.
  const surf = VIEW.oy > 0.5 ? { ripples: true } : null;
  drawPrey(CTX, WORLD, surf);
  seal.draw(CTX);

  // ⚡ SH-13: аура баффа — видимая длительность эффекта (пикап-практика: игрок должен ВИДЕТЬ,
  // что бафф активен и когда кончится). Золотое кольцо тает вместе с остатком баффа;
  // при reduced-motion — статичное кольцо без вращения искр.
  if (seal.buffT > 0) {
    const k = Math.min(1, seal.buffT / STAR.buffSec); // 1 → 0 к концу баффа
    const rr = seal.r * 1.45;
    CTX.save();
    CTX.translate(seal.x, seal.y);
    CTX.strokeStyle = 'rgba(255,232,122,' + (0.55 * k).toFixed(3) + ')';
    CTX.lineWidth = 3;
    CTX.beginPath(); CTX.arc(0, 0, rr, 0, PI * 2); CTX.stroke();
    CTX.strokeStyle = 'rgba(207,240,255,' + (0.7 * k).toFixed(3) + ')';
    CTX.lineWidth = 2;
    CTX.lineCap = 'round';
    const spin = reduced ? 0 : t * 7;
    for (let i = 0; i < 4; i++) { // четыре искровые чёрточки по кольцу
      const a = spin + i * (PI / 2);
      CTX.beginPath();
      CTX.moveTo(cos(a) * rr * 0.92, sin(a) * rr * 0.92);
      CTX.lineTo(cos(a) * rr * 1.14, sin(a) * rr * 1.14);
      CTX.stroke();
    }
    CTX.restore();
  }

  // Border layers IN FRONT of the field: side kelp walls, the wavy sea surface + vignette.
  if (hasBorder) {
    CTX.save();
    CTX.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawBorderFront(CTX, VIEW, WORLD, t, reduced);
    CTX.restore();
  }

  if(!STATE.running){
    CTX.save(); CTX.fillStyle='rgba(0,0,0,0.2)'; CTX.fillRect(0,0,WORLD.w,WORLD.h); CTX.restore();
  }

  if (SHOW_FPS) { // dev readout, bottom-left (clear of the HUD)
    CTX.save();
    CTX.setTransform(DPR, 0, 0, DPR, 0, 0);
    CTX.font = '600 13px ui-monospace, monospace';
    const y = VIEW.dispH - 10;
    const txt = (FPS.value || '–') + ' fps · ' + (FPS.workMs ? FPS.workMs.toFixed(1) : '–') + ' ms';
    CTX.fillStyle = 'rgba(2,22,34,0.6)'; CTX.fillRect(8, y - 15, 140, 20);
    // colour by the REAL work time (vsync-independent): green if comfortably under the 16.7ms budget
    CTX.fillStyle = FPS.workMs && FPS.workMs < 11 ? '#7CFC9A' : FPS.workMs < 16 ? '#FFD479' : '#FF7A6B';
    CTX.fillText(txt, 13, y);
    CTX.restore();
  }
}

async function shareScore(){
  const url=new URL(location.href); url.searchParams.delete('s'); url.searchParams.delete('b');
  const link = url.toString() + (url.search?'&':'?') + 's='+(SCORE.now||0)+'&b='+(SCORE.best||0);
  const isNew = SCORE.now===SCORE.best; const tag=isNew?t('shareNewRecordTag'):'';
  const shareData={ title:t('title'), text:t('shareText', { score: SCORE.now, best: SCORE.best, tag }), url:link };
  try{
    if(navigator.share){ await navigator.share(shareData); }
    else if(navigator.clipboard){ await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`); toast(t('linkCopied')); }
    else{ prompt(t('copyShare'), `${shareData.text}\n${shareData.url}`); }
  }catch{}
}

let toastId;
function toast(msg){
  clearTimeout(toastId);
  let el=document.getElementById('toast');
  if(!el){ el=document.createElement('div'); el.id='toast';
    Object.assign(el.style,{position:'fixed',left:'50%',bottom:'12vh',transform:'translateX(-50%)',
      background:'rgba(2,22,34,.9)',color:'#e6f7ff',padding:'10px 14px',borderRadius:'12px',zIndex:20,fontWeight:600});
    document.body.appendChild(el);
  }
  el.textContent=msg; el.style.opacity='1'; toastId=setTimeout(()=>el.style.opacity='0',1600);
}

window.addEventListener('load', ()=> CANVAS.focus());
