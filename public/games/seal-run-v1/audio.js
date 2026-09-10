// SR-15: synthesised effects. No microphone, asset downloads or autoplay.
export class OceanAudio {
  constructor(enabled = false) {
    this.enabled = enabled
    this.context = null
  }
  async setEnabled(enabled) {
    this.enabled = enabled
    if (enabled) {
      const Audio = window.AudioContext || window.webkitAudioContext
      if (!Audio) {
        this.enabled = false
        return
      }
      this.context ??= new Audio()
      try {
        await this.context.resume()
      } catch {
        this.enabled = false
      }
    } else if (this.context) await this.context.suspend().catch(() => {})
  }
  play(kind) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return
    const c = this.context,
      now = c.currentTime
    const melodies = {
      fish: [660, 880],
      burst: [220, 440, 660],
      'life-lost': [180, 110],
      'rock-bounce': [130],
      'debris-enter': [170, 145],
      finished: [523, 659, 784, 1046],
      dead: [330, 262, 196],
    }
    for (const [index, hz] of (melodies[kind] ?? []).entries()) {
      const o = c.createOscillator(),
        gain = c.createGain(),
        start = now + index * 0.075
      o.type = kind === 'life-lost' ? 'triangle' : 'sine'
      o.frequency.setValueAtTime(hz, start)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.075, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18)
      o.connect(gain)
      gain.connect(c.destination)
      o.start(start)
      o.stop(start + 0.2)
      o.onended = () => {
        o.disconnect()
        gain.disconnect()
      }
    }
  }
}
