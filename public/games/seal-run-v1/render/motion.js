// SR-17: deterministic ornament only. Collision/pickup coordinates remain f.y.
export function fishBob(fish, timeMs, reduced = false) {
  if (reduced) return 0
  const amplitude = fish.type === 'fish_rare' ? 8 : 5
  return Math.sin(timeMs / (fish.type === 'fish_rare' ? 340 : 260) + fish.x * 0.017) * amplitude
}
