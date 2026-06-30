// core/sim.js — the simulation CORE, free of DOM/rendering so it can run headless.
//
// Both the live game (game.js) and the fairness test harness (tools/fairness-sim.mjs)
// drive the EXACT same code through these functions, so what the bot measures is what
// players actually get. Pure logic only: no canvas, no document, no rendering.

import { BAL, BASE } from './balance.js';
import { PREY, spawnPrey } from '../entities/prey.js';

export const ROUND_MS = 60_000; // a round is always 60s

const { hypot, min, max, sin, exp } = Math;

/**
 * Advance the seal one tick. `ctrl` is the unified control input:
 *   { px, py, active }  — pointer/touch target (world coords) + whether it's held
 *   { kx, ky }          — keyboard axis in [-1,1] (right−left, down−up)
 * Mutates `seal` (vx/vy/x/y/px/py). Identical to the original game.js seal physics.
 */
export function stepSeal(seal, ctrl, dt, world) {
  seal.px = seal.x; seal.py = seal.y;
  const kx = ctrl.kx | 0, ky = ctrl.ky | 0;

  // 1) Pointer/touch ARRIVE steering
  if (ctrl.active) {
    const dx = ctrl.px - seal.x, dy = ctrl.py - seal.y;
    const dist = hypot(dx, dy) || 1;
    const stopR = max(16, seal.r * (0.55 + min(0.1, (1.0 - min(1, BAL.diag / BASE.diag)) * 0.25)));
    const slowR = max(stopR + 60, min(BAL.diag * 0.13, 180));
    let desiredSpeed;
    if (dist <= stopR) desiredSpeed = 0;
    else if (dist < slowR) desiredSpeed = seal.maxSpeed * ((dist - stopR) / (slowR - stopR));
    else desiredSpeed = seal.maxSpeed;

    const nx = dx / dist, ny = dy / dist;
    const dvx = nx * desiredSpeed - seal.vx, dvy = ny * desiredSpeed - seal.vy;
    const maxDeltaV = seal.accel * dt;
    const dLen = hypot(dvx, dvy);
    if (dLen > 1e-4) { const k = min(1, maxDeltaV / dLen); seal.vx += dvx * k; seal.vy += dvy * k; }

    if (dist <= stopR && !(kx || ky)) {
      const damp = exp(-dt / 0.016);
      seal.vx *= damp; seal.vy *= damp;
      if (hypot(seal.vx, seal.vy) < 8) { seal.vx = 0; seal.vy = 0; }
    }
  }

  // 2) Keyboard thrust (Arrow/WASD)
  if (kx || ky) {
    const len = hypot(kx, ky) || 1;
    const thrust = seal.accel * 0.70; // KB_THRUST — keep feel as-is
    seal.vx += (kx / len) * thrust * dt;
    seal.vy += (ky / len) * thrust * dt;
  }

  // Clamp overall speed to seal.maxSpeed
  { const sp = hypot(seal.vx, seal.vy); if (sp > seal.maxSpeed) { const k = seal.maxSpeed / sp; seal.vx *= k; seal.vy *= k; } }

  // 3) Free-drift damping only when no input is active
  if (!ctrl.active && !(kx || ky)) { seal.vx *= 0.985; seal.vy *= 0.985; }

  // Integrate + clamp to world
  seal.x += seal.vx * dt; seal.y += seal.vy * dt;
  seal.x = max(seal.r, min(world.w - seal.r, seal.x));
  seal.y = max(seal.r, min(world.h - seal.r, seal.y));
}

/**
 * Spawn-control tick: top up the prey to the (time-ramped) target population at a paced
 * cadence. Returns the new spawnTimer. Identical to the original game.js spawn control.
 */
export function spawnTick(spawnTimer, dt, timeLeft, world) {
  spawnTimer -= dt;
  const progress = 1 - max(0, timeLeft) / ROUND_MS; // 0..1
  const targetPop = min(BAL.maxPreyCap, Math.round(BAL.maxPreyCap * 0.6 + progress * BAL.maxPreyCap * 0.4));
  if (PREY.length < targetPop && spawnTimer <= 0) {
    const need = targetPop - PREY.length;
    spawnPrey(world, min(2, need));
    const catchup = need > 6 ? 0.35 : 0.55;
    const diagK = BAL.diag / BASE.diag;
    spawnTimer = catchup / max(0.85, min(1.3, diagK));
  }
  return spawnTimer;
}
