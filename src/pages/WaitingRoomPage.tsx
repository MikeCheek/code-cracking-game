import type { PlayerProfile, RoomData, UserProfile } from '../types'

type WaitingRoomPageProps = {
  user: UserProfile
  room: RoomData
  myProfile: PlayerProfile | null
  opponentProfile: PlayerProfile | null
  onCopyInvite: () => void
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
  onLeaveRoom,
  onDeleteRoom,
  onJoinAsPlayer2,
}: WaitingRoomPageProps) {
  return (
    <section className="space-y-5">
      <article className="rounded-3xl border border-violet-200 bg-white p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-700">Room #{room.id.slice(0, 6)}</p>
        <h2 className="text-2xl font-bold text-fuchsia-950">{room.roomName}</h2>
        <p className="text-sm font-semibold text-fuchsia-900">Waiting Room</p>
        <p className="text-sm text-fuchsia-800/80">Share your invite link. Match starts as soon as someone joins.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-violet-50 p-3">
            <p className="font-semibold">You: {myProfile?.avatar} {myProfile?.username}</p>
          </div>
          <div className="rounded-xl bg-violet-50 p-3">
            {opponentProfile ? (
              <p className="font-semibold">Opponent: {opponentProfile.avatar} {opponentProfile.username}</p>
            ) : room.hostId === user.id && onJoinAsPlayer2 ? (
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-fuchsia-700">No opponent yet</span>
                <button
                  onClick={onJoinAsPlayer2}
                  className="rounded-lg border border-violet-300 bg-violet-100 px-2 py-1 text-xs font-bold text-violet-900 hover:bg-violet-200"
                >
                  Join as P2
                </button>
              </div>
            ) : (
              <p className="font-semibold">Opponent: ❔ Waiting...</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            onClick={onCopyInvite}
            className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100"
          >
            Copy Invite
          </button>
          <button
            onClick={onLeaveRoom}
            className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            Leave Room
          </button>
          {room.hostId === user.id && (
            <button
              onClick={onDeleteRoom}
              className="rounded-lg bg-fuchsia-700 px-3 py-2 text-sm font-semibold text-white hover:bg-fuchsia-600"
            >
              Delete Room
            </button>
          )}
        </div>
      </article>
    </section>
  )
}
