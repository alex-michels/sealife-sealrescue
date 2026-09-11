// render/art.js — shared procedural fish, debris and skerry-cap textures (SR-06/SR-21).
// Draw once to offscreen Canvas at 2×, then reuse Phaser textures across chapters.
// Generated animals and boats are registered by hazards.js; expedition.js owns the
// current chapter's procedural seal/rock. Legacy background helpers below are only
// retained where used as fallbacks. No gameplay RNG or simulation logic lives here.
import { BRAND, WATER, ENTITY, TEXTURES, DEPTH_FADE, mix, rgba } from '../core/theme.js'
import { FIELD_W, WORLD_H } from '../core/balance.js'

const SCALE = 2 // спрайты: канвас 2× логического размера

function spriteCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w * SCALE
  c.height = h * SCALE
  const ctx = c.getContext('2d')
  ctx.scale(SCALE, SCALE)
  return [c, ctx]
}

function vGrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  for (const [t, col] of stops) g.addColorStop(t, col)
  return g
}

// ————————————————————————————— Рыба ————————————————————————————————————————
function drawFishSmall(ctx, w, h) {
  const E = ENTITY.fish_small
  ctx.fillStyle = E.back
  ctx.beginPath() // хвост слева
  ctx.moveTo(1, h / 2)
  ctx.lineTo(9, h * 0.15)
  ctx.lineTo(9, h * 0.85)
  ctx.closePath()
  ctx.fill()
  const body = new Path2D()
  body.ellipse(w * 0.6, h / 2, w * 0.36, h * 0.42, 0, 0, Math.PI * 2)
  ctx.fillStyle = vGrad(ctx, 0, h, [
    [0, E.back],
    [0.55, E.body],
    [1, E.belly],
  ])
  ctx.fill(body)
  ctx.strokeStyle = '#ecf5d9'
  ctx.lineWidth = 1.15
  ctx.stroke(body)
  ctx.fillStyle = E.eye
  ctx.beginPath()
  ctx.arc(w * 0.74, h * 0.42, 1.6, 0, Math.PI * 2)
  ctx.fill()
}

function drawFishRare(ctx, w, h) {
  const E = ENTITY.fish_rare
  ctx.fillStyle = E.glow // ореол приза
  ctx.beginPath()
  ctx.arc(w * 0.58, h / 2, h * 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = E.back
  ctx.beginPath()
  ctx.moveTo(1, h / 2)
  ctx.lineTo(11, h * 0.12)
  ctx.lineTo(11, h * 0.88)
  ctx.closePath()
  ctx.fill()
  const body = new Path2D()
  body.ellipse(w * 0.6, h / 2, w * 0.32, h * 0.36, 0, 0, Math.PI * 2)
  ctx.fillStyle = vGrad(ctx, h * 0.14, h * 0.86, [
    [0, E.back],
    [0.5, E.body],
    [1, E.belly],
  ])
  ctx.fill(body)
  ctx.strokeStyle = '#ecf5d9'
  ctx.lineWidth = 1.15
  ctx.stroke(body)
  ctx.fillStyle = E.eye
  ctx.beginPath()
  ctx.arc(w * 0.72, h * 0.42, 1.8, 0, Math.PI * 2)
  ctx.fill()
}

// Сухая макушка кекура (band-0 камни пробивают линию воды): гранит pebble-тонов
// + пенная юбка. Оверлей БЕЗ хитбокса — чистый декор поверх камня.
function drawSkerryCap(ctx, w, h) {
  const E = ENTITY.skerry
  const dome = new Path2D()
  dome.moveTo(4, h - 8)
  dome.quadraticCurveTo(w * 0.16, 6, w * 0.45, 3)
  dome.quadraticCurveTo(w * 0.78, 2, w - 4, h - 8)
  dome.closePath()
  ctx.fillStyle = vGrad(ctx, 0, h, [
    [0, E.lit],
    [1, E.dry],
  ])
  ctx.fill(dome)
  ctx.save()
  ctx.clip(dome)
  ctx.fillStyle = rgba('#6E675C', 0.5)
  for (const [x, y] of [
    [w * 0.3, h * 0.5],
    [w * 0.55, h * 0.35],
    [w * 0.7, h * 0.6],
  ]) {
    ctx.beginPath()
    ctx.ellipse(x, y, 4, 2.4, 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  // Пенная юбка по ватерлинии
  ctx.fillStyle = E.foam
  for (let x = 2; x < w - 2; x += 14) {
    ctx.beginPath()
    ctx.ellipse(x + 7, h - 7, 8, 4, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ————————————————————————————— Антропогенный мусор —————————————————————————
function drawGhostNet(ctx, w, h) {
  const E = ENTITY.ghost_net
  ctx.strokeStyle = E.line
  ctx.lineWidth = 1.6
  for (let x = 8; x <= w - 8; x += 20) {
    ctx.beginPath()
    ctx.moveTo(x, 4)
    ctx.quadraticCurveTo(x + 7, h * 0.5, x, h - 4) // провисшие вертикали
    ctx.stroke()
  }
  for (let y = 14; y <= h - 6; y += 24) {
    ctx.beginPath()
    ctx.moveTo(4, y)
    ctx.quadraticCurveTo(w * 0.5, y + 9, w - 4, y) // провисшие горизонтали
    ctx.stroke()
  }
  // Обрывки снизу
  for (const x of [w * 0.22, w * 0.6, w * 0.85]) {
    ctx.beginPath()
    ctx.moveTo(x, h - 5)
    ctx.quadraticCurveTo(x - 5, h + 1, x - 3, h - 1)
    ctx.stroke()
  }
  // Поплавки — buoy: честный сигнальный акцент опасности
  for (const x of [w * 0.19, w * 0.5, w * 0.81]) {
    ctx.fillStyle = E.float
    ctx.beginPath()
    ctx.arc(x, 9, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = E.floatRim
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function drawPlasticCluster(ctx, w, h) {
  const E = ENTITY.plastic_cluster
  // Бутылка (полупрозрачная, крышка buoy)
  ctx.save()
  ctx.translate(w * 0.26, h * 0.52)
  ctx.rotate(-0.35)
  ctx.fillStyle = E.bottle
  ctx.beginPath()
  ctx.roundRect(-14, -30, 28, 58, 8)
  ctx.fill()
  ctx.fillStyle = rgba('#FFFFFF', 0.35)
  ctx.fillRect(-8, -24, 6, 44)
  ctx.fillStyle = E.cap
  ctx.beginPath()
  ctx.roundRect(-7, -38, 14, 9, 3)
  ctx.fill()
  ctx.restore()

  // Пакет-«призрак» с волнистым низом
  ctx.fillStyle = E.bag
  ctx.beginPath()
  ctx.moveTo(w * 0.52, h * 0.18)
  ctx.quadraticCurveTo(w * 0.9, h * 0.1, w * 0.92, h * 0.5)
  ctx.quadraticCurveTo(w * 0.94, h * 0.78, w * 0.8, h * 0.72)
  ctx.quadraticCurveTo(w * 0.72, h * 0.9, w * 0.62, h * 0.76)
  ctx.quadraticCurveTo(w * 0.52, h * 0.86, w * 0.5, h * 0.6)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = E.fold
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(w * 0.6, h * 0.24)
  ctx.quadraticCurveTo(w * 0.66, h * 0.5, w * 0.62, h * 0.72)
  ctx.moveTo(w * 0.74, h * 0.2)
  ctx.quadraticCurveTo(w * 0.8, h * 0.46, w * 0.78, h * 0.68)
  ctx.stroke()

  // Осколки
  ctx.fillStyle = E.shard
  for (const [x, y, s, a] of [
    [w * 0.44, h * 0.85, 8, 0.4],
    [w * 0.14, h * 0.16, 7, -0.5],
    [w * 0.6, h * 0.06, 6, 0.2],
  ]) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a)
    ctx.beginPath()
    ctx.moveTo(-s, s * 0.6)
    ctx.lineTo(0, -s)
    ctx.lineTo(s, s * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

// ————————————————————————————— Фон: вода, слои параллакса, пена ——————————————
// Статичный градиент толщи + запечённые лучи света (без анимации — RM-safe).
function drawWaterBackdrop(ctx, w, h) {
  ctx.fillStyle = vGrad(ctx, 0, h, [
    [0, mix(WATER.surface, BRAND.FOG, 0.3)], // подсвеченный слой под поверхностью
    [0.1, WATER.surface],
    [0.45, WATER.mid],
    [0.8, WATER.deep],
    [1, WATER.floor],
  ])
  ctx.fillRect(0, 0, w, h)
  // Лучи
  ctx.fillStyle = rgba(BRAND.FOG, 0.045)
  for (const [x, wTop, wBot, len] of [
    [150, 26, 90, 360],
    [430, 40, 130, 420],
    [720, 22, 80, 330],
  ]) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + wTop, 0)
    ctx.lineTo(x + wBot + 60, len)
    ctx.lineTo(x + 60, len)
    ctx.closePath()
    ctx.fill()
  }
  // Придонная дымка
  ctx.fillStyle = vGrad(ctx, h - 90, h, [
    [0, 'rgba(11,40,50,0)'],
    [1, 'rgba(11,40,50,0.55)'],
  ])
  ctx.fillRect(0, h - 90, w, 90)
}

// Дальний слой: кекуры-столбы (часть достаёт до поверхности — тема «квази-суши» и в
// параллаксе), донные скалы, силуэты ламинарии. Всё примешано к воде (DEPTH_FADE.far).
function drawFarLayer(ctx, w, h) {
  const fade = (c) => mix(c, WATER.deep, DEPTH_FADE.far)
  const rock = fade(ENTITY.rock.base)
  // Донные округлые стеки
  for (const [x, rw, rh] of [
    [90, 150, 210],
    [360, 220, 150],
    [700, 170, 260],
    [1050, 200, 180],
  ]) {
    ctx.fillStyle = rock
    ctx.beginPath()
    ctx.moveTo(x - rw / 2, h)
    ctx.quadraticCurveTo(x - rw / 2 + 8, h - rh * 0.8, x - rw * 0.12, h - rh)
    ctx.quadraticCurveTo(x + rw * 0.3, h - rh - 14, x + rw / 2, h - rh * 0.45)
    ctx.lineTo(x + rw / 2, h)
    ctx.closePath()
    ctx.fill()
  }
  // Столбы до поверхности (пробивают линию воды за кадром). Вертикальный градиент —
  // у поверхности столб тает в светлой воде (иначе тёмная плита на светлом фоне).
  for (const [x, tw] of [
    [540, 90],
    [1180, 70],
  ]) {
    ctx.fillStyle = vGrad(ctx, 0, h * 0.62, [
      [0, mix(rock, WATER.surface, 0.62)],
      [0.5, mix(rock, WATER.surface, 0.25)],
      [1, rock],
    ])
    ctx.beginPath()
    ctx.moveTo(x - tw / 2, 0)
    ctx.quadraticCurveTo(x - tw / 2 - 12, h * 0.35, x - tw * 0.2, h * 0.62)
    ctx.lineTo(x + tw * 0.3, h * 0.62)
    ctx.quadraticCurveTo(x + tw / 2 + 10, h * 0.3, x + tw / 2, 0)
    ctx.closePath()
    ctx.fill()
  }
  // Силуэты ламинарии
  ctx.lineWidth = 5
  for (const [x, tall, ci] of [
    [240, 170, 0],
    [265, 120, 1],
    [880, 200, 0],
    [910, 140, 2],
  ]) {
    ctx.strokeStyle = fade(ENTITY.kelp[ci])
    ctx.beginPath()
    ctx.moveTo(x, h)
    ctx.quadraticCurveTo(x + 18, h - tall * 0.55, x - 8, h - tall)
    ctx.stroke()
  }
}

// ————————————————————————————— Сборка ———————————————————————————————————————
/**
 * Регистрирует все текстуры игры в TextureManager сцены. Идемпотентно
 * (scene.restart() не перегенерирует). Ключи — контракт core/theme.js TEXTURES.
 */
export function buildTextures(scene) {
  if (scene.textures.exists('fish_small')) return

  const addSprite = (key, w, h, draw) => {
    const [c, ctx] = spriteCanvas(w, h)
    draw(ctx, w, h)
    scene.textures.addCanvas(key, c)
  }

  const T = TEXTURES
  addSprite('fish_small', T.fish_small.w, T.fish_small.h, drawFishSmall)
  addSprite('fish_rare', T.fish_rare.w, T.fish_rare.h, drawFishRare)
  addSprite('skerry_cap', T.skerry_cap.w, T.skerry_cap.h, drawSkerryCap)
  addSprite('ghost_net', T.ghost_net.w, T.ghost_net.h, drawGhostNet)
  addSprite('plastic_cluster', T.plastic_cluster.w, T.plastic_cluster.h, drawPlasticCluster)
}

/**
 * Статичный фон для standalone-заглушки «Coming soon» (SH-14): толща воды + дальние
 * силуэты скал/ламинарии. Без тюленя, хищников и рыбы, без Phaser и без анимации
 * (RM-safe). Рисует прямо в переданный canvas (game.js растягивает его CSS'ом).
 */
export function paintPlaceholderBackdrop(canvas) {
  canvas.width = FIELD_W
  canvas.height = WORLD_H
  const ctx = canvas.getContext('2d')
  drawWaterBackdrop(ctx, FIELD_W, WORLD_H)
  drawFarLayer(ctx, FIELD_W, WORLD_H)
}
