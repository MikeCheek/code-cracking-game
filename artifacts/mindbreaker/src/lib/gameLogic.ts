export interface GuessResult {
  exact: number;
  misplaced: number;
}

export function evaluateGuess(secret: number[], guess: number[]): GuessResult {
  const len = secret.length;
  let exact = 0;
  let misplaced = 0;

  const secretRemaining: number[] = [];
  const guessRemaining: number[] = [];

  for (let i = 0; i < len; i++) {
    if (secret[i] === guess[i]) {
      exact++;
    } else {
      secretRemaining.push(secret[i]);
      guessRemaining.push(guess[i]);
    }
  }

  for (const g of guessRemaining) {
    const idx = secretRemaining.indexOf(g);
    if (idx !== -1) {
      misplaced++;
      secretRemaining.splice(idx, 1);
    }
  }

  return { exact, misplaced };
}

export function isConsistentResponse(
  pastGuesses: { guess: number[]; response: GuessResult }[],
  secret: number[],
  len: number
): boolean {
  for (const { guess, response } of pastGuesses) {
    const computed = evaluateGuess(secret, guess);
    if (computed.exact !== response.exact || computed.misplaced !== response.misplaced) {
      return false;
    }
  }
  return true;
}

export function generateCode(length: number, allowRepeats: boolean): number[] {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const result: number[] = [];

  if (allowRepeats) {
    for (let i = 0; i < length; i++) {
      result.push(Math.floor(Math.random() * 10));
    }
  } else {
    const shuffled = [...digits].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, length);
  }

  return result;
}

export function canLie(
  claimedResponse: GuessResult,
  trueResponse: GuessResult
): boolean {
  return claimedResponse.exact !== trueResponse.exact || claimedResponse.misplaced !== trueResponse.misplaced;
}

export function detectLie(
  guess: number[],
  claimedResponse: GuessResult,
  actualSecret: number[]
): boolean {
  const trueResponse = evaluateGuess(actualSecret, guess);
  return trueResponse.exact !== claimedResponse.exact || trueResponse.misplaced !== claimedResponse.misplaced;
}
