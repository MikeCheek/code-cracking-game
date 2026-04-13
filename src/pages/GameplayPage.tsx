import { useEffect, useMemo, useRef, useState } from 'react'
import type { GuessRecord, PlayerProfile, RoomData, RpsChoice } from '../types'
import { WORD_LANGUAGE_LABELS } from '../constants'
import { getRoomGameMode, getRoomWordLanguage } from '../utils/gameMode'

const RPS_ITEMS: Array<{ value: RpsChoice; icon: string; label: string }> = [
  { value: 'rock', icon: '🪨', label: 'Rock' },
  { value: 'paper', icon: '📄', label: 'Paper' },
  { value: 'scissors', icon: '✂️', label: 'Scissors' },
]

const QUICK_EMOTES = [
  '❤️',
  '😍',
  '🧐',
  '😈',
  '🕒',
  '🔥',
  '😂',
  '😤',
  '🤯',
  '🥶',
  '😎',
  '👏',
  '💀',
  '👀',
  '🤝',
  '🙃',
  '😅',
  '😭',
  '💥',
  '🫡',
]

const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const
const LETTER_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'z', 'x', 'c', 'v', 'b', 'n', 'm'] as const
type DigitKind = 'strike' | 'ball' | 'miss' | 'code'
type FlyingEmote = {
  id: string
  value: string
  originX: number
  originY: number
  x1: number
  y1: number
  x2: number
  y2: number
  x3: number
  y3: number
  x4: number
  y4: number
  rotate1: number
  rotate2: number
  rotate3: number
  rotate4: number
  scale1: number
  scale2: number
  scale3: number
  scale4: number
  durationMs: number
}

type EmotePathTemplate = {
  points: Array<{ x: number; y: number }>
}

const EMOTE_PATH_TEMPLATES: EmotePathTemplate[] = [
  {
    points: [
      { x: 58, y: -72 },
      { x: 132, y: -166 },
      { x: 220, y: -254 },
      { x: 304, y: -338 },
    ],
  },
  {
    points: [
      { x: 44, y: -68 },
      { x: 170, y: -142 },
      { x: 132, y: -254 },
      { x: 268, y: -334 },
    ],
  },
  {
    points: [
      { x: 72, y: -56 },
      { x: 96, y: -198 },
      { x: 248, y: -212 },
      { x: 214, y: -352 },
    ],
  },
  {
    points: [
      { x: 50, y: -86 },
      { x: 186, y: -126 },
      { x: 208, y: -282 },
      { x: 326, y: -310 },
    ],
  },
]

type GameplayPageProps = {
  room: RoomData
  myProfile: PlayerProfile | null
  opponentProfile: PlayerProfile | null
  hostProfile?: PlayerProfile | null
  guestProfile?: PlayerProfile | null
  watcherProfile?: PlayerProfile | null
  isWatchMode?: boolean
  sortedHistory: GuessRecord[]
  pendingForResponder: boolean
  myTurn: boolean
  rpsChoice: RpsChoice | ''
  secretInput: string
  secretLocked: boolean
  guessInput: string
  claimedBulls: number
  claimedCows: number
  mySecret?: string
  onRpsChoice: (choice: RpsChoice) => void
  onSecretInputChange: (value: string) => void
  onGuessInputChange: (value: string) => void
  onClaimedBullsChange: (value: number) => void
  onClaimedCowsChange: (value: number) => void
  onSubmitSecret: () => void
  onUnlockSecret: () => void
  onSubmitGuess: () => void
  onAnswerGuess: () => void
  onSendQuickEmote: (emote: string) => void
  onBackToRooms: () => void
  onLeaveRoom: () => void
  onDeleteRoom: () => void
  canDeleteRoom: boolean
  isCheckingWordSecret: boolean
  isCheckingWordGuess: boolean
}

export function GameplayPage({
  room,
  myProfile,
  opponentProfile,
  hostProfile = null,
  guestProfile = null,
  watcherProfile = null,
  isWatchMode = false,
  sortedHistory,
  pendingForResponder,
  myTurn,
  rpsChoice,
  secretInput,
  secretLocked,
  guessInput,
  claimedBulls,
  claimedCows,
  mySecret,
  onRpsChoice,
  onSecretInputChange,
  onGuessInputChange,
  onClaimedBullsChange,
  onClaimedCowsChange,
  onSubmitSecret,
  onUnlockSecret,
  onSubmitGuess,
  onAnswerGuess,
  onSendQuickEmote,
  onBackToRooms,
  onLeaveRoom,
  onDeleteRoom,
  canDeleteRoom,
  isCheckingWordSecret,
  isCheckingWordGuess,
}: GameplayPageProps) {
  const [showGameMenu, setShowGameMenu] = useState(false)
  const [showEmotePicker, setShowEmotePicker] = useState(false)
  const [selectedQuickEmote, setSelectedQuickEmote] = useState(QUICK_EMOTES[0])
  const [showAllGuesses, setShowAllGuesses] = useState(false)
  const [flyingEmotes, setFlyingEmotes] = useState<FlyingEmote[]>([])
  const [emotesEnabled, setEmotesEnabled] = useState(true)
  const [emoteScale, setEmoteScale] = useState(1)
  const [uiNow, setUiNow] = useState(0)
  const gameMenuRef = useRef<HTMLDivElement | null>(null)
  const latestQuickEmoteAtRef = useRef<Record<string, number>>({})
  const emoteMainHoldTimeoutRef = useRef<number | null>(null)
  const emoteMainHoldIntervalRef = useRef<number | null>(null)
  const emoteMainHoldPointerIdRef = useRef<number | null>(null)
  const emoteMainLongPressActiveRef = useRef(false)
  const isWordGame = getRoomGameMode(room) === 'words'
  const wordLanguageLabel = WORD_LANGUAGE_LABELS[getRoomWordLanguage(room)]
  const isMyTurnCard = room.currentTurnPlayerId && myProfile?.id === room.currentTurnPlayerId
  const isOpponentTurnCard = room.currentTurnPlayerId && opponentProfile?.id === room.currentTurnPlayerId
  const maxCodeLength = room.settings.codeLength

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (gameMenuRef.current?.contains(target)) return
      setShowGameMenu(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    if (room.status !== 'rps' && room.status !== 'playing') return
    const tick = () => setUiNow(Date.now())
    tick()
    const timer = setInterval(tick, 180)
    return () => clearInterval(timer)
  }, [room.status])

  useEffect(() => {
    latestQuickEmoteAtRef.current = {}
  }, [room.id])

  const stopMainEmoteHold = () => {
    if (emoteMainHoldTimeoutRef.current !== null) {
      clearTimeout(emoteMainHoldTimeoutRef.current)
      emoteMainHoldTimeoutRef.current = null
    }
    if (emoteMainHoldIntervalRef.current !== null) {
      clearInterval(emoteMainHoldIntervalRef.current)
      emoteMainHoldIntervalRef.current = null
    }
    emoteMainHoldPointerIdRef.current = null
    emoteMainLongPressActiveRef.current = false
  }

  useEffect(() => stopMainEmoteHold, [])

  const sendQuickEmote = (emote: string) => {
    setSelectedQuickEmote(emote)
    onSendQuickEmote(emote)
  }

  const onMainEmotePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return

    stopMainEmoteHold()
    emoteMainHoldPointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)

    emoteMainHoldTimeoutRef.current = window.setTimeout(() => {
      emoteMainLongPressActiveRef.current = true
      sendQuickEmote(selectedQuickEmote)
      emoteMainHoldIntervalRef.current = window.setInterval(() => {
        sendQuickEmote(selectedQuickEmote)
      }, 180)
    }, 280)
  }

  const onMainEmotePointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (emoteMainHoldPointerIdRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const wasLongPress = emoteMainLongPressActiveRef.current
    stopMainEmoteHold()
    if (!wasLongPress) {
      setShowEmotePicker((open) => !open)
    }
  }

  const createRandomFlight = (emoteId: string, value: string): FlyingEmote => {
    const isSmallViewport = typeof window !== 'undefined' ? window.innerWidth < 640 : true
    const baseRightInset = isSmallViewport ? 16 : 24
    const baseBottomInset = isSmallViewport ? 80 : 96
    const anchorX = baseRightInset + 28
    const anchorY = baseBottomInset + 28
    const maxLeft = Math.max(60, window.innerWidth - anchorX - 20)
    const maxUp = Math.max(100, window.innerHeight - anchorY - 20)

    const template = EMOTE_PATH_TEMPLATES[Math.floor(Math.random() * EMOTE_PATH_TEMPLATES.length)]
    const scale = 0.85 + Math.random() * 0.4
    const jitter = 20

    const clampX = (valueX: number) => Math.max(-maxLeft, Math.min(anchorX - 8, valueX))
    const clampY = (valueY: number) => Math.max(-maxUp, Math.min(-14, valueY))

    const toPoint = (index: number) => {
      const base = template.points[index]
      const x = clampX(-base.x * scale + (Math.random() * 2 - 1) * jitter)
      const y = clampY(base.y * scale + (Math.random() * 2 - 1) * jitter)
      return { x, y }
    }

    const p1 = toPoint(0)
    const p2 = toPoint(1)
    const p3 = toPoint(2)
    const p4 = toPoint(3)

    const swing = Math.random() < 0.5 ? -1 : 1
    const durationMs = 2050 + Math.round(Math.random() * 850)

    return {
      id: emoteId,
      value,
      originX: -28,
      originY: 28,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      x3: p3.x,
      y3: p3.y,
      x4: p4.x,
      y4: p4.y,
      rotate1: swing * (6 + Math.random() * 16),
      rotate2: -swing * (16 + Math.random() * 24),
      rotate3: swing * (10 + Math.random() * 26),
      rotate4: -swing * (8 + Math.random() * 20),
      scale1: 0.9 + Math.random() * 0.18,
      scale2: 0.95 + Math.random() * 0.24,
      scale3: 1.03 + Math.random() * 0.24,
      scale4: 0.88 + Math.random() * 0.28,
      durationMs,
    }
  }

  const appendSymbol = (current: string, symbol: string) => {
    if (current.length >= maxCodeLength) return
    return `${current}${symbol}`
  }

  const isDuplicateDigitBlocked = (current: string, digit: string) => {
    if (room.settings.allowDuplicates) return false
    return current.includes(digit)
  }

  const numberOptions = Array.from({ length: maxCodeLength + 1 }, (_, index) => index)
  const pendingGuessDigits = room.pendingGuess?.guess.split('') ?? []

  const getDigitKinds = (
    guess: string,
    strikes: number,
    balls: number,
    secret?: string,
  ): DigitKind[] => {
    const digits = guess.split('')
    if (digits.length === 0) return []

    if (secret && secret.length === digits.length) {
      const result: DigitKind[] = Array.from({ length: digits.length }, () => 'miss')
      const pool: Record<string, number> = {}

      for (let index = 0; index < digits.length; index += 1) {
        if (digits[index] === secret[index]) {
          result[index] = 'strike'
        } else {
          const secretDigit = secret[index]
          pool[secretDigit] = (pool[secretDigit] ?? 0) + 1
        }
      }

      for (let index = 0; index < digits.length; index += 1) {
        if (result[index] === 'strike') continue
        const digit = digits[index]
        const available = pool[digit] ?? 0
        if (available > 0) {
          result[index] = 'ball'
          pool[digit] = available - 1
        }
      }

      return result
    }

    const result: DigitKind[] = Array.from({ length: digits.length }, () => 'miss')
    for (let index = 0; index < Math.min(strikes, digits.length); index += 1) {
      result[index] = 'strike'
    }
    for (let index = strikes; index < Math.min(strikes + balls, digits.length); index += 1) {
      result[index] = 'ball'
    }
    return result
  }

  const getDigitChipClassName = (kind: DigitKind) => {
    if (kind === 'strike') return 'border-emerald-300/50 bg-emerald-300/20 text-emerald-100'
    if (kind === 'ball') return 'border-amber-300/50 bg-amber-300/20 text-amber-100'
    if (kind === 'code') return 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100'
    return 'border-white/10 bg-slate-900/50 text-slate-100'
  }

  const pendingKinds = getDigitKinds(room.pendingGuess?.guess ?? '', claimedBulls, claimedCows, mySecret)
  const visibleGuesses = useMemo(() => {
    if (showAllGuesses || !myProfile?.id) return sortedHistory
    return sortedHistory.filter((item) => item.fromPlayerId === myProfile.id)
  }, [myProfile?.id, showAllGuesses, sortedHistory])
  const quickEmoteEntries = useMemo(
    () => (room.quickEmotes ? Object.entries(room.quickEmotes) : []),
    [room.quickEmotes],
  )
  const rpsTimeLeftMs = room.status === 'rps' && room.rpsDeadlineAt ? Math.max(0, room.rpsDeadlineAt - uiNow) : 5000
  const rpsTimeLeftSeconds = Math.ceil(rpsTimeLeftMs / 1000)
  const rpsProgress = Math.max(0, Math.min(1, rpsTimeLeftMs / 5000))
  const activeTurnPlayerId = room.turnActorPlayerId
    ?? (room.pendingGuess
      ? (room.pendingGuess.fromPlayerId === room.hostId ? room.guestId : room.hostId)
      : room.currentTurnPlayerId)
  const turnTimeLeftMs = room.status === 'playing' && room.turnDeadlineAt
    ? Math.max(0, room.turnDeadlineAt - uiNow)
    : null
  const turnProgress = room.settings.maxTurnSeconds && turnTimeLeftMs !== null
    ? Math.max(0, Math.min(1, turnTimeLeftMs / (room.settings.maxTurnSeconds * 1000)))
    : null
  const myTurnTimeLeftSeconds = activeTurnPlayerId && myProfile?.id === activeTurnPlayerId && turnTimeLeftMs !== null
    ? Math.ceil(turnTimeLeftMs / 1000)
    : null
  const opponentTurnTimeLeftSeconds = activeTurnPlayerId && opponentProfile?.id === activeTurnPlayerId && turnTimeLeftMs !== null
    ? Math.ceil(turnTimeLeftMs / 1000)
    : null
  const myTyping = Boolean(
    myProfile?.id
    && room.typingByPlayer?.[myProfile.id]
    && uiNow - (room.typingByPlayer?.[myProfile.id] ?? 0) < 3200,
  )
  const opponentTyping = Boolean(
    opponentProfile?.id
    && room.typingByPlayer?.[opponentProfile.id]
    && uiNow - (room.typingByPlayer?.[opponentProfile.id] ?? 0) < 3200,
  )

  useEffect(() => {
    if (quickEmoteEntries.length === 0) return

    const addTimers: number[] = []
    const removeTimers: number[] = []

    for (const [senderId, payload] of quickEmoteEntries) {
      const previousAt = latestQuickEmoteAtRef.current[senderId] ?? 0
      if (payload.at <= previousAt) continue

      latestQuickEmoteAtRef.current[senderId] = payload.at
      const emoteId = `${senderId}-${payload.at}`

      const addTimeout = window.setTimeout(() => {
        setFlyingEmotes((current) => [...current, createRandomFlight(emoteId, payload.value)])
      }, 0)
      addTimers.push(addTimeout)

      const removeTimeout = window.setTimeout(() => {
        setFlyingEmotes((current) => current.filter((entry) => entry.id !== emoteId))
      }, 3400)
      removeTimers.push(removeTimeout)
    }

    return () => {
      addTimers.forEach((timer) => clearTimeout(timer))
      removeTimers.forEach((timer) => clearTimeout(timer))
    }
  }, [quickEmoteEntries])

  if (isWatchMode) {
    return (
      <section className="relative mx-auto grid w-full max-w-4xl gap-3 pb-24">
        <article className="glass-panel-strong rounded-3xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Spectating</p>
              <h2 className="text-xl font-bold text-white">{room.roomName}</h2>
              <p className="text-sm text-slate-300">Read-only mode: you can watch and send emotes.</p>
            </div>
            <button
              type="button"
              onClick={onBackToRooms}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Go back
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-200">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">You: {watcherProfile?.avatar ?? '👀'} {watcherProfile?.username ?? 'Watcher'}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Host: {hostProfile?.avatar ?? '🙂'} {hostProfile?.username ?? 'Host'}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Guest: {guestProfile ? `${guestProfile.avatar} ${guestProfile.username}` : 'Waiting for player 2'}</span>
          </div>
        </article>

        <article className="glass-panel rounded-3xl p-3">
          <p className="mb-2 text-sm font-semibold text-white">Guesses</p>
          {sortedHistory.length === 0 ? (
            <p className="text-sm text-slate-300">No guesses yet.</p>
          ) : (
            <div className="space-y-2">
              {sortedHistory.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <span>Turn {item.turnNumber}</span>
                    <span className="font-mono text-fuchsia-200">{item.guess}</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {room.profiles[item.fromPlayerId]?.username ?? 'Player'} • {item.actualBulls} Strikes • {item.actualCows} Balls
                  </p>
                  {item.lieDetected && (
                    <p className="text-xs font-semibold text-rose-200">
                      Lie detected: {room.profiles[item.toPlayerId]?.username ?? 'Responder'} gave a false answer.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>

        {emotesEnabled && (
          <div className="pointer-events-none fixed bottom-4 right-4 z-[985] h-0 w-0 sm:bottom-24 sm:right-6">
            {flyingEmotes.map((entry) => (
              <span
                key={entry.id}
                className="quick-emote-fly"
                style={{
                  ['--emote-origin-x' as string]: `${entry.originX}px`,
                  ['--emote-origin-y' as string]: `${entry.originY}px`,
                  ['--emote-x1' as string]: `${entry.x1}px`,
                  ['--emote-y1' as string]: `${entry.y1}px`,
                  ['--emote-x2' as string]: `${entry.x2}px`,
                  ['--emote-y2' as string]: `${entry.y2}px`,
                  ['--emote-x3' as string]: `${entry.x3}px`,
                  ['--emote-y3' as string]: `${entry.y3}px`,
                  ['--emote-x4' as string]: `${entry.x4}px`,
                  ['--emote-y4' as string]: `${entry.y4}px`,
                  ['--emote-rotate1' as string]: `${entry.rotate1}deg`,
                  ['--emote-rotate2' as string]: `${entry.rotate2}deg`,
                  ['--emote-rotate3' as string]: `${entry.rotate3}deg`,
                  ['--emote-rotate4' as string]: `${entry.rotate4}deg`,
                  ['--emote-scale1' as string]: `${entry.scale1}`,
                  ['--emote-scale2' as string]: `${entry.scale2}`,
                  ['--emote-scale3' as string]: `${entry.scale3}`,
                  ['--emote-scale4' as string]: `${entry.scale4}`,
                  ['--emote-duration' as string]: `${entry.durationMs}ms`,
                  ['--emote-base-scale' as string]: `${emoteScale}`,
                }}
              >
                {entry.value}
              </span>
            ))}
          </div>
        )}

        <div className="fixed bottom-4 right-4 z-[990] flex flex-col items-end gap-2 sm:bottom-24 sm:right-6">
          {showEmotePicker && (
            <div className="glass-panel-strong w-[18.5rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 p-3 space-y-3">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setEmotesEnabled((enabled) => !enabled)}
                  className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition ${emotesEnabled
                    ? 'bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                    : 'bg-slate-500/20 text-slate-300 hover:bg-slate-500/30'
                    }`}
                >
                  {emotesEnabled ? 'Receiving emotes: ON' : 'Receiving emotes: OFF'}
                </button>
                <div className="px-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-300">Received size</label>
                    <span className="text-xs text-slate-400">{Math.round(emoteScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={emoteScale}
                    onChange={(e) => setEmoteScale(parseFloat(e.currentTarget.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-400"
                  />
                </div>
              </div>

              <div className="max-h-44 overflow-y-auto">
                <div className="grid grid-cols-5 gap-2">
                  {QUICK_EMOTES.map((emote) => (
                    <button
                      key={emote}
                      type="button"
                      onClick={() => {
                        sendQuickEmote(emote)
                        setShowEmotePicker(false)
                      }}
                      className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-xl leading-none transition hover:scale-105 hover:bg-white/10"
                    >
                      {emote}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onPointerDown={onMainEmotePointerDown}
            onPointerUp={onMainEmotePointerEnd}
            onPointerCancel={onMainEmotePointerEnd}
            onPointerLeave={onMainEmotePointerEnd}
            className="flex h-14 w-14 select-none items-center justify-center rounded-full border border-cyan-200/35 bg-gradient-to-br from-cyan-300 via-sky-300 to-fuchsia-300 text-2xl shadow-[0_14px_34px_rgba(34,211,238,0.38)] transition hover:scale-105"
            aria-label="Toggle quick emotes"
            aria-expanded={showEmotePicker}
          >
            {selectedQuickEmote}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="relative mx-auto grid w-full max-w-4xl gap-3 pb-24">
      <article className="glass-panel-strong rounded-3xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Game</p>
            <h2 className="truncate text-xl font-bold text-white">{room.roomName}</h2>
            <p className="text-sm text-slate-300">{room.message ?? 'Playing'}</p>
          </div>

          <div ref={gameMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowGameMenu((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-slate-100 shadow-sm transition hover:bg-white/10"
              aria-label="Room actions"
              aria-expanded={showGameMenu}
            >
              ⚙
            </button>

            {showGameMenu && (
              <div className="glass-panel-strong absolute right-0 top-12 z-20 w-44 rounded-xl p-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowGameMenu(false)
                    onLeaveRoom()
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-200 transition hover:bg-rose-400/15"
                >
                  Leave game
                </button>
                {canDeleteRoom && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowGameMenu(false)
                      onDeleteRoom()
                    }}
                    className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-400/15"
                  >
                    Delete game
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      <article className="grid grid-cols-2 gap-2">
        <div className={`rounded-2xl border p-3 ${isMyTurnCard ? 'border-emerald-300/45 bg-emerald-300/15' : 'border-white/10 bg-white/5'}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold text-white">{myProfile?.avatar} {myProfile?.username ?? 'You'}</p>
            {myTyping && (
              <span className="shrink-0 flex items-center gap-1" aria-label="Typing" title="Typing">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 animate-pulse-soft" />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 animate-pulse-soft" style={{ animationDelay: '120ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 animate-pulse-soft" style={{ animationDelay: '240ms' }} />
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-300">{isMyTurnCard ? 'Current player' : 'Waiting'}</p>
          {myTurnTimeLeftSeconds !== null && room.settings.maxTurnSeconds && (
            <>
              <p className="mt-1 text-[11px] font-semibold text-amber-200">Time left: {myTurnTimeLeftSeconds}s</p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/5">
                <div
                  className="h-full bg-linear-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 transition-[width] duration-150"
                  style={{ width: `${(turnProgress ?? 0) * 100}%` }}
                />
              </div>
            </>
          )}
          <p className="mt-1 text-xs text-rose-200">Lies: {room.penalties[myProfile?.id ?? ''] ?? 0} / 3</p>
          {mySecret && (
            <div className="mt-2 flex flex-wrap gap-2">
              {mySecret.split('').map((digit, index) => (
                <span
                  key={`my-code-${digit}-${index}`}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border font-mono text-sm font-bold ${getDigitChipClassName('code')}`}
                >
                  {digit}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className={`rounded-2xl border p-3 ${isOpponentTurnCard ? 'border-emerald-300/45 bg-emerald-300/15' : 'border-white/10 bg-white/5'}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold text-white">{opponentProfile?.avatar ?? '❔'} {opponentProfile?.username ?? 'Opponent'}</p>
            {opponentTyping && (
              <span className="shrink-0 flex items-center gap-1" aria-label="Typing" title="Typing">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 animate-pulse-soft" />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 animate-pulse-soft" style={{ animationDelay: '120ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 animate-pulse-soft" style={{ animationDelay: '240ms' }} />
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-300">{isOpponentTurnCard ? 'Current player' : 'Waiting'}</p>
          {opponentTurnTimeLeftSeconds !== null && room.settings.maxTurnSeconds && (
            <>
              <p className="mt-1 text-[11px] font-semibold text-amber-200">Time left: {opponentTurnTimeLeftSeconds}s</p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/5">
                <div
                  className="h-full bg-linear-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 transition-[width] duration-150"
                  style={{ width: `${(turnProgress ?? 0) * 100}%` }}
                />
              </div>
            </>
          )}
          <p className="mt-1 text-xs text-rose-200">Lies: {room.penalties[opponentProfile?.id ?? ''] ?? 0} / 3</p>
        </div>
      </article>

      <article className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="glass-panel rounded-3xl p-4">
          <p className="text-sm font-semibold text-white">Current action</p>

          {room.status === 'rps' && (
            <p className="mt-3 text-sm text-slate-300">Choose Rock, Paper, or Scissors in the full-screen modal. You can change until timer ends.</p>
          )}

          {room.status === 'secrets' && (
            <div className="mt-3 space-y-2">
              {isWordGame ? (
                <>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Secret word</label>
                  <input
                    value={secretInput.toUpperCase()}
                    onChange={(event) => onSecretInputChange(event.target.value)}
                    disabled={secretLocked}
                    maxLength={maxCodeLength}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={`Enter a ${wordLanguageLabel.toLowerCase()} word`}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-center font-mono text-2xl tracking-[0.18em] text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-fuchsia-300/60 disabled:opacity-55"
                  />
                  <p className="text-xs text-slate-300">Use a real {wordLanguageLabel.toLowerCase()} word. Letters only.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onSecretInputChange(secretInput.slice(0, -1))}
                      disabled={secretLocked || secretInput.length === 0}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Backspace
                    </button>
                    <button
                      type="button"
                      onClick={() => onSecretInputChange('')}
                      disabled={secretLocked || secretInput.length === 0}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onUnlockSecret}
                      disabled={!secretLocked || isCheckingWordSecret}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Unlock
                    </button>
                    <button
                      type="button"
                      onClick={onSubmitSecret}
                      disabled={secretLocked || secretInput.length !== maxCodeLength || isCheckingWordSecret}
                      className="rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 text-sm font-bold text-slate-950"
                    >
                      {isCheckingWordSecret ? 'Checking word...' : secretLocked ? 'Word locked' : 'Lock word'}
                    </button>
                  </div>
                  {isCheckingWordSecret && (
                    <p className="text-xs font-semibold text-cyan-200 animate-pulse-soft">Validating word...</p>
                  )}
                </>
              ) : (
                <>
                  <div className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-slate-100">
                    {(secretInput || '').padEnd(maxCodeLength, '•')}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {DIGIT_KEYS.map((digit) => (
                      <button
                        key={`secret-digit-${digit}`}
                        type="button"
                        onClick={() => onSecretInputChange(appendSymbol(secretInput, digit) ?? secretInput)}
                        disabled={secretLocked || isDuplicateDigitBlocked(secretInput, digit)}
                        className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {digit}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onSecretInputChange(secretInput.slice(0, -1))}
                      disabled={secretLocked || secretInput.length === 0}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Backspace
                    </button>
                    <button
                      type="button"
                      onClick={() => onSecretInputChange('')}
                      disabled={secretLocked || secretInput.length === 0}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onUnlockSecret}
                      disabled={!secretLocked}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Unlock
                    </button>
                    <button
                      type="button"
                      onClick={onSubmitSecret}
                      disabled={secretLocked || secretInput.length !== maxCodeLength}
                      className="rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 text-sm font-bold text-slate-950"
                    >
                      {secretLocked ? 'Code locked' : 'Lock code'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {room.status === 'playing' && (
            <div className="mt-3 space-y-3">
              {myTurn && !room.pendingGuess && (
                <>
                  {isWordGame ? (
                    <>
                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Guess word</label>
                      <input
                        value={guessInput.toUpperCase()}
                        onChange={(event) => onGuessInputChange(event.target.value)}
                        maxLength={maxCodeLength}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder={`Type a ${wordLanguageLabel.toLowerCase()} word`}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-center font-mono text-2xl tracking-[0.18em] text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-fuchsia-300/60"
                      />
                      <p className="text-xs text-slate-300">Only real {wordLanguageLabel.toLowerCase()} words can be submitted.</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onGuessInputChange(guessInput.slice(0, -1))}
                          disabled={guessInput.length === 0}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Backspace
                        </button>
                        <button
                          type="button"
                          onClick={() => onGuessInputChange('')}
                          disabled={guessInput.length === 0}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Clear
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={onSubmitGuess}
                        disabled={guessInput.length !== maxCodeLength || isCheckingWordGuess}
                        className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 text-sm font-bold text-slate-950"
                      >
                        {isCheckingWordGuess ? 'Checking word...' : 'Submit word'}
                      </button>
                      {isCheckingWordGuess && (
                        <p className="text-xs font-semibold text-cyan-200 animate-pulse-soft">Validating word...</p>
                      )}
                      <div className="grid grid-cols-6 gap-2 text-center sm:grid-cols-8">
                        {LETTER_KEYS.map((letter) => (
                          <button
                            key={`guess-letter-${letter}`}
                            type="button"
                            onClick={() => onGuessInputChange(appendSymbol(guessInput, letter) ?? guessInput)}
                            disabled={isCheckingWordGuess}
                            className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs font-bold uppercase text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {letter}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-slate-100">
                        {(guessInput || '').padEnd(maxCodeLength, '•')}
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {DIGIT_KEYS.map((digit) => (
                          <button
                            key={`guess-digit-${digit}`}
                            type="button"
                            onClick={() => onGuessInputChange(appendSymbol(guessInput, digit) ?? guessInput)}
                            disabled={isDuplicateDigitBlocked(guessInput, digit)}
                            className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {digit}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onGuessInputChange(guessInput.slice(0, -1))}
                          disabled={guessInput.length === 0}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Backspace
                        </button>
                        <button
                          type="button"
                          onClick={() => onGuessInputChange('')}
                          disabled={guessInput.length === 0}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Clear
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={onSubmitGuess}
                        disabled={guessInput.length !== maxCodeLength}
                        className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 text-sm font-bold text-slate-950"
                      >
                        Submit guess
                      </button>
                    </>
                  )}
                </>
              )}

              {room.pendingGuess && pendingForResponder && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm text-white">Opponent guess</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pendingGuessDigits.map((digit, index) => (
                      <span
                        key={`${digit}-${index}`}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border font-mono text-base font-bold ${getDigitChipClassName(pendingKinds[index] ?? 'miss')}`}
                      >
                        {digit}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold">
                    <span className="text-emerald-200">Green = Exact match</span>
                    <span className="text-amber-200">Orange = Wrong place</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-emerald-200">Strikes</p>
                      <div className="mt-1 grid grid-cols-6 gap-1">
                        {numberOptions.map((value) => (
                          <button
                            key={`strikes-${value}`}
                            type="button"
                            onClick={() => onClaimedBullsChange(value)}
                            className={`rounded-lg px-2 py-1 text-xs font-bold transition ${claimedBulls === value
                              ? 'border border-emerald-300/55 bg-emerald-300/35 text-emerald-50'
                              : 'border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                              }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-amber-200">Balls</p>
                      <div className="mt-1 grid grid-cols-6 gap-1">
                        {numberOptions.map((value) => (
                          <button
                            key={`balls-${value}`}
                            type="button"
                            onClick={() => onClaimedCowsChange(value)}
                            className={`rounded-lg px-2 py-1 text-xs font-bold transition ${claimedCows === value
                              ? 'border border-amber-300/55 bg-amber-300/35 text-amber-50'
                              : 'border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                              }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onAnswerGuess}
                    className="mt-2 w-full rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 text-sm font-bold text-slate-950"
                  >
                    Send answer
                  </button>
                </div>
              )}

              {!myTurn && !pendingForResponder && <p className="text-sm text-slate-300">Wait for opponent action.</p>}
            </div>
          )}

          {room.status === 'finished' && (
            <p className="mt-3 text-sm text-slate-300">Game finished. Opening results...</p>
          )}
        </div>

        <div className="glass-panel rounded-3xl p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">Guesses</p>
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setShowAllGuesses(false)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${!showAllGuesses
                  ? 'bg-cyan-300/25 text-cyan-100'
                  : 'text-slate-300 hover:bg-white/10 hover:text-slate-100'
                  }`}
              >
                My guesses
              </button>
              <button
                type="button"
                onClick={() => setShowAllGuesses(true)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${showAllGuesses
                  ? 'bg-cyan-300/25 text-cyan-100'
                  : 'text-slate-300 hover:bg-white/10 hover:text-slate-100'
                  }`}
              >
                All players
              </button>
            </div>
          </div>
          {sortedHistory.length === 0 ? (
            <p className="text-sm text-slate-300">No guesses yet.</p>
          ) : visibleGuesses.length === 0 ? (
            <p className="text-sm text-slate-300">No guesses from your side yet.</p>
          ) : (
            <div className="space-y-2">
              {visibleGuesses.map((item) => {
                // const kinds = getDigitKinds(
                //   item.guess,
                //   item.actualBulls,
                //   item.actualCows,
                //   item.toPlayerId === myProfile?.id ? mySecret : undefined,
                // )

                return (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <span>Turn {item.turnNumber}</span>
                      <div className="flex flex-wrap justify-end gap-1">
                        {item.guess.split('').map((digit, index) => (
                          <span
                            key={`${item.id}-digit-${digit}-${index}`}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border font-mono text-xs font-bold ${getDigitChipClassName('miss')}`}
                          >
                            {digit}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300">
                      {room.profiles[item.fromPlayerId]?.username ?? 'Player'} • {item.actualBulls} Strikes • {item.actualCows} Balls
                    </p>
                    {item.lieDetected && (
                      <p className="text-xs font-semibold text-rose-200">
                        Lie detected: {room.profiles[item.toPlayerId]?.username ?? 'Responder'} gave a false answer.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </article>

      {room.status === 'rps' && (
        <div className="fixed inset-0 z-[980] flex items-center justify-center bg-slate-950/88 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-2xl rounded-3xl p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-fuchsia-300">Rock Paper Scissors</p>
            <h3 className="mt-2 text-2xl font-black text-white">Pick your symbol</h3>
            <p className="mt-2 text-sm text-slate-300">Winner starts first. A tie triggers another round.</p>

            <div className="mx-auto mt-5 w-full max-w-md">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-cyan-200">
                <span>Locking in...</span>
                <span>{rpsTimeLeftSeconds}s</span>
              </div>
              <div className="h-2 w-full  rounded-full border border-white/10 bg-white/5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 transition-[width] duration-100"
                  style={{ width: `${rpsProgress * 100}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {RPS_ITEMS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onRpsChoice(item.value)}
                  className={`rounded-3xl border px-3 py-5 text-center transition ${rpsChoice === item.value
                    ? 'border-fuchsia-200/45 bg-gradient-to-r from-fuchsia-300 to-violet-400 text-slate-950'
                    : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  title={item.label}
                >
                  <div className="text-5xl">{item.icon}</div>
                  <div className="mt-2 text-sm font-semibold">{item.label}</div>
                </button>
              ))}
            </div>

            {rpsChoice ? (
              <p className="mt-4 text-sm font-semibold text-cyan-200">You picked {rpsChoice}. You can still change before timer ends.</p>
            ) : (
              <p className="mt-4 text-sm font-semibold text-cyan-200">No choice yet. Random pick if timer reaches zero.</p>
            )}
          </div>
        </div>
      )}

      {emotesEnabled && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[985] h-0 w-0 sm:bottom-24 sm:right-6">
          {flyingEmotes.map((entry) => (
            <span
              key={entry.id}
              className="quick-emote-fly"
              style={{
                ['--emote-origin-x' as string]: `${entry.originX}px`,
                ['--emote-origin-y' as string]: `${entry.originY}px`,
                ['--emote-x1' as string]: `${entry.x1}px`,
                ['--emote-y1' as string]: `${entry.y1}px`,
                ['--emote-x2' as string]: `${entry.x2}px`,
                ['--emote-y2' as string]: `${entry.y2}px`,
                ['--emote-x3' as string]: `${entry.x3}px`,
                ['--emote-y3' as string]: `${entry.y3}px`,
                ['--emote-x4' as string]: `${entry.x4}px`,
                ['--emote-y4' as string]: `${entry.y4}px`,
                ['--emote-rotate1' as string]: `${entry.rotate1}deg`,
                ['--emote-rotate2' as string]: `${entry.rotate2}deg`,
                ['--emote-rotate3' as string]: `${entry.rotate3}deg`,
                ['--emote-rotate4' as string]: `${entry.rotate4}deg`,
                ['--emote-scale1' as string]: `${entry.scale1}`,
                ['--emote-scale2' as string]: `${entry.scale2}`,
                ['--emote-scale3' as string]: `${entry.scale3}`,
                ['--emote-scale4' as string]: `${entry.scale4}`,
                ['--emote-duration' as string]: `${entry.durationMs}ms`,
                ['--emote-base-scale' as string]: `${emoteScale}`,
              }}
            >
              {entry.value}
            </span>
          ))}
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-[990] flex flex-col items-end gap-2 sm:bottom-24 sm:right-6">
        {showEmotePicker && (
          <div className="glass-panel-strong w-[18.5rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 p-3 space-y-3">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setEmotesEnabled((enabled) => !enabled)}
                className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition ${emotesEnabled
                  ? 'bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                  : 'bg-slate-500/20 text-slate-300 hover:bg-slate-500/30'
                  }`}
              >
                {emotesEnabled ? 'Receiving emotes: ON' : 'Receiving emotes: OFF'}
              </button>
              <div className="px-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-300">Received size</label>
                  <span className="text-xs text-slate-400">{Math.round(emoteScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={emoteScale}
                  onChange={(e) => setEmoteScale(parseFloat(e.currentTarget.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-400"
                />
              </div>
            </div>

            <div className="max-h-44 overflow-y-auto">
              <div className="grid grid-cols-5 gap-2">
                {QUICK_EMOTES.map((emote) => (
                  <button
                    key={emote}
                    type="button"
                    onClick={() => {
                      sendQuickEmote(emote)
                      setShowEmotePicker(false)
                    }}
                    className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-xl leading-none transition hover:scale-105 hover:bg-white/10"
                  >
                    {emote}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          onPointerDown={onMainEmotePointerDown}
          onPointerUp={onMainEmotePointerEnd}
          onPointerCancel={onMainEmotePointerEnd}
          onPointerLeave={onMainEmotePointerEnd}
          className="flex h-14 w-14 select-none items-center justify-center rounded-full border border-cyan-200/35 bg-gradient-to-br from-cyan-300 via-sky-300 to-fuchsia-300 text-2xl shadow-[0_14px_34px_rgba(34,211,238,0.38)] transition hover:scale-105"
          aria-label="Toggle quick emotes"
          aria-expanded={showEmotePicker}
        >
          {selectedQuickEmote}
        </button>
      </div>

    </section>
  )
}
