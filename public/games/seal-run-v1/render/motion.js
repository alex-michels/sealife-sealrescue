import { baseSpeed, BAL, SIM_DT } from '../core/balance.js'

// SR-17: deterministic ornament only. Collision/pickup coordinates remain f.y.
export function fishBob(fish, timeMs, reduced = false) {
  if (reduced) return 0
  const amplitude = fish.type === 'fish_rare' ? 8 : 5
  return Math.sin(timeMs / (fish.type === 'fish_rare' ? 340 : 260) + fish.x * 0.017) * amplitude
}

// SR-23: presentation clock only. Every resource/collision still uses the same fixed sim tick.
// Steady practice spends more wall time on faster ticks, holding current travel at 120 lu/s.
export function playbackRate(state, tempo = '1', pendingBurst = false) {
  if (tempo !== 'steady') return ['0.35', '0.5', '0.75'].includes(tempo) ? Number(tempo) : 1
  const willBurst =
    pendingBurst && state.tMs >= state.burstReadyMs && state.stamina >= BAL.BURST_COST
  const burstUntil = willBurst ? state.tMs + BAL.BURST_MS : state.burstUntilMs
  const nextMs = state.tMs + SIM_DT * 1000
  const speed =
    baseSpeed(state.worldD) *
    state.speedMultiplier *
    (nextMs < burstUntil ? BAL.BURST_MULT : 1) *
    (state.buffLeftMs > 0 ? BAL.FISH_SPEED_BUFF_MULT : 1)
  return Math.min(1, 120 / speed)
}
