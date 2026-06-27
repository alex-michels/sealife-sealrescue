// entities/prey.js
import { BAL, BASE } from '../core/balance.js';
import { SWEEP_T } from '../game.js';

// tiny helper
const lerp = (a,b,t)=>a+(b-a)*t;

// --- Cute idle motion + C-start–like escape tuning ---
// (Values chosen to look natural, not physically exact.)
const WIGGLE = {
  rotAmp: 0.08,       // ±rad idle body wobble
  rotFreq: 5.0,       // Hz-equivalent (multiplied by 2π inside)
  scaleAmp: 0.04,     // y-scale breathing effect
};
const ESCAPE = {
  threatK: 4,       // threat radius ≈ seal.r * threatK (soft, feels right)
  burstImpulse: 160,  // instantaneous dv (px/s) on trigger (away from seal)
  maxBoost: 1.6,      // cap: up to 1.6× normal fish max speed during escape
  fleeHold: 0.22,     // seconds we consider the fish "in flee mode"
  restAfter: 1.2,     // minimum cooldown until next flee
  steer: 260,         // while fleeing, extra away-from-seal steering (px/s^2)
  dragHi: 0.985,      // stronger drag during/after burst (decays the boost)
  dragLo: 0.998,      // normal gentle drag baseline (keeps speeds calm)
};

// Gentle baseline swim when not threatened (keeps fish from “parking”)
const CRUISE = {
  targetK: 0.55, // target ≈ 55% of BAL.fishSpeedMin (auto scales with screen)
  accel: 120,    // how quickly they regain that slow cruise (px/s^2)
  wander: 18,    // tiny heading meander (px/s^2) so it looks alive
};


// -------------------------------------------------------
// species catalog (shape/color/size/behavior)
const SPECIES = [
  {
    name:'goldie', size:1.0, colors:{body:'#ffd166', tail:'#f9c74f', eye:'#09202d'},
    draw(ctx,r,phase,tailKick=0){
      // subtle tail “kick” when fleeing (makes it look lively)
      ctx.fillStyle=this.colors.body;
      ctx.beginPath(); ctx.ellipse(0,0,r*0.9,r*0.6,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=this.colors.tail;
      ctx.beginPath(); 
      const k = r*0.6 * (0.7 + tailKick); // kick widens tail a touch
      ctx.moveTo(-r*0.9,0); ctx.lineTo(-r*1.4,-k); ctx.lineTo(-r*1.4,k); 
      ctx.closePath(); ctx.fill();
      ctx.fillStyle=this.colors.eye; ctx.beginPath(); ctx.arc(r*0.5,-r*0.1,r*0.1,0,Math.PI*2); ctx.fill();
    },
    wiggle: (f,dt,i)=>{ f.vx += Math.sin(f.t*4.8+i)*4*dt; f.vy += Math.cos(f.t*4.2+i)*4*dt; }
  },
  {
    name:'herring', size:0.9, colors:{body:'#a8d0f0', tail:'#8bbadf', eye:'#082334'},
    draw(ctx,r,phase,tailKick=0){
      ctx.fillStyle=this.colors.body;
      ctx.beginPath(); ctx.ellipse(0,0,r*1.05,r*0.48,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=this.colors.tail;
      ctx.beginPath(); 
      const k=r*0.45*(0.7+tailKick);
      ctx.moveTo(-r*1.0,0); ctx.lineTo(-r*1.45,-k); ctx.lineTo(-r*1.45,k); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(8,35,52,.25)'; ctx.lineWidth=1;
      for(let s=-0.30;s<=0.30;s+=0.15){ ctx.beginPath(); ctx.ellipse(r*0.12, r*s, r*0.58, r*0.23, 0, 0, Math.PI*2); ctx.stroke(); }
      ctx.fillStyle=this.colors.eye; ctx.beginPath(); ctx.arc(r*0.55,-r*0.06,r*0.08,0,Math.PI*2); ctx.fill();
    },
    wiggle: (f,dt,i)=>{ f.vy += Math.sin(f.t*3.6+i)*5*dt; }
  },
  {
    name:'sprat', size:0.7, colors:{body:'#cfe7ff', tail:'#9fc1e0', eye:'#09233a'},
    draw(ctx,r,phase,tailKick=0){
      ctx.fillStyle=this.colors.body;
      ctx.beginPath(); ctx.ellipse(0,0,r*1.0,r*0.42,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(20,40,60,.25)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-r*0.6,0); ctx.lineTo(r*0.85,0); ctx.stroke();
      ctx.fillStyle=this.colors.tail;
      ctx.beginPath(); 
      const k=r*0.35*(0.7+tailKick);
      ctx.moveTo(-r*1.0,0); ctx.lineTo(-r*1.35,-k); ctx.lineTo(-r*1.35,k); ctx.closePath(); ctx.fill();
      ctx.fillStyle=this.colors.eye; ctx.beginPath(); ctx.arc(r*0.55,-r*0.03,r*0.07,0,Math.PI*2); ctx.fill();
    },
    wiggle:(f,dt,i)=>{ f.vx += Math.sin(f.t*5.0+i)*3*dt; }
  },
  {
    name:'anchovy', size:0.75, colors:{body:'#c0e0ff', tail:'#8fb6da', eye:'#0b2336'},
    draw(ctx,r,phase,tailKick=0){
      ctx.fillStyle=this.colors.body;
      ctx.beginPath(); ctx.ellipse(0,0,r*1.15,r*0.38,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(10,30,50,.25)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-r*0.7,-r*0.06); ctx.lineTo(r*0.9,-r*0.06); ctx.stroke();
      ctx.fillStyle=this.colors.tail;
      ctx.beginPath(); 
      const k=r*0.35*(0.7+tailKick);
      ctx.moveTo(-r*1.15,0); ctx.lineTo(-r*1.45,-k); ctx.lineTo(-r*1.45,k); ctx.closePath(); ctx.fill();
      ctx.fillStyle=this.colors.eye; ctx.beginPath(); ctx.arc(r*0.6,-r*0.05,r*0.07,0,Math.PI*2); ctx.fill();
    },
    wiggle:(f,dt,i)=>{ f.vy += Math.cos(f.t*4.2+i)*4*dt; }
  },
  {
    name:'sardine', size:0.85, colors:{body:'#b9e2dd', tail:'#92c4bc', eye:'#0b2a2a'},
    draw(ctx,r,phase,tailKick=0){
      ctx.fillStyle=this.colors.body; ctx.beginPath(); ctx.ellipse(0,0,r*1.1,r*0.50,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(9,32,45,.55)';
      for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.arc(-r*0.2+i*r*0.2, -r*0.18, r*0.035, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle=this.colors.tail;
      ctx.beginPath(); 
      const k=r*0.45*(0.7+tailKick);
      ctx.moveTo(-r*1.1,0); ctx.lineTo(-r*1.5,-k); ctx.lineTo(-r*1.5,k); ctx.closePath(); ctx.fill();
      ctx.fillStyle=this.colors.eye; ctx.beginPath(); ctx.arc(r*0.55,-r*0.07,r*0.08,0,Math.PI*2); ctx.fill();
    },
    wiggle:(f,dt,i)=>{ f.vx += Math.sin(f.t*3.8+i)*3.5*dt; }
  },
  {
    name:'smelt', size:0.8, colors:{body:'#a9e3c2', tail:'#84caa6', eye:'#082a22'},
    draw(ctx,r,phase,tailKick=0){
      ctx.fillStyle=this.colors.body;
      ctx.beginPath(); ctx.ellipse(0,0,r*1.05,r*0.42,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(8,42,34,.25)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.ellipse(r*0.2, 0, r*0.5, r*0.2, 0, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle=this.colors.eye; ctx.beginPath(); ctx.arc(r*0.55,-r*0.04,r*0.07,0,Math.PI*2); ctx.fill();
    },
    wiggle:(f,dt,i)=>{ f.vx += Math.sin(f.t*4.6+i)*3*dt; }
  },
  {
    name:'sandlance', size:0.85, colors:{body:'#b6e1f2', tail:'#8ec1df', eye:'#082a3a'},
    draw(ctx,r,phase,tailKick=0){
      ctx.fillStyle=this.colors.body;
      ctx.beginPath();
      ctx.moveTo(-r*1.2,0);
      ctx.quadraticCurveTo(r*0.2,-r*0.5, r*1.2,0);
      ctx.quadraticCurveTo(r*0.2, r*0.5, -r*1.2,0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle=this.colors.eye; ctx.beginPath(); ctx.arc(r*0.7,-r*0.06,r*0.07,0,Math.PI*2); ctx.fill();
    },
    wiggle:(f,dt,i)=>{ f.vy += Math.sin(f.t*5.0+i)*3.5*dt; }
  },
  {
    name:'codling', size:1.0, colors:{body:'#c9d6b8', tail:'#a9c092', eye:'#0a2216'},
    draw(ctx,r,phase,tailKick=0){
      ctx.fillStyle=this.colors.body; ctx.beginPath(); ctx.ellipse(0,0,r*1.0,r*0.55,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(20,30,10,.25)';
      for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.arc(i*r*0.18, -r*0.05+((i%2)?r*0.08:-r*0.04), r*0.05, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle=this.colors.tail;
      ctx.beginPath(); 
      const k=r*0.5*(0.7+tailKick);
      ctx.moveTo(-r*1.0,0); ctx.lineTo(-r*1.45,-k); ctx.lineTo(-r*1.45,k); ctx.closePath(); ctx.fill();
      ctx.fillStyle=this.colors.eye; ctx.beginPath(); ctx.arc(r*0.5,-r*0.08,r*0.09,0,Math.PI*2); ctx.fill();
    },
    wiggle:(f,dt,i)=>{ f.vx += Math.sin(f.t*3.4+i)*3*dt; f.vy += Math.cos(f.t*3.0+i)*2*dt; }
  },
  {
    name:'capelin', size:0.7, colors:{body:'#9fd9b5', tail:'#7dc09d', eye:'#0a2c23'},
    draw(ctx,r,phase,tailKick=0){
      ctx.fillStyle=this.colors.body;
      ctx.beginPath(); ctx.moveTo(-r*1.1,0); ctx.quadraticCurveTo(r*0.5,-r*0.5,r*1.0,0);
      ctx.quadraticCurveTo(r*0.5,r*0.5,-r*1.1,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle=this.colors.eye; ctx.beginPath(); ctx.arc(r*0.6,-r*0.05,r*0.07,0,Math.PI*2); ctx.fill();
    },
    wiggle:(f,dt,i)=>{ f.vx += Math.sin(f.t*5.2+i)*3*dt; }
  },
  {
    name:'squid', size:1.2, colors:{body:'#f08fb0', tail:'#ec6f9a', eye:'#1b0b18'},
    draw(ctx,r,phase,tailKick=0){
      ctx.fillStyle=this.colors.body;
      ctx.beginPath(); ctx.ellipse(0,-r*0.1,r*0.65,r*0.9,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=this.colors.tail; ctx.lineWidth=2;
      for(let k=-2;k<=2;k++){ ctx.beginPath(); ctx.moveTo(-r*0.2+k*r*0.1, r*0.6);
        ctx.quadraticCurveTo(k*r*0.2, r*0.9, k*r*0.25, r*1.2); ctx.stroke(); }
      ctx.fillStyle=this.colors.eye; ctx.beginPath(); ctx.arc(r*0.2,-r*0.2,r*0.08,0,Math.PI*2); ctx.fill();
    },
    wiggle:(f,dt)=>{ f.vy += Math.sin(f.t*2.2)*6*dt; } // мягкий пульс
  },
  {
    name:'star', size:0.9, colors:{body:'#ffb55a', eye:'#0a1f2a'},
    draw(ctx,r){ // no tail
      ctx.fillStyle=this.colors.body;
      ctx.beginPath();
      for(let i=0;i<5;i++){ const a = i*(Math.PI*2/5)-Math.PI/2;
        const x=Math.cos(a)*r*0.8, y=Math.sin(a)*r*0.8;
        const ax=Math.cos(a+0.6)*r*0.35, ay=Math.sin(a+0.6)*r*0.35;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        ctx.lineTo(ax,ay);
      } ctx.closePath(); ctx.fill();
    },
    wiggle:(f,dt)=>{ f.vx*=0.995; f.vy*=0.995; } // дрейфует
  },
];
for (const sp of SPECIES) sp.hasMouth = !['star','squid'].includes(sp.name);
Object.freeze(SPECIES);

export const PREY = []; // active list

export function spawnPrey(world, n=1){
  for(let i=0;i<n;i++){
    const sp = SPECIES[(Math.random()*SPECIES.length)|0];
    const edge = (Math.random()*4)|0;
    const speed = BAL.fishSpeedMin + Math.random()*(BAL.fishSpeedMax - BAL.fishSpeedMin);
    const baseR = (12 + Math.random()*10) * sp.size * BAL.fishSizeK;

    let x,y,vx,vy,dir;
    if(edge===0){ x=-20; y=Math.random()*world.h; vx=speed; vy=(Math.random()-0.5)*speed*0.35; dir=1; }
    else if(edge===1){ x=world.w+20; y=Math.random()*world.h; vx=-speed; vy=(Math.random()-0.5)*speed*0.35; dir=-1; }
    else if(edge===2){ x=Math.random()*world.w; y=-20; vx=(Math.random()-0.5)*speed*0.35; vy=speed; dir=Math.sign(vx)||1; }
    else { x=Math.random()*world.w; y=world.h+20; vx=(Math.random()-0.5)*speed*0.35; vy=-speed; dir=Math.sign(vx)||-1; }

    PREY.push({
      x,y, px:x,py:y, vx,vy, r:baseR, t:0, dir, sp,
      // cute/escape state
      phase: Math.random()*Math.PI*2,
      fleeT: 0,           // active flee timer
      restT: 0,           // cooldown before next flee
      tailKick: 0         // transient tail exaggeration on flee
    });
  }
}

export function updatePrey(dt, seal, world, eatCb){
  const now = performance.now()/1000;
  const diagK = BAL.diag / BASE.diag;

  // Small-screen scaling: reduce escape potency on phones a bit
  // diagK=0.6 → boostK≈0.85 (so ~15% softer), big screens ~1.0
  const boostK  = (diagK < 1) ? (0.85 + 0.15 * diagK) : 1.0;
  const steerK  = (diagK < 1) ? (0.90 + 0.10 * diagK) : 1.0;
  const threatK = ESCAPE.threatK * (0.95 + 0.05 * diagK); // tiny scale with size

  for(let i=PREY.length-1;i>=0;i--){
    const f = PREY[i];

    // remember previous position
    f.px=f.x; f.py=f.y;
    f.t+=dt; f.phase += dt;

    // ——— distance to seal
    const dx = f.x - seal.x, dy = f.y - seal.y;
    const d2 = dx*dx + dy*dy;
    const threatR = (seal.r * threatK) + f.r*1.2; // slightly smaller fish padding
    const threat2 = threatR*threatR;

    // cooldowns
    if (f.fleeT > 0) f.fleeT -= dt;
    if (f.restT > 0) f.restT -= dt;

    // ——— C-start–like trigger: quick turn & burst when seal is close
    if (d2 < threat2 && f.fleeT <= 0 && f.restT <= 0) {
      const d = Math.max(1, Math.sqrt(d2));
      const nx = dx / d, ny = dy / d;         // away from seal
      // impulse (adds to current velocity)
      f.vx += nx * (ESCAPE.burstImpulse * boostK);
      f.vy += ny * (ESCAPE.burstImpulse * boostK);

      // face away immediately (so draw scale flip feels right)
      f.dir = Math.sign(f.vx) || f.dir;

      // timers
      f.fleeT  = ESCAPE.fleeHold;
      f.restT  = ESCAPE.restAfter;

      // small tail “kick” visual for ~0.2 s
      f.tailKick = 1.0;
    }

    // ——— extra steering away while fleeing (gentle)
    if (f.fleeT > 0) {
      const d = Math.max(1, Math.sqrt(d2));
      const ax = (ESCAPE.steer * steerK) * (dx / d);
      const ay = (ESCAPE.steer * steerK) * (dy / d);
      f.vx += ax * dt; 
      f.vy += ay * dt;
    }

    // species wiggles (existing)
    f.sp.wiggle(f,dt,i);

    // speed control: gentle drag always; stronger during escape
    const drag = f.fleeT > 0 ? ESCAPE.dragHi : ESCAPE.dragLo;
    f.vx *= drag; f.vy *= drag;

    // --- baseline cruise when NOT fleeing ---
    if (f.fleeT <= 0) {
      const sp = Math.hypot(f.vx, f.vy);
      const target = BAL.fishSpeedMin * CRUISE.targetK;
      const a = CRUISE.accel * dt;

      if (sp < target) {
        if (sp < 1) {
          // if nearly still, pick a stable, seeded heading to start moving
          const ang = f.phase * 1.7 + i * 0.9;
          f.vx += Math.cos(ang) * a;
          f.vy += Math.sin(ang) * a;
        } else {
          // accelerate along current heading to reach target cruise
          f.vx += (f.vx / sp) * a;
          f.vy += (f.vy / sp) * a;
        }
      }

      // tiny wander so cruising isn’t perfectly straight
      f.vx += Math.sin(f.phase*1.3 + i)       * CRUISE.wander * dt;
      f.vy += Math.cos(f.phase*1.1 + i*0.57)  * CRUISE.wander * dt;

      // keep facing in the travel direction (for drawing)
      f.dir = Math.sign(f.vx) || f.dir;
    }


    // soft cap during boost
    const vmaxBoost = 1.0 + (ESCAPE.maxBoost - 1.0) * boostK;
    const vmax = BAL.fishSpeedMax * (f.fleeT > 0 ? vmaxBoost : 1.0);
    const sp = Math.hypot(f.vx, f.vy);
    if (sp > vmax) { const k = vmax / sp; f.vx *= k; f.vy *= k; }

    // integrate
    f.x += f.vx*dt; f.y += f.vy*dt;

    // soft inward push near edges so prey don't stick to borders
    {
      const m = Math.min(48, Math.max(36, world.w * 0.05)); // margin ~5vw, clamped
      let pushX = 0, pushY = 0;
      if (f.x < m)          pushX = (m - f.x) / m;
      else if (f.x > world.w - m) pushX = - (f.x - (world.w - m)) / m;

      if (f.y < m)          pushY = (m - f.y) / m;
      else if (f.y > world.h - m) pushY = - (f.y - (world.h - m)) / m;

      if (pushX || pushY) {
        const edgeSteer = 180; // gentle, not game-changing
        f.vx += edgeSteer * pushX * dt;
        f.vy += (edgeSteer * 0.9) * pushY * dt;
      }
    }

    // edge cull
    if(f.x<-60 || f.x>world.w+60 || f.y<-60 || f.y>world.h+60){ PREY.splice(i,1); continue; }

    // collision sweep (re-uses shared samples from game.js)
    const eatR = f.r + seal.r*0.90, eatR2 = eatR*eatR;
    let hit = false;
    for (const tt of SWEEP_T) {
      const sx = lerp(seal.px, seal.x, tt), sy = lerp(seal.py, seal.y, tt);
      const fx = lerp(f.px, f.x, tt),       fy = lerp(f.py, f.y, tt);
      const ex = fx - sx, ey = fy - sy;
      if (ex*ex + ey*ey < eatR2) { hit = true; break; }
    }
    if(hit){ PREY.splice(i,1); eatCb(); }

    // decay visual tail kick
    if (f.tailKick > 0) f.tailKick = Math.max(0, f.tailKick - dt*5);
  }
}

export function drawPrey(ctx){
  // prefer-reduced-motion? Keep wiggles tiny
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t = performance.now()/1000;
  const TWO_PI = Math.PI*2;

  for(const f of PREY){
    const dir = (f.dir || (f.vx>=0?1:-1)) >= 0 ? 1 : -1;

    // tiny cute wobble (idle breathing/roll)
    const wig = reduced ? 0 : Math.sin((t + f.phase) * WIGGLE.rotFreq) * WIGGLE.rotAmp;
    const sclY = 1 + (reduced ? 0 : Math.sin((t + f.phase*0.7) * (WIGGLE.rotFreq*0.33)) * WIGGLE.scaleAmp);

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(dir, 1);
    ctx.rotate(wig);
    ctx.scale(1, sclY);

    // pass a small tailKick (0..1) to fish draw; looks extra “alive” on flee
    f.sp.draw(ctx, f.r, f.phase, f.tailKick);

    if (f.sp.hasMouth){
      ctx.strokeStyle='rgba(9,32,45,.8)'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(f.r*0.65, f.r*0.05);
      ctx.quadraticCurveTo(f.r*0.72, f.r*0.06, f.r*0.78, f.r*0.04); ctx.stroke();
    }
    ctx.restore();
  }
}
