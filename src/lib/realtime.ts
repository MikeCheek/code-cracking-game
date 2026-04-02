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
import { normalizeRoomName } from '../utils/roomName'
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
  roomName: string,
): Promise<string> {
  // Keep only one room per host by deleting older rooms before creating a new one.
  const existingByHost = await getHostRoomIds(user.id)
  await Promise.all(existingByHost.map((id) => set(roomRef(id), null)))

  const newRoom = push(roomsRef)
  if (!newRoom.key) {
    throw new Error('Unable to create room id')
  }

  const normalizedPassword = password.trim()
  const passwordHash = settings.isPrivate && normalizedPassword ? await sha256(normalizedPassword) : undefined
  const normalizedRoomName = normalizeRoomName(roomName, user.username)

  const payload: Omit<RoomData, 'id'> = {
    roomName: normalizedRoomName,
    createdAt: Date.now(),
    status: 'waiting',
    hostId: user.id,
    settings: {
      ...settings,
      ...(passwordHash ? { passwordHash } : {}),
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
  const normalizedPassword = password.trim()
  const passwordHash = normalizedPassword ? await sha256(normalizedPassword) : undefined

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

    if (!isParticipantRejoin && room.settings.isPrivate && (room.settings.passwordHash ?? '') !== (passwordHash ?? '')) {
      throw new Error('Wrong room password')
    }

    if (!room.guestId && !isHostRejoin) {
      room.guestId = user.id
      room.status = 'rps'
    }

    room.profiles[user.id] = {
      ...user,
      joinedAt: Date.now(),
    }

    room.penalties[user.id] = room.penalties[user.id] ?? 0
    if (room.pausedByDisconnect?.playerId === user.id) {
      delete room.pausedByDisconnect
      room.message = `${user.username} rejoined. Match resumed.`
    } else {
      room.message = `${user.username} joined the room`
    }

    return room
  })

  if (!tx.committed) {
    throw new Error('Could not join this room')
  }
}

export async function joinOwnRoomAsGuest(roomId: string, hostUserId: string, guestProfile: UserProfile): Promise<void> {
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
      room.status = 'rps'
    }

    room.profiles[guestProfile.id] = {
      ...guestProfile,
      joinedAt: Date.now(),
    }

    room.penalties[guestProfile.id] = room.penalties[guestProfile.id] ?? 0
    room.message = `${guestProfile.username} joined in same-phone mode`

    return room
  })

  if (!tx.committed) {
    throw new Error('Could not enable same-phone mode')
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
    callback({
      id: roomId,
      ...value,
      roomName: value.roomName ?? `${value.profiles[value.hostId]?.username ?? 'Host'}'s Room`,
    })
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
        roomName: room.roomName ?? `${room.profiles[room.hostId]?.username ?? 'Host'}'s Room`,
        status: room.status,
        isPrivate: room.settings.isPrivate,
        hostId: room.hostId,
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

async function getHostRoomIds(hostId: string): Promise<string[]> {
  const snapshot = await get(roomsRef)
  if (!snapshot.exists()) return []

  const value = snapshot.val() as Record<string, Omit<RoomData, 'id'>>
  return Object.entries(value)
    .filter(([, room]) => room.hostId === hostId)
    .map(([id]) => id)
}

export async function deleteRoom(roomId: string, userId: string): Promise<void> {
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

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const targetRef = roomRef(roomId)

  const tx = await runTransaction(targetRef, (room: RoomData | null) => {
    if (!room) return room

    const isHost = room.hostId === userId
    const isGuest = room.guestId === userId
    if (!isHost && !isGuest) return room

    const opponentId = isHost ? room.guestId : room.hostId
    const leaverName = room.profiles[userId]?.username ?? 'A player'

    if (!opponentId) {
      // No opponent present, room can be safely removed.
      return null
    }

    if (room.pausedByDisconnect?.playerId && room.pausedByDisconnect.playerId !== userId) {
      // Both players have now left; clean up the room.
      return null
    }

    if (room.pausedByDisconnect?.playerId === userId) {
      return room
    }

    const opponentName = room.profiles[opponentId]?.username ?? 'Opponent'
    room.pausedByDisconnect = {
      playerId: userId,
      at: Date.now(),
    }
    room.message = `${leaverName} disconnected. ${opponentName}, keep waiting or leave too.`
    return room
  })

  if (!tx.committed) {
    throw new Error('Could not leave this room')
  }
}

export async function keepWaitingForRejoin(roomId: string, userId: string): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || !room.pausedByDisconnect?.playerId) return room
    const waitingName = room.profiles[userId]?.username ?? 'Opponent'
    const disconnectedName = room.profiles[room.pausedByDisconnect.playerId]?.username ?? 'player'
    room.message = `${waitingName} is waiting for ${disconnectedName} to rejoin.`
    return room
  })
}

export async function chooseRps(roomId: string, userId: string, choice: RpsChoice): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'rps') return room
    if (!room.guestId) return room
    if (room.pausedByDisconnect?.playerId) return room

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
    if (room.pausedByDisconnect?.playerId) return room

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
    if (room.pausedByDisconnect?.playerId) return room
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
    const lieDetected = actual.bulls !== claimedBulls || actual.cows !== claimedCows
    
    // If lies aren't allowed or penalty limit reached, dishonest responses are detected as lies
    if (!room.settings.allowLies || (room.penalties[responderId] ?? 0) >= MAX_PENALTIES) {
      if (lieDetected) {
        // Dishonest response when not allowed - this is a penalty
        room.penalties[responderId] = (room.penalties[responderId] ?? 0) + 1
        room.message = `Lie detected against ${room.profiles[responderId]?.username ?? 'player'}`
        if ((room.penalties[responderId] ?? 0) >= MAX_PENALTIES) {
          room.status = 'finished'
          room.winnerId = guesserId
          room.loserId = responderId
          room.message = 'Game over by penalties'
          delete room.pendingGuess
          return room
        }
        // Continue turn if penalty not yet maxed
        delete room.pendingGuess
        room.currentTurnPlayerId = responderId
        return room
      }
    } else if (lieDetected) {
      // Lies are allowed and player hasn't maxed out - apply penalty for this lie
      room.penalties[responderId] = (room.penalties[responderId] ?? 0) + 1
      room.message = `Lie detected against ${room.profiles[responderId]?.username ?? 'player'}`
      if ((room.penalties[responderId] ?? 0) >= MAX_PENALTIES) {
        room.status = 'finished'
        room.winnerId = guesserId
        room.loserId = responderId
        room.message = 'Game over by penalties'
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
      at: Date.now(),
    }

    room.guessHistory[recordId] = record
    delete room.pendingGuess

    // Auto-finish if the guess is exactly correct (prevents needing honest responder)
    if (actual.bulls === room.settings.codeLength && actual.cows === 0) {
      room.status = 'finished'
      room.winnerId = guesserId
      room.loserId = responderId
      room.message = `Code cracked by ${room.profiles[guesserId]?.username ?? 'player'}! Correct guess detected.`
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
  const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  const url = new URL(window.location.origin)
  url.pathname = `${basePath}/rooms`.replace('//', '/')
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

export async function lockSecret(roomId: string, userId: string, secret: string): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'secrets' || !room.guestId) return room

    if (!isValidCombination(secret, room.settings.codeLength, room.settings.allowDuplicates)) {
      throw new Error('Invalid secret for this room settings')
    }

    room.secrets = room.secrets ?? {}
    room.secrets[userId] = secret

    room.lockedSecrets = room.lockedSecrets ?? {}
    room.lockedSecrets[userId] = true

    const hostLocked = Boolean(room.lockedSecrets[room.hostId])
    const guestLocked = Boolean(room.lockedSecrets[room.guestId])

    if (hostLocked && guestLocked) {
      room.status = 'playing'
      room.message = 'All codes locked. Game started!'
    }

    return room
  })
}

export async function unlockSecret(roomId: string, userId: string): Promise<void> {
  await runTransaction(roomRef(roomId), (room: RoomData | null) => {
    if (!room || room.status !== 'secrets') return room

    room.lockedSecrets = room.lockedSecrets ?? {}
    room.lockedSecrets[userId] = false

    return room
  })
}
