import type { GuessRecord, PlayerProfile, RoomData } from '../types'

type ResultsPageProps = {
  room: RoomData
  myProfile: PlayerProfile | null
  opponentProfile: PlayerProfile | null
  sortedHistory: GuessRecord[]
  onBackToRooms: () => void
  onPlayAgain: () => void
  canPlayAgain?: boolean
}

export function ResultsPage({
  room,
  myProfile,
  opponentProfile,
  sortedHistory,
  onBackToRooms,
  onPlayAgain,
  canPlayAgain = true,
}: ResultsPageProps) {
  const winner = room.winnerId ? room.profiles[room.winnerId] : null
  const myVote = Boolean(myProfile?.id && room.replayVotes?.[myProfile.id])
  const opponentVote = Boolean(opponentProfile?.id && room.replayVotes?.[opponentProfile.id])

  const winnerTurns = sortedHistory.filter((entry) => entry.fromPlayerId === room.winnerId)
  const liesDetected = sortedHistory.filter((entry) => entry.lieDetected).length
  const stats = {
    turns: winnerTurns.length,
    strikes: winnerTurns.reduce((sum, entry) => sum + entry.actualBulls, 0),
    balls: winnerTurns.reduce((sum, entry) => sum + entry.actualCows, 0),
  }

  return (
    <section className="mx-auto grid h-full w-full max-w-3xl grid-rows-[auto_auto_1fr_auto] gap-3 ">
      <article className="glass-panel rounded-3xl p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Results</p>
        <h2 className="mt-1 text-2xl font-bold text-white">{winner ? `${winner.avatar} ${winner.username} won` : 'Match finished'}</h2>
        <p className="mt-1 text-sm text-slate-300">{room.message ?? 'Game complete.'}</p>
      </article>

      <article className="grid grid-cols-3 gap-2">
        <div className="glass-panel rounded-2xl p-3 text-center">
          <p className="text-xs text-slate-400">Turns</p>
          <p className="text-xl font-bold text-white">{stats.turns}</p>
        </div>
        <div className="glass-panel rounded-2xl p-3 text-center">
          <p className="text-xs text-slate-400">Strikes</p>
          <p className="text-xl font-bold text-white">{stats.strikes}</p>
        </div>
        <div className="glass-panel rounded-2xl p-3 text-center">
          <p className="text-xs text-slate-400">Balls</p>
          <p className="text-xl font-bold text-white">{stats.balls}</p>
        </div>
      </article>

      <article className="glass-panel rounded-2xl p-3 text-center">
        <p className="text-xs text-slate-400">Lie Detector</p>
        <p className="text-base font-semibold text-rose-200">{liesDetected} detected (max 3 per player)</p>
      </article>

      <article className="glass-panel rounded-3xl p-3 overflow-y-auto">
        <p className="mb-2 text-sm font-semibold text-white">All guesses</p>
        {sortedHistory.length === 0 ? (
          <p className="text-sm text-slate-300">No guesses recorded.</p>
        ) : (
          <div className="space-y-2">
            {sortedHistory.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <span>Turn {entry.turnNumber}</span>
                  <span className="font-mono text-fuchsia-200">{entry.guess}</span>
                </div>
                <p className="text-xs text-slate-300">
                  {room.profiles[entry.fromPlayerId]?.username ?? 'Player'} • {entry.actualBulls} Strikes • {entry.actualCows} Balls
                </p>
                {entry.lieDetected && (
                  <p className="text-xs font-semibold text-rose-200">
                    Lie detected: {room.profiles[entry.toPlayerId]?.username ?? 'Responder'} gave a false answer.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="glass-panel rounded-3xl p-3">
        {canPlayAgain ? (
          <>
            <p className="text-xs text-slate-300">
              {opponentVote ? 'Opponent wants to play again.' : 'Opponent has not asked for a replay yet.'}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onBackToRooms}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Games page
              </button>
              <button
                type="button"
                onClick={onPlayAgain}
                disabled={myVote}
                className="rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-3 py-2 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {myVote ? 'Replay requested' : 'Play again'}
              </button>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1">
            <button
              type="button"
              onClick={onBackToRooms}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Games page
            </button>
          </div>
        )}
      </article>
    </section>
  )
}
