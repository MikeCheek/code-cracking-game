import { useState } from 'react'
import type { LobbyRoomSummary } from '../types'

type RoomsPageProps = {
  currentUserAvatar: string
  joinableRooms: LobbyRoomSummary[]
  myHostedRooms: LobbyRoomSummary[]
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
  onJoinOwnRoomAsGuest: (roomId: string, guestName: string, guestAvatar: string) => Promise<boolean>
  onDeleteHostedRoom: (roomId: string) => void
}

export function RoomsPage({
  currentUserAvatar,
  joinableRooms,
  myHostedRooms,
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
  onJoinOwnRoomAsGuest,
  onDeleteHostedRoom,
}: RoomsPageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [privateRoomToJoinId, setPrivateRoomToJoinId] = useState<string | null>(null)
  const [samePhoneRoomId, setSamePhoneRoomId] = useState<string | null>(null)
  const [samePhoneGuestName, setSamePhoneGuestName] = useState('Player 2')
  const [samePhoneGuestAvatar, setSamePhoneGuestAvatar] = useState(currentUserAvatar === '😀' ? '😎' : '😀')

  const onRequestJoin = async (roomId: string, roomIsPrivate: boolean) => {
    if (!roomIsPrivate) {
      await onJoinRoom(roomId)
      return
    }

    onJoinPasswordChange('')
    setPrivateRoomToJoinId(roomId)
  }

  const openSamePhoneSetup = (roomId: string, hostName: string) => {
    setSamePhoneRoomId(roomId)
    setSamePhoneGuestName(`${hostName.slice(0, 16)} (P2)`)
    setSamePhoneGuestAvatar(currentUserAvatar === '😀' ? '😎' : '😀')
  }

  const roomRuleLabel = (entry: LobbyRoomSummary) => {
    const parts = [
      `${entry.codeLength} digits`,
      entry.allowDuplicates ? 'duplicates on' : 'unique digits',
      entry.isPrivate ? 'private' : 'public',
    ]
    return parts.join(' · ')
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <article className="glass-panel-strong rounded-[2rem] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.34em] text-fuchsia-300">Lobby</p>
            <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">Room browser</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Jump into an open match, spin up a fresh room, or host a same-phone session in seconds.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110"
          >
            Create room
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="glass-panel rounded-[1.25rem] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Open rooms</p>
            <p className="mt-2 text-3xl font-bold text-white">{joinableRooms.length}</p>
          </div>
          <div className="glass-panel rounded-[1.25rem] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">My hosted</p>
            <p className="mt-2 text-3xl font-bold text-white">{myHostedRooms.length}</p>
          </div>
          <div className="glass-panel rounded-[1.25rem] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Current avatar</p>
            <p className="mt-2 text-3xl">{currentUserAvatar}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-white">Join instantly</h3>
            <span className="text-sm text-slate-400">Public rooms only</span>
          </div>

          {joinableRooms.length === 0 && (
            <div className="rounded-[1.5rem] border border-white/8 bg-white/5 px-4 py-5 text-sm text-slate-300">
              No open rooms are live right now. Create one and be the first match on the board.
            </div>
          )}

          <div className="grid gap-3">
            {joinableRooms.map((entry, idx) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  void onRequestJoin(entry.id, entry.isPrivate)
                }}
                className="glass-panel group w-full rounded-[1.5rem] p-4 text-left transition hover:-translate-y-0.5 hover:border-fuchsia-300/30 hover:bg-white/[0.09]"
                style={{ animation: `slideInUp 0.45s ease-out ${idx * 70}ms both` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-bold text-white">{entry.roomName}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-300">
                        {entry.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">Host: {entry.hostName}</p>
                    <p className="mt-1 text-xs text-slate-400">{roomRuleLabel(entry)}</p>
                  </div>
                  <span className="rounded-2xl bg-gradient-to-r from-fuchsia-300 to-violet-300 px-4 py-2 text-sm font-bold text-slate-950 transition group-hover:brightness-110">
                    Join
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-white">My hosted rooms</h3>
            <span className="text-sm text-slate-400">Manage or delete</span>
          </div>

          {myHostedRooms.length === 0 && (
            <div className="rounded-[1.5rem] border border-white/8 bg-white/5 px-4 py-5 text-sm text-slate-300">
              You are not hosting any rooms yet.
            </div>
          )}

          <div className="grid gap-3">
            {myHostedRooms.map((entry, idx) => (
              <div
                key={entry.id}
                className="glass-panel rounded-[1.5rem] p-4"
                style={{ animation: `slideInUp 0.45s ease-out ${idx * 70}ms both` }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-white">{entry.roomName}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Room #{entry.id.slice(0, 6)} · {entry.hasGuest ? 'Ready to play' : 'Waiting for a guest'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{entry.isPrivate ? 'Private room' : 'Public room'}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!entry.hasGuest && (
                      <button
                        type="button"
                        onClick={() => openSamePhoneSetup(entry.id, entry.hostName)}
                        className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-2 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-300/15"
                      >
                        Join same phone
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteHostedRoom(entry.id)}
                      className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/15"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-lg rounded-[1.75rem] p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-fuchsia-300">Room builder</p>
                <h3 className="mt-1 text-2xl font-bold text-white">Create room</h3>
              </div>
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
              Create Room
            </button>
          </div>
        </div>
      )}

      {privateRoomToJoinId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-md rounded-[1.75rem] p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-fuchsia-300">Private room</p>
                <h3 className="mt-1 text-2xl font-bold text-white">Enter password</h3>
              </div>
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
              Join Private Room
            </button>
          </div>
        </div>
      )}

      {samePhoneRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-md rounded-[1.75rem] p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-fuchsia-300">Same-phone mode</p>
                <h3 className="mt-1 text-2xl font-bold text-white">Player 2 setup</h3>
              </div>
              <button
                type="button"
                onClick={() => setSamePhoneRoomId(null)}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <label className="block text-sm font-semibold text-slate-100">Player 2 name</label>
            <input
              value={samePhoneGuestName}
              onChange={(event) => setSamePhoneGuestName(event.target.value)}
              maxLength={24}
              placeholder="Enter Player 2 name"
              className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none"
            />

            <label className="mt-4 block text-sm font-semibold text-slate-100">Player 2 avatar</label>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {['😀', '😎', '🤖', '🧠', '🦊', '🐼', '🐯', '🐸', '🦄', '🐙', '🚀', '⚡'].map((icon) => (
                <button
                  type="button"
                  key={icon}
                  onClick={() => setSamePhoneGuestAvatar(icon)}
                  className={`rounded-2xl border px-2 py-2 text-lg transition ${samePhoneGuestAvatar === icon ? 'border-fuchsia-300/60 bg-fuchsia-300/15' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                  {icon}
                </button>
              ))}
            </div>

            <button
              onClick={async () => {
                const joined = await onJoinOwnRoomAsGuest(samePhoneRoomId, samePhoneGuestName, samePhoneGuestAvatar)
                if (joined) {
                  setSamePhoneRoomId(null)
                }
              }}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 font-bold text-slate-950 transition hover:brightness-110"
            >
              Start Same-Phone Match
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
