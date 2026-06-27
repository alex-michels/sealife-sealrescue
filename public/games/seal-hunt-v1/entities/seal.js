// entities/seal.js
// Плавный 360° разворот по вектору движения (к касанию/мыши).
// Крутилка ограничена turnRate (рад/с), чтобы поворот был естественным.
const { sin, cos, hypot, min, max, PI } = Math;

export function makeSeal(makeSpots) {
  return {
    x:0, y:0, r:30,
    px:0, py:0,
    vx:0, vy:0,

    maxSpeed:200,
    accel:900,

    // --- ориентация
    angle: 0,          // текущий угол (радианы), 0 — «вправо»
    turnRate: 5.0,     // макс. скорость поворота, рад/с (подкрутите под вкус)
    _lastT: 0,         // служебное: отметка времени предыдущего кадра

    // оставим для совместимости (не используется в draw):
    facing:1,

    _spots:null,
    spots: makeSpots(7,34),

    draw(ctx){
      const r = this.r;
      const now = performance.now();
      const t = now / 1000;
      const dt = this._lastT ? Math.min(0.05, (now - this._lastT)/1000) : 0;
      this._lastT = now;

      // интенсивность «плавания» для анимации ласт
      const speed = hypot(this.vx, this.vy);
      const swim  = Math.min(1, speed / (this.maxSpeed * 0.5));

      // ---- рассчитать желаемый угол по вектору скорости
      // если почти стоим — удерживаем прошлый угол (без дёрганий)
      if (speed > 1) {
        const desired = Math.atan2(this.vy, this.vx); // [-PI..PI]
        // кратчайший поворот к цели
        const wrap = (a)=> (a + Math.PI*3) % (Math.PI*2) - Math.PI;
        let diff = wrap(desired - this.angle);
        const maxStep = this.turnRate * (dt || 0.016);
        if (Math.abs(diff) > maxStep) diff = Math.sign(diff) * maxStep;
        this.angle = wrap(this.angle + diff);
      }

      // небольшие углы для анимации хвоста/переднего ласта
      const tailAng = sin(t * 7.0) * 0.22 * swim;
      const flapAng = (-0.15) + sin(t * 3.0) * 0.20 * swim;

      // ==== РИСОВАНИЕ ====
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);      // <— вместо масштабирования по facing

      // тень
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#001018';
      ctx.beginPath();
      ctx.ellipse(0, r*0.40, r*1.22, r*0.50, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // тело
      ctx.fillStyle = '#bcd2da';
      ctx.beginPath();
      ctx.ellipse(0, 0, r*1.45, r*1.10, 0, 0, Math.PI*2);
      ctx.fill();

      // задние ласты
      ctx.save();
      ctx.rotate(tailAng);
      ctx.fillStyle = '#9bb8c4';
      ctx.beginPath();
      ctx.moveTo(-r*1.30, -r*0.3);
      ctx.quadraticCurveTo(-r*1.95, -r*0.60, -r*1.70, -r*0.05);
      ctx.quadraticCurveTo(-r*1.85,  r*0.60, -r*1.30,  r*0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0b1b23';
      for (let i=0;i<4;i++){
        const yy = -r*0.22 + i*(r*0.15);
        ctx.beginPath();
        ctx.ellipse(-r*1.65, yy, r*0.07, r*0.04, 0, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();

      // передний ласт (анимация)
      ctx.save();
      ctx.translate(r*0.00, r*0.15);
      ctx.rotate(flapAng);
      ctx.fillStyle = '#9bb8c4';
      ctx.beginPath();
      ctx.ellipse(r*0.00, r*0.15, r*0.60, r*0.30, -0.15, 0, Math.PI*2);
      ctx.fill();

      // «сгибы» на конце ласта
      ctx.fillStyle = '#0b1b23';
      const tipX = r*-0.5, tipY = r*0.05, stepY = r*0.09;
      for (let i=0;i<4;i++){
        const yy = tipY + i*stepY;
        ctx.beginPath();
        ctx.ellipse(tipX, yy, r*0.075, r*0.045, -0.15, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();

      // глаз
      ctx.fillStyle = '#0b1b23';
      ctx.beginPath();
      ctx.arc(r*1.18, -r*0.10, r*0.16, 0, Math.PI*2);
      ctx.fill();

      // нос + вибриссы
      ctx.beginPath(); ctx.arc(r*1.22, r*0.02, r*0.05, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(22,37,46,0.85)'; ctx.lineWidth = 1; ctx.lineCap = 'round';
      for (let i=0;i<3;i++){
        const yy = r*(0.2 + i*0.085);
        ctx.beginPath();
        ctx.moveTo(r*1.18, yy);
        ctx.quadraticCurveTo(r*1.2, yy - r*0.06, r*1.65, yy - r*0.01);
        ctx.stroke();
      }

      ctx.restore();
    }
  };
}
