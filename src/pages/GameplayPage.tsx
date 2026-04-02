import { useState } from 'react'
import { MAX_PENALTIES } from '../constants'
import type { GuessRecord, PlayerProfile, RoomData, RpsChoice, UserProfile } from '../types'
import { evaluateGuess } from '../utils/game'

const RPS_ITEMS: Array<{ value: RpsChoice; icon: string; label: string }> = [
  { value: 'rock', icon: '🪨', label: 'Rock' },
  { value: 'paper', icon: '📄', label: 'Paper' },
  { value: 'scissors', icon: '✂️', label: 'Scissors' },
]

const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

type CellTone = 'empty' | 'neutral' | 'exact' | 'present' | 'absent'

type GameplayPageProps = {
  user: UserProfile
  room: RoomData
  myProfile: PlayerProfile | null
  opponentProfile: PlayerProfile | null
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
  onCopyInvite: () => void
  onShareTelegram?: () => void
  onShareWhatsApp?: () => void
  onLeaveRoom: () => void
  onDeleteRoom: () => void
}

type NumericPadProps = {
  value: string
  maxLength: number
  onChange: (nextValue: string) => void
  onDigitClick?: (digit: string) => void
  onSubmit: () => void
  submitLabel: string
}

type CodeCellsProps = {
  value: string
  length: number
  tones?: CellTone[]
  onCellClick?: (index: number) => void
  selectedIndex?: number | null
}

function CodeCells({ value, length, tones, onCellClick, selectedIndex }: CodeCellsProps) {
  const chars = value.slice(0, length).split('')

  return (
    <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-10">
      {Array.from({ length }).map((_, index) => {
        const digit = chars[index] ?? ''
        const tone = tones?.[index] ?? (digit ? 'neutral' : 'empty')
        const isSelected = selectedIndex === index
        const toneClass =
          tone === 'exact'
            ? 'border-emerald-300/70 bg-emerald-300/20 text-emerald-100'
            : tone === 'present'
              ? 'border-amber-300/70 bg-amber-300/20 text-amber-100'
              : tone === 'absent'
                ? 'border-white/12 bg-white/6 text-slate-400'
                : tone === 'neutral'
                  ? 'border-fuchsia-300/40 bg-fuchsia-300/15 text-fuchsia-100'
                  : 'border-white/12 bg-slate-950/40 text-slate-500'

        return (
          <button
            key={index}
            type="button"
            onClick={() => onCellClick?.(index)}
            className={`flex h-12 items-center justify-center rounded-xl border text-lg font-black transition-all duration-300 sm:h-11 ${
              isSelected ? 'ring-2 ring-fuchsia-300 ring-offset-2 ring-offset-slate-950 scale-105' : 'hover:scale-105'
            } ${toneClass} ${onCellClick ? 'cursor-pointer hover:brightness-110' : ''}`}
            style={{
              animation: digit ? `popBounce 0.3s ease-out ${index * 30}ms both` : undefined,
            }}
          >
            {digit || '•'}
          </button>
        )
      })}
    </div>
  )
}

function getGuessCellHints(secret: string, guess: string, length: number): CellTone[] {
  const secretChars = secret.slice(0, length).split('')
  const guessChars = guess.slice(0, length).split('')
  const tones: CellTone[] = Array.from({ length }, (_, i) => (guessChars[i] ? 'absent' : 'empty'))
  const remainingCounts: Record<string, number> = {}

  for (let i = 0; i < length; i += 1) {
    const secretDigit = secretChars[i]
    const guessDigit = guessChars[i]

    if (!guessDigit) continue

    if (secretDigit === guessDigit) {
      tones[i] = 'exact'
    } else if (secretDigit) {
      remainingCounts[secretDigit] = (remainingCounts[secretDigit] ?? 0) + 1
    }
  }

  for (let i = 0; i < length; i += 1) {
    if (tones[i] === 'exact') continue
    const guessDigit = guessChars[i]
    if (!guessDigit) continue

    if ((remainingCounts[guessDigit] ?? 0) > 0) {
      tones[i] = 'present'
      remainingCounts[guessDigit] -= 1
    } else {
      tones[i] = 'absent'
    }
  }

  return tones
}

function NumericPad({ value, maxLength, onChange, onDigitClick, onSubmit, submitLabel }: NumericPadProps) {
  return (
    <div className="mt-3 animate-slide-in-up rounded-2xl border border-white/10 bg-slate-950/45 p-3 shadow-lg transition-all duration-300">
      <div className="grid grid-cols-5 gap-2">
        {DIGIT_KEYS.map((digit, idx) => (
          <button
            type="button"
            key={digit}
            onClick={() => {
              onDigitClick?.(digit)
              if (!onDigitClick && value.length < maxLength) {
                onChange(`${value}${digit}`)
              }
            }}
            className="transform rounded-lg border border-white/10 bg-white/5 px-2 py-3 text-base font-bold text-slate-100 transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
            style={{
              animation: `slideInUp 0.3s ease-out ${idx * 20}ms both`,
            }}
          >
            {digit}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(value.slice(0, -1))}
          className="transform rounded-lg border border-white/10 bg-white/5 px-2 py-2.5 text-xs font-semibold text-slate-100 transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
        >
          Backspace
        </button>
        <button
          type="button"
          onClick={() => onChange('')}
          className="transform rounded-lg border border-white/10 bg-white/5 px-2 py-2.5 text-xs font-semibold text-slate-100 transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
        >
          Clear
        </button>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        className="mt-3 w-full transform rounded-lg bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-3 py-3 text-sm font-bold text-slate-950 transition-all duration-300 hover:scale-[1.01] hover:brightness-110 active:scale-95 shadow-md hover:shadow-lg"
      >
        {submitLabel}
      </button>
    </div>
  )
}

export function GameplayPage({
  user,
  room,
  myProfile,
  opponentProfile,
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
  onCopyInvite,
  onShareTelegram,
  onShareWhatsApp,
  onLeaveRoom,
  onDeleteRoom,
}: GameplayPageProps) {
  const [secretSelectedIndex, setSecretSelectedIndex] = useState<number | null>(null)
  const [guessSelectedIndex, setGuessSelectedIndex] = useState<number | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showAllGuesses, setShowAllGuesses] = useState(false)

  const showPenaltyCounters = room.status === 'playing' || room.status === 'finished'
  const isPlaying = room.status === 'playing'
  const isMyTurnCard = isPlaying && myProfile?.id === room.currentTurnPlayerId
  const isOpponentTurnCard = isPlaying && opponentProfile?.id === room.currentTurnPlayerId
  const pendingGuessHints =
    room.pendingGuess && mySecret
      ? getGuessCellHints(mySecret, room.pendingGuess.guess, room.settings.codeLength)
      : undefined
  const activeViewerId = myProfile?.id ?? user.id
  const visibleHistory = showAllGuesses
    ? sortedHistory
    : sortedHistory.filter((item) => item.fromPlayerId === activeViewerId)

  const handleSecretCellClick = (index: number) => {
    setSecretSelectedIndex(index)
  }

  const handleSecretDigitInput = (digit: string) => {
    if (secretSelectedIndex === null) return
    const chars = secretInput.split('')
    chars[secretSelectedIndex] = digit
    onSecretInputChange(chars.join(''))
    if (secretSelectedIndex < room.settings.codeLength - 1) {
      setSecretSelectedIndex(secretSelectedIndex + 1)
    }
  }

  const handleGuessCellClick = (index: number) => {
    setGuessSelectedIndex(index)
  }

  const handleGuessDigitInput = (digit: string) => {
    if (guessSelectedIndex === null) return
    const chars = guessInput.split('')
    chars[guessSelectedIndex] = digit
    onGuessInputChange(chars.join(''))
    if (guessSelectedIndex < room.settings.codeLength - 1) {
      setGuessSelectedIndex(guessSelectedIndex + 1)
    }
  }

  const calculateGameScore = () => {
    const winnerGuesses = (room.guessHistory ?? {})
    const guessesByWinner = Object.values(winnerGuesses).filter((guess) => guess.fromPlayerId === room.winnerId)
    const turnsTaken = guessesByWinner.length
    const totalBulls = guessesByWinner.reduce((sum, guess) => sum + guess.actualBulls, 0)
    const totalCows = guessesByWinner.reduce((sum, guess) => sum + guess.actualCows, 0)
    return { turnsTaken, totalBulls, totalCows }
  }

  const isButtonDisabled = (isBulls: boolean, value: number): boolean => {
    // Only apply restrictions when responding to a guess
    if (!pendingForResponder || !mySecret || !room.pendingGuess) return false

    // Check if lies are forbidden or limit reached
    const liesDisallowed = !room.settings.allowLies || (room.penalties[user.id] ?? 0) >= MAX_PENALTIES
    if (!liesDisallowed) return false

    // Calculate actual bulls/cows
    const actual = evaluateGuess(mySecret, room.pendingGuess.guess)
    const actualValue = isBulls ? actual.bulls : actual.cows

    // Disable if this value doesn't match the actual
    return value !== actualValue
  }

  return (
    <section className="space-y-5">
      <article className={`glass-panel-strong animate-slide-in-down rounded-[2rem] shadow-xl transition-all duration-500 ${isPlaying ? 'p-4 md:p-5' : 'p-6'}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="animate-fade-in">
            <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-300">Room #{room.id.slice(0, 6)}</p>
            <p className="text-sm font-semibold text-slate-100">{room.roomName}</p>
            <h2 className={`transform transition-all duration-300 ${isPlaying ? 'text-xl' : 'text-2xl'} font-bold text-white`}>{room.status.toUpperCase()}</h2>
            <p className={`transition-colors duration-300 ${isPlaying ? 'text-xs' : 'text-sm'} text-slate-300`}>{room.message ?? 'Game in progress'}</p>
          </div>
          <div className="flex gap-2 sm:grid-cols-1">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="transform rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
              title="Room settings"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div
            className={`animate-slide-in-left transform rounded-2xl p-3 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
              isMyTurnCard
                ? 'border border-emerald-300/45 bg-emerald-300/15 ring-2 ring-emerald-300/30'
                : 'border border-white/8 bg-white/5'
            }`}
          >
            <p className="font-semibold text-white">You: {myProfile?.avatar} {myProfile?.username}</p>
            <p className={`${isPlaying ? 'text-xs' : 'text-sm'} text-slate-300`}>
              {showPenaltyCounters
                ? `Penalties: ${room.penalties[user.id] ?? 0}/${MAX_PENALTIES}`
                : 'Penalties activate during battle.'}
            </p>
            {isMyTurnCard && <p className="mt-1 text-xs font-bold text-emerald-100">Your turn</p>}
            {mySecret && (
              <div>
                <p className={`${isPlaying ? 'text-xs' : 'text-sm'} mt-1 text-slate-100`}>Your code</p>
                <CodeCells value={mySecret} length={room.settings.codeLength} />
              </div>
            )}
          </div>
          <div
            className={`animate-slide-in-right transform rounded-2xl p-3 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
              isOpponentTurnCard
                ? 'border border-emerald-300/45 bg-emerald-300/15 ring-2 ring-emerald-300/30'
                : 'border border-white/8 bg-white/5'
            }`}
          >
            <p className="font-semibold text-white">Opponent: {opponentProfile?.avatar ?? '❔'} {opponentProfile?.username ?? 'Waiting...'}</p>
            <p className={`${isPlaying ? 'text-xs' : 'text-sm'} text-slate-300`}>
              {showPenaltyCounters
                ? `Penalties: ${opponentProfile ? room.penalties[opponentProfile.id] ?? 0 : 0}/${MAX_PENALTIES}`
                : 'Penalties activate during battle.'}
            </p>
            {isOpponentTurnCard && <p className="mt-1 text-xs font-bold text-emerald-100">Opponent turn</p>}
          </div>
        </div>
      </article>

      {room.status === 'rps' && (
        <article className="glass-panel animate-slide-in-up rounded-3xl p-6 shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold text-white">Rock Paper Scissors</h3>
          <p className="mt-1 text-sm text-slate-300">First win starts the match.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {RPS_ITEMS.map((item, idx) => (
              <button
                key={item.value}
                onClick={() => onRpsChoice(item.value)}
                title={item.label}
                className={`transform rounded-xl px-4 py-2 font-semibold transition-all duration-200 active:scale-95 ${
                  rpsChoice === item.value
                    ? 'scale-105 bg-gradient-to-r from-fuchsia-300 to-violet-400 text-slate-950 shadow-lg'
                    : 'border border-white/10 bg-white/5 text-slate-100 hover:scale-105 hover:bg-white/10'
                }`}
                style={{
                  animation: `scaleIn 0.3s ease-out ${idx * 50}ms both`,
                }}
              >
                <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                <span className="sr-only">{item.label}</span>
              </button>
            ))}
          </div>
        </article>
      )}

      {room.status === 'secrets' && (
        <article className="glass-panel animate-slide-in-up rounded-3xl p-6 shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold text-white">Set your secret combination</h3>
          <p className="mt-1 text-sm text-slate-300">
            Length: {room.settings.codeLength} • {room.settings.allowDuplicates ? 'duplicates allowed' : 'no duplicates'}
          </p>
          
          {secretLocked ? (
            <div className="mt-4 animate-scale-in">
              <div className="transform rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4 transition-all duration-300 hover:shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-emerald-100">🔐 Code Locked</p>
                  <button
                    type="button"
                    onClick={onUnlockSecret}
                    className="transform rounded-lg border border-emerald-300/30 bg-emerald-300/15 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition-all duration-200 hover:scale-105 hover:bg-emerald-300/20 active:scale-95"
                  >
                    Unlock Code
                  </button>
                </div>
                <CodeCells
                  value={secretInput}
                  length={room.settings.codeLength}
                />
                <p className="mt-3 text-xs text-emerald-100/90">Your code is locked and hidden from your opponent. You can unlock it to make changes.</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 animate-fade-in">
              <p className="mb-2 text-xs text-slate-300">Tap a cell to select it, then tap a digit to fill it.</p>
              <CodeCells
                value={secretInput}
                length={room.settings.codeLength}
                onCellClick={handleSecretCellClick}
                selectedIndex={secretSelectedIndex}
              />
              <NumericPad
                value={secretInput}
                maxLength={room.settings.codeLength}
                onChange={onSecretInputChange}
                onDigitClick={secretSelectedIndex !== null ? handleSecretDigitInput : undefined}
                onSubmit={onSubmitSecret}
                submitLabel="Lock Secret"
              />
            </div>
          )}
        </article>
      )}

      {room.status === 'playing' && (
        <article className="glass-panel animate-slide-in-up rounded-3xl p-6 shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold text-white">Battle Phase</h3>

          {myTurn && !room.pendingGuess && (
            <div className="mt-4 animate-slide-in-left">
              <p className="mb-2 text-xs text-slate-300">Tap a cell to select it, then tap a digit to fill it.</p>
              <CodeCells
                value={guessInput}
                length={room.settings.codeLength}
                onCellClick={handleGuessCellClick}
                selectedIndex={guessSelectedIndex}
              />
              <NumericPad
                value={guessInput}
                maxLength={room.settings.codeLength}
                onChange={onGuessInputChange}
                onDigitClick={guessSelectedIndex !== null ? handleGuessDigitInput : undefined}
                onSubmit={onSubmitGuess}
                submitLabel="Send Guess"
              />
            </div>
          )}

          {room.pendingGuess && pendingForResponder && (
            <div className="mt-4 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 p-4">
              <p className="font-medium text-fuchsia-100">Opponent guess</p>
              <CodeCells
                value={room.pendingGuess.guess}
                length={room.settings.codeLength}
                tones={pendingGuessHints}
              />
              {mySecret && (
                <p className="mt-2 text-xs text-fuchsia-100/90">
                  Green = right digit in right spot, yellow = digit exists in another spot, gray = not in your code.
                </p>
              )}
              <div className="mt-4 grid gap-4 md:max-w-xs">
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-100">Bulls</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: room.settings.codeLength + 1 }).map((_, i) => {
                      const disabled = isButtonDisabled(true, i)
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => !disabled && onClaimedBullsChange(i)}
                          disabled={disabled}
                          className={`h-11 w-11 rounded-lg border font-bold transition ${
                            disabled
                              ? 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'
                              : claimedBulls === i
                                ? 'border-emerald-300/60 bg-emerald-300/20 text-emerald-100 shadow-md'
                                : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                          }`}
                        >
                          {i}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-100">Cows</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: room.settings.codeLength + 1 }).map((_, i) => {
                      const disabled = isButtonDisabled(false, i)
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => !disabled && onClaimedCowsChange(i)}
                          disabled={disabled}
                          className={`h-11 w-11 rounded-lg border font-bold transition ${
                            disabled
                              ? 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'
                              : claimedCows === i
                                ? 'border-amber-300/60 bg-amber-300/20 text-amber-100 shadow-md'
                                : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                          }`}
                        >
                          {i}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={onAnswerGuess}
                className="mt-3 rounded-lg bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110"
              >
                Submit Answer
              </button>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {showAllGuesses ? 'All Guesses' : 'My Guesses'} ({visibleHistory.length})
            </p>
            <button
              type="button"
              onClick={() => setShowAllGuesses((current) => !current)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
            >
              {showAllGuesses ? 'Show Mine Only' : 'Show Opponent Too'}
            </button>
          </div>

          {visibleHistory.length === 0 && (
            <div className="rounded-xl border border-white/8 bg-slate-950/45 px-3 py-3 text-sm text-slate-300">
              No guesses yet.
            </div>
          )}

          <div className="mt-2 space-y-2 md:hidden">
            {visibleHistory.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/8 bg-slate-950/45 p-3 text-sm text-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Turn {item.turnNumber}</span>
                  <span className="font-mono text-fuchsia-200">{item.guess}</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">{room.profiles[item.fromPlayerId]?.username}</p>
                <p className="mt-2 text-xs text-slate-300">
                  Claimed {item.claimedBulls}/{item.claimedCows} • Actual {item.actualBulls}/{item.actualCows} • {item.lieDetected ? 'Lie' : 'Clean'}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-2 hidden overflow-x-auto rounded-2xl border border-white/8 bg-slate-950/45 md:block">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-200">
                  <th className="px-3 py-3">Turn</th>
                  <th className="px-3 py-3">By</th>
                  <th className="px-3 py-3">Guess</th>
                  <th className="px-3 py-3">Claimed</th>
                  <th className="px-3 py-3">Actual</th>
                  <th className="px-3 py-3">Lie?</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((item) => (
                  <tr key={item.id} className="border-t border-white/8 text-slate-100">
                    <td className="px-3 py-2.5">{item.turnNumber}</td>
                    <td className="px-3 py-2.5">{room.profiles[item.fromPlayerId]?.username}</td>
                    <td className="px-3 py-2.5 font-mono text-fuchsia-100">{item.guess}</td>
                    <td className="px-3 py-2.5">{item.claimedBulls} / {item.claimedCows}</td>
                    <td className="px-3 py-2.5">{item.actualBulls} / {item.actualCows}</td>
                    <td className="px-3 py-2.5">{item.lieDetected ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {room.status === 'finished' && (
        <article className="animate-slide-in-up rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-6 shadow-xl transition-all duration-300">
          <h3 className="animate-float text-2xl font-bold text-emerald-100">🎉 Game Over</h3>
          
          <div className="mt-4 animate-scale-in transform rounded-xl border border-emerald-300/30 bg-slate-950/45 p-4 transition-all duration-300 hover:shadow-lg hover:scale-105">
            <p className="text-lg font-bold text-emerald-100">
              🏆 Winner: {room.profiles[room.winnerId ?? '']?.username ?? 'Unknown'}
            </p>
          </div>

          {(() => {
            const { turnsTaken, totalBulls, totalCows } = calculateGameScore()
            return (
              <div className="mt-4 animate-fade-in space-y-2 rounded-xl border border-white/10 bg-slate-950/45 p-4">
                <h4 className="font-semibold text-emerald-100">Game Stats</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="transform rounded-lg border border-sky-300/20 bg-sky-300/10 p-3 text-center transition-all duration-300 hover:shadow-lg hover:scale-105">
                    <p className="text-xs text-sky-100">Turns</p>
                    <p className="text-2xl font-bold text-sky-50">{turnsTaken}</p>
                  </div>
                  <div className="transform rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-3 text-center transition-all duration-300 hover:shadow-lg hover:scale-105">
                    <p className="text-xs text-emerald-100">Bulls</p>
                    <p className="text-2xl font-bold text-emerald-50">{totalBulls}</p>
                  </div>
                  <div className="transform rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-center transition-all duration-300 hover:shadow-lg hover:scale-105">
                    <p className="text-xs text-amber-100">Cows</p>
                    <p className="text-2xl font-bold text-amber-50">{totalCows}</p>
                  </div>
                </div>
              </div>
            )
          })()}

          <button
            onClick={onLeaveRoom}
            className="transform mt-4 w-full rounded-xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 font-semibold text-slate-950 transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 shadow-md hover:shadow-lg"
          >
            Back To Rooms
          </button>
        </article>
      )}

      {showSettingsModal && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl transition-all duration-300"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="glass-panel-strong animate-scale-in w-full max-w-sm transform rounded-3xl p-6 transition-all duration-300"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-white">Room Settings</h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  onCopyInvite()
                  setShowSettingsModal(false)
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                🔗 Smart Share Invite
              </button>

              {onShareTelegram && (
                <button
                  type="button"
                  onClick={() => {
                    onShareTelegram()
                    setShowSettingsModal(false)
                  }}
                  className="w-full rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/15"
                >
                  ✈️ Share On Telegram
                </button>
              )}

              {onShareWhatsApp && (
                <button
                  type="button"
                  onClick={() => {
                    onShareWhatsApp()
                    setShowSettingsModal(false)
                  }}
                  className="w-full rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15"
                >
                  💬 Share On WhatsApp
                </button>
              )}
              
              {room.hostId === user.id && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteRoom()
                    setShowSettingsModal(false)
                  }}
                  className="w-full rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-400/15"
                >
                  🗑️ Delete Room
                </button>
              )}
              
              <button
                type="button"
                onClick={() => {
                  onLeaveRoom()
                  setShowSettingsModal(false)
                }}
                className="w-full rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/15"
              >
                🚪 Leave Room
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
