import type { LobbyRoomSummary } from '../../types'
import { PlayerCountBadge, RoomBadges } from './RoomBadges'

type ActiveRoomCardProps = {
  entry: LobbyRoomSummary
  onRequestJoin: (roomId: string, roomIsPrivate: boolean) => void
  onWatchRoom: (roomId: string) => void
}

export function ActiveRoomCard({ entry, onRequestJoin, onWatchRoom }: ActiveRoomCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/[0.08]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 w-full">
          <div className="flex items-center justify-between gap-2 w-full">
            <p className="truncate text-sm font-bold text-white">{entry.roomName}</p>
            <PlayerCountBadge hasGuest={entry.hasGuest} />
          </div>
          <p className="mt-0.5 text-xs text-cyan-200/95">Host: {entry.hostName}</p>
        </div>
        <div className="shrink-0 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => onRequestJoin(entry.id, entry.isPrivate)}
            disabled={entry.hasGuest}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition ${
              entry.hasGuest
                ? 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-400'
                : 'bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 text-slate-950 shadow-[0_10px_24px_rgba(34,211,238,0.2)] hover:brightness-110'
            }`}
          >
            {entry.hasGuest ? 'In game' : 'Join →'}
          </button>
          <button
            type="button"
            onClick={() => onWatchRoom(entry.id)}
            className="rounded-xl border border-violet-300/35 bg-violet-300/15 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-violet-100 transition hover:bg-violet-300/25"
          >
            Watch
          </button>
        </div>
      </div>

      <div className="mt-2 max-w-[80%]">
        <RoomBadges entry={entry} />
      </div>
    </div>
  )
}

type PastRoomCardProps = {
  entry: LobbyRoomSummary
  onOpenPastGameResults: (roomId: string) => void
}

export function PastRoomCard({ entry, onOpenPastGameResults }: PastRoomCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{entry.roomName}</p>
          <p className="mt-0.5 text-xs text-slate-300">Completed game • Host: {entry.hostName}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenPastGameResults(entry.id)}
          className="shrink-0 rounded-xl border border-cyan-300/30 bg-cyan-300/15 px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-cyan-100 transition hover:bg-cyan-300/25"
        >
          View result
        </button>
      </div>

      <div className="mt-2">
        <RoomBadges entry={entry} />
      </div>
    </div>
  )
}
