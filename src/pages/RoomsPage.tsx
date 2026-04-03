import { useState } from 'react'
import type { LobbyRoomSummary } from '../types'

type RoomsPageProps = {
  joinableRooms: LobbyRoomSummary[]
  codeLength: number
  allowDuplicates: boolean
  isPrivate: boolean
  allowLies: boolean
  newRoomName: string
  newRoomPassword: string
  joinPassword: string
  onCodeLengthChange: (value: number) => void
  onAllowDuplicatesChange: (value: boolean) => void
  onIsPrivateChange: (value: boolean) => void
  onAllowLiesChange: (value: boolean) => void
  onNewRoomNameChange: (value: string) => void
  onRegenerateRoomName: () => void
  onNewRoomPasswordChange: (value: string) => void
  onJoinPasswordChange: (value: string) => void
  onCreateRoom: () => Promise<boolean>
  onJoinRoom: (roomId: string) => Promise<boolean>
}

export function RoomsPage({
  joinableRooms,
  codeLength,
  allowDuplicates,
  isPrivate,
  allowLies,
  newRoomName,
  newRoomPassword,
  joinPassword,
  onCodeLengthChange,
  onAllowDuplicatesChange,
  onIsPrivateChange,
  onAllowLiesChange,
  onNewRoomNameChange,
  onRegenerateRoomName,
  onNewRoomPasswordChange,
  onJoinPasswordChange,
  onCreateRoom,
  onJoinRoom,
}: RoomsPageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [privateRoomToJoinId, setPrivateRoomToJoinId] = useState<string | null>(null)

  const onRequestJoin = async (roomId: string, roomIsPrivate: boolean) => {
    if (!roomIsPrivate) {
      await onJoinRoom(roomId)
      return
    }

    onJoinPasswordChange('')
    setPrivateRoomToJoinId(roomId)
  }

  return (
    <section className="mx-auto grid h-full w-full max-w-3xl grid-rows-[auto_1fr] gap-3 overflow-hidden">
      <article className="glass-panel-strong rounded-3xl p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-white">Open games</h2>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:brightness-110"
          >
            Create game
          </button>
        </div>
      </article>

      <article className="glass-panel rounded-3xl p-3 overflow-y-auto">
        {joinableRooms.length === 0 ? (
          <p className="text-sm text-slate-300">No open games right now.</p>
        ) : (
          <div className="space-y-2">
            {joinableRooms.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  void onRequestJoin(entry.id, entry.isPrivate)
                }}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{entry.roomName}</span>
                  <span className="text-xs text-slate-300">Join</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </article>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-lg rounded-[1.75rem] p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="mt-1 text-2xl font-bold text-white">Create game</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <label className="mt-2 block text-sm font-semibold text-slate-100">Room name</label>
            <div className="mt-1 flex gap-2">
              <input
                value={newRoomName}
                onChange={(event) => onNewRoomNameChange(event.target.value)}
                placeholder="Your room name"
                maxLength={40}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-fuchsia-300/60"
              />
              <button
                type="button"
                onClick={onRegenerateRoomName}
                className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-fuchsia-200 transition hover:bg-white/10"
              >
                Random
              </button>
            </div>

            <label className="mt-3 block text-sm font-semibold text-slate-100">Digits length (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={codeLength}
              onChange={(event) => onCodeLengthChange(Number(event.target.value))}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-slate-100 outline-none transition focus:border-fuchsia-300/60"
            />

            <label className="mt-3 flex items-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-100 transition hover:bg-white/10">
              <input
                type="checkbox"
                checked={allowDuplicates}
                onChange={(event) => onAllowDuplicatesChange(event.target.checked)}
              />
              Allow duplicated digits
            </label>

            <label className="mt-3 flex items-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-100 transition hover:bg-white/10">
              <input type="checkbox" checked={isPrivate} onChange={(event) => onIsPrivateChange(event.target.checked)} />
              Private room
            </label>

            {isPrivate && (
              <input
                value={newRoomPassword}
                onChange={(event) => onNewRoomPasswordChange(event.target.value)}
                placeholder="Room password"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-fuchsia-300/60"
              />
            )}

            <label className="mt-3 flex items-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-100 transition hover:bg-white/10">
              <input type="checkbox" checked={allowLies} onChange={(event) => onAllowLiesChange(event.target.checked)} />
              Allow lies (up to 3)
            </label>

            <button
              onClick={async () => {
                const created = await onCreateRoom()
                if (created) {
                  setShowCreateModal(false)
                }
              }}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 font-bold text-slate-950 transition hover:brightness-110"
            >
              Create game
            </button>
          </div>
        </div>
      )}

      {privateRoomToJoinId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-md rounded-[1.75rem] p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="mt-1 text-2xl font-bold text-white">Enter password</h3>
              <button
                type="button"
                onClick={() => {
                  setPrivateRoomToJoinId(null)
                  onJoinPasswordChange('')
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <input
              value={joinPassword}
              onChange={(event) => onJoinPasswordChange(event.target.value)}
              placeholder="Enter room password"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-fuchsia-300/60"
            />

            <button
              onClick={async () => {
                const joined = await onJoinRoom(privateRoomToJoinId)
                if (joined) {
                  setPrivateRoomToJoinId(null)
                  onJoinPasswordChange('')
                }
              }}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 font-bold text-slate-950 transition hover:brightness-110"
            >
              Join game
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
