export type GamePhase =
  | "lobby"
  | "setup"
  | "rps"
  | "set_code"
  | "playing"
  | "ended";

export type RPSChoice = "rock" | "paper" | "scissors";

export interface Player {
  id: string;
  username: string;
  avatar: string;
  score: number;
  penaltyCount: number;
}

export interface GuessEntry {
  guess: number[];
  response: { exact: number; misplaced: number };
  timestamp: number;
  playerId: string;
}

export interface RPSRound {
  player1Choice?: RPSChoice;
  player2Choice?: RPSChoice;
  winner?: string;
  ties?: number;
}

export interface GameSettings {
  codeLength: number;
  allowRepeats: boolean;
  password?: string;
}

export interface Game {
  id: string;
  hostId: string;
  guestId?: string;
  player1: Player;
  player2?: Player;
  phase: GamePhase;
  settings: GameSettings;
  rps?: RPSRound;
  currentTurn?: string;
  guesses: GuessEntry[];
  player1CodeSet?: boolean;
  player2CodeSet?: boolean;
  winner?: string;
  createdAt: number;
  updatedAt: number;
  inviteCode: string;
}

export const PREDEFINED_AVATARS = [
  "🦊",
  "🐺",
  "🦁",
  "🐯",
  "🦅",
  "🦉",
  "🐉",
  "🦄",
  "🦋",
  "🐙",
  "🦑",
  "🦈",
  "🐬",
  "🦚",
  "🦜",
  "🦩",
  "🧙",
  "🧝",
  "🧜",
  "🧞",
  "👾",
  "🤖",
  "👻",
  "💀",
];
