export function isValidCombination(
  value: string,
  codeLength: number,
  allowDuplicates: boolean,
): boolean {
  if (!/^\d+$/.test(value)) return false
  if (value.length !== codeLength) return false
  if (!allowDuplicates) {
    const digits = new Set(value.split(''))
    if (digits.size !== value.length) return false
  }
  return true
}

export function evaluateGuess(secret: string, guess: string): { bulls: number; cows: number } {
  let bulls = 0
  const secretCount: Record<string, number> = {}
  const guessCount: Record<string, number> = {}

  for (let i = 0; i < secret.length; i += 1) {
    if (secret[i] === guess[i]) {
      bulls += 1
    } else {
      secretCount[secret[i]] = (secretCount[secret[i]] ?? 0) + 1
      guessCount[guess[i]] = (guessCount[guess[i]] ?? 0) + 1
    }
  }

  let cows = 0
  for (const digit of Object.keys(guessCount)) {
    cows += Math.min(guessCount[digit] ?? 0, secretCount[digit] ?? 0)
  }

  return { bulls, cows }
}

export function decideRpsWinner(a: 'rock' | 'paper' | 'scissors', b: 'rock' | 'paper' | 'scissors'): 0 | 1 | 2 {
  if (a === b) return 0
  if (
    (a === 'rock' && b === 'scissors') ||
    (a === 'paper' && b === 'rock') ||
    (a === 'scissors' && b === 'paper')
  ) {
    return 1
  }
  return 2
}
