import { useMemo, useState } from 'react'
import { evaluateGuess } from '../utils/game'

type PracticePageProps = {
  onBackToWelcome: () => void
  onStartLobby: () => void
}

type PracticeTurn = {
  id: string
  guess: string
  bulls: number
  cows: number
}

function createSecret(length: number): string {
  const digits = '0123456789'.split('')
  const shuffled = [...digits].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, length).join('')
}

export function PracticePage({ onBackToWelcome, onStartLobby }: PracticePageProps) {
  const codeLength = 4
  const [secret, setSecret] = useState(() => createSecret(codeLength))
  const [guess, setGuess] = useState('')
  const [turns, setTurns] = useState<PracticeTurn[]>([])
  const [message, setMessage] = useState('Try to crack the hidden 4-digit code.')
  const [revealed, setRevealed] = useState(false)

  const solved = useMemo(() => turns.some((turn) => turn.bulls === codeLength), [turns])

  const restart = () => {
    setSecret(createSecret(codeLength))
    setGuess('')
    setTurns([])
    setMessage('New puzzle ready. Start guessing.')
    setRevealed(false)
  }

  const submitGuess = () => {
    const trimmed = guess.trim()
    if (!/^\d+$/.test(trimmed) || trimmed.length !== codeLength) {
      setMessage(`Enter exactly ${codeLength} digits.`)
      return
    }

    const result = evaluateGuess(secret, trimmed)
    const nextTurn: PracticeTurn = {
      id: crypto.randomUUID(),
      guess: trimmed,
      bulls: result.bulls,
      cows: result.cows,
    }

    setTurns((current) => [nextTurn, ...current])
    setGuess('')

    if (result.bulls === codeLength) {
      setMessage('Solved. Start a live match to play against someone else.')
      setRevealed(true)
      return
    }

    setMessage(`Close: ${result.bulls} strikes and ${result.cows} balls.`)
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-0">
      <article className="glass-panel-strong overflow-hidden rounded-[2rem] border border-white/10 p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.34em] text-cyan-200/80">Instant demo</p>
            <h1 className="mt-3 text-4xl font-black leading-[0.95] text-white sm:text-6xl">Learn the game in one minute.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              This local practice mode uses the same strike-and-ball logic as the real game, but it does not need a login or a second player.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={submitGuess}
                className="rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                Check guess
              </button>
              <button
                type="button"
                onClick={restart}
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                New puzzle
              </button>
              <button
                type="button"
                onClick={onStartLobby}
                className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
              >
                Start live game
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-300">Current puzzle</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Secret code</p>
              <p className="mt-2 font-mono text-4xl font-bold text-white">{revealed ? secret : '• • • •'}</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Length</p>
                <p className="text-lg font-bold text-white">4</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Turns</p>
                <p className="text-lg font-bold text-white">{turns.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Solved</p>
                <p className="text-lg font-bold text-white">{solved ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel rounded-3xl p-4 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200/80">Make a guess</p>
          <label className="mt-3 block text-sm font-semibold text-white">Enter 4 digits</label>
          <input
            value={guess}
            onChange={(event) => setGuess(event.target.value.replace(/\D/g, '').slice(0, codeLength))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                submitGuess()
              }
            }}
            placeholder="1234"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-2xl font-mono tracking-[0.25em] text-white outline-none transition focus:border-fuchsia-300/60"
          />
          <p className="mt-3 text-sm text-slate-300">{message}</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={submitGuess}
              className="rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:brightness-110"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => setGuess('')}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">What the feedback means</p>
            <p className="mt-2">Strikes are correct digits in the correct place. Balls are correct digits in the wrong place.</p>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-fuchsia-200/80">Guess history</p>
            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
            >
              {revealed ? 'Hide answer' : 'Reveal answer'}
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {turns.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">No guesses yet. Try a number like 0123.</p>
            ) : (
              turns.map((turn, index) => (
                <div key={turn.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">Turn {turns.length - index}</p>
                    <p className="font-mono text-lg text-fuchsia-100">{turn.guess}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">
                    {turn.bulls} strikes, {turn.cows} balls
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </article>

      <article className="glass-panel-strong rounded-3xl p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200/80">Ready for the real thing?</p>
            <p className="mt-1 text-sm text-slate-300">Use the lobby to create a room, invite a friend, and play a live match.</p>
          </div>
          <button
            type="button"
            onClick={onBackToWelcome}
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Back to landing
          </button>
        </div>
      </article>
    </section>
  )
}