let audioContext: AudioContext | null = null

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function playTone(frequency: number, durationMs: number, gain = 0.05): void {
  const ctx = getContext()
  const oscillator = ctx.createOscillator()
  const volume = ctx.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.value = frequency
  volume.gain.value = gain

  oscillator.connect(volume)
  volume.connect(ctx.destination)

  const now = ctx.currentTime
  oscillator.start(now)
  oscillator.stop(now + durationMs / 1000)
}

export function playClick(): void {
  playTone(540, 65)
}

export function playSuccess(): void {
  playTone(620, 90)
  setTimeout(() => playTone(890, 120), 95)
}

export function playAlert(): void {
  playTone(260, 120, 0.07)
}
