import type { PlayerProfile, RoomData, UserProfile } from '../types'

type WaitingRoomPageProps = {
  user: UserProfile
  room: RoomData
  myProfile: PlayerProfile | null
  opponentProfile: PlayerProfile | null
  onCopyInvite: () => void
  onShareTelegram: () => void
  onShareWhatsApp: () => void
  onLeaveRoom: () => void
  onDeleteRoom: () => void
  onJoinAsPlayer2?: () => void
}

export function WaitingRoomPage({
  user,
  room,
  myProfile,
  opponentProfile,
  onCopyInvite,
  onShareTelegram,
  onShareWhatsApp,
  onLeaveRoom,
  onDeleteRoom,
  onJoinAsPlayer2,
}: WaitingRoomPageProps) {
  const roomTags = [
    room.settings.isPrivate ? 'Private' : 'Public',
    `${room.settings.codeLength} digits`,
    room.settings.allowDuplicates ? 'Duplicates on' : 'Unique digits',
    room.settings.allowLies ? 'Lies enabled' : 'No lies',
  ]

  return (
    <section className="space-y-5">
      <article className="glass-panel-strong rounded-[2rem] p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.34em] text-fuchsia-300">Staging bay</p>
            <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">{room.roomName}</h2>
            <p className="mt-2 text-sm text-slate-300">Room #{room.id.slice(0, 6)} · waiting for launch</p>
          </div>

          <div className="rounded-[1.25rem] border border-white/8 bg-white/6 px-4 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Your slot</p>
            <p className="mt-2 text-3xl">{myProfile?.avatar}</p>
            <p className="text-sm font-semibold text-white">{myProfile?.username}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {roomTags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-fuchsia-300/15 bg-fuchsia-300/10 p-5">
          <p className="text-sm font-semibold text-fuchsia-100">Match will begin as soon as the opponent joins.</p>
          <p className="mt-2 text-sm leading-6 text-fuchsia-50/80">
            Send the invite link now, or use a direct share button below to open Telegram, WhatsApp, or the native share sheet.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">You</p>
            <p className="mt-2 text-base font-semibold text-white">
              {myProfile?.avatar} {myProfile?.username}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Opponent</p>
            {opponentProfile ? (
              <p className="mt-2 text-base font-semibold text-white">
                {opponentProfile.avatar} {opponentProfile.username}
              </p>
            ) : room.hostId === user.id && onJoinAsPlayer2 ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-300">No opponent yet</p>
                <button
                  onClick={onJoinAsPlayer2}
                  className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-2 text-xs font-bold text-fuchsia-100 transition hover:bg-fuchsia-300/15"
                >
                  Join as P2
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-300">Waiting for a player...</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={onCopyInvite}
            className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Copy invite
          </button>
          <button
            onClick={onShareTelegram}
            className="rounded-[1.5rem] border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/15"
          >
            Telegram
          </button>
          <button
            onClick={onShareWhatsApp}
            className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15"
          >
            WhatsApp
          </button>
          <button
            onClick={onLeaveRoom}
            className="rounded-[1.5rem] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/15"
          >
            Leave
          </button>
          {room.hostId === user.id && (
            <button
              onClick={onDeleteRoom}
              className="rounded-[1.5rem] border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-400/15"
            >
              Delete room
            </button>
          )}
        </div>
      </article>
    </section>
  )
}
