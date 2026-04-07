import type { PastGameSummary } from '../types'

type HistoryPageProps = {
  games: PastGameSummary[]
  onOpenPastResult: (roomId: string) => void
}

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function resultClassName(result: PastGameSummary['result']): string {
  if (result === 'win') return 'bg-emerald-400/20 text-emerald-200 border-emerald-300/40'
  if (result === 'loss') return 'bg-rose-400/20 text-rose-200 border-rose-300/40'
  return 'bg-amber-300/20 text-amber-100 border-amber-300/30'
}

function resultLabel(result: PastGameSummary['result']): string {
  if (result === 'win') return 'Win'
  if (result === 'loss') return 'Loss'
  return 'Unknown'
}

export function HistoryPage({ games, onOpenPastResult }: HistoryPageProps) {
  const totalGames = games.length
  const wins = games.filter((game) => game.result === 'win').length
  const losses = games.filter((game) => game.result === 'loss').length
  const unknown = games.filter((game) => game.result === 'unknown').length
  const myLiesDetected = games.reduce((sum, game) => sum + game.myLiesDetected, 0)
  const opponentLiesDetected = games.reduce((sum, game) => sum + game.opponentLiesDetected, 0)
  const totalTurns = games.reduce((sum, game) => sum + game.turns, 0)
  const averageTurns = totalGames > 0 ? (totalTurns / totalGames).toFixed(1) : '0.0'
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header className="glass-panel-strong rounded-3xl p-5">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200/80">Account Stats</p>
        <h2 className="mt-2 text-3xl font-black text-white">Past Games</h2>
        <p className="mt-2 text-sm text-slate-300">Review wins, losses, lies detected, and match details from your account history.</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Games</p>
            <p className="mt-1 text-xl font-black text-white">{totalGames}</p>
          </div>
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/80">Wins</p>
            <p className="mt-1 text-xl font-black text-emerald-100">{wins}</p>
          </div>
          <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-rose-200/80">Losses</p>
            <p className="mt-1 text-xl font-black text-rose-100">{losses}</p>
          </div>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-amber-100/80">Unknown</p>
            <p className="mt-1 text-xl font-black text-amber-100">{unknown}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Win Rate</p>
            <p className="mt-1 text-xl font-black text-white">{winRate}%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Avg Turns</p>
            <p className="mt-1 text-xl font-black text-white">{averageTurns}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-900/45 px-3 py-2 text-sm text-slate-200">
            Your lies detected: <span className="font-bold text-rose-200">{myLiesDetected}</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/45 px-3 py-2 text-sm text-slate-200">
            Opponent lies detected: <span className="font-bold text-emerald-200">{opponentLiesDetected}</span>
          </div>
        </div>
      </header>

      {games.length === 0 ? (
        <article className="glass-panel rounded-3xl p-6 text-center">
          <h3 className="text-xl font-bold text-white">No finished games yet</h3>
          <p className="mt-2 text-sm text-slate-300">Complete at least one account match to populate this page.</p>
        </article>
      ) : (
        <div className="grid gap-3">
          {games.map((game) => (
            <article key={game.id} className="glass-panel rounded-2xl border border-white/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-white">{game.roomName}</h3>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] ${resultClassName(game.result)}`}>
                  {resultLabel(game.result)}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-400">Played {formatDateTime(game.playedAt)}</p>

              <div className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                <p><span className="text-slate-400">Opponent:</span> {game.opponentName}</p>
                <p><span className="text-slate-400">Role:</span> {game.myRole}</p>
                <p><span className="text-slate-400">Mode:</span> {game.gameMode}{game.gameMode === 'words' ? ` (${game.wordLanguage ?? 'en'})` : ''}</p>
                <p><span className="text-slate-400">Code length:</span> {game.codeLength}</p>
                <p><span className="text-slate-400">Turns:</span> {game.turns}</p>
                <p><span className="text-slate-400">Duplicates:</span> {game.allowDuplicates ? 'Yes' : 'No'}</p>
                <p><span className="text-slate-400">Lies allowed:</span> {game.allowLies ? 'Yes' : 'No'}</p>
                <p><span className="text-slate-400">Private room:</span> {game.isPrivate ? 'Yes' : 'No'}</p>
                <p><span className="text-slate-400">Your lies caught:</span> {game.myLiesDetected}</p>
                <p><span className="text-slate-400">Opponent lies caught:</span> {game.opponentLiesDetected}</p>
                <p><span className="text-slate-400">Your penalties:</span> {game.myPenalties}</p>
                <p><span className="text-slate-400">Opponent penalties:</span> {game.opponentPenalties}</p>
              </div>

              {(game.winnerName || game.message) && (
                <p className="mt-3 text-xs text-slate-300">
                  {game.winnerName ? `Winner: ${game.winnerName}. ` : ''}
                  {game.message ?? ''}
                </p>
              )}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => onOpenPastResult(game.id)}
                  className="rounded-xl border border-cyan-300/35 bg-cyan-300/15 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                >
                  Open Match Details
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
