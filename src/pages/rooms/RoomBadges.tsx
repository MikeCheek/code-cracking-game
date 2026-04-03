import { WORD_LANGUAGE_LABELS } from '../../constants'
import type { LobbyRoomSummary } from '../../types'

type RoomBadgesProps = {
  entry: LobbyRoomSummary
  includePlayerCount?: boolean
}

export function PlayerCountBadge({ hasGuest }: { hasGuest: boolean }) {
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${hasGuest ? 'border-amber-300/35 bg-amber-300/15 text-amber-100' : 'border-emerald-300/35 bg-emerald-300/15 text-emerald-100'}`}>
      {hasGuest ? '2/2 players' : '1/2 players'}
    </span>
  )
}

export function RoomBadges({ entry, includePlayerCount = false }: RoomBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-white/10 bg-slate-900/55 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
        {entry.gameMode === 'words' ? 'Word mode' : 'Number mode'}
      </span>
      <span className="rounded-full border border-white/10 bg-slate-900/55 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
        {entry.codeLength} {entry.gameMode === 'words' ? 'letters' : 'digits'}
      </span>
      {entry.gameMode === 'words' && entry.wordLanguage && (
        <span className="rounded-full border border-white/10 bg-slate-900/55 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
          {WORD_LANGUAGE_LABELS[entry.wordLanguage]}
        </span>
      )}
      {entry.gameMode === 'numbers' && (
        <span className="rounded-full border border-white/10 bg-slate-900/55 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
          {entry.allowDuplicates ? 'Duplicates on' : 'Unique digits'}
        </span>
      )}
      <span className="rounded-full border border-white/10 bg-slate-900/55 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
        {entry.isPrivate ? 'Private' : 'Public'}
      </span>
      {includePlayerCount && <PlayerCountBadge hasGuest={entry.hasGuest} />}
    </div>
  )
}
