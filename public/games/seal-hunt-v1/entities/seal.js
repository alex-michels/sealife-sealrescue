// entities/seal.js
// Тюлень: плавный 360° разворот по вектору движения, тёплая «шкура» (pebble) и
// 3-тоновая флэт-заливка (спина/тело/живот) + тонкий крап — современный флэт-арт
// в духе бренда (DESIGN_BRIEF), без «AI-блоба».
import { PALETTE } from '../core/theme.js';

const { sin, hypot } = Math;
const S = PALETTE.seal;

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
      const swim = Math.min(1, speed / (this.maxSpeed * 0.5));

      // повернуть к вектору скорости (кратчайшим путём)
      if (speed > 1) {
        const desired = Math.atan2(this.vy, this.vx);
        const wrap = (a) => (a + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        let diff = wrap(desired - this.angle);
        const maxStep = this.turnRate * (dt || 0.016);
        if (Math.abs(diff) > maxStep) diff = Math.sign(diff) * maxStep;
        this.angle = wrap(this.angle + diff);
      }

      const tailAng = sin(t * 7.0) * 0.20 * swim;
      const flapAng = -0.12 + sin(t * 3.0) * 0.20 * swim;

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

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // мягкая тень под тюленем (в мировой ориентации читается достаточно)
      ctx.fillStyle = S.shadow;
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, r * 0.5, r * 1.25, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // задние ласты (хвост) — за телом
      ctx.save();
      ctx.translate(-r * 1.25, 0);
      ctx.rotate(tailAng);
      ctx.fillStyle = S.back;
      ctx.beginPath();
      ctx.moveTo(r * 0.1, 0);
      ctx.quadraticCurveTo(-r * 0.7, -r * 0.62, -r * 0.5, -r * 0.04);
      ctx.quadraticCurveTo(-r * 0.85, r * 0.1, -r * 0.5, r * 0.5);
      ctx.quadraticCurveTo(-r * 0.15, r * 0.66, r * 0.1, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // тело: база
      body();
      ctx.fillStyle = S.body;
      ctx.fill();

      // 3-тоновая заливка + крап в пределах силуэта
      ctx.save();
      body();
      ctx.clip();
      ctx.fillStyle = S.back; // спина темнее (верхняя треть)
      ctx.fillRect(-r * 2, -r * 1.3, r * 4, r * 0.72);
      ctx.fillStyle = S.belly; // живот (нижняя часть)
      ctx.fillRect(-r * 2, r * 0.36, r * 4, r * 1.3);
      ctx.fillStyle = S.spot; // тонкий крап на спине/боку
      for (const sp of this.spots) {
        if (sp.ry > 0.15) continue; // только верхняя половина
        ctx.globalAlpha = sp.a * 0.7;
        ctx.beginPath();
        ctx.ellipse(sp.rx * r * 0.9, sp.ry * r * 1.1, r * sp.r * 0.9, r * sp.r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // мягкий контровой блик по верхней кромке
      ctx.strokeStyle = S.rim;
      ctx.lineWidth = r * 0.08;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.74);
      ctx.bezierCurveTo(r * 0.3, -r * 1.0, r * 1.1, -r * 0.66, r * 1.4, -r * 0.18);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      // передний ласт (анимация)
      ctx.save();
      ctx.translate(r * 0.15, r * 0.34);
      ctx.rotate(flapAng);
      ctx.fillStyle = S.back;
      ctx.beginPath();
      ctx.ellipse(-r * 0.15, r * 0.18, r * 0.62, r * 0.27, -0.18, 0, Math.PI * 2);
      ctx.fill();
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
