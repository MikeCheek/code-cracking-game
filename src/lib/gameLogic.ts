import { Guess } from '@/types/game';

export function calculateBullsAndCows(guess: string, secret: string): { bulls: number; cows: number } {
  let bulls = 0;
  let cows = 0;
  const secretArr = secret.split('');
  const guessArr = guess.split('');
  const secretUsed = new Array(secret.length).fill(false);
  const guessUsed = new Array(guess.length).fill(false);

  for (let i = 0; i < guess.length; i++) {
    if (guessArr[i] === secretArr[i]) {
      bulls++;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < secret.length; j++) {
      if (secretUsed[j]) continue;
      if (guessArr[i] === secretArr[j]) {
        cows++;
        secretUsed[j] = true;
        guessUsed[i] = true;
        break;
      }
    }
  }

  return { bulls, cows };
}

export function generateAllCombinations(length: number, allowRepeats: boolean): string[] {
  const combinations: string[] = [];
  const digits = '0123456789';
  
  function generate(current: string) {
    if (current.length === length) {
      combinations.push(current);
      return;
    }
    for (const digit of digits) {
      if (!allowRepeats && current.includes(digit)) continue;
      generate(current + digit);
    }
  }
  
  generate('');
  return combinations;
}

export function isAnswerConsistent(
  newGuess: string,
  reportedBulls: number,
  reportedCows: number,
  previousGuesses: Guess[],
  allowRepeats: boolean
): boolean {
  const length = newGuess.length;
  const allCombinations = generateAllCombinations(length, allowRepeats);
  
  // Find combinations consistent with all previous guesses
  const consistent = allCombinations.filter(combo => {
    for (const pg of previousGuesses) {
      const { bulls, cows } = calculateBullsAndCows(pg.combination, combo);
      if (bulls !== pg.bulls || cows !== pg.cows) return false;
    }
    return true;
  });
  
  // Check if any consistent combination yields the reported bulls/cows for the new guess
  const valid = consistent.some(combo => {
    const { bulls, cows } = calculateBullsAndCows(newGuess, combo);
    return bulls === reportedBulls && cows === reportedCows;
  });
  
  return valid;
}

export function determineRPSWinner(p1: string, p2: string): 'player1' | 'player2' | 'tie' {
  if (p1 === p2) return 'tie';
  if (
    (p1 === 'rock' && p2 === 'scissors') ||
    (p1 === 'scissors' && p2 === 'paper') ||
    (p1 === 'paper' && p2 === 'rock')
  ) return 'player1';
  return 'player2';
}

function secureRandomHex(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export function generateUserId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback using crypto.getRandomValues for secure random bytes
  const hex = secureRandomHex(16);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function generateGameId(): string {
  return secureRandomHex(4).toUpperCase();
}

export const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🤖', '👾', '🦄', '🐲', '🎃', '👻', '🦋', '🐙'];
