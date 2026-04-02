export type GameStatus = 'waiting' | 'rps' | 'secrets' | 'playing' | 'finished'

export type RpsChoice = 'rock' | 'paper' | 'scissors'

export interface UserProfile {
  id: string
  username: string
  avatar: string
}

export interface PlayerProfile extends UserProfile {
  joinedAt: number
}

export interface RoomSettings {
  codeLength: number
  allowDuplicates: boolean
  isPrivate: boolean
  passwordHash?: string
}

export interface PendingGuess {
  fromPlayerId: string
  guess: string
  turnNumber: number
  at: number
}

export interface GuessRecord {
  id: string
  fromPlayerId: string
  toPlayerId: string
  guess: string
  claimedBulls: number
  claimedCows: number
  actualBulls: number
  actualCows: number
  lieDetected: boolean
  turnNumber: number
  at: number
}

export interface RoomData {
  id: string
  createdAt: number
  status: GameStatus
  hostId: string
  guestId?: string
  settings: RoomSettings
  profiles: Record<string, PlayerProfile>
  penalties: Record<string, number>
  rpsChoices?: Record<string, RpsChoice>
  rpsRound: number
  starterPlayerId?: string
  currentTurnPlayerId?: string
  secrets?: Record<string, string>
  pendingGuess?: PendingGuess
  guessHistory?: Record<string, GuessRecord>
  winnerId?: string
  loserId?: string
  message?: string
}

export interface LobbyRoomSummary {
  id: string
  status: GameStatus
  isPrivate: boolean
  hostName: string
  codeLength: number
  allowDuplicates: boolean
  hasGuest: boolean
  createdAt: number
}
