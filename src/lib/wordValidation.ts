import type { WordLanguage } from '../types'

const VALIDATION_CACHE = new Map<string, boolean>()

const OFFLINE_WORDS: Record<WordLanguage, Set<string>> = {
  en: new Set([
    'able', 'about', 'above', 'agent', 'alert', 'apple', 'arise', 'beacon', 'battle', 'bright',
    'circle', 'clover', 'cipher', 'danger', 'dream', 'eagle', 'ember', 'forest', 'friend', 'future',
    'galaxy', 'garden', 'globe', 'golden', 'harbor', 'hidden', 'jungle', 'keeper', 'legend', 'lunar',
    'magic', 'mystic', 'night', 'orange', 'planet', 'puzzle', 'quartz', 'rocket', 'silver', 'signal',
    'silent', 'spring', 'stone', 'summer', 'sunset', 'thunder', 'tiger', 'travel', 'valley', 'victory',
    'wander', 'window', 'winter', 'yellow', 'zebra',
  ]),
  it: new Set([
    'amore', 'ancora', 'angelo', 'arancia', 'azzurro', 'bello', 'canto', 'cielo', 'cuore', 'donna',
    'fermo', 'fiore', 'fuoco', 'gatto', 'giorno', 'grano', 'lavoro', 'luna', 'mano', 'mare',
    'miele', 'notte', 'nuvola', 'ombra', 'paese', 'piano', 'pietra', 'radice', 'rosa', 'saluto',
    'scuola', 'sogno', 'strada', 'tavolo', 'tempo', 'vento', 'verde', 'viaggio', 'voce', 'zucchero',
  ]),
  es: new Set([
    'amigo', 'arena', 'azul', 'barco', 'bosque', 'cambio', 'cielo', 'costa', 'cuento', 'diente',
    'fuego', 'fuerte', 'gente', 'golpe', 'gracia', 'luz', 'mundo', 'noche', 'nube', 'oro',
    'palabra', 'plaza', 'puente', 'querer', 'rastro', 'saludo', 'sombra', 'sueno', 'tierra', 'torre',
    'trigo', 'verde', 'viaje', 'ventana', 'viento', 'zorro',
  ]),
  fr: new Set([
    'amour', 'avion', 'beau', 'bonjour', 'chose', 'ciel', 'clair', 'coeur', 'couleur', 'dragon',
    'etoile', 'feu', 'fleur', 'garde', 'givre', 'jour', 'lumiere', 'maison', 'matin', 'monde',
    'neige', 'nuit', 'orange', 'pierre', 'plume', 'port', 'raison', 'riviere', 'silence', 'soleil',
    'source', 'terre', 'tour', 'travail', 'vent', 'vivre', 'voyage',
  ]),
}

export function normalizeWordInput(value: string, maxLength: number): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}]/gu, '')
    .slice(0, maxLength)
}

function offlineHasWord(language: WordLanguage, word: string): boolean {
  return OFFLINE_WORDS[language].has(word)
}

async function validateWithDictionaryApi(language: WordLanguage, word: string): Promise<boolean> {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/${language}/${encodeURIComponent(word)}`)
  return response.ok
}

export async function isRealWord(language: WordLanguage, rawWord: string): Promise<boolean> {
  const word = rawWord.trim().normalize('NFC').toLowerCase()
  const cacheKey = `${language}:${word}`
  const cached = VALIDATION_CACHE.get(cacheKey)
  if (cached !== undefined) return cached

  if (!word) {
    VALIDATION_CACHE.set(cacheKey, false)
    return false
  }

  try {
    const onlineResult = await validateWithDictionaryApi(language, word)
    if (onlineResult) {
      VALIDATION_CACHE.set(cacheKey, true)
      return true
    }

    const offlineResult = offlineHasWord(language, word)
    VALIDATION_CACHE.set(cacheKey, offlineResult)
    return offlineResult
  } catch {
    const offlineResult = offlineHasWord(language, word)
    VALIDATION_CACHE.set(cacheKey, offlineResult)
    return offlineResult
  }
}