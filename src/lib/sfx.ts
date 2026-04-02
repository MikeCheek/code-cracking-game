import type { AudioSettings } from '../types'

let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let musicGain: GainNode | null = null
let sfxGain: GainNode | null = null
let musicLoopTimer: number | null = null

let currentSettings: AudioSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.35,
  sfxVolume: 0.65,
  musicTheme: 'arcade',
  uiTheme: 'neon-pink',
}

type MusicThemeConfig = {
  barMs: number
  beatSec: number
  melody: number[]
  bass: number[]
  melodyWave: OscillatorType
  bassWave: OscillatorType
  melodyGain: number
  bassGain: number
}

const MUSIC_THEMES: Record<'arcade' | 'calm', MusicThemeConfig> = {
  arcade: {
    barMs: 4000,
    beatSec: 0.5,
    melody: [261.63, 329.63, 392.0, 329.63, 440.0, 392.0, 329.63, 293.66],
    bass: [130.81, 146.83, 164.81, 146.83],
    melodyWave: 'sine',
    bassWave: 'triangle',
    melodyGain: 0.06,
    bassGain: 0.04,
  },
  calm: {
    barMs: 6000,
    beatSec: 0.75,
    melody: [220.0, 246.94, 261.63, 293.66, 329.63, 293.66, 261.63, 246.94],
    bass: [110.0, 123.47, 130.81, 123.47],
    melodyWave: 'sine',
    bassWave: 'sine',
    melodyGain: 0.045,
    bassGain: 0.03,
  },
}

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
    masterGain = audioContext.createGain()
    musicGain = audioContext.createGain()
    sfxGain = audioContext.createGain()

    musicGain.connect(masterGain)
    sfxGain.connect(masterGain)
    masterGain.connect(audioContext.destination)

    applySettingsToGains()
  }
  return audioContext
}

function applySettingsToGains(): void {
  if (!musicGain || !sfxGain || !masterGain) return
  musicGain.gain.value = currentSettings.musicEnabled ? clampVolume(currentSettings.musicVolume) : 0
  sfxGain.gain.value = currentSettings.sfxEnabled ? clampVolume(currentSettings.sfxVolume) : 0
  masterGain.gain.value = 0.9
}

function playTone(frequency: number, durationMs: number, gain = 0.05): void {
  const ctx = getContext()
  if (!sfxGain || !currentSettings.sfxEnabled || currentSettings.sfxVolume <= 0) {
    return
  }

  const oscillator = ctx.createOscillator()
  const volume = ctx.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.value = frequency
  volume.gain.value = gain

  oscillator.connect(volume)
  volume.connect(sfxGain)

  const now = ctx.currentTime
  oscillator.start(now)
  oscillator.stop(now + durationMs / 1000)
}

function playMusicNote(
  frequency: number,
  startAt: number,
  durationSec: number,
  peakGain = 0.08,
  wave: OscillatorType = 'sine',
): void {
  const ctx = getContext()
  if (!musicGain || !currentSettings.musicEnabled || currentSettings.musicVolume <= 0) {
    return
  }

  const oscillator = ctx.createOscillator()
  const envelope = ctx.createGain()

  oscillator.type = wave
  oscillator.frequency.setValueAtTime(frequency, startAt)

  envelope.gain.setValueAtTime(0.0001, startAt)
  envelope.gain.linearRampToValueAtTime(peakGain, startAt + 0.08)
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec)

  oscillator.connect(envelope)
  envelope.connect(musicGain)

  oscillator.start(startAt)
  oscillator.stop(startAt + durationSec + 0.02)
}

function scheduleMusicBar(): void {
  if (!currentSettings.musicEnabled || currentSettings.musicVolume <= 0) {
    return
  }

  const ctx = getContext()
  const start = ctx.currentTime + 0.04
  const theme = MUSIC_THEMES[currentSettings.musicTheme]
  const beat = theme.beatSec

  theme.melody.forEach((frequency, index) => {
    playMusicNote(frequency, start + index * beat, beat * 0.9, theme.melodyGain, theme.melodyWave)
  })

  theme.bass.forEach((frequency, index) => {
    playMusicNote(frequency, start + index * beat * 2, beat * 1.9, theme.bassGain, theme.bassWave)
  })
}

function startMusicLoop(): void {
  if (musicLoopTimer !== null || !currentSettings.musicEnabled) {
    return
  }

  const theme = MUSIC_THEMES[currentSettings.musicTheme]
  scheduleMusicBar()
  musicLoopTimer = window.setInterval(() => {
    scheduleMusicBar()
  }, theme.barMs)
}

function stopMusicLoop(): void {
  if (musicLoopTimer !== null) {
    window.clearInterval(musicLoopTimer)
    musicLoopTimer = null
  }
}

export function configureAudio(nextSettings: AudioSettings): void {
  const previousTheme = currentSettings.musicTheme

  currentSettings = {
    musicEnabled: nextSettings.musicEnabled,
    sfxEnabled: nextSettings.sfxEnabled,
    musicVolume: clampVolume(nextSettings.musicVolume),
    sfxVolume: clampVolume(nextSettings.sfxVolume),
    musicTheme: nextSettings.musicTheme,
    uiTheme: nextSettings.uiTheme,
  }

  applySettingsToGains()

  if (previousTheme !== currentSettings.musicTheme) {
    stopMusicLoop()
  }

  if (currentSettings.musicEnabled) {
    startMusicLoop()
  } else {
    stopMusicLoop()
  }
}

export function getAudioSettings(): AudioSettings {
  return { ...currentSettings }
}

export async function ensureAudioReady(): Promise<void> {
  const ctx = getContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }

  if (currentSettings.musicEnabled) {
    startMusicLoop()
  }
}

export function playClick(): void {
  playTone(540, 65)
}

export function playSuccess(): void {
  playTone(620, 90)
  window.setTimeout(() => playTone(890, 120), 95)
}

export function playAlert(): void {
  playTone(260, 120, 0.07)
}

export function playLie(): void {
  playTone(420, 90, 0.06)
  window.setTimeout(() => playTone(300, 110, 0.07), 85)
  window.setTimeout(() => playTone(190, 150, 0.08), 185)
}
