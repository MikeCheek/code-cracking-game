import type { AudioSettings, UserProfile } from '../types'

const USER_KEY = 'mindbreaker-user-v1'
const AUDIO_KEY = 'mindbreaker-audio-v1'
const AUDIO_CONSENT_KEY = 'mindbreaker-audio-consent-v1'

const defaultAudioSettings: AudioSettings = {
  musicEnabled: false,
  sfxEnabled: false,
  musicVolume: 0.35,
  sfxVolume: 0.65,
  musicTheme: 'arcade',
}

export function loadUser(): UserProfile | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>
    if (
      typeof parsed.id === 'string' &&
      typeof parsed.username === 'string' &&
      typeof parsed.avatar === 'string'
    ) {
      return {
        id: parsed.id,
        username: parsed.username,
        avatar: parsed.avatar,
      }
    }
    return null
  } catch {
    return null
  }
}

export function saveUser(user: UserProfile): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY)
}

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function loadAudioSettings(): AudioSettings {
  const raw = localStorage.getItem(AUDIO_KEY)
  if (!raw) return defaultAudioSettings

  try {
    const parsed = JSON.parse(raw) as Partial<AudioSettings>
    return {
      musicEnabled: typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : defaultAudioSettings.musicEnabled,
      sfxEnabled: typeof parsed.sfxEnabled === 'boolean' ? parsed.sfxEnabled : defaultAudioSettings.sfxEnabled,
      musicVolume:
        typeof parsed.musicVolume === 'number' ? clampVolume(parsed.musicVolume) : defaultAudioSettings.musicVolume,
      sfxVolume: typeof parsed.sfxVolume === 'number' ? clampVolume(parsed.sfxVolume) : defaultAudioSettings.sfxVolume,
      musicTheme:
        parsed.musicTheme === 'calm' || parsed.musicTheme === 'arcade'
          ? parsed.musicTheme
          : defaultAudioSettings.musicTheme,
    }
  } catch {
    return defaultAudioSettings
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  localStorage.setItem(AUDIO_KEY, JSON.stringify(settings))
}

export function hasAudioConsent(): boolean {
  return localStorage.getItem(AUDIO_CONSENT_KEY) === 'true'
}

export function setAudioConsent(consented: boolean): void {
  localStorage.setItem(AUDIO_CONSENT_KEY, consented ? 'true' : 'false')
}
