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

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <article className="animate-slide-in-left rounded-3xl border border-violet-200 bg-white p-6 shadow-xl transition-all duration-300">
        <h2 className="text-2xl font-black text-fuchsia-900">Game Rooms</h2>
        <div className="animate-fade-in rounded-xl border border-violet-200 bg-violet-50 p-4 transition-all duration-300">
          <p className="text-sm text-fuchsia-800/90">Create a new room with custom code rules and optional privacy.</p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="transform mt-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
          >
            Create Room
          </button>
        </div>

        <h3 className="mt-4 text-lg font-extrabold text-fuchsia-900">Join Room</h3>

        <ul className="mt-3 space-y-3">
          {joinableRooms.length === 0 && (
            <li className="animate-slide-in-left rounded-xl bg-violet-50 p-3 text-sm text-violet-700">No open rooms yet.</li>
          )}
          {joinableRooms.map((entry, idx) => (
            <li key={entry.id} className="transform animate-slide-in-left rounded-xl border border-violet-200 p-3 transition-all duration-300 hover:scale-105 hover:shadow-lg" style={{
              animation: `slideInLeft 0.5s ease-out ${idx * 100}ms both`,
            }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-fuchsia-900">{entry.roomName}</p>
                  <p className="text-xs text-fuchsia-800/80">
                    Host: {entry.hostName} •
                    {' '}
                    {entry.codeLength} digits • {entry.allowDuplicates ? 'duplicates allowed' : 'unique digits'} •{' '}
                    {entry.isPrivate ? 'private' : 'public'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    void onRequestJoin(entry.id, entry.isPrivate)
                  }}
                  className="transform rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-1.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-110 hover:brightness-110 active:scale-95"
                >
                  Join
                </button>
              </div>
            </li>
          ))}
        </ul>

        <h3 className="mt-5 text-lg font-extrabold text-fuchsia-900">My Hosted Rooms</h3>
        <ul className="mt-3 space-y-3">
          {myHostedRooms.length === 0 && (
            <li className="animate-slide-in-left rounded-xl bg-violet-50 p-3 text-sm text-violet-700">You have no active hosted rooms.</li>
          )}
          {myHostedRooms.map((entry, idx) => (
            <li key={entry.id} className="transform animate-slide-in-left rounded-xl border border-violet-200 p-3 transition-all duration-300 hover:scale-105 hover:shadow-lg" style={{
              animation: `slideInLeft 0.5s ease-out ${idx * 100}ms both`,
            }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-fuchsia-900">{entry.roomName}</p>
                  <p className="text-xs text-fuchsia-800/80">
                    Room #{entry.id.slice(0, 6)} • {entry.hasGuest ? 'Has guest' : 'Waiting'} • {entry.isPrivate ? 'private' : 'public'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!entry.hasGuest && (
                    <button
                      onClick={() => openSamePhoneSetup(entry.id, entry.hostName)}
                      className="transform rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-900 transition-all duration-200 hover:scale-105 hover:bg-violet-100 active:scale-95"
                    >
                      Join Same Phone
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteHostedRoom(entry.id)}
                    className="transform rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-rose-500 active:scale-95"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </article>

      {showCreateModal && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-fuchsia-950/60 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="animate-scale-in w-full max-w-lg transform rounded-3xl border border-fuchsia-200 bg-white p-5 shadow-2xl transition-all duration-300">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-xl font-extrabold text-fuchsia-900">Create Room</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="transform rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-sm font-semibold text-fuchsia-800 transition-all duration-200 hover:scale-105 hover:bg-fuchsia-100 active:scale-95"
              >
                Close
              </button>
            </div>

            <label className="mt-2 block text-sm font-semibold text-fuchsia-900">Room name</label>
            <div className="mt-1 flex gap-2">
              <input
                value={newRoomName}
                onChange={(event) => onNewRoomNameChange(event.target.value)}
                placeholder="Your room name"
                maxLength={40}
                className="w-full transform rounded-xl border border-violet-300 bg-white px-3 py-2 transition-all duration-200 focus:scale-105 focus:shadow-md"
              />
              <button
                type="button"
                onClick={onRegenerateRoomName}
                className="transform shrink-0 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 transition-all duration-200 hover:scale-105 hover:bg-violet-100 active:scale-95"
              >
                Random
              </button>
            </div>

            <label className="mt-3 block text-sm font-semibold text-fuchsia-900">Digits length (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={codeLength}
              onChange={(event) => onCodeLengthChange(Number(event.target.value))}
              className="mt-1 w-full transform rounded-xl border border-violet-300 bg-white px-3 py-2 transition-all duration-200 focus:scale-105 focus:shadow-md"
            />

            <label className="mt-3 flex items-center gap-2 text-sm transition-all duration-200 hover:scale-105">
              <input
                type="checkbox"
                checked={allowDuplicates}
                onChange={(event) => onAllowDuplicatesChange(event.target.checked)}
              />
              Allow duplicated digits
            </label>

            <label className="mt-3 flex items-center gap-2 text-sm transition-all duration-200 hover:scale-105">
              <input type="checkbox" checked={isPrivate} onChange={(event) => onIsPrivateChange(event.target.checked)} />
              Private room
            </label>

            {isPrivate && (
              <input
                value={newRoomPassword}
                onChange={(event) => onNewRoomPasswordChange(event.target.value)}
                placeholder="Room password"
                className="mt-3 w-full transform rounded-xl border border-violet-300 bg-white px-3 py-2 transition-all duration-200 focus:scale-105 focus:shadow-md"
              />
            )}

            <label className="mt-3 flex items-center gap-2 text-sm transition-all duration-200 hover:scale-105">
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
              className="transform mt-4 w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-500 px-4 py-2 font-semibold text-white transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 shadow-md hover:shadow-lg"
            >
              Create Room
            </button>
          </div>
        </div>
      )}

      {privateRoomToJoinId && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-fuchsia-950/60 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="animate-scale-in w-full max-w-md transform rounded-3xl border border-fuchsia-200 bg-white p-5 shadow-2xl transition-all duration-300">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-xl font-extrabold text-fuchsia-900">Private Room Password</h3>
              <button
                type="button"
                onClick={() => {
                  setPrivateRoomToJoinId(null)
                  onJoinPasswordChange('')
                }}
                className="transform rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-sm font-semibold text-fuchsia-800 transition-all duration-200 hover:scale-105 hover:bg-fuchsia-100 active:scale-95"
              >
                Close
              </button>
            </div>

            <input
              value={joinPassword}
              onChange={(event) => onJoinPasswordChange(event.target.value)}
              placeholder="Enter room password"
              className="w-full transform rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 transition-all duration-200 focus:scale-105 focus:shadow-md"
            />

            <button
              onClick={async () => {
                const joined = await onJoinRoom(privateRoomToJoinId)
                if (joined) {
                  setPrivateRoomToJoinId(null)
                  onJoinPasswordChange('')
                }
              }}
              className="transform mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 font-semibold text-white transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 shadow-md hover:shadow-lg"
            >
              Join Private Room
            </button>
          </div>
        </div>
      )}

      {samePhoneRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-fuchsia-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-fuchsia-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-xl font-extrabold text-fuchsia-900">Same-Phone Player Setup</h3>
              <button
                type="button"
                onClick={() => setSamePhoneRoomId(null)}
                className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-sm font-semibold text-fuchsia-800 hover:bg-fuchsia-100"
              >
                Close
              </button>
            </div>

            <label className="block text-sm font-semibold text-fuchsia-900">Player 2 name</label>
            <input
              value={samePhoneGuestName}
              onChange={(event) => setSamePhoneGuestName(event.target.value)}
              maxLength={24}
              placeholder="Enter Player 2 name"
              className="mt-1 w-full rounded-xl border border-violet-300 bg-white px-3 py-2"
            />

            <label className="mt-4 block text-sm font-semibold text-fuchsia-900">Player 2 avatar</label>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {['😀', '😎', '🤖', '🧠', '🦊', '🐼', '🐯', '🐸', '🦄', '🐙', '🚀', '⚡'].map((icon) => (
                <button
                  type="button"
                  key={icon}
                  onClick={() => setSamePhoneGuestAvatar(icon)}
                  className={`rounded-lg border px-2 py-2 text-lg ${samePhoneGuestAvatar === icon ? 'border-fuchsia-500 bg-fuchsia-100' : 'border-violet-200 bg-violet-50 hover:bg-violet-100'}`}
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
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 font-semibold text-white hover:brightness-110"
            >
              Start Same-Phone Match
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
