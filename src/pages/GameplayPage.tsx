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
            ? 'border-emerald-400 bg-emerald-100 text-emerald-900'
            : tone === 'present'
              ? 'border-amber-400 bg-amber-100 text-amber-900'
              : tone === 'absent'
                ? 'border-slate-300 bg-slate-100 text-slate-600'
                : tone === 'neutral'
                  ? 'border-violet-300 bg-violet-100 text-violet-900'
                  : 'border-violet-200 bg-white text-violet-400'

        return (
          <button
            key={index}
            type="button"
            onClick={() => onCellClick?.(index)}
            className={`flex h-11 items-center justify-center rounded-lg border text-lg font-black transition-all duration-300 ${
              isSelected ? 'ring-2 ring-fuchsia-500 ring-offset-2 scale-110' : 'hover:scale-105'
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
    <div className="mt-3 animate-slide-in-up rounded-xl border border-violet-200 bg-white p-3 shadow-lg transition-all duration-300">
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
            className="transform rounded-lg bg-violet-100 px-2 py-2 text-sm font-bold text-violet-900 transition-all duration-200 hover:scale-110 hover:bg-violet-200 active:scale-95"
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
          className="transform rounded-lg border border-violet-300 bg-violet-50 px-2 py-2 text-xs font-semibold text-violet-900 transition-all duration-200 hover:scale-105 hover:bg-violet-100 active:scale-95"
        >
          Backspace
        </button>
        <button
          type="button"
          onClick={() => onChange('')}
          className="transform rounded-lg border border-violet-300 bg-violet-50 px-2 py-2 text-xs font-semibold text-violet-900 transition-all duration-200 hover:scale-105 hover:bg-violet-100 active:scale-95"
        >
          Clear
        </button>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        className="mt-3 w-full transform rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:brightness-110 active:scale-95 shadow-md hover:shadow-lg"
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
  onLeaveRoom,
  onDeleteRoom,
}: GameplayPageProps) {
  const [secretSelectedIndex, setSecretSelectedIndex] = useState<number | null>(null)
  const [guessSelectedIndex, setGuessSelectedIndex] = useState<number | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const showPenaltyCounters = room.status === 'playing' || room.status === 'finished'
  const isPlaying = room.status === 'playing'
  const isMyTurnCard = isPlaying && room.currentTurnPlayerId === user.id
  const isOpponentTurnCard = isPlaying && opponentProfile?.id === room.currentTurnPlayerId
  const pendingGuessHints =
    room.pendingGuess && mySecret
      ? getGuessCellHints(mySecret, room.pendingGuess.guess, room.settings.codeLength)
      : undefined

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
      <article className={`animate-slide-in-down rounded-3xl border border-violet-200 bg-white shadow-xl transition-all duration-500 ${isPlaying ? 'p-4' : 'p-6'}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="animate-fade-in">
            <p className="text-xs uppercase tracking-[0.2em] text-violet-700">Room #{room.id.slice(0, 6)}</p>
            <p className="text-sm font-semibold text-fuchsia-900">{room.roomName}</p>
            <h2 className={`transform transition-all duration-300 ${isPlaying ? 'text-xl' : 'text-2xl'} font-bold text-fuchsia-950`}>{room.status.toUpperCase()}</h2>
            <p className={`transition-colors duration-300 ${isPlaying ? 'text-xs' : 'text-sm'} text-fuchsia-800/80`}>{room.message ?? 'Game in progress'}</p>
          </div>
          <div className="flex gap-2 sm:grid-cols-1">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="transform rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-900 transition-all duration-200 hover:scale-105 hover:bg-violet-100 active:scale-95"
              title="Room settings"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div
            className={`animate-slide-in-left transform rounded-xl p-2.5 transition-all duration-300 hover:shadow-lg hover:scale-105 ${
              isMyTurnCard
                ? 'border border-emerald-400 bg-emerald-100 ring-2 ring-emerald-300'
                : 'bg-violet-50'
            }`}
          >
            <p className="font-semibold">You: {myProfile?.avatar} {myProfile?.username}</p>
            <p className={`${isPlaying ? 'text-xs' : 'text-sm'} text-fuchsia-800/80`}>
              {showPenaltyCounters
                ? `Penalties: ${room.penalties[user.id] ?? 0}/${MAX_PENALTIES}`
                : 'Penalties activate during battle.'}
            </p>
            {isMyTurnCard && <p className="mt-1 text-xs font-bold text-emerald-900">Your turn</p>}
            {mySecret && (
              <div>
                <p className={`${isPlaying ? 'text-xs' : 'text-sm'} mt-1 text-fuchsia-900`}>Your code</p>
                <CodeCells value={mySecret} length={room.settings.codeLength} />
              </div>
            )}
          </div>
          <div
            className={`animate-slide-in-right transform rounded-xl p-2.5 transition-all duration-300 hover:shadow-lg hover:scale-105 ${
              isOpponentTurnCard
                ? 'border border-emerald-400 bg-emerald-100 ring-2 ring-emerald-300'
                : 'bg-violet-50'
            }`}
          >
            <p className="font-semibold">Opponent: {opponentProfile?.avatar ?? '❔'} {opponentProfile?.username ?? 'Waiting...'}</p>
            <p className={`${isPlaying ? 'text-xs' : 'text-sm'} text-fuchsia-800/80`}>
              {showPenaltyCounters
                ? `Penalties: ${opponentProfile ? room.penalties[opponentProfile.id] ?? 0 : 0}/${MAX_PENALTIES}`
                : 'Penalties activate during battle.'}
            </p>
            {isOpponentTurnCard && <p className="mt-1 text-xs font-bold text-emerald-900">Opponent turn</p>}
          </div>
        </div>
      </article>

      {room.status === 'rps' && (
        <article className="animate-slide-in-up rounded-3xl border border-violet-200 bg-white p-6 shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold text-fuchsia-900">Rock Paper Scissors</h3>
          <p className="mt-1 text-sm text-fuchsia-800/80">First win decides who starts. Tie repeats.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {RPS_ITEMS.map((item, idx) => (
              <button
                key={item.value}
                onClick={() => onRpsChoice(item.value)}
                title={item.label}
                className={`transform rounded-xl px-4 py-2 font-semibold transition-all duration-200 active:scale-95 ${
                  rpsChoice === item.value ? 'scale-110 bg-fuchsia-600 text-white shadow-lg' : 'bg-violet-100 hover:scale-110 hover:bg-violet-200'
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
        <article className="animate-slide-in-up rounded-3xl border border-violet-200 bg-white p-6 shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold text-fuchsia-900">Set your secret combination</h3>
          <p className="mt-1 text-sm text-fuchsia-800/80">
            Length: {room.settings.codeLength} • {room.settings.allowDuplicates ? 'duplicates allowed' : 'no duplicates'}
          </p>
          
          {secretLocked ? (
            <div className="mt-4 animate-scale-in">
              <div className="transform rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition-all duration-300 hover:shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-emerald-900">🔐 Code Locked</p>
                  <button
                    type="button"
                    onClick={onUnlockSecret}
                    className="transform rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-emerald-700 active:scale-95"
                  >
                    Unlock Code
                  </button>
                </div>
                <CodeCells
                  value={secretInput}
                  length={room.settings.codeLength}
                />
                <p className="mt-3 text-xs text-emerald-800">Your code is locked and hidden from your opponent. You can unlock it to make changes.</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 animate-fade-in">
              <p className="mb-2 text-xs text-fuchsia-700">Tap a cell to select it, then tap a digit to fill it.</p>
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
        <article className="animate-slide-in-up rounded-3xl border border-violet-200 bg-white p-6 shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold text-fuchsia-900">Battle Phase</h3>

          {myTurn && !room.pendingGuess && (
            <div className="mt-4 animate-slide-in-left">
              <p className="mb-2 text-xs text-fuchsia-700">Tap a cell to select it, then tap a digit to fill it.</p>
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
            <div className="mt-4 rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4">
              <p className="font-medium">Opponent guess review</p>
              <CodeCells
                value={room.pendingGuess.guess}
                length={room.settings.codeLength}
                tones={pendingGuessHints}
              />
              {mySecret && (
                <p className="mt-2 text-xs text-fuchsia-900">
                  Green = right digit in right spot, yellow = digit exists in another spot, gray = not in your code.
                </p>
              )}
              <div className="mt-4 grid gap-4 md:max-w-xs">
                <div>
                  <p className="mb-2 text-sm font-semibold text-fuchsia-900">Bulls</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: room.settings.codeLength + 1 }).map((_, i) => {
                      const disabled = isButtonDisabled(true, i)
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => !disabled && onClaimedBullsChange(i)}
                          disabled={disabled}
                          className={`h-9 w-9 rounded-lg border font-bold transition ${
                            disabled
                              ? 'cursor-not-allowed border-slate-300 bg-slate-100 text-slate-600'
                              : claimedBulls === i
                                ? 'border-emerald-400 bg-emerald-100 text-emerald-900 shadow-md'
                                : 'border-violet-300 bg-violet-100 text-violet-900 hover:bg-violet-200'
                          }`}
                        >
                          {i}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-fuchsia-900">Cows</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: room.settings.codeLength + 1 }).map((_, i) => {
                      const disabled = isButtonDisabled(false, i)
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => !disabled && onClaimedCowsChange(i)}
                          disabled={disabled}
                          className={`h-9 w-9 rounded-lg border font-bold transition ${
                            disabled
                              ? 'cursor-not-allowed border-slate-300 bg-slate-100 text-slate-600'
                              : claimedCows === i
                                ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-md'
                                : 'border-violet-300 bg-violet-100 text-violet-900 hover:bg-violet-200'
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
                className="mt-3 rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-500 px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
              >
                Submit Answer
              </button>
            </div>
          )}

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-violet-100 text-left">
                  <th className="px-3 py-2">Turn</th>
                  <th className="px-3 py-2">By</th>
                  <th className="px-3 py-2">Guess</th>
                  <th className="px-3 py-2">Claimed</th>
                  <th className="px-3 py-2">Actual</th>
                  <th className="px-3 py-2">Lie?</th>
                </tr>
              </thead>
              <tbody>
                {sortedHistory.map((item) => (
                  <tr key={item.id} className="border-b border-violet-100">
                    <td className="px-3 py-2">{item.turnNumber}</td>
                    <td className="px-3 py-2">{room.profiles[item.fromPlayerId]?.username}</td>
                    <td className="px-3 py-2 font-mono">{item.guess}</td>
                    <td className="px-3 py-2">{item.claimedBulls} / {item.claimedCows}</td>
                    <td className="px-3 py-2">{item.actualBulls} / {item.actualCows}</td>
                    <td className="px-3 py-2">{item.lieDetected ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {room.status === 'finished' && (
        <article className="animate-slide-in-up rounded-3xl border border-emerald-300 bg-emerald-50 p-6 shadow-xl transition-all duration-300">
          <h3 className="animate-float text-2xl font-bold text-emerald-900">🎉 Game Over</h3>
          
          <div className="mt-4 animate-scale-in transform rounded-xl border border-emerald-200 bg-white p-4 transition-all duration-300 hover:shadow-lg hover:scale-105">
            <p className="text-lg font-bold text-emerald-900">
              🏆 Winner: {room.profiles[room.winnerId ?? '']?.username ?? 'Unknown'}
            </p>
          </div>

          {(() => {
            const { turnsTaken, totalBulls, totalCows } = calculateGameScore()
            return (
              <div className="mt-4 animate-fade-in space-y-2 rounded-xl bg-white p-4">
                <h4 className="font-semibold text-emerald-900">Game Stats</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="transform rounded-lg bg-blue-50 p-3 text-center transition-all duration-300 hover:shadow-lg hover:scale-110">
                    <p className="text-xs text-blue-700">Turns</p>
                    <p className="text-2xl font-bold text-blue-900">{turnsTaken}</p>
                  </div>
                  <div className="transform rounded-lg bg-green-50 p-3 text-center transition-all duration-300 hover:shadow-lg hover:scale-110">
                    <p className="text-xs text-green-700">Bulls</p>
                    <p className="text-2xl font-bold text-green-900">{totalBulls}</p>
                  </div>
                  <div className="transform rounded-lg bg-yellow-50 p-3 text-center transition-all duration-300 hover:shadow-lg hover:scale-110">
                    <p className="text-xs text-yellow-700">Cows</p>
                    <p className="text-2xl font-bold text-yellow-900">{totalCows}</p>
                  </div>
                </div>
              </div>
            )
          })()}

          <button
            onClick={onLeaveRoom}
            className="transform mt-4 w-full rounded-xl bg-fuchsia-700 px-4 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-fuchsia-600 active:scale-95 shadow-md hover:shadow-lg"
          >
            Back To Rooms
          </button>
        </article>
      )}

      {showSettingsModal && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-fuchsia-950/60 p-4 backdrop-blur-sm transition-all duration-300"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="animate-scale-in w-full max-w-sm transform rounded-3xl border border-fuchsia-200 bg-white p-6 shadow-2xl transition-all duration-300"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-fuchsia-900">Room Settings</h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-sm font-semibold text-fuchsia-800 hover:bg-fuchsia-100"
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
                className="w-full rounded-lg border border-violet-300 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900 hover:bg-violet-100"
              >
                📋 Copy Invite Link
              </button>
              
              {room.hostId === user.id && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteRoom()
                    setShowSettingsModal(false)
                  }}
                  className="w-full rounded-lg bg-fuchsia-700 px-4 py-3 text-sm font-semibold text-white hover:bg-fuchsia-600"
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
                className="w-full rounded-lg bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-500"
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
