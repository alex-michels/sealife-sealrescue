import { generateCourse, generateRound, courseHash } from './core/course.js'
import {
  BIOMES,
  BIOME_IDS,
  EXPEDITION,
  MAX_ROUNDS,
  RULES_VERSION,
  roundSpeed,
} from './core/biomes.js'
import { createSim, getResult } from './core/sim.js'
import { FIELD_W, WORLD_H, BAL } from './core/balance.js'
import { createPlayScene } from './render/scene.js'
import { paintPreview, paintHero, loadOcean } from './render/expedition.js'
import { renderName } from './core/alias.js'
import { t, lang, setLanguage, preference, savePreference } from './i18n.js'
import { OceanAudio } from './audio.js'

const $ = (id) => document.getElementById(id)
const number = (n) => Number(n).toLocaleString(lang())
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase()
let mode = 'explore',
  selected = 'coastal',
  seed = new URLSearchParams(location.search).get('seed')?.slice(0, 80) || randomSeed()
let view = 'menu',
  previousView = 'menu',
  game = null,
  state = null,
  course = null,
  chapter = 0,
  rounds = [],
  ticket = null,
  submitted = false,
  busy = false
let reduced = preference('seal_run_motion', 'system')
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)')
const isReduced = () => (reduced === 'system' ? motionQuery.matches : reduced === 'true')
const audio = new OceanAudio(false)
let soundWanted = preference('seal_run_sound', 'false') === 'true'
const input = { mode: 'none', targetY: null, keys: new Set(), direction: 0, burst: false }
let toastUntil = 0,
  boardPage = 1,
  boardRequest = 0,
  boardReturnFocus = null,
  announcedLow = false
const levels = () => rounds.filter((r) => r.phase === 'finished').length
const total = (key) => rounds.reduce((sum, r) => sum + r[key], 0)

function settings() {
  $('sound')
    .querySelector('path')
    .setAttribute(
      'd',
      soundWanted
        ? 'm11 5-5 4H3v6h3l5 4V5ZM15 8q6 4 0 8'
        : 'm11 5-5 4H3v6h3l5 4V5Zm5 3 5 8m0-8-5 8',
    )
  $('sound').setAttribute('aria-pressed', String(soundWanted))
  $('sound').title = t('sound') + ': ' + t(soundWanted ? 'on' : 'off')
  $('sound').setAttribute('aria-label', $('sound').title)
  $('motion').setAttribute('aria-pressed', String(isReduced()))
  $('motion').title = t('motion') + ': ' + t(isReduced() ? 'on' : 'off')
}
function drawMenu() {
  const b = BIOMES[selected],
    idx = BIOME_IDS.indexOf(selected)
  document.documentElement.style.setProperty('--accent', b.accent)
  $('location-name').textContent = b.name[lang()]
  $('location-species').textContent = b.species[lang()]
  $('location-number').textContent = String(idx + 1).padStart(2, '0')
  $('chapter-eyebrow').textContent = String(idx + 1).padStart(2, '0') + ' / 05 · 900 M'
  $('seed-label').textContent = mode === 'weekly' ? t('weekly') : seed
  $('mode-hint').textContent = t(mode === 'weekly' ? 'weeklyHint' : 'exploreHint')
  $('mode-explore').setAttribute('aria-pressed', String(mode === 'explore'))
  $('mode-weekly').setAttribute('aria-pressed', String(mode === 'weekly'))
  $('regenerate').hidden = mode === 'weekly'
  $('pace-label').hidden = mode === 'weekly'
  paintPreview($('ocean-preview'), selected, true)
  paintHero($('seal-portrait'), selected)
  $('biome-map').replaceChildren(
    ...BIOME_IDS.map((id, i) => {
      const button = document.createElement('button')
      button.className = 'biome-card'
      button.dataset.biome = id
      button.setAttribute('aria-pressed', String(id === selected))
      button.disabled = mode === 'weekly' && id !== 'coastal'
      const canvas = document.createElement('canvas')
      canvas.setAttribute('aria-hidden', 'true')
      paintPreview(canvas, id)
      const label = document.createElement('span')
      label.textContent = String(i + 1).padStart(2, '0') + ' / ' + BIOMES[id].name[lang()]
      button.append(canvas, label)
      button.addEventListener('click', () => {
        selected = id
        drawMenu()
        $('biome-map')
          .querySelector('[data-biome="' + id + '"]')
          .focus()
      })
      return button
    }),
  )
  settings()
}
function clearInput() {
  input.keys.clear()
  input.direction = 0
  input.mode = 'none'
  input.targetY = null
  input.burst = false
}
function currentCtrl() {
  const ctrl = {}
  if (input.mode === 'pointer' && input.targetY != null) ctrl.targetY = input.targetY
  if (input.mode === 'key') ctrl.keyDir = input.direction
  if (input.burst) {
    ctrl.burst = true
    input.burst = false
  }
  return ctrl
}
function setView(next, focus) {
  view = next
  clearInput()
  for (const [id, v] of [
    ['menu', 'menu'],
    ['paused', 'pause'],
    ['over', 'result'],
    ['board', 'board'],
  ])
    $(id).hidden = next !== v
  const playing = next === 'play'
  $('hud').hidden = !playing
  $('play-controls').hidden = !playing
  $('portrait-tip').hidden = !playing
  $('ocean-preview').hidden = next !== 'menu'
  $('stage').hidden = next === 'menu'
  if (playing) fitPlayArea()
  const modal = ['pause', 'result', 'board'].includes(next)
  document.querySelector('.topbar').inert = modal
  document.querySelector('.bar').inert = modal
  for (const id of ['menu', 'hud', 'play-controls']) $(id).inert = modal
  if (next !== 'play') $('toast').hidden = true
  if (focus) $(focus).focus({ preventScroll: true })
}

function fitPlayArea() {
  if (view !== 'play') return
  const wrap = $('stage-wrap').getBoundingClientRect()
  const hud = $('hud').getBoundingClientRect()
  const controls = $('play-controls').getBoundingClientRect()
  const top = Math.max(0, hud.bottom - wrap.top + 10) + 'px'
  const bottom = Math.max(0, wrap.bottom - controls.top + 10) + 'px'
  if ($('stage').style.top !== top || $('stage').style.bottom !== bottom) {
    $('stage').style.top = top
    $('stage').style.bottom = bottom
    game?.scale.refresh()
  }
}
const playLayout = new ResizeObserver(() => requestAnimationFrame(fitPlayArea))
for (const id of ['stage-wrap', 'hud', 'play-controls']) playLayout.observe($(id))

function pause() {
  if (view === 'play' && state?.phase === 'running') {
    setView('pause', 'resume')
    audio.context?.suspend()
  }
}
function resume() {
  setView('play', 'pause-button')
  if (soundWanted) audio.setEnabled(true)
}
function toast(key) {
  $('toast').textContent = t(key)
  $('toast').hidden = false
  toastUntil = (state?.tMs || 0) + 3200
}
function updateHud(s) {
  const pct = Math.round(s.stamina)
  $('hud-stamina-fill').style.width = pct + '%'
  $('hud-stamina-fill').classList.toggle('low', pct <= 25)
  $('hud-stamina').setAttribute('aria-valuenow', String(pct))
  $('hud-energy-value').textContent = String(pct)
  $('hud-lives').textContent =
    '♥'.repeat(Math.max(0, s.lives)) + '·'.repeat(3 - Math.max(0, s.lives))
  $('hud-lives').setAttribute('aria-label', t('lives') + ': ' + Math.max(0, s.lives) + '/3')
  $('hud-dist').textContent = Math.floor(s.d / 40) + ' m'
  $('course-progress-fill').style.width = Math.min(100, (s.d / s.lengthLu) * 100) + '%'
  $('burst').disabled = s.stamina < BAL.BURST_COST || s.tMs < s.burstReadyMs
  if (s.stamina < 25 && !announcedLow) {
    toast('lowEnergy')
    announcedLow = true
  }
  if (s.stamina > 45) announcedLow = false
  if (s.tMs > toastUntil) $('toast').hidden = true
}
function onEvents(events) {
  for (const event of events) {
    audio.play(event.type)
    if (event.type === 'life-lost') toast('hit')
    if (event.type === 'debris-enter') toast('net')
  }
}
async function api(url, options = {}) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || String(response.status))
    return body
  } finally {
    clearTimeout(timer)
  }
}
async function start() {
  if (busy) return
  busy = true
  $('start').disabled = true
  $('start-error').hidden = true
  $('start').querySelector('[data-i18n]').textContent = t('loading')
  ticket = null
  try {
    // Audio activation must happen in the user's gesture, before awaiting the network.
    if (soundWanted) await audio.setEnabled(true)
    ticket = mode === 'weekly' ? await api('/api/leaderboard/start?game=seal-run') : null
    if (ticket && (ticket.rulesVersion !== RULES_VERSION || typeof ticket.courseSeed !== 'string'))
      throw new Error('rules')
    rounds = []
    chapter = 0
    submitted = false
    await beginRound()
  } catch {
    setView('menu', 'start')
    $('start-error').textContent = t(mode === 'weekly' && !ticket ? 'startError' : 'loadError')
    $('start-error').hidden = false
  } finally {
    busy = false
    $('start').disabled = false
    $('start').querySelector('[data-i18n]').textContent = t('play')
  }
}
async function beginRound() {
  const biome =
    mode === 'weekly'
      ? EXPEDITION[chapter]
      : BIOME_IDS[(BIOME_IDS.indexOf(selected) + chapter) % MAX_ROUNDS]
  course =
    mode === 'weekly'
      ? generateRound(ticket.courseSeed, chapter)
      : {
          ...generateCourse(seed + ':' + chapter, biome),
          speedMultiplier: roundSpeed(chapter) * ($('gentle').checked ? 0.8 : 1),
        }
  await loadOcean(biome)
  state = createSim(course)
  announcedLow = false
  const Phaser = (await import('./vendor/phaser.esm.js')).default
  const Play = createPlayScene(Phaser, {
    state,
    course,
    currentCtrl,
    updateHud,
    onEvents,
    onEnd: finish,
    isPaused: () => view !== 'play',
    isReduced,
  })
  document.documentElement.style.setProperty('--accent', BIOMES[biome].accent)
  $('hud-chapter').textContent = t('chapter') + ' ' + (chapter + 1) + ' / ' + MAX_ROUNDS
  $('hud-location').textContent = BIOMES[biome].name[lang()]
  setView('play', 'pause-button')
  if (!game) {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: $('stage'),
      width: FIELD_W,
      height: WORLD_H,
      backgroundColor: BIOMES[biome].floor,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [Play],
      audio: { noAudio: true },
    })
  } else {
    game.scene.stop('play')
    game.scene.remove('play')
    game.scene.add('play', Play, true)
    game.scale.refresh()
  }
  updateHud(state)
  toast('firstMove')
  registerOffline()
}
function finish(s) {
  if (view !== 'play' && view !== 'pause') return
  rounds.push(getResult(s))
  setView('result')
  renderResult()
  if ($('next-round').hidden) $('restart').focus()
  else $('next-round').focus()
}
function renderResult() {
  const last = rounds.at(-1)
  if (!last) return
  const won = last.phase === 'finished',
    all = won && chapter === MAX_ROUNDS - 1
  $('result-kicker').textContent =
    t(won ? 'chapterDone' : 'chapter') + ' ' + (chapter + 1) + ' / ' + MAX_ROUNDS
  $('over-title').textContent = t(all ? 'expeditionDone' : won ? 'finish' : 'ended')
  $('result-hint').textContent = t(won ? 'nextHint' : 'endedHint')
  $('r-score').textContent = number(total('score'))
  $('r-dist').textContent = number(total('distanceM')) + ' m'
  $('r-fish').textContent = number(total('fishCollected'))
  $('r-levels').textContent = levels() + ' / ' + MAX_ROUNDS
  $('r-lives').textContent = last.livesRemaining + ' / 3'
  $('result-mode').textContent =
    mode === 'weekly' ? t('weekly') + ' · ' + renderName(ticket.parts, lang()) : t('practiceResult')
  $('next-round').hidden = !won || all || submitted
  $('submit-score').hidden = mode !== 'weekly' || submitted
  $('submit-status').textContent = ''
}
async function submit() {
  if (busy || submitted || !ticket) return
  if (rounds.some((r) => r.durationMs < 3000)) {
    $('submit-status').textContent = t('shortSwim')
    return
  }
  busy = true
  $('submit-score').disabled = true
  $('next-round').disabled = true
  $('restart').disabled = true
  $('back-map').disabled = true
  $('submit-status').textContent = t('submitting')
  try {
    const result = await api('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game: 'seal-run',
        token: ticket.token,
        seed: ticket.seed,
        score: total('score'),
        durationMs: total('durationMs'),
        rounds: rounds.map((r) => ({
          distanceM: r.distanceM,
          fishCollected: r.fishCollected,
          fishPoints: r.fishPoints,
          livesRemaining: r.livesRemaining,
          durationMs: r.durationMs,
        })),
      }),
    })
    submitted = true
    $('submit-score').hidden = true
    $('next-round').hidden = true
    $('submit-status').textContent =
      t('saved') +
      ' ' +
      t('rank') +
      ': ' +
      result.rank +
      '. ' +
      t('best') +
      ': ' +
      number(result.score)
  } catch (error) {
    const key =
      error.message === 'token_used'
        ? 'usedToken'
        : error.message === 'token_age'
          ? 'expired'
          : 'submitError'
    if (key === 'usedToken') {
      submitted = true
      $('submit-score').hidden = true
      $('next-round').hidden = true
    }
    $('submit-status').textContent = t(key)
  } finally {
    busy = false
    for (const id of ['submit-score', 'next-round', 'restart', 'back-map']) $(id).disabled = false
  }
}
async function readBoard() {
  const request = ++boardRequest
  $('board-status').textContent = t('boardLoading')
  $('board-table').hidden = true
  $('personal-best').textContent = ''
  $('board-prev').disabled = true
  $('board-next').disabled = true
  try {
    const result = await api('/api/leaderboard?game=seal-run&page=' + boardPage + '&limit=20')
    if (request !== boardRequest || view !== 'board') return
    $('board-season').textContent = result.season
    $('board-status').textContent = result.top.length ? '' : t('boardEmpty')
    $('board-table').hidden = !result.top.length
    $('board-rows').replaceChildren(
      ...result.top.map((row) => {
        const tr = document.createElement('tr'),
          name = renderName(row.parts, lang()) || row.alias
        for (const value of [
          row.rank,
          name + (row.suffix >= 2 ? ' ' + row.suffix : ''),
          number(row.score),
          row.levelsCompleted ?? '—',
        ]) {
          const td = document.createElement('td')
          td.textContent = String(value)
          tr.append(td)
        }
        return tr
      }),
    )
    if (result.personalBest != null)
      $('personal-best').textContent = t('best') + ': ' + number(result.personalBest)
    $('board-prev').disabled = boardPage <= 1
    $('board-next').disabled = !result.hasMore
  } catch {
    if (request === boardRequest) $('board-status').textContent = t('boardError')
  }
}
function home() {
  if (busy) return
  game?.scene.stop('play')
  state = null
  course = null
  setView('menu', 'start')
  drawMenu()
}
$('start').addEventListener('click', start)
$('restart').addEventListener('click', start)
$('next-round').addEventListener('click', async () => {
  if (busy) return
  busy = true
  $('next-round').disabled = true
  try {
    chapter++
    await beginRound()
  } catch {
    chapter--
    setView('result')
    $('submit-status').textContent = t('startError')
  } finally {
    busy = false
    $('next-round').disabled = false
  }
})
$('submit-score').addEventListener('click', submit)
$('back-map').addEventListener('click', home)
$('brand').addEventListener('click', (e) => {
  e.preventDefault()
  if (view === 'play') pause()
  else home()
})
$('mode-explore').addEventListener('click', () => {
  mode = 'explore'
  $('start-error').hidden = true
  drawMenu()
})
$('mode-weekly').addEventListener('click', () => {
  mode = 'weekly'
  $('start-error').hidden = true
  selected = 'coastal'
  drawMenu()
})
$('regenerate').addEventListener('click', () => {
  seed = randomSeed()
  drawMenu()
})
$('pause-button').addEventListener('click', pause)
$('resume').addEventListener('click', resume)
$('end-swim').addEventListener('click', () => {
  if (!state) return
  state.phase = 'dead'
  finish(state)
})
$('burst').addEventListener('click', () => {
  if (view === 'play') input.burst = true
})
$('sound').addEventListener('click', async () => {
  soundWanted = !soundWanted
  await audio.setEnabled(soundWanted)
  savePreference('seal_run_sound', String(soundWanted))
  settings()
  if (soundWanted) audio.play('fish')
})
$('motion').addEventListener('click', () => {
  reduced = String(!isReduced())
  savePreference('seal_run_motion', reduced)
  settings()
})
motionQuery.addEventListener('change', settings)
document
  .querySelectorAll('[data-lang]')
  .forEach((button) =>
    button.addEventListener('click', () => setLanguage(button.dataset.lang, true)),
  )
document.addEventListener('sealrun:language', () => {
  drawMenu()
  if (view === 'result') renderResult()
  if (view === 'board') readBoard()
  if (course) $('hud-location').textContent = BIOMES[course.biome].name[lang()]
})
$('fs').hidden = !document.documentElement.requestFullscreen
$('fs').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  else
    $('app')
      .requestFullscreen?.()
      .catch(() => {})
})
$('board-open').addEventListener('click', () => {
  previousView = view === 'play' ? 'pause' : view
  boardReturnFocus = document.activeElement
  setView('board', 'board-close')
  boardPage = 1
  readBoard()
})
function closeBoard() {
  boardRequest++
  setView(previousView, previousView === 'pause' ? 'resume' : undefined)
  if (previousView !== 'pause') boardReturnFocus?.focus()
}
$('board-close').addEventListener('click', closeBoard)
$('board-prev').addEventListener('click', () => {
  boardPage--
  readBoard()
})
$('board-next').addEventListener('click', () => {
  boardPage++
  readBoard()
})
$('board-retry').addEventListener('click', readBoard)
const dirs = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 }
window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab' && ['pause', 'result', 'board'].includes(view)) {
    const box = $(view === 'pause' ? 'paused' : view === 'result' ? 'over' : 'board')
    const items = [...box.querySelectorAll('button,a[href],input')].filter(
      (el) => !el.disabled && !el.hidden && el.getClientRects().length,
    )
    const first = items[0],
      last = items.at(-1)
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last?.focus()
    }
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first?.focus()
    }
    return
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (view === 'play') {
      e.preventDefault()
      pause()
    } else if (view === 'pause') {
      e.preventDefault()
      resume()
    } else if (view === 'board' && e.code === 'Escape') closeBoard()
    return
  }
  if (view !== 'play') return
  if (e.code in dirs) {
    e.preventDefault()
    input.mode = 'key'
    input.keys.add(e.code)
    input.direction = Math.sign([...input.keys].reduce((sum, key) => sum + dirs[key], 0))
  }
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault()
    input.burst = true
  }
})
window.addEventListener('keyup', (e) => {
  if (e.code in dirs) {
    input.keys.delete(e.code)
    input.direction = Math.sign([...input.keys].reduce((sum, key) => sum + dirs[key], 0))
  }
})
function pointer(e) {
  if (view !== 'play' || (e.type === 'pointermove' && e.pointerType !== 'mouse' && !e.buttons))
    return
  const canvas = $('stage').querySelector('canvas')
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  if (!rect.height) return
  input.mode = 'pointer'
  input.targetY = ((e.clientY - rect.top) / rect.height) * WORLD_H
  if (e.type === 'pointerdown') {
    e.preventDefault()
    $('stage').setPointerCapture(e.pointerId)
  }
}
$('stage').addEventListener('pointerdown', pointer)
$('stage').addEventListener('pointermove', pointer)
for (const [id, direction] of [
  ['swim-up', -1],
  ['swim-down', 1],
]) {
  $(id).addEventListener('pointerdown', (e) => {
    if (view !== 'play') return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    input.mode = 'key'
    input.direction = direction
  })
  $(id).addEventListener('pointerup', clearInput)
  $(id).addEventListener('lostpointercapture', clearInput)
}
window.addEventListener('pointercancel', clearInput)
window.addEventListener('blur', () => {
  clearInput()
  pause()
})
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause()
})
for (const id of ['paused', 'over', 'board']) {
  $(id).setAttribute('role', 'dialog')
  $(id).setAttribute('aria-modal', 'true')
}

let offlineStarted = false
async function registerOffline() {
  if (offlineStarted || !('serviceWorker' in navigator)) return
  offlineStarted = true
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' })
    const ready = () => {
      $('offline-ready').textContent = t('readyOffline')
    }
    if (registration.active) ready()
    else
      registration.installing?.addEventListener('statechange', () => {
        if (registration.active) ready()
      })
  } catch {
    /* Practice remains playable online; no score outbox. */
  }
}
// Read-only copies for regression tooling; no control hook can mutate the live simulation.
window.SealRun = {
  get state() {
    return state ? structuredClone(state) : null
  },
  get course() {
    return course ? structuredClone(course) : null
  },
  get seedStr() {
    return seed
  },
  get hash() {
    return course ? courseHash(course) : null
  },
  get view() {
    return view
  },
}
drawMenu()
setView('menu')

function readyInterface() {
  $('app').inert = false
  $('app').removeAttribute('aria-busy')
  $('boot-status')?.remove()
  $('start').disabled = false
}
const standalone = (() => {
  try {
    return self === top
  } catch {
    return false
  }
})()
if (standalone) {
  document.body.classList.add('cfg-pending')
  $('start').disabled = true
  api('/api/game-config?game=seal-run')
    .then(async (config) => {
      if (config.standalone !== false) return
      window.__placeholder = true
      document.body.classList.add('placeholder')
      const { paintPlaceholderBackdrop } = await import('./render/art.js')
      paintPlaceholderBackdrop($('coming-soon-bg'))
      $('coming-soon').hidden = false
    })
    .catch(() => {})
    .finally(() => {
      document.body.classList.remove('cfg-pending')
      readyInterface()
    })
} else readyInterface()
