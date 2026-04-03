export type GameStatus = 'waiting' | 'rps' | 'secrets' | 'playing' | 'finished'

export type RpsChoice = 'rock' | 'paper' | 'scissors'
export type GameMode = 'numbers' | 'words'
export type WordLanguage = 'en' | 'it' | 'es' | 'fr'

export interface UserProfile {
  id: string
  username: string
  avatar: string
}

export interface AudioSettings {
  musicEnabled: boolean
  sfxEnabled: boolean
  musicVolume: number
  sfxVolume: number
  musicTheme: 'arcade' | 'calm'
  uiTheme: 'neon-pink' | 'midnight-purple' | 'arcade-cyan' | 'sunset-pop'
}

export interface PlayerProfile extends UserProfile {
  joinedAt: number
}

export interface RoomSettings {
  gameMode?: GameMode
  wordLanguage?: WordLanguage
  codeLength: number
  allowDuplicates: boolean
  isPrivate: boolean
  allowLies: boolean
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
  roomName: string
  createdAt: number
  status: GameStatus
  hostId: string
  guestId?: string
  settings: RoomSettings
  profiles: Record<string, PlayerProfile>
  spectatorProfiles?: Record<string, PlayerProfile>
  penalties: Record<string, number>
  rpsChoices?: Record<string, RpsChoice>
  rpsRound: number
  rpsDeadlineAt?: number
  lastRpsResult?: {
    round: number
    hostChoice: RpsChoice
    guestChoice: RpsChoice
    winner: 'host' | 'guest' | 'tie'
    at: number
  }
  starterPlayerId?: string
  currentTurnPlayerId?: string
  secrets?: Record<string, string>
  lockedSecrets?: Record<string, boolean>
  pendingGuess?: PendingGuess
  guessHistory?: Record<string, GuessRecord>
  quickEmotes?: Record<string, { value: string; at: number }>
  winnerId?: string
  loserId?: string
  message?: string
  pausedByDisconnect?: {
    playerId: string
    at: number
  }
  replayVotes?: Record<string, boolean>
}

export interface LobbyRoomSummary {
  id: string
  roomName: string
  status: GameStatus
  gameMode: GameMode
  wordLanguage?: WordLanguage
  isPrivate: boolean
  hostId: string
  hostName: string
  codeLength: number
  allowDuplicates: boolean
  hasGuest: boolean
  createdAt: number
}
