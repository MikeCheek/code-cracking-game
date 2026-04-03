import type { PlayerProfile, RoomData, UserProfile } from '../types'
import { WORD_LANGUAGE_LABELS } from '../constants'
import { getRoomGameMode, getRoomWordLanguage } from '../utils/gameMode'

type WaitingRoomPageProps = {
  user: UserProfile
  room: RoomData
  myProfile: PlayerProfile | null
  opponentProfile: PlayerProfile | null
  onLeaveRoom: () => void
  onDeleteRoom: () => void
  canDeleteRoom: boolean
  onCopyInvite: () => void
  onShareTelegram: () => void
  onShareWhatsApp: () => void
  onJoinAsPlayer2?: () => void
}

export function WaitingRoomPage({
  user,
  room,
  myProfile,
  opponentProfile,
  onLeaveRoom,
  onDeleteRoom,
  canDeleteRoom,
  onCopyInvite,
  onShareTelegram,
  onShareWhatsApp,
  onJoinAsPlayer2,
}: WaitingRoomPageProps) {
  const roomTags = [
    room.settings.isPrivate ? 'Private' : 'Public',
    getRoomGameMode(room) === 'words' ? `${room.settings.codeLength} letters` : `${room.settings.codeLength} digits`,
    getRoomGameMode(room) === 'words'
      ? `${WORD_LANGUAGE_LABELS[getRoomWordLanguage(room)]} words`
      : room.settings.allowDuplicates ? 'Duplicates on' : 'Unique digits',
    room.settings.allowLies ? 'Lies enabled' : 'No lies',
  ]

  return (
    <section className="mx-auto grid h-full w-full max-w-4xl grid-rows-[auto_1fr_auto] gap-3 overflow-hidden">
      <article className="glass-panel-strong rounded-3xl p-4">
        <h2 className="text-xl font-bold text-white">{room.roomName}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {roomTags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onLeaveRoom}
            className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/15"
          >
            Leave room
          </button>
          {canDeleteRoom && (
            <button
              type="button"
              onClick={onDeleteRoom}
              className="rounded-xl border border-fuchsia-300/25 bg-fuchsia-400/10 px-3 py-2 text-xs font-semibold text-fuchsia-100 transition hover:bg-fuchsia-400/15"
            >
              Delete room
            </button>
          )}
        </div>
      </article>

      <article className="grid grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[1fr_1fr]">
        <div className="glass-panel rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Participants</p>
          <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white">
            {myProfile?.avatar} {myProfile?.username}
          </div>
          <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white">
            {opponentProfile ? (
              <span>{opponentProfile.avatar} {opponentProfile.username}</span>
            ) : (
              <span>Waiting for player 2</span>
            )}
          </div>
          {!opponentProfile && room.hostId === user.id && onJoinAsPlayer2 && (
            <button
              type="button"
              onClick={onJoinAsPlayer2}
              className="mt-3 w-full rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-2 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-300/15"
            >
              Join as player 2
            </button>
          )}
        </div>

        <div className="glass-panel rounded-3xl p-4">
           <div className="flex items-center justify-center rounded-3xl p-4">
          <div className="animate-hourglass text-7xl" aria-hidden="true">⏳</div>
        </div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Share invite</p>
          <div className="mt-3 grid gap-2">
            <button
              onClick={onCopyInvite}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Copy invite
            </button>
            <button
              onClick={onShareTelegram}
              className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/15"
            >
              Telegram
            </button>
            <button
              onClick={onShareWhatsApp}
              className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15"
            >
              WhatsApp
            </button>
          </div>
        </div>
      </article>

    </section>
  )
}
