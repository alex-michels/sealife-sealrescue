// render/scenery.js
// Calm underwater scene with higher-contrast vertical gradient.
// Dark-green seaweeds, short greens near the seabed, and gentle motion.

let bubbles = [];
let tallKelp = [], shortKelp = [], grassTufts = [], lettuce = [], rocks = [];
let seaGrad = null, topGrad = null, botGrad = null;

function makeSeaGradient(ctx, world){
  const g = ctx.createLinearGradient(0, 0, 0, world.h);
  // brighter near surface → darker at depth
  g.addColorStop(0.00, '#0e6f9f');
  g.addColorStop(0.25, '#0a537b');
  g.addColorStop(0.60, '#073b56');
  g.addColorStop(1.00, '#021a28');
  return g;
}

export function initScenery(world, ctx){
// main sea gradient (full height)
  seaGrad = makeSeaGradient(ctx, world);

  // one-time overlays (recomputed on resize only)
  const topH = Math.min(160, world.h*0.22);
  topGrad = ctx.createLinearGradient(0, 0, 0, topH);
  topGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
  topGrad.addColorStop(1, 'rgba(255,255,255,0.00)');

  const botY = world.h*0.68;
  botGrad = ctx.createLinearGradient(0, botY, 0, world.h);
  botGrad.addColorStop(0, 'rgba(0,0,0,0.00)');
  botGrad.addColorStop(1, 'rgba(0,0,0,0.25)');

  // bubbles
  bubbles = Array.from({length: 28}, () => ({
    x: Math.random()*world.w, y: Math.random()*world.h,
    r: 1 + Math.random()*3, s: 8 + Math.random()*12
  }));

  // rocks
  const rockCount = Math.max(2, Math.round(world.w/500));
  rocks = Array.from({length: rockCount}, () => ({
    x: Math.random()*world.w, w: 60+Math.random()*120, h: 20+Math.random()*30
  }));

  // Tall kelp (dark-green ribbons)
  const kelpCols = Math.max(3, Math.round(world.w/320));
  tallKelp = Array.from({length: kelpCols}, (_, i) => ({
    x: (i+0.5)*world.w/(kelpCols+1),
    h: world.h*(0.28 + Math.random()*0.28),
    // darker, kelp-like green tones
    c: `rgba(26, 87, 62, ${0.55 + Math.random()*0.15})`,
    swayPhase: Math.random()*Math.PI*2
  }));

  // Shorter kelp/seaweeds near the bottom (denser, low height)
  const shortCount = Math.max(4, Math.round(world.w/260));
  shortKelp = Array.from({length: shortCount}, () => ({
    x: Math.random()*world.w,
    h: world.h*(0.12 + Math.random()*0.12),
    c: `rgba(30, 100, 68, ${0.55 + Math.random()*0.2})`,
    swayPhase: Math.random()*Math.PI*2
  }));

  // Eelgrass tufts (Zostera): thin dark-green blades in clumps
  const tuftCount = Math.max(5, Math.round(world.w/280));
  grassTufts = Array.from({length: tuftCount}, () => ({
    x: Math.random()*world.w,
    blades: 6 + (Math.random()*5|0),
    h: world.h*(0.10 + Math.random()*0.10),
    width: 10 + Math.random()*18,
    // deep eelgrass tone
    c: `rgba(24, 102, 74, ${0.65 + Math.random()*0.2})`,
    phase: Math.random()*Math.PI*2
  }));

  // Sea lettuce (Ulva): small translucent bright-green patches anchored near rocks
  const lettCount = Math.max(2, Math.round(world.w/600));
  lettuce = Array.from({length: lettCount}, () => ({
    x: Math.random()*world.w,
    y: world.h - (10 + Math.random()*22),
    r: 12 + Math.random()*22,
    // two tones for subtle variegation
    fill: 'rgba(95, 205, 95, 0.35)',
    edge: 'rgba(55, 150, 70, 0.45)',
    wobble: Math.random()*Math.PI*2
  }));
}

export function drawBackground(ctx, world, t, reducedMotion=false){
    // Sea gradient
    ctx.fillStyle = seaGrad || '#032538';
    ctx.fillRect(0, 0, world.w, world.h);

    // Surface glow (topGrad) — compute once in initScenery
    const topH = Math.min(160, world.h*0.22);
    ctx.fillStyle = topGrad || '#0000';
    ctx.fillRect(0, 0, world.w, topH);

    // Depth vignette (botGrad)
    const botY = world.h*0.68;
    ctx.fillStyle = botGrad || '#0000';
    ctx.fillRect(0, botY, world.w, world.h - botY);

  // Bubbles (slow rise)
  ctx.globalAlpha = 0.15;
  for(const b of bubbles){
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fillStyle = '#cbefff'; ctx.fill();
    b.y -= (reducedMotion?0.2:0.6) + b.s*0.005;
    if (b.y < -10) { b.y = world.h + 10; b.x = Math.random()*world.w; }
  }
  ctx.globalAlpha = 1;

  // Tall kelp sway
  ctx.lineWidth = 6;
  for(const k of tallKelp){
    const sway = reducedMotion ? 0 : Math.sin(t + k.swayPhase) * 18;
    ctx.strokeStyle = k.c;
    ctx.beginPath();
    ctx.moveTo(k.x, world.h);
    ctx.quadraticCurveTo(k.x + sway*0.3, world.h - k.h*0.6, k.x + sway, world.h - k.h);
    ctx.stroke();
  }

  // Short kelp / low seaweeds (closer to seabed, slightly thinner)
  ctx.lineWidth = 5;
  for(const s of shortKelp){
    const sway = reducedMotion ? 0 : Math.sin(t*1.1 + s.swayPhase) * 12;
    ctx.strokeStyle = s.c;
    ctx.beginPath();
    ctx.moveTo(s.x, world.h);
    ctx.quadraticCurveTo(s.x + sway*0.35, world.h - s.h*0.6, s.x + sway*0.8, world.h - s.h);
    ctx.stroke();
  }

  // Eelgrass (Zostera) tufts: multiple thin blades per clump
  for(const g of grassTufts){
    const amp = reducedMotion ? 0 : 10;
    const cx = g.x, baseY = world.h;
    const step = g.width / (g.blades-1);
    ctx.strokeStyle = g.c;
    ctx.lineWidth = 2;
    for(let i=0;i<g.blades;i++){
      const x = cx - g.width/2 + i*step;
      const phase = g.phase + i*0.3;
      const sway = Math.sin(t*1.2 + phase) * amp;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + sway*0.2, baseY - g.h*0.55, x + sway*0.6, baseY - g.h);
      ctx.stroke();
    }
  }

  // Seabed rocks
  ctx.fillStyle = 'rgba(30, 60, 70, 0.56)';
  for(const r of rocks){
    ctx.beginPath();
    ctx.ellipse(r.x, world.h-8, r.w, r.h, 0, 0, Math.PI*2);
    ctx.fill();
  }
}