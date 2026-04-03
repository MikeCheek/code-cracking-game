import type { GuessRecord, PlayerProfile, RoomData, RpsChoice, UserProfile } from '../types'

const RPS_ITEMS: Array<{ value: RpsChoice; icon: string; label: string }> = [
  { value: 'rock', icon: '🪨', label: 'Rock' },
  { value: 'paper', icon: '📄', label: 'Paper' },
  { value: 'scissors', icon: '✂️', label: 'Scissors' },
]

const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const

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
  onLeaveRoom: () => void
  onDeleteRoom: () => void
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
  onLeaveRoom,
  onDeleteRoom,
}: GameplayPageProps) {
  const isMyTurnCard = room.currentTurnPlayerId && myProfile?.id === room.currentTurnPlayerId
  const isOpponentTurnCard = room.currentTurnPlayerId && opponentProfile?.id === room.currentTurnPlayerId
  const maxCodeLength = room.settings.codeLength

  const appendDigit = (current: string, digit: string) => {
    if (current.length >= maxCodeLength) return
    return `${current}${digit}`
  }

  const numberOptions = Array.from({ length: maxCodeLength + 1 }, (_, index) => index)

  return (
    <section className="mx-auto grid h-full w-full max-w-4xl grid-rows-[auto_auto_1fr_auto] gap-3 overflow-hidden">
      <article className="glass-panel-strong rounded-3xl p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Game</p>
        <h2 className="text-xl font-bold text-white">{room.roomName}</h2>
        <p className="text-sm text-slate-300">{room.message ?? 'Playing'}</p>
      </article>

      <article className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className={`rounded-2xl border p-3 ${isMyTurnCard ? 'border-emerald-300/45 bg-emerald-300/15' : 'border-white/10 bg-white/5'}`}>
          <p className="text-sm font-semibold text-white">{myProfile?.avatar} {myProfile?.username ?? 'You'}</p>
          <p className="mt-1 text-xs text-slate-300">{isMyTurnCard ? 'Current player' : 'Waiting'}</p>
          {mySecret && <p className="mt-1 font-mono text-fuchsia-100">Code: {mySecret}</p>}
        </div>
        <div className={`rounded-2xl border p-3 ${isOpponentTurnCard ? 'border-emerald-300/45 bg-emerald-300/15' : 'border-white/10 bg-white/5'}`}>
          <p className="text-sm font-semibold text-white">{opponentProfile?.avatar ?? '❔'} {opponentProfile?.username ?? 'Opponent'}</p>
          <p className="mt-1 text-xs text-slate-300">{isOpponentTurnCard ? 'Current player' : 'Waiting'}</p>
        </div>
      </article>

      <article className="grid grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[1fr_1fr]">
        <div className="glass-panel rounded-3xl p-4 overflow-y-auto">
          <p className="text-sm font-semibold text-white">Current action</p>

          {room.status === 'rps' && (
            <div className="mt-3 flex gap-2">
              {RPS_ITEMS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onRpsChoice(item.value)}
                  className={`rounded-2xl px-4 py-3 text-2xl transition ${
                    rpsChoice === item.value
                      ? 'bg-gradient-to-r from-fuchsia-300 to-violet-400 text-slate-950'
                      : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                  }`}
                  title={item.label}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          )}

          {room.status === 'secrets' && (
            <div className="mt-3 space-y-2">
              <div className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-slate-100">
                {(secretInput || '').padEnd(maxCodeLength, '•')}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {DIGIT_KEYS.map((digit) => (
                  <button
                    key={`secret-digit-${digit}`}
                    type="button"
                    onClick={() => onSecretInputChange(appendDigit(secretInput, digit) ?? secretInput)}
                    disabled={secretLocked}
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
                  onClick={onSubmitSecret}
                  disabled={secretLocked || secretInput.length !== maxCodeLength}
                  className="rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 text-sm font-bold text-slate-950"
                >
                  {secretLocked ? 'Code locked' : 'Lock code'}
                </button>
                <button
                  type="button"
                  onClick={onUnlockSecret}
                  disabled={!secretLocked}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Unlock
                </button>
              </div>
            </div>
          )}

          {room.status === 'playing' && (
            <div className="mt-3 space-y-3">
              {myTurn && !room.pendingGuess && (
                <>
                  <div className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-slate-100">
                    {(guessInput || '').padEnd(maxCodeLength, '•')}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {DIGIT_KEYS.map((digit) => (
                      <button
                        key={`guess-digit-${digit}`}
                        type="button"
                        onClick={() => onGuessInputChange(appendDigit(guessInput, digit) ?? guessInput)}
                        className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-sm font-bold text-white transition hover:bg-white/10"
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

              {room.pendingGuess && pendingForResponder && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm text-white">Opponent guess: <span className="font-mono text-fuchsia-100">{room.pendingGuess.guess}</span></p>
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-xs text-slate-300">Strikes</p>
                      <div className="mt-1 grid grid-cols-6 gap-1">
                        {numberOptions.map((value) => (
                          <button
                            key={`strikes-${value}`}
                            type="button"
                            onClick={() => onClaimedBullsChange(value)}
                            className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                              claimedBulls === value
                                ? 'bg-fuchsia-300/30 text-white'
                                : 'border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-300">Balls</p>
                      <div className="mt-1 grid grid-cols-6 gap-1">
                        {numberOptions.map((value) => (
                          <button
                            key={`balls-${value}`}
                            type="button"
                            onClick={() => onClaimedCowsChange(value)}
                            className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                              claimedCows === value
                                ? 'bg-fuchsia-300/30 text-white'
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

        <div className="glass-panel rounded-3xl p-3 overflow-y-auto">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </article>

      <article className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onLeaveRoom}
          className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/15"
        >
          Leave game
        </button>
        {room.hostId === user.id ? (
          <button
            type="button"
            onClick={onDeleteRoom}
            className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-400/15"
          >
            Delete game
          </button>
        ) : (
          <div />
        )}
      </article>
    </section>
  )
}
