export type GameStatus = 'waiting' | 'rps' | 'setup' | 'playing' | 'finished';
export type RPSChoice = 'rock' | 'paper' | 'scissors';

export interface Player {
  userId: string;
  username: string;
  avatar: string;
  combination?: string;
  ready: boolean;
}

export interface RPSState {
  player1Choice?: RPSChoice;
  player2Choice?: RPSChoice;
  winner?: string; // userId or 'tie'
}

export interface Guess {
  byPlayer: string; // userId
  combination: string;
  bulls: number;
  cows: number;
  answeredBy: string; // userId
  lied: boolean;
  timestamp: number;
}

export interface Game {
  id: string;
  status: GameStatus;
  combinationLength: 4 | 5;
  allowRepeats: boolean;
  password?: string;
  createdAt: number;
  createdBy: string;
  player1: Player;
  player2?: Player;
  rps: RPSState;
  currentTurn: string; // userId
  guesses: Guess[];
  winner?: string; // userId
  lies: Record<string, number>;
}

export interface User {
  userId: string;
  username: string;
  avatar: string;
}
