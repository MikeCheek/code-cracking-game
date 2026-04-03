import type { WordLanguage } from './types'

export const MAX_PENALTIES = 3
export const DEFAULT_GAME_MODE = 'numbers' as const
export const DEFAULT_WORD_LANGUAGE: WordLanguage = 'en'
export const MAX_WORD_CODE_LENGTH = 10

export const WORD_LANGUAGE_OPTIONS: WordLanguage[] = ['en', 'it', 'es', 'fr']

export const WORD_LANGUAGE_LABELS: Record<WordLanguage, string> = {
  en: 'English',
  it: 'Italian',
  es: 'Spanish',
  fr: 'French',
}

export const AVATARS = [
  '🤖',
  '🦊',
  '🐼',
  '🐸',
  '🐙',
  '🦉',
  '🐯',
  '🦄',
  '🐵',
  '🐧',
  '🦁',
  '🐺',
  '🐰',
  '🐻',
  '🦝',
  '🐱',
  '🐶',
  '🦋',
  '🌟',
  '⚡',
  '🐲',
  '🐳',
  '🐬',
  '🐢',
  '🦥',
  '🐞',
  '🐝',
  '🦇',
  '🧩',
  '🎯',
]

export const DEFAULT_CODE_LENGTH = 4
