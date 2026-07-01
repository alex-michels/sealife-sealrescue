// entities/seal.js
// Тюлень (phocid/безухий, по типу Weddell): окрас «серки» — серебристо-серый с
// контршейдингом (плавный градиент: тёмная спина → светлый живот) и тёмными крапинами.
// Передние ласты с когтями, крошечный широкий хвостик между задними ластами.
import { PALETTE } from '../core/theme.js';

const { sin, hypot } = Math;
const S = PALETTE.seal;
const SEAL_EDGE = 'rgba(12,34,48,0.7)'; // тонкий контур-отбивка — тот же «ink», что у добычи

export function makeSeal(makeSpots) {
  return {
    x: 0, y: 0, r: 30,
    px: 0, py: 0,
    vx: 0, vy: 0,

    maxSpeed: 320,
    accel: 2400,

    // ориентация
    angle: 0, // радианы, 0 — «вправо»
    turnRate: 6.5, // макс. скорость поворота, рад/с (снаппи под новый темп)
    _lastT: 0,

    facing: 1, // совместимость
    spots: makeSpots(7, 22),

    draw(ctx) {
      const r = this.r;
      const now = performance.now();
      const t = now / 1000;
      const dt = this._lastT ? Math.min(0.05, (now - this._lastT) / 1000) : 0;
      this._lastT = now;

      const speed = hypot(this.vx, this.vy);
      const swim = Math.min(1, speed / (this.maxSpeed * 0.35)); // быстрее набирает «мах»

      // повернуть к вектору скорости (кратчайшим путём)
      if (speed > 1) {
        const desired = Math.atan2(this.vy, this.vx);
        const wrap = (a) => (a + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        let diff = wrap(desired - this.angle);
        const maxStep = this.turnRate * (dt || 0.016);
        if (Math.abs(diff) > maxStep) diff = Math.sign(diff) * maxStep;
        this.angle = wrap(this.angle + diff);
      }

      // чуть более интенсивная анимация ласт во время плавания
      const tailAng = sin(t * 7.5) * 0.30 * swim;
      const flapAng = -0.10 + sin(t * 3.4) * 0.34 * swim;

      // силуэт тела (нос справа, хвост слева) — плотная «торпеда»
      const body = () => {
        ctx.beginPath();
        ctx.moveTo(r * 1.5, 0);
        ctx.bezierCurveTo(r * 1.42, -r * 0.92, r * 0.25, -r * 1.04, -r * 0.7, -r * 0.72);
        ctx.bezierCurveTo(-r * 1.18, -r * 0.5, -r * 1.46, -r * 0.24, -r * 1.46, 0);
        ctx.bezierCurveTo(-r * 1.46, r * 0.24, -r * 1.18, r * 0.5, -r * 0.7, r * 0.72);
        ctx.bezierCurveTo(r * 0.25, r * 1.04, r * 1.42, r * 0.92, r * 1.5, 0);
        ctx.closePath();
      };
const flipperFill = S.back; // ровный серый цвет ласт, близкий к тёмной части туловища

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // tiny separation edge — a THIN dark silhouette of the whole seal, drawn BEHIND every part
      // so he reads against the reef backdrop (like the prey). Re-traces the SAME part paths a hair
      // larger and fills them dark; the real parts below are untouched and drawn on top. Edge only.
      {
        const grow = 1 + Math.min(0.09, 1.1 / r);
        ctx.save();
        ctx.scale(grow, grow);
        ctx.fillStyle = SEAL_EDGE;
        body(); ctx.fill();
        ctx.save();
        ctx.translate(-r * 1.25, 0); ctx.rotate(tailAng);
        ctx.beginPath();
        ctx.moveTo(r * 0.1, 0);
        ctx.quadraticCurveTo(-r * 0.76, -r * 0.64, -r * 0.54, -r * 0.04);
        ctx.quadraticCurveTo(-r * 0.92, r * 0.12, -r * 0.54, r * 0.54);
        ctx.quadraticCurveTo(-r * 0.16, r * 0.7, r * 0.1, 0);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.moveTo(-r * 1.34, -r * 0.16);
        ctx.quadraticCurveTo(-r * 1.74, -r * 0.08, -r * 1.6, r * 0.03);
        ctx.quadraticCurveTo(-r * 1.48, r * 0.1, -r * 1.34, r * 0.04);
        ctx.closePath(); ctx.fill();
        ctx.save();
        ctx.translate(r * 0.15, r * 0.34); ctx.rotate(flapAng);
        ctx.beginPath();
        ctx.ellipse(-r * 0.15, r * 0.18, r * 0.62, r * 0.27, -0.18, 0, Math.PI * 2);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.restore();
      }

// задние ласты — за телом, ровный серый цвет
ctx.save();
ctx.translate(-r * 1.25, 0);
ctx.rotate(tailAng);
ctx.fillStyle = flipperFill;
ctx.beginPath();
ctx.moveTo(r * 0.1, 0);
ctx.quadraticCurveTo(-r * 0.76, -r * 0.64, -r * 0.54, -r * 0.04);
ctx.quadraticCurveTo(-r * 0.92, r * 0.12, -r * 0.54, r * 0.54);
ctx.quadraticCurveTo(-r * 0.16, r * 0.7, r * 0.1, 0);
ctx.closePath();
ctx.fill();
ctx.restore();

// хвостик между/над задними ластами — чуть длиннее и заметнее
ctx.save();
ctx.fillStyle = S.body;
ctx.beginPath();
ctx.moveTo(-r * 1.34, -r * 0.16);
ctx.quadraticCurveTo(-r * 1.74, -r * 0.08, -r * 1.6, r * 0.03);
ctx.quadraticCurveTo(-r * 1.48, r * 0.1, -r * 1.34, r * 0.04);
ctx.closePath();
ctx.fill();

ctx.strokeStyle = S.dark;
ctx.globalAlpha = 0.35;
ctx.lineWidth = Math.max(1, r * 0.045);
ctx.stroke();
ctx.globalAlpha = 1;
ctx.restore();

      // тело: плавный контршейдинг (тёмная спина → серебристый живот)
      const fur = ctx.createLinearGradient(0, -r * 1.05, 0, r * 1.05);
      fur.addColorStop(0, S.back);
      fur.addColorStop(0.5, S.body);
      fur.addColorStop(1, S.belly);
      body();
      ctx.fillStyle = fur;
      ctx.fill();

      // крапины + контровой блик в пределах силуэта
      ctx.save();
      body();
      ctx.clip();
      ctx.fillStyle = S.spot;
      for (const sp of this.spots) {
        if (sp.ry > 0.35) continue; // в основном на спине/боку, не на светлом брюхе
        ctx.globalAlpha = sp.a * 0.5;
        ctx.beginPath();
        ctx.ellipse(sp.rx * r * 0.95, sp.ry * r - r * 0.12, r * sp.r * 0.8, r * sp.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // передний ласт (анимация) + когти на кончике
      ctx.save();
      ctx.translate(r * 0.15, r * 0.34);
      ctx.rotate(flapAng);
      ctx.fillStyle = flipperFill;
      ctx.beginPath();
      ctx.ellipse(-r * 0.15, r * 0.18, r * 0.62, r * 0.27, -0.18, 0, Math.PI * 2);
      ctx.fill();
// когти (тёмные, тупые) — на кромке ласта, «пальцами» как у лапы; очень короткие
const tipX = -r * 0.58, tipY = r * 0.29;
const dx = -0.982, dy = 0.181; // вдоль главной оси ласта, наружу
const px = -dy, py = dx; // перпендикуляр
ctx.strokeStyle = S.claw;
ctx.lineWidth = Math.max(1.1, r * 0.05);
ctx.lineCap = 'round';
for (let i = -1; i <= 1; i++) {
  const ox = tipX + px * i * r * 0.11;
  const oy = tipY + py * i * r * 0.11;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(ox + dx * r * 0.08, oy + dy * r * 0.08);
  ctx.stroke();
}
      ctx.restore();

      // глаз + блик
      ctx.fillStyle = S.dark;
      ctx.beginPath();
      ctx.arc(r * 0.92, -r * 0.22, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.highlight;
      ctx.beginPath();
      ctx.arc(r * 0.98, -r * 0.28, r * 0.055, 0, Math.PI * 2);
      ctx.fill();

      // нос
      ctx.fillStyle = S.dark;
      ctx.beginPath();
      ctx.ellipse(r * 1.42, r * 0.02, r * 0.09, r * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();

      // вибриссы (усы)
      ctx.strokeStyle = S.whisker;
      ctx.lineWidth = Math.max(1, r * 0.03);
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const yy = r * (0.12 + i * 0.1);
        ctx.beginPath();
        ctx.moveTo(r * 1.3, yy);
        ctx.quadraticCurveTo(r * 1.5, yy - r * 0.05, r * 1.85, yy - r * 0.02 + i * r * 0.04);
        ctx.stroke();
      }

      ctx.restore();
    },
  };
}
