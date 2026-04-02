import { AVATARS } from '../constants'

const ADJECTIVES = ['Swift', 'Bold', 'Clever', 'Bright', 'Calm', 'Fierce', 'Keen', 'Quick', 'Wise', 'Deft']
const NOUNS = ['Hawk', 'Tiger', 'Fox', 'Wolf', 'Eagle', 'Raven', 'Lynx', 'Puma', 'Cobra', 'Viper']

export function generateRandomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]
}

export function generateRandomUsername(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const number = Math.floor(100 + Math.random() * 900)
  return `${adjective}${noun}${number}`
}
