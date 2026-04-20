import {
  child,
  get,
  onValue,
  push,
  ref,
  runTransaction,
  set,
  type Unsubscribe
} from 'firebase/database'
import { DEFAULT_WORD_LANGUAGE, MAX_PENALTIES } from '../constants'
import { db } from './firebase'
import {
  decideRpsWinner,
  evaluateGuess,
  isValidCombination
} from '../utils/game'
import { normalizeRoomName } from '../utils/roomName'
import type {
  GuessRecord,
  LobbyRoomSummary,
  PastGameSummary,
  RoomData,
  RoomSettings,
  RpsChoice,
  UserProfile
} from '../types'
import { isRealWord, normalizeWordInput } from './wordValidation'

const roomsRef = ref(db, 'rooms')
const RPS_ROUND_MS = 5000
const RPS_CHOICES: RpsChoice[] = ['rock', 'paper', 'scissors']

function getTurnDurationMs (room: RoomData): number | null {
  const seconds = room.settings.maxTurnSeconds
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null
  return Math.round(seconds * 1000)
}

function setNextTurnDeadline (room: RoomData, actorId: string): void {
  const durationMs = getTurnDurationMs(room)
  if (!durationMs) {
    delete room.turnDeadlineAt
    delete room.turnActorPlayerId
    return
  }

  room.turnActorPlayerId = actorId
  room.turnDeadlineAt = Date.now() + durationMs
}

export function roomRef (roomId: string) {
  return child(roomsRef, roomId)
}

function randomRpsChoice (): RpsChoice {
  return RPS_CHOICES[Math.floor(Math.random() * RPS_CHOICES.length)]
}

function resolveRpsRound (room: RoomData): RoomData {
  if (!room.guestId) return room

  room.rpsChoices = room.rpsChoices ?? {}
  const hostChoice = room.rpsChoices[room.hostId] ?? randomRpsChoice()
  const guestChoice = room.rpsChoices[room.guestId] ?? randomRpsChoice()

  const winner = decideRpsWinner(hostChoice, guestChoice)
  room.lastRpsResult = {
    round: room.rpsRound,
    hostChoice,
    guestChoice,
    winner: winner === 0 ? 'tie' : winner === 1 ? 'host' : 'guest',
    at: Date.now()
  }

  delete room.rpsDeadlineAt
  room.rpsChoices = {}

  if (winner === 0) {
    room.rpsRound += 1
    room.rpsDeadlineAt = Date.now() + RPS_ROUND_MS
    room.message = 'RPS tie! Play again.'
    return room
  }

  room.starterPlayerId = winner === 1 ? room.hostId : room.guestId
  room.currentTurnPlayerId = room.starterPlayerId
  room.status = 'playing'
  setNextTurnDeadline(room, room.currentTurnPlayerId)
  room.message = 'RPS finished. Game started.'
  return room
}

async function validateCodeForRoom (
  value: string,
  settings: RoomSettings,
  label: 'secret' | 'guess'
): Promise<string> {
  const gameMode = settings.gameMode ?? 'numbers'

  if (gameMode === 'words') {
    const normalizedWord = normalizeWordInput(value, settings.codeLength)
    if (normalizedWord.length !== settings.codeLength) {
      throw new Error(`Invalid ${label} for this room settings`)
    }

    const language = settings.wordLanguage ?? DEFAULT_WORD_LANGUAGE
    const isValidWord = await isRealWord(language, normalizedWord)
    if (!isValidWord) {
      throw new Error(`That ${label} is not a valid dictionary word`)
    }

    return normalizedWord
  }

  if (
    !isValidCombination(value, settings.codeLength, settings.allowDuplicates)
  ) {
    throw new Error(`Invalid ${label} for this room settings`)
  }

  return value
}

async function sha256 (value: string): Promise<string> {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function createRoom (
  user: UserProfile,
  settings: Omit<RoomSettings, 'passwordHash'>,
  password: string,
  roomName: string
): Promise<string> {
  // Keep only one active room per host by deleting older active rooms before creating a new one.
  const existingByHost = await getActiveHostRoomIds(user.id)
  await Promise.all(existingByHost.map(id => set(roomRef(id), null)))

  const newRoom = push(roomsRef)
  if (!newRoom.key) {
    throw new Error('Unable to create room id')
  }

  const normalizedPassword = password.trim()
  const passwordHash =
    settings.isPrivate && normalizedPassword
      ? await sha256(normalizedPassword)
      : undefined
  const normalizedRoomName = normalizeRoomName(roomName, user.username)

  const payload: Omit<RoomData, 'id'> = {
    roomName: normalizedRoomName,
    createdAt: Date.now(),
    status: 'waiting',
    hostId: user.id,
    settings: {
      ...settings,
      ...(passwordHash ? { passwordHash } : {})
    },
    profiles: {
      [user.id]: {
        ...user,
        joinedAt: Date.now()
      }
    },
    penalties: {
      [user.id]: 0
    },
    rpsRound: 1
  }

  await set(newRoom, payload)
  return newRoom.key
}

export async function joinRoom (
  roomId: string,
  user: UserProfile,
  password: string
): Promise<void> {
  const currentRef = roomRef(roomId)
  const normalizedPassword = password.trim()
  const passwordHash = normalizedPassword
    ? await sha256(normalizedPassword)
    : undefined

  const tx = await runTransaction(currentRef, (room: RoomData | null) => {
    if (!room) {
      return room
    }

    const isHostRejoin = room.hostId === user.id
    const isGuestRejoin = room.guestId === user.id
    const isParticipantRejoin = isHostRejoin || isGuestRejoin

    if (room.guestId && room.guestId !== user.id && !isParticipantRejoin) {
      return room
    }

    if (
      !isParticipantRejoin &&
      room.settings.isPrivate &&
      (room.settings.passwordHash ?? '') !== (passwordHash ?? '')
    ) {
      throw new Error('Wrong room password')
    }

    if (!room.guestId && !isHostRejoin) {
      room.guestId = user.id
      room.status = 'secrets'
    }

    room.profiles[user.id] = {
      ...user,
      joinedAt: Date.now()
    }

    room.penalties[user.id] = room.penalties[user.id] ?? 0
    if (room.pausedByDisconnect?.playerId === user.id) {
      delete room.pausedByDisconnect
      room.message = `${user.username} rejoined. Match resumed.`
    } else {
      room.message = `${user.username} joined the room. Both players can lock their secrets.`
    }

    return room
  })

  if (!tx.committed) {
    throw new Error('Could not join this room')
  }
}

export async function joinOwnRoomAsGuest (
  roomId: string,
  hostUserId: string,
  guestProfile: UserProfile
): Promise<void> {
  const currentRef = roomRef(roomId)

  const tx = await runTransaction(currentRef, (room: RoomData | null) => {
    if (!room) {
      return room
    }

    if (room.hostId !== hostUserId) {
      throw new Error('Only the host can enable same-phone mode for this room')
    }

    if (room.guestId && room.guestId !== guestProfile.id) {
      throw new Error('Room already has a guest')
    }

    if (!room.guestId) {
      room.guestId = guestProfile.id
      room.status = 'secrets'
    }

    room.profiles[guestProfile.id] = {
      ...guestProfile,
      joinedAt: Date.now()
    }

    room.penalties[guestProfile.id] = room.penalties[guestProfile.id] ?? 0
    room.message = `${guestProfile.username} joined in same-phone mode. Both players can lock their secrets.`

    return room
  })

  if (!tx.committed) {
    throw new Error('Could not enable same-phone mode')
  }
}

export async function joinRoomAsSpectator (
  roomId: string,
  user: UserProfile
): Promise<void> {
  const currentRef = roomRef(roomId)

  const tx = await runTransaction(currentRef, (room: RoomData | null) => {
    if (!room) return room
    if (room.status === 'finished') return room

    if (room.hostId === user.id || room.guestId === user.id) {
      return room
    }

    room.spectatorProfiles = room.spectatorProfiles ?? {}
    room.spectatorProfiles[user.id] = {
      ...user,
      joinedAt: Date.now()
    }
    room.message = `${user.username} is watching the match`
    return room
  })

  if (!tx.committed) {
    throw new Error('Could not join as spectator')
  }
}

export function subscribeRoom (
  roomId: string,
  callback: (room: RoomData | null) => void
): Unsubscribe {
  const currentRef = roomRef(roomId)
  return onValue(currentRef, snapshot => {
    const value = snapshot.val() as Omit<RoomData, 'id'> | null
    if (!value) {
      callback(null)
      return
    }
    callback({
      id: roomId,
      ...value,
      roomName:
        value.roomName ??
        `${value.profiles[value.hostId]?.username ?? 'Host'}'s Room`
    })
  })
}

export function subscribeLobby (
  callback: (rooms: LobbyRoomSummary[]) => void
): Unsubscribe {
  return onValue(roomsRef, snapshot => {
    const value = snapshot.val() as Record<string, Omit<RoomData, 'id'>> | null
    if (!value) {
      callback([])
      return
    }

    const list = Object.entries(value)
      .map(([id, room]) => ({
        id,
        roomName:
          room.roomName ??
          `${room.profiles[room.hostId]?.username ?? 'Host'}'s Room`,
        status: room.status,
        gameMode: room.settings.gameMode ?? 'numbers',
        wordLanguage: room.settings.wordLanguage,
        isPrivate: room.settings.isPrivate,
        hostId: room.hostId,
        hostName: room.profiles[room.hostId]?.username ?? 'Host',
        codeLength: room.settings.codeLength,
        allowDuplicates: room.settings.allowDuplicates,
        maxTurnSeconds: room.settings.maxTurnSeconds,
        hasGuest: Boolean(room.guestId),
        createdAt: room.createdAt
      }))
      .sort((a, b) => b.createdAt - a.createdAt)

    callback(list)
  })
}

export function subscribePastGames (
  userId: string,
  callback: (games: PastGameSummary[]) => void
): Unsubscribe {
  return onValue(roomsRef, snapshot => {
    const value = snapshot.val() as Record<string, Omit<RoomData, 'id'>> | null
    if (!value) {
      callback([])
      return
    }

    const list = Object.entries(value)
      .map(([id, room]): PastGameSummary | null => {
        if (room.status !== 'finished') return null

        const isHost = room.hostId === userId
        const isGuest = room.guestId === userId
        if (!isHost && !isGuest) return null

        const myRole = isHost ? 'host' : 'guest'
        const opponentId = isHost ? room.guestId : room.hostId
        const opponentName = opponentId
          ? room.profiles[opponentId]?.username ?? 'Unknown player'
          : 'No opponent'

        const guessHistory = Object.values(room.guessHistory ?? {})
        const turns = guessHistory.length
        const lastTurnAt =
          guessHistory.length > 0
            ? Math.max(...guessHistory.map(record => record.at))
            : room.createdAt

        const myLiesDetected = guessHistory.filter(
          record => record.toPlayerId === userId && record.lieDetected
        ).length
        const opponentLiesDetected = opponentId
          ? guessHistory.filter(
              record => record.toPlayerId === opponentId && record.lieDetected
            ).length
          : 0

        const result: PastGameSummary['result'] = room.winnerId
          ? room.winnerId === userId
            ? 'win'
            : 'loss'
          : 'unknown'

        return {
          id,
          roomName:
            room.roomName ??
            `${room.profiles[room.hostId]?.username ?? 'Host'}'s Room`,
          playedAt: lastTurnAt,
          result,
          myRole,
          opponentName,
          gameMode: room.settings.gameMode ?? 'numbers',
          wordLanguage: room.settings.wordLanguage,
          codeLength: room.settings.codeLength,
          allowDuplicates: room.settings.allowDuplicates,
          allowLies: room.settings.allowLies,
          isPrivate: room.settings.isPrivate,
          turns,
          myLiesDetected,
          opponentLiesDetected,
          myPenalties: room.penalties[userId] ?? 0,
          opponentPenalties: opponentId ? room.penalties[opponentId] ?? 0 : 0,
          winnerName: room.winnerId
            ? room.profiles[room.winnerId]?.username
            : undefined,
          message: room.message
        }
      })
      .filter((item): item is PastGameSummary => Boolean(item))
      .sort((a, b) => b.playedAt - a.playedAt)

    callback(list)
  })
}

async function getActiveHostRoomIds (hostId: string): Promise<string[]> {
  const snapshot = await get(roomsRef)
  if (!snapshot.exists()) return []

  const value = snapshot.val() as Record<string, Omit<RoomData, 'id'>>
  return Object.entries(value)
    .filter(([, room]) => room.hostId === hostId && room.status !== 'finished')
    .map(([id]) => id)
}

export async function deleteRoom (
  roomId: string,
  userId: string
): Promise<void> {
  const targetRef = roomRef(roomId)

  const tx = await runTransaction(targetRef, (room: RoomData | null) => {
    if (!room) return room
    if (room.hostId !== userId) {
      throw new Error('Only the host can delete this room')
    }
    return null
  })

  if (!tx.committed) {
    throw new Error('Could not delete room')
  }
}

export async function leaveRoom (roomId: string, userId: string): Promise<void> {
  const targetRef = roomRef(roomId)

  const tx = await runTransaction(targetRef, (room: RoomData | null) => {
    if (!room) return room

    if (room.spectatorProfiles?.[userId]) {
      delete room.spectatorProfiles[userId]
      if (Object.keys(room.spectatorProfiles).length === 0) {
        delete room.spectatorProfiles
      }
      return room
    }

    const isHost = room.hostId === userId
    const isGuest = room.guestId === userId
    if (!isHost && !isGuest) return room

    // Keep finished games in the database for history and stats pages.
    if (room.status === 'finished') {
      return room
    }

    const opponentId = isHost ? room.guestId : room.hostId
    const leaverName = room.profiles[userId]?.username ?? 'A player'

    if (!opponentId) {
      // No opponent present, room can be safely removed.
      return null
    }

    if (
      room.pausedByDisconnect?.playerId &&
      room.pausedByDisconnect.playerId !== userId
    ) {
      // Both players have now left; clean up the room.
      return null
    }

    if (room.pausedByDisconnect?.playerId === userId) {
      return room
    }

    const opponentName = room.profiles[opponentId]?.username ?? 'Opponent'
    room.pausedByDisconnect = {
      playerId: userId,
      at: Date.now()
    }
    room.message = `${leaverName} disconnected. ${opponentName}, keep waiting or leave too.`
    return room
  })

  if (!tx.committed) {
    throw new Error('Could not leave this room')
  }
}

export async function keepWaitingForRejoin (
  roomId: string,
  userId: string
): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || !room.pausedByDisconnect?.playerId) return room
    const waitingName = room.profiles[userId]?.username ?? 'Opponent'
    const disconnectedName =
      room.profiles[room.pausedByDisconnect.playerId]?.username ?? 'player'
    room.message = `${waitingName} is waiting for ${disconnectedName} to rejoin.`
    return room
  })
}

export async function chooseRps (
  roomId: string,
  userId: string,
  choice: RpsChoice
): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'rps') return room
    if (!room.guestId) return room
    if (room.pausedByDisconnect?.playerId) return room

    const now = Date.now()
    if (!room.rpsDeadlineAt) room.rpsDeadlineAt = now + RPS_ROUND_MS
    if (now > room.rpsDeadlineAt) {
      return resolveRpsRound(room)
    }

    room.rpsChoices = room.rpsChoices ?? {}
    room.rpsChoices[userId] = choice

    return room
  })
}

export async function finalizeRpsRound (roomId: string): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'rps') return room
    if (!room.guestId) return room
    if (room.pausedByDisconnect?.playerId) return room
    if (!room.rpsDeadlineAt) return room
    if (Date.now() < room.rpsDeadlineAt) return room
    return resolveRpsRound(room)
  })
}

export async function sendQuickEmote (
  roomId: string,
  userId: string,
  emote: string
): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room) return room
    const isPlayer = Boolean(room.profiles[userId])
    const isSpectator = Boolean(room.spectatorProfiles?.[userId])
    if (!isPlayer && !isSpectator) return room
    if (room.pausedByDisconnect?.playerId) return room

    room.quickEmotes = room.quickEmotes ?? {}
    const previousAt = room.quickEmotes[userId]?.at ?? 0
    const nextAt = Math.max(Date.now(), previousAt + 1)
    room.quickEmotes[userId] = {
      value: emote,
      at: nextAt
    }

    return room
  })
}

export async function submitSecret (
  roomId: string,
  userId: string,
  secret: string,
  settings: RoomSettings
): Promise<void> {
  const normalizedSecret = await validateCodeForRoom(secret, settings, 'secret')

  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'secrets' || !room.guestId) return room
    if (room.pausedByDisconnect?.playerId) return room

    room.secrets = room.secrets ?? {}
    room.secrets[userId] = normalizedSecret

    const hasHost = Boolean(room.secrets[room.hostId])
    const hasGuest = Boolean(room.secrets[room.guestId])

    if (hasHost && hasGuest) {
      room.status = 'rps'
      room.rpsChoices = {}
      room.rpsRound = Math.max(1, room.rpsRound ?? 1)
      room.rpsDeadlineAt = Date.now() + RPS_ROUND_MS
      room.message =
        'All secrets locked. Choose Rock, Paper, Scissors to decide who starts.'
    }

    return room
  })
}

export async function submitGuess (
  roomId: string,
  userId: string,
  guess: string,
  settings: RoomSettings
): Promise<void> {
  const normalizedGuess = await validateCodeForRoom(guess, settings, 'guess')

  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'playing' || !room.guestId) return room
    if (room.pausedByDisconnect?.playerId) return room
    if (room.currentTurnPlayerId !== userId) return room
    if (room.pendingGuess) return room

    const turnNumber = (Object.keys(room.guessHistory ?? {}).length ?? 0) + 1
    room.pendingGuess = {
      fromPlayerId: userId,
      guess: normalizedGuess,
      turnNumber,
      at: Date.now()
    }

    if (room.typingByPlayer?.[userId]) {
      delete room.typingByPlayer[userId]
      if (Object.keys(room.typingByPlayer).length === 0) {
        delete room.typingByPlayer
      }
    }

    const responderId = userId === room.hostId ? room.guestId : room.hostId
    if (responderId) {
      setNextTurnDeadline(room, responderId)
    }

    room.message = 'Guess submitted. Waiting for response.'
    return room
  })
}

export async function answerGuess (
  roomId: string,
  responderId: string,
  claimedBulls: number,
  claimedCows: number
): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'playing' || !room.guestId) return room
    if (room.pausedByDisconnect?.playerId) return room
    if (!room.pendingGuess || !room.secrets) return room

    const pending = room.pendingGuess
    const guesserId = pending.fromPlayerId
    const targetId = guesserId === room.hostId ? room.guestId : room.hostId

    if (targetId !== responderId) {
      return room
    }

    const responderSecret = room.secrets[responderId]
    if (!responderSecret) return room

    const actual = evaluateGuess(responderSecret, pending.guess)

    // A lie is detected when the response doesn't match actual values
    const lieDetected =
      actual.bulls !== claimedBulls || actual.cows !== claimedCows

    if (room.typingByPlayer?.[responderId]) {
      delete room.typingByPlayer[responderId]
      if (Object.keys(room.typingByPlayer).length === 0) {
        delete room.typingByPlayer
      }
    }

    // If lies aren't allowed or penalty limit reached, dishonest responses are detected as lies
    if (
      !room.settings.allowLies ||
      (room.penalties[responderId] ?? 0) >= MAX_PENALTIES
    ) {
      if (lieDetected) {
        // Dishonest response when not allowed - this is a penalty
        room.penalties[responderId] = (room.penalties[responderId] ?? 0) + 1
        room.message = `Lie detected against ${
          room.profiles[responderId]?.username ?? 'player'
        }`
        if ((room.penalties[responderId] ?? 0) >= MAX_PENALTIES) {
          room.status = 'finished'
          room.winnerId = guesserId
          room.loserId = responderId
          room.message = 'Game over by penalties'
          delete room.turnDeadlineAt
          delete room.turnActorPlayerId
          delete room.pendingGuess
          return room
        }
        // Continue turn if penalty not yet maxed
        delete room.pendingGuess
        room.currentTurnPlayerId = responderId
        setNextTurnDeadline(room, responderId)
        return room
      }
    } else if (lieDetected) {
      // Lies are allowed and player hasn't maxed out - apply penalty for this lie
      room.penalties[responderId] = (room.penalties[responderId] ?? 0) + 1
      room.message = `Lie detected against ${
        room.profiles[responderId]?.username ?? 'player'
      }`
      if ((room.penalties[responderId] ?? 0) >= MAX_PENALTIES) {
        room.status = 'finished'
        room.winnerId = guesserId
        room.loserId = responderId
        room.message = 'Game over by penalties'
        delete room.turnDeadlineAt
        delete room.turnActorPlayerId
        delete room.pendingGuess
        return room
      }
    }

    const recordId = push(child(roomRef(roomId), 'guessHistory')).key
    if (!recordId) return room

    room.guessHistory = room.guessHistory ?? {}

    const record: GuessRecord = {
      id: recordId,
      fromPlayerId: guesserId,
      toPlayerId: responderId,
      guess: pending.guess,
      claimedBulls,
      claimedCows,
      actualBulls: actual.bulls,
      actualCows: actual.cows,
      lieDetected,
      turnNumber: pending.turnNumber,
      at: Date.now()
    }

    room.guessHistory[recordId] = record
    delete room.pendingGuess

    // Auto-finish if the guess is exactly correct (prevents needing honest responder)
    if (actual.bulls === room.settings.codeLength && actual.cows === 0) {
      room.status = 'finished'
      room.winnerId = guesserId
      room.loserId = responderId
      room.message = `Code cracked by ${
        room.profiles[guesserId]?.username ?? 'player'
      }! Correct guess detected.`
      delete room.turnDeadlineAt
      delete room.turnActorPlayerId
      return room
    }

    room.currentTurnPlayerId = responderId
    setNextTurnDeadline(room, responderId)
    room.message = lieDetected ? room.message : 'Turn switched'
    return room
  })
}

export async function getRoom (roomId: string): Promise<RoomData | null> {
  const snapshot = await get(roomRef(roomId))
  if (!snapshot.exists()) return null
  return { id: roomId, ...(snapshot.val() as Omit<RoomData, 'id'>) }
}

export function buildInviteLink (roomId: string): string {
  const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  const url = new URL(window.location.origin)
  url.pathname = `${basePath}/rooms`.replace('//', '/')
  url.searchParams.set('room', roomId)
  return url.toString()
}

export async function copyInviteLink (roomId: string): Promise<void> {
  const link = buildInviteLink(roomId)
  await navigator.clipboard.writeText(link)
}

export async function verifyPassword (
  roomId: string,
  password: string
): Promise<boolean> {
  const room = await getRoom(roomId)
  if (!room) return false
  const hash = password ? await sha256(password) : undefined
  return (room.settings.passwordHash ?? '') === (hash ?? '')
}

export async function lockSecret (
  roomId: string,
  userId: string,
  secret: string,
  settings: RoomSettings
): Promise<void> {
  const normalizedSecret = await validateCodeForRoom(secret, settings, 'secret')

  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'secrets' || !room.guestId) return room

    room.secrets = room.secrets ?? {}
    room.secrets[userId] = normalizedSecret

    room.lockedSecrets = room.lockedSecrets ?? {}
    room.lockedSecrets[userId] = true

    const hostLocked = Boolean(room.lockedSecrets[room.hostId])
    const guestLocked = Boolean(room.lockedSecrets[room.guestId])

    if (hostLocked && guestLocked) {
      room.status = 'rps'
      room.rpsChoices = {}
      room.rpsRound = Math.max(1, room.rpsRound ?? 1)
      room.rpsDeadlineAt = Date.now() + RPS_ROUND_MS
      room.message =
        'All codes locked. Choose Rock, Paper, Scissors to decide who starts.'
    }

    return room
  })
}

export async function unlockSecret (
  roomId: string,
  userId: string
): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'secrets') return room

    room.lockedSecrets = room.lockedSecrets ?? {}
    room.lockedSecrets[userId] = false

    return room
  })
}

export async function updateGuessTypingStatus (
  roomId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'playing') return room
    if (!room.profiles[userId]) return room

    room.typingByPlayer = room.typingByPlayer ?? {}
    if (isTyping) {
      room.typingByPlayer[userId] = Date.now()
    } else {
      delete room.typingByPlayer[userId]
      if (Object.keys(room.typingByPlayer).length === 0) {
        delete room.typingByPlayer
      }
    }

    return room
  })
}

export async function finalizeTurnTimeout (roomId: string): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'playing' || !room.guestId) return room
    if (room.pausedByDisconnect?.playerId) return room
    if (!room.turnDeadlineAt) return room
    if (Date.now() < room.turnDeadlineAt) return room
    if (!getTurnDurationMs(room)) return room

    const actorId =
      room.turnActorPlayerId ??
      (room.pendingGuess
        ? room.pendingGuess.fromPlayerId === room.hostId
          ? room.guestId
          : room.hostId
        : room.currentTurnPlayerId)

    if (!actorId) return room

    if (room.typingByPlayer?.[actorId]) {
      delete room.typingByPlayer[actorId]
      if (Object.keys(room.typingByPlayer).length === 0) {
        delete room.typingByPlayer
      }
    }

    if (room.pendingGuess) {
      const pending = room.pendingGuess
      const guesserId = pending.fromPlayerId
      const responderId = guesserId === room.hostId ? room.guestId : room.hostId
      if (!responderId || responderId !== actorId) return room
      const responderSecret = room.secrets?.[responderId]
      if (!responderSecret) return room

      const actual = evaluateGuess(responderSecret, pending.guess)
      const recordId = push(child(roomRef(roomId), 'guessHistory')).key
      if (!recordId) return room

      room.guessHistory = room.guessHistory ?? {}
      room.guessHistory[recordId] = {
        id: recordId,
        fromPlayerId: guesserId,
        toPlayerId: responderId,
        guess: pending.guess,
        claimedBulls: actual.bulls,
        claimedCows: actual.cows,
        actualBulls: actual.bulls,
        actualCows: actual.cows,
        lieDetected: false,
        turnNumber: pending.turnNumber,
        at: Date.now()
      }

      delete room.pendingGuess

      if (actual.bulls === room.settings.codeLength && actual.cows === 0) {
        room.status = 'finished'
        room.winnerId = guesserId
        room.loserId = responderId
        room.message = `Code cracked by ${
          room.profiles[guesserId]?.username ?? 'player'
        }! Correct guess detected.`
        delete room.turnDeadlineAt
        delete room.turnActorPlayerId
        return room
      }

      room.currentTurnPlayerId = responderId
      setNextTurnDeadline(room, responderId)
      room.message = `${
        room.profiles[responderId]?.username ?? 'Player'
      } ran out of time to answer. Turn switched.`
      return room
    }

    const currentActor = room.currentTurnPlayerId
    if (!currentActor || currentActor !== actorId) return room
    const nextPlayerId =
      currentActor === room.hostId ? room.guestId : room.hostId
    if (!nextPlayerId) return room
    room.currentTurnPlayerId = nextPlayerId
    setNextTurnDeadline(room, nextPlayerId)
    room.message = `${
      room.profiles[currentActor]?.username ?? 'Player'
    } ran out of time. Turn passed.`
    return room
  })
}

export async function votePlayAgain (
  roomId: string,
  userId: string
): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'finished' || !room.guestId) return room
    if (!room.profiles[userId]) return room

    room.replayVotes = room.replayVotes ?? {}
    room.replayVotes[userId] = true

    const hostReady = Boolean(room.replayVotes[room.hostId])
    const guestReady = Boolean(room.replayVotes[room.guestId])

    if (!hostReady || !guestReady) {
      room.message = `${
        room.profiles[userId]?.username ?? 'Player'
      } wants to play again.`
      return room
    }

    // Reset room state for a fresh rematch while keeping same players and settings.
    room.status = 'secrets'
    room.rpsChoices = {}
    room.rpsRound = 1
    delete room.rpsDeadlineAt
    delete room.lastRpsResult
    delete room.starterPlayerId
    delete room.currentTurnPlayerId
    delete room.turnDeadlineAt
    delete room.turnActorPlayerId
    room.secrets = {}
    room.lockedSecrets = {}
    delete room.pendingGuess
    room.guessHistory = {}
    room.typingByPlayer = {}
    delete room.winnerId
    delete room.loserId
    room.replayVotes = {}
    room.penalties = {
      [room.hostId]: 0,
      [room.guestId]: 0
    }
    room.message = 'Rematch starting. Set your secret codes.'
    return room
  })
}
