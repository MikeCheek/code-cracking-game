import {
  child,
  get,
  onValue,
  push,
  ref,
  runTransaction,
  set,
  type Unsubscribe,
} from 'firebase/database'
import { MAX_PENALTIES } from '../constants'
import { db } from './firebase'
import { decideRpsWinner, evaluateGuess, isValidCombination } from '../utils/game'
import type { GuessRecord, LobbyRoomSummary, RoomData, RoomSettings, RpsChoice, UserProfile } from '../types'

const roomsRef = ref(db, 'rooms')

function roomRef(roomId: string) {
  return child(roomsRef, roomId)
}

async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createRoom(
  user: UserProfile,
  settings: Omit<RoomSettings, 'passwordHash'>,
  password: string,
): Promise<string> {
  const newRoom = push(roomsRef)
  if (!newRoom.key) {
    throw new Error('Unable to create room id')
  }

  const passwordHash = password ? await sha256(password) : undefined

  const payload: Omit<RoomData, 'id'> = {
    createdAt: Date.now(),
    status: 'waiting',
    hostId: user.id,
    settings: {
      ...settings,
      passwordHash,
    },
    profiles: {
      [user.id]: {
        ...user,
        joinedAt: Date.now(),
      },
    },
    penalties: {
      [user.id]: 0,
    },
    rpsRound: 1,
  }

  await set(newRoom, payload)
  return newRoom.key
}

export async function joinRoom(roomId: string, user: UserProfile, password: string): Promise<void> {
  const currentRef = roomRef(roomId)
  const passwordHash = password ? await sha256(password) : undefined

  const tx = await runTransaction(currentRef, (room: RoomData | null) => {
    if (!room) {
      return room
    }

    if (room.guestId && room.guestId !== user.id) {
      return room
    }

    if ((room.settings.passwordHash ?? '') !== (passwordHash ?? '')) {
      throw new Error('Wrong room password')
    }

    if (!room.guestId) {
      room.guestId = user.id
      room.status = 'rps'
    }

    room.profiles[user.id] = {
      ...user,
      joinedAt: Date.now(),
    }

    room.penalties[user.id] = room.penalties[user.id] ?? 0
    room.message = `${user.username} joined the room`

    return room
  })

  if (!tx.committed) {
    throw new Error('Could not join this room')
  }
}

export function subscribeRoom(roomId: string, callback: (room: RoomData | null) => void): Unsubscribe {
  const currentRef = roomRef(roomId)
  return onValue(currentRef, (snapshot) => {
    const value = snapshot.val() as Omit<RoomData, 'id'> | null
    if (!value) {
      callback(null)
      return
    }
    callback({ id: roomId, ...value })
  })
}

export function subscribeLobby(callback: (rooms: LobbyRoomSummary[]) => void): Unsubscribe {
  return onValue(roomsRef, (snapshot) => {
    const value = snapshot.val() as Record<string, Omit<RoomData, 'id'>> | null
    if (!value) {
      callback([])
      return
    }

    const list = Object.entries(value)
      .map(([id, room]) => ({
        id,
        status: room.status,
        isPrivate: room.settings.isPrivate,
        hostName: room.profiles[room.hostId]?.username ?? 'Host',
        codeLength: room.settings.codeLength,
        allowDuplicates: room.settings.allowDuplicates,
        hasGuest: Boolean(room.guestId),
        createdAt: room.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)

    callback(list)
  })
}

export async function chooseRps(roomId: string, userId: string, choice: RpsChoice): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'rps') return room
    if (!room.guestId) return room

    room.rpsChoices = room.rpsChoices ?? {}
    room.rpsChoices[userId] = choice

    const hostChoice = room.rpsChoices[room.hostId]
    const guestChoice = room.rpsChoices[room.guestId]

    if (hostChoice && guestChoice) {
      const winner = decideRpsWinner(hostChoice, guestChoice)
      if (winner === 0) {
        room.rpsRound += 1
        room.rpsChoices = {}
        room.message = 'RPS tie! Play again.'
      } else {
        room.starterPlayerId = winner === 1 ? room.hostId : room.guestId
        room.currentTurnPlayerId = room.starterPlayerId
        room.status = 'secrets'
        room.message = 'RPS finished. Set your secret codes.'
      }
    }

    return room
  })
}

export async function submitSecret(roomId: string, userId: string, secret: string): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'secrets' || !room.guestId) return room

    if (!isValidCombination(secret, room.settings.codeLength, room.settings.allowDuplicates)) {
      throw new Error('Invalid secret for this room settings')
    }

    room.secrets = room.secrets ?? {}
    room.secrets[userId] = secret

    const hasHost = Boolean(room.secrets[room.hostId])
    const hasGuest = Boolean(room.secrets[room.guestId])

    if (hasHost && hasGuest) {
      room.status = 'playing'
      room.message = 'All secrets locked. Game started.'
    }

    return room
  })
}

export async function submitGuess(roomId: string, userId: string, guess: string): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'playing' || !room.guestId) return room
    if (room.currentTurnPlayerId !== userId) return room
    if (room.pendingGuess) return room

    if (!isValidCombination(guess, room.settings.codeLength, room.settings.allowDuplicates)) {
      throw new Error('Invalid guess')
    }

    const turnNumber = (Object.keys(room.guessHistory ?? {}).length ?? 0) + 1
    room.pendingGuess = {
      fromPlayerId: userId,
      guess,
      turnNumber,
      at: Date.now(),
    }

    room.message = 'Guess submitted. Waiting for response.'
    return room
  })
}

export async function answerGuess(
  roomId: string,
  responderId: string,
  claimedBulls: number,
  claimedCows: number,
): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'playing' || !room.guestId) return room
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
    const lieDetected = actual.bulls !== claimedBulls || actual.cows !== claimedCows

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
      at: Date.now(),
    }

    room.guessHistory[recordId] = record
    room.pendingGuess = undefined

    if (lieDetected) {
      room.penalties[responderId] = (room.penalties[responderId] ?? 0) + 1
      room.message = `Lie detected against ${room.profiles[responderId]?.username ?? 'player'}`
      if ((room.penalties[responderId] ?? 0) >= MAX_PENALTIES) {
        room.status = 'finished'
        room.winnerId = guesserId
        room.loserId = responderId
        room.message = 'Game over by penalties'
        return room
      }
    }

    if (actual.bulls === room.settings.codeLength) {
      room.status = 'finished'
      room.winnerId = guesserId
      room.loserId = responderId
      room.message = 'Secret cracked!'
      return room
    }

    room.currentTurnPlayerId = responderId
    room.message = lieDetected ? room.message : 'Turn switched'
    return room
  })
}

export async function getRoom(roomId: string): Promise<RoomData | null> {
  const snapshot = await get(roomRef(roomId))
  if (!snapshot.exists()) return null
  return { id: roomId, ...(snapshot.val() as Omit<RoomData, 'id'>) }
}

export function buildInviteLink(roomId: string): string {
  const url = new URL(window.location.href)
  url.searchParams.set('room', roomId)
  return url.toString()
}

export async function copyInviteLink(roomId: string): Promise<void> {
  const link = buildInviteLink(roomId)
  await navigator.clipboard.writeText(link)
}

export async function verifyPassword(roomId: string, password: string): Promise<boolean> {
  const room = await getRoom(roomId)
  if (!room) return false
  const hash = password ? await sha256(password) : undefined
  return (room.settings.passwordHash ?? '') === (hash ?? '')
}
