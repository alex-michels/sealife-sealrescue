// render/art.js — процедурные Canvas2D-текстуры Seal Run (SR-06).
//
// Пайплайн (решение SR-06): НЕ бинарный атлас в репо, а рисование оффскрин-канвасами при
// создании сцены + scene.textures.addCanvas — арт диффабелен, тонируется из core/theme.js
// (бренд-токены), git без blob'ов. Прецедент — render/scenery.js Seal Hunter (Canvas2D);
// здесь те же приёмы (градиенты контршейдинга, quadraticCurveTo-силуэты), но на выходе
// текстуры Phaser, а не прямой рендер в кадр.
//
// Спрайты рисуются в 2× (чёткость при апскейле Scale.FIT), фоновые тайлы — в 1×
// (мягкие градиенты, резкость не нужна). game.js задаёт логический размер setDisplaySize.
//
// ТОЛЬКО декор: никакой логики/RNG-геймплея здесь нет (Math.random допустим лишь в
// стат. раскладке фоновых тайлов — она фиксируется при генерации текстуры, спека §1.3).

import {
  BRAND, WATER, SEAL, ENTITY, TEXTURES, PARALLAX, DEPTH_FADE, mix, rgba,
} from '../core/theme.js';
import { FIELD_W, WORLD_H } from '../core/balance.js';

const SCALE = 2; // спрайты: канвас 2× логического размера

function spriteCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w * SCALE;
  c.height = h * SCALE;
  const ctx = c.getContext('2d');
  ctx.scale(SCALE, SCALE);
  return [c, ctx];
}

function tileCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function vGrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, col] of stops) g.addColorStop(t, col);
  return g;
}

// ————————————————————————————— Тюлень Уэдделла —————————————————————————————
// Профиль вправо; БЕЗ ушных раковин; серебристый вертикальный градиент (спина→брюхо),
// крап по спине, большой глаз, «улыбка», усы. Два кадра: задние ласты вверх/вниз
// (гребок) — структура кадров = задел под будущие анимации (галумпинг v2).
function drawSeal(ctx, w, h, frame) {
  const flip = frame === 0 ? -1 : 1;

  // Задние ласты (хвостовой веер) — за телом, крупные: главный «двигатель» тюленя
  ctx.save();
  ctx.translate(12, h * 0.5);
  ctx.rotate(flip * 0.26);
  const lobe = (ry, dy) => {
    ctx.beginPath();
    ctx.moveTo(9, dy);
    ctx.quadraticCurveTo(-10, dy - ry, -12, dy - ry * 0.25);
    ctx.quadraticCurveTo(-7, dy + ry * 0.7, 9, dy + 2);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = mix(SEAL.body, SEAL.back, 0.35);
  lobe(14, -7);
  ctx.fillStyle = SEAL.body;
  lobe(14, 7);
  ctx.restore();

  // Тело-торпеда: нос справа, самая толстая точка — за головой, к хвосту длинный конус
  const body = new Path2D();
  body.moveTo(8, h * 0.5);
  body.quadraticCurveTo(30, 13, 54, 10);
  body.quadraticCurveTo(76, 8, 88, 16); // покатый лоб (маленькая голова, без ушей)
  body.quadraticCurveTo(w - 2, 24, w - 3, h * 0.54); // морда
  body.quadraticCurveTo(90, h - 10, 60, h - 9); // брюхо
  body.quadraticCurveTo(28, h - 10, 8, h * 0.5); // длинный хвостовой конус
  body.closePath();

  ctx.fillStyle = vGrad(ctx, 4, h - 4, [
    [0, SEAL.back],
    [0.42, SEAL.body],
    [0.78, SEAL.belly],
    [1, SEAL.belly],
  ]);
  ctx.fill(body);

  // Крап — только внутри тела
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = SEAL.spot;
  const spots = [
    [30, 14, 4, 2.4], [46, 11, 3.2, 2], [62, 13, 4.4, 2.6], [76, 18, 3, 2],
    [38, 22, 2.6, 1.8], [56, 21, 3.4, 2.2], [70, 26, 2.4, 1.6],
  ];
  for (const [x, y, rx, ry] of spots) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Контровой блик по спине
  ctx.strokeStyle = SEAL.rim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 12);
  ctx.quadraticCurveTo(60, 4, 84, 14);
  ctx.stroke();
  ctx.restore();

  // Передний ласт (гребок в противофазе хвосту)
  ctx.save();
  ctx.translate(56, h * 0.72);
  ctx.rotate(flip * -0.18 + 0.5);
  ctx.fillStyle = mix(SEAL.body, SEAL.back, 0.3);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14, 2, 18, 12);
  ctx.quadraticCurveTo(8, 14, 0, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Морда: глаз (большой, с бликом), нос, улыбка, усы
  ctx.fillStyle = SEAL.eye;
  ctx.beginPath();
  ctx.arc(79, 22, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SEAL.eyeShine;
  ctx.beginPath();
  ctx.arc(80.6, 20.4, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SEAL.nose;
  ctx.beginPath();
  ctx.ellipse(w - 6, 27, 3, 2.2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = SEAL.mouth;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(w - 7, 31);
  ctx.quadraticCurveTo(w - 16, 35, w - 24, 31); // уголок вверх — «улыбка» Уэдделла
  ctx.stroke();
  ctx.strokeStyle = SEAL.whisker;
  ctx.lineWidth = 1;
  for (const [dx, dy] of [[10, -1], [11, 2], [10, 5]]) {
    ctx.beginPath();
    ctx.moveTo(w - 14, 30);
    ctx.quadraticCurveTo(w - 14 + dx * 0.6, 30 + dy * 0.6, w - 14 + dx, 30 + dy);
    ctx.stroke();
  }
}

// ————————————————————————————— Хищники (нос ВЛЕВО — навстречу тюленю) ———————
function drawOrca(ctx, w, h) {
  const E = ENTITY.orca;
  const cy = h * 0.6; // центр тела = origin (спинной плавник выше)

  // Хвостовые лопасти справа
  ctx.fillStyle = E.body;
  ctx.beginPath();
  ctx.moveTo(w - 34, cy);
  ctx.quadraticCurveTo(w - 6, cy - 26, w - 2, cy - 34);
  ctx.quadraticCurveTo(w - 14, cy - 8, w - 8, cy);
  ctx.quadraticCurveTo(w - 14, cy + 8, w - 2, cy + 34);
  ctx.quadraticCurveTo(w - 6, cy + 26, w - 34, cy);
  ctx.closePath();
  ctx.fill();

  // Спинной плавник (высокий серп) — над телом
  ctx.beginPath();
  ctx.moveTo(78, cy - 40);
  ctx.quadraticCurveTo(88, 8, 97, 2);
  ctx.quadraticCurveTo(102, 26, 112, cy - 38);
  ctx.closePath();
  ctx.fill();

  // Тело (bodyH=92 накрывает хитбокс r=46)
  const body = new Path2D();
  body.moveTo(4, cy + 2);
  body.quadraticCurveTo(20, cy - 44, 70, cy - 46);
  body.quadraticCurveTo(120, cy - 46, 148, cy - 18);
  body.quadraticCurveTo(160, cy, 148, cy + 16);
  body.quadraticCurveTo(118, cy + 46, 66, cy + 44);
  body.quadraticCurveTo(20, cy + 40, 4, cy + 2);
  body.closePath();
  ctx.fill(body);

  ctx.save();
  ctx.clip(body);
  // Белое брюхо/подбородок
  ctx.fillStyle = E.belly;
  ctx.beginPath();
  ctx.moveTo(2, cy + 6);
  ctx.quadraticCurveTo(40, cy + 18, 80, cy + 30);
  ctx.quadraticCurveTo(120, cy + 42, 150, cy + 30);
  ctx.lineTo(150, cy + 60);
  ctx.lineTo(2, cy + 60);
  ctx.closePath();
  ctx.fill();
  // Седло за плавником
  ctx.fillStyle = E.saddle;
  ctx.beginPath();
  ctx.ellipse(118, cy - 30, 20, 9, 0.35, 0, Math.PI * 2);
  ctx.fill();
  // Глазное пятно
  ctx.fillStyle = E.patch;
  ctx.save();
  ctx.translate(40, cy - 16);
  ctx.rotate(-0.25);
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Линия пасти
  ctx.strokeStyle = E.jaw;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(6, cy + 4);
  ctx.quadraticCurveTo(26, cy + 12, 44, cy + 12);
  ctx.stroke();
  ctx.restore();

  // Глаз — тёмная точка у пятна
  ctx.fillStyle = BRAND.INK;
  ctx.beginPath();
  ctx.arc(28, cy - 6, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Грудной плавник
  ctx.fillStyle = E.body;
  ctx.save();
  ctx.translate(62, cy + 26);
  ctx.rotate(0.6);
  ctx.beginPath();
  ctx.ellipse(0, 0, 17, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShark(ctx, w, h, E, blunt) {
  const cy = h * (blunt ? 0.57 : 0.615);
  const ry = blunt ? 42 : 30;

  // Хвост-полумесяц справа (верхняя лопасть больше)
  ctx.fillStyle = E.back;
  ctx.beginPath();
  ctx.moveTo(w - 26, cy);
  ctx.quadraticCurveTo(w - 4, cy - ry * 0.9, w - 2, cy - ry * 1.1);
  ctx.quadraticCurveTo(w - 10, cy - 6, w - 4, cy + ry * 0.66);
  ctx.quadraticCurveTo(w - 8, cy + ry * 0.4, w - 26, cy);
  ctx.closePath();
  ctx.fill();

  // Спинной плавник
  ctx.beginPath();
  ctx.moveTo(w * 0.44, cy - ry + 4);
  ctx.quadraticCurveTo(w * 0.52, 2, w * 0.58, 0);
  ctx.quadraticCurveTo(w * 0.6, cy - ry * 0.9, w * 0.68, cy - ry + 6);
  ctx.closePath();
  ctx.fill();

  // Тело: нос слева (у большой акулы — тупее)
  const noseX = blunt ? 10 : 4;
  const body = new Path2D();
  body.moveTo(noseX, cy + (blunt ? 2 : 4));
  body.quadraticCurveTo(w * 0.2, cy - ry, w * 0.5, cy - ry);
  body.quadraticCurveTo(w * 0.82, cy - ry, w - 18, cy - 4);
  body.quadraticCurveTo(w - 24, cy + ry * 0.5, w * 0.62, cy + ry * 0.92);
  body.quadraticCurveTo(w * 0.28, cy + ry, noseX, cy + (blunt ? 2 : 4));
  body.closePath();

  ctx.fillStyle = vGrad(ctx, cy - ry, cy + ry, [
    [0, E.back],
    [0.55, E.body],
    [0.85, E.belly],
    [1, E.belly],
  ]);
  ctx.fill(body);

  ctx.save();
  ctx.clip(body);
  // Жаберные щели
  ctx.strokeStyle = rgba(BRAND.INK, 0.35);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.3 + i * 6, cy - ry * 0.35);
    ctx.quadraticCurveTo(w * 0.28 + i * 6, cy, w * 0.3 + i * 6, cy + ry * 0.3);
    ctx.stroke();
  }
  // Пасть — короткая дуга с двумя зубами
  ctx.strokeStyle = rgba(BRAND.INK, 0.55);
  ctx.beginPath();
  ctx.moveTo(noseX + 3, cy + ry * 0.34);
  ctx.quadraticCurveTo(noseX + 14, cy + ry * 0.52, noseX + 26, cy + ry * 0.5);
  ctx.stroke();
  ctx.fillStyle = BRAND.FOG;
  for (const dx of [8, 15]) {
    ctx.beginPath();
    ctx.moveTo(noseX + dx, cy + ry * 0.42);
    ctx.lineTo(noseX + dx + 3, cy + ry * 0.42);
    ctx.lineTo(noseX + dx + 1.5, cy + ry * 0.52);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Глаз
  ctx.fillStyle = E.eye;
  ctx.beginPath();
  ctx.arc(noseX + 16, cy - ry * 0.32, blunt ? 3 : 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Грудной плавник
  ctx.fillStyle = E.back;
  ctx.save();
  ctx.translate(w * 0.42, cy + ry * 0.62);
  ctx.rotate(0.7);
  ctx.beginPath();
  ctx.ellipse(0, 0, blunt ? 16 : 12, blunt ? 7 : 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ————————————————————————————— Рыба ————————————————————————————————————————
function drawFishSmall(ctx, w, h) {
  const E = ENTITY.fish_small;
  ctx.fillStyle = E.back;
  ctx.beginPath(); // хвост слева
  ctx.moveTo(1, h / 2);
  ctx.lineTo(9, h * 0.15);
  ctx.lineTo(9, h * 0.85);
  ctx.closePath();
  ctx.fill();
  const body = new Path2D();
  body.ellipse(w * 0.6, h / 2, w * 0.36, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = vGrad(ctx, 0, h, [[0, E.back], [0.55, E.body], [1, E.belly]]);
  ctx.fill(body);
  ctx.fillStyle = E.eye;
  ctx.beginPath();
  ctx.arc(w * 0.74, h * 0.42, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawFishRare(ctx, w, h) {
  const E = ENTITY.fish_rare;
  ctx.fillStyle = E.glow; // ореол приза
  ctx.beginPath();
  ctx.arc(w * 0.58, h / 2, h * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = E.back;
  ctx.beginPath();
  ctx.moveTo(1, h / 2);
  ctx.lineTo(11, h * 0.12);
  ctx.lineTo(11, h * 0.88);
  ctx.closePath();
  ctx.fill();
  const body = new Path2D();
  body.ellipse(w * 0.6, h / 2, w * 0.32, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fillStyle = vGrad(ctx, h * 0.14, h * 0.86, [[0, E.back], [0.5, E.body], [1, E.belly]]);
  ctx.fill(body);
  ctx.fillStyle = E.eye;
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.42, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

// ————————————————————————————— Камни и «квази-суша» ————————————————————————
// Камень тянется setDisplaySize под габарит хитбокса → силуэт почти full-bleed
// (углы ≤6 lu), чтобы визуал не был меньше прямоугольника коллизии.
function drawRock(ctx, w, h) {
  const E = ENTITY.rock;
  const body = new Path2D();
  body.moveTo(3, h);
  body.lineTo(0, h * 0.4);
  body.quadraticCurveTo(w * 0.08, h * 0.08, w * 0.3, h * 0.05);
  body.quadraticCurveTo(w * 0.55, -2, w * 0.75, h * 0.06);
  body.quadraticCurveTo(w, h * 0.12, w, h * 0.55);
  body.lineTo(w - 3, h);
  body.closePath();
  ctx.fillStyle = vGrad(ctx, 0, h, [[0, E.lit], [0.45, E.base], [1, E.dark]]);
  ctx.fill(body);

  ctx.save();
  ctx.clip(body);
  // Грань-блик слева-сверху
  ctx.fillStyle = rgba('#4A707C', 0.4);
  ctx.beginPath();
  ctx.moveTo(w * 0.06, h * 0.34);
  ctx.quadraticCurveTo(w * 0.2, h * 0.1, w * 0.44, h * 0.09);
  ctx.quadraticCurveTo(w * 0.3, h * 0.28, w * 0.2, h * 0.5);
  ctx.closePath();
  ctx.fill();
  // Трещины
  ctx.strokeStyle = rgba('#122B33', 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.55, h * 0.12);
  ctx.quadraticCurveTo(w * 0.5, h * 0.4, w * 0.6, h * 0.62);
  ctx.moveTo(w * 0.78, h * 0.3);
  ctx.quadraticCurveTo(w * 0.72, h * 0.5, w * 0.8, h * 0.72);
  ctx.stroke();
  ctx.restore();

  // Водоросли на макушке
  for (const [x, tall, col] of [
    [w * 0.28, 16, E.algae], [w * 0.36, 22, E.algaeLit], [w * 0.66, 14, E.algae],
  ]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.1 + 4);
    ctx.quadraticCurveTo(x + 5, h * 0.1 - tall * 0.6, x - 2, h * 0.1 - tall);
    ctx.stroke();
  }
}

// Сухая макушка кекура (band-0 камни пробивают линию воды): гранит pebble-тонов
// + пенная юбка. Оверлей БЕЗ хитбокса — чистый декор поверх камня.
function drawSkerryCap(ctx, w, h) {
  const E = ENTITY.skerry;
  const dome = new Path2D();
  dome.moveTo(4, h - 8);
  dome.quadraticCurveTo(w * 0.16, 6, w * 0.45, 3);
  dome.quadraticCurveTo(w * 0.78, 2, w - 4, h - 8);
  dome.closePath();
  ctx.fillStyle = vGrad(ctx, 0, h, [[0, E.lit], [1, E.dry]]);
  ctx.fill(dome);
  ctx.save();
  ctx.clip(dome);
  ctx.fillStyle = rgba('#6E675C', 0.5);
  for (const [x, y] of [[w * 0.3, h * 0.5], [w * 0.55, h * 0.35], [w * 0.7, h * 0.6]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 2.4, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Пенная юбка по ватерлинии
  ctx.fillStyle = E.foam;
  for (let x = 2; x < w - 2; x += 14) {
    ctx.beginPath();
    ctx.ellipse(x + 7, h - 7, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ————————————————————————————— Антропогенный мусор —————————————————————————
function drawGhostNet(ctx, w, h) {
  const E = ENTITY.ghost_net;
  ctx.strokeStyle = E.line;
  ctx.lineWidth = 1.6;
  for (let x = 8; x <= w - 8; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.quadraticCurveTo(x + 7, h * 0.5, x, h - 4); // провисшие вертикали
    ctx.stroke();
  }
  for (let y = 14; y <= h - 6; y += 24) {
    ctx.beginPath();
    ctx.moveTo(4, y);
    ctx.quadraticCurveTo(w * 0.5, y + 9, w - 4, y); // провисшие горизонтали
    ctx.stroke();
  }
  // Обрывки снизу
  for (const x of [w * 0.22, w * 0.6, w * 0.85]) {
    ctx.beginPath();
    ctx.moveTo(x, h - 5);
    ctx.quadraticCurveTo(x - 5, h + 1, x - 3, h - 1);
    ctx.stroke();
  }
  // Поплавки — buoy: честный сигнальный акцент опасности
  for (const x of [w * 0.19, w * 0.5, w * 0.81]) {
    ctx.fillStyle = E.float;
    ctx.beginPath();
    ctx.arc(x, 9, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = E.floatRim;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawPlasticCluster(ctx, w, h) {
  const E = ENTITY.plastic_cluster;
  // Бутылка (полупрозрачная, крышка buoy)
  ctx.save();
  ctx.translate(w * 0.26, h * 0.52);
  ctx.rotate(-0.35);
  ctx.fillStyle = E.bottle;
  ctx.beginPath();
  ctx.roundRect(-14, -30, 28, 58, 8);
  ctx.fill();
  ctx.fillStyle = rgba('#FFFFFF', 0.35);
  ctx.fillRect(-8, -24, 6, 44);
  ctx.fillStyle = E.cap;
  ctx.beginPath();
  ctx.roundRect(-7, -38, 14, 9, 3);
  ctx.fill();
  ctx.restore();

  // Пакет-«призрак» с волнистым низом
  ctx.fillStyle = E.bag;
  ctx.beginPath();
  ctx.moveTo(w * 0.52, h * 0.18);
  ctx.quadraticCurveTo(w * 0.9, h * 0.1, w * 0.92, h * 0.5);
  ctx.quadraticCurveTo(w * 0.94, h * 0.78, w * 0.8, h * 0.72);
  ctx.quadraticCurveTo(w * 0.72, h * 0.9, w * 0.62, h * 0.76);
  ctx.quadraticCurveTo(w * 0.52, h * 0.86, w * 0.5, h * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = E.fold;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(w * 0.6, h * 0.24);
  ctx.quadraticCurveTo(w * 0.66, h * 0.5, w * 0.62, h * 0.72);
  ctx.moveTo(w * 0.74, h * 0.2);
  ctx.quadraticCurveTo(w * 0.8, h * 0.46, w * 0.78, h * 0.68);
  ctx.stroke();

  // Осколки
  ctx.fillStyle = E.shard;
  for (const [x, y, s, a] of [[w * 0.44, h * 0.85, 8, 0.4], [w * 0.14, h * 0.16, 7, -0.5], [w * 0.6, h * 0.06, 6, 0.2]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.6);
    ctx.lineTo(0, -s);
    ctx.lineTo(s, s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
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
  ]);
  ctx.fillRect(0, 0, w, h);
  // Лучи
  ctx.fillStyle = rgba(BRAND.FOG, 0.045);
  for (const [x, wTop, wBot, len] of [[150, 26, 90, 360], [430, 40, 130, 420], [720, 22, 80, 330]]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + wTop, 0);
    ctx.lineTo(x + wBot + 60, len);
    ctx.lineTo(x + 60, len);
    ctx.closePath();
    ctx.fill();
  }
  // Придонная дымка
  ctx.fillStyle = vGrad(ctx, h - 90, h, [[0, 'rgba(11,40,50,0)'], [1, 'rgba(11,40,50,0.55)']]);
  ctx.fillRect(0, h - 90, w, 90);
}

// Дальний слой: кекуры-столбы (часть достаёт до поверхности — тема «квази-суши» и в
// параллаксе), донные скалы, силуэты ламинарии. Всё примешано к воде (DEPTH_FADE.far).
function drawFarLayer(ctx, w, h) {
  const fade = (c) => mix(c, WATER.deep, DEPTH_FADE.far);
  const rock = fade(ENTITY.rock.base);
  // Донные округлые стеки
  for (const [x, rw, rh] of [[90, 150, 210], [360, 220, 150], [700, 170, 260], [1050, 200, 180]]) {
    ctx.fillStyle = rock;
    ctx.beginPath();
    ctx.moveTo(x - rw / 2, h);
    ctx.quadraticCurveTo(x - rw / 2 + 8, h - rh * 0.8, x - rw * 0.12, h - rh);
    ctx.quadraticCurveTo(x + rw * 0.3, h - rh - 14, x + rw / 2, h - rh * 0.45);
    ctx.lineTo(x + rw / 2, h);
    ctx.closePath();
    ctx.fill();
  }
  // Столбы до поверхности (пробивают линию воды за кадром). Вертикальный градиент —
  // у поверхности столб тает в светлой воде (иначе тёмная плита на светлом фоне).
  for (const [x, tw] of [[540, 90], [1180, 70]]) {
    ctx.fillStyle = vGrad(ctx, 0, h * 0.62, [
      [0, mix(rock, WATER.surface, 0.62)],
      [0.5, mix(rock, WATER.surface, 0.25)],
      [1, rock],
    ]);
    ctx.beginPath();
    ctx.moveTo(x - tw / 2, 0);
    ctx.quadraticCurveTo(x - tw / 2 - 12, h * 0.35, x - tw * 0.2, h * 0.62);
    ctx.lineTo(x + tw * 0.3, h * 0.62);
    ctx.quadraticCurveTo(x + tw / 2 + 10, h * 0.3, x + tw / 2, 0);
    ctx.closePath();
    ctx.fill();
  }
  // Силуэты ламинарии
  ctx.lineWidth = 5;
  for (const [x, tall, ci] of [[240, 170, 0], [265, 120, 1], [880, 200, 0], [910, 140, 2]]) {
    ctx.strokeStyle = fade(ENTITY.kelp[ci]);
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.quadraticCurveTo(x + 18, h - tall * 0.55, x - 8, h - tall);
    ctx.stroke();
  }
}

// Средний слой: грунтовая полоса + келп-лес + валуны (DEPTH_FADE.mid).
function drawMidLayer(ctx, w, h) {
  const fade = (c) => mix(c, WATER.deep, DEPTH_FADE.mid);
  // Грунт
  ctx.fillStyle = fade('#1D3A43');
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h - 46);
  ctx.quadraticCurveTo(w * 0.25, h - 66, w * 0.5, h - 50);
  ctx.quadraticCurveTo(w * 0.75, h - 36, w, h - 56);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  // Валуны
  for (const [x, rw, rh] of [[150, 90, 52], [620, 120, 66]]) {
    ctx.fillStyle = fade(ENTITY.rock.base);
    ctx.beginPath();
    ctx.ellipse(x, h - 44, rw / 2, rh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fade(ENTITY.rock.lit);
    ctx.beginPath();
    ctx.ellipse(x - rw * 0.14, h - 50 - rh * 0.14, rw * 0.26, rh * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Келп: кластеры изогнутых лент с листьями
  const blade = (x, tall, ci, bow) => {
    ctx.strokeStyle = fade(ENTITY.kelp[ci]);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, h - 40);
    ctx.quadraticCurveTo(x + bow, h - 40 - tall * 0.6, x + bow * 0.4, h - 40 - tall);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const bx = x + bow * (2 * t - t * t);
      const by = h - 40 - tall * t;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + 12, by - 4, bx + 18, by - 14);
      ctx.stroke();
    }
  };
  blade(70, 200, 0, 26);
  blade(100, 150, 1, -18);
  blade(330, 260, 2, 22);
  blade(360, 190, 0, -14);
  blade(390, 130, 1, 20);
  blade(760, 230, 1, -24);
  blade(800, 170, 2, 18);
}

// Пена ватерлинии: тайл, скроллится СО СКОРОСТЬЮ МИРА (поверхность — план геймплея,
// камни band 0 пробивают её), это не параллакс — RM её не трогает.
function drawFoamTile(ctx, w, h) {
  const E = ENTITY.foam;
  ctx.fillStyle = E.band;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h * 0.4);
  for (let x = w; x > 0; x -= 30) {
    ctx.quadraticCurveTo(x - 8, h * 0.95, x - 15, h * 0.45);
    ctx.quadraticCurveTo(x - 22, h * 0.25, x - 30, h * 0.4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = E.crest;
  ctx.fillRect(0, 0, w, 2.5);
}

// ————————————————————————————— Сборка ———————————————————————————————————————
/**
 * Регистрирует все текстуры игры в TextureManager сцены. Идемпотентно
 * (scene.restart() не перегенерирует). Ключи — контракт core/theme.js TEXTURES.
 */
export function buildTextures(scene) {
  if (scene.textures.exists('seal_0')) return;

  const addSprite = (key, w, h, draw) => {
    const [c, ctx] = spriteCanvas(w, h);
    draw(ctx, w, h);
    scene.textures.addCanvas(key, c);
  };
  const addTile = (key, w, h, draw) => {
    const [c, ctx] = tileCanvas(w, h);
    draw(ctx, w, h);
    scene.textures.addCanvas(key, c);
  };

  const T = TEXTURES;
  addSprite('seal_0', T.seal.w, T.seal.h, (c, w, h) => drawSeal(c, w, h, 0));
  addSprite('seal_1', T.seal.w, T.seal.h, (c, w, h) => drawSeal(c, w, h, 1));
  addSprite('orca', T.orca.w, T.orca.h, drawOrca);
  addSprite('shark_white', T.shark_white.w, T.shark_white.h, (c, w, h) =>
    drawShark(c, w, h, ENTITY.shark_white, false));
  addSprite('shark_big', T.shark_big.w, T.shark_big.h, (c, w, h) =>
    drawShark(c, w, h, ENTITY.shark_big, true));
  addSprite('fish_small', T.fish_small.w, T.fish_small.h, drawFishSmall);
  addSprite('fish_rare', T.fish_rare.w, T.fish_rare.h, drawFishRare);
  addSprite('rock', T.rock.w, T.rock.h, drawRock);
  addSprite('skerry_cap', T.skerry_cap.w, T.skerry_cap.h, drawSkerryCap);
  addSprite('ghost_net', T.ghost_net.w, T.ghost_net.h, drawGhostNet);
  addSprite('plastic_cluster', T.plastic_cluster.w, T.plastic_cluster.h, drawPlasticCluster);

  addTile('bg_water', FIELD_W, WORLD_H, drawWaterBackdrop);
  addTile('bg_far', PARALLAX.far.tileW, WORLD_H, drawFarLayer);
  addTile('bg_mid', PARALLAX.mid.tileW, WORLD_H, drawMidLayer);
  addTile('foam', 240, 20, drawFoamTile);
}
