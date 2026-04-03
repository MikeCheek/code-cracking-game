import { useState } from 'react'
import { MAX_WORD_CODE_LENGTH, WORD_LANGUAGE_LABELS, WORD_LANGUAGE_OPTIONS } from '../constants'
import type { GameMode, WordLanguage } from '../types'
import type { LobbyRoomSummary } from '../types'
import { ActiveRoomCard, PastRoomCard } from './rooms/RoomCards'

type RoomsPageProps = {
  lobbyRooms: LobbyRoomSummary[]
  codeLength: number
  allowDuplicates: boolean
  isPrivate: boolean
  allowLies: boolean
  newRoomName: string
  newRoomPassword: string
  joinPassword: string
  selectedGameMode: GameMode
  selectedWordLanguage: WordLanguage
  onCodeLengthChange: (value: number) => void
  onAllowDuplicatesChange: (value: boolean) => void
  onIsPrivateChange: (value: boolean) => void
  onAllowLiesChange: (value: boolean) => void
  onGameModeChange: (value: GameMode) => void
  onWordLanguageChange: (value: WordLanguage) => void
  onNewRoomNameChange: (value: string) => void
  onRegenerateRoomName: () => void
  onNewRoomPasswordChange: (value: string) => void
  onJoinPasswordChange: (value: string) => void
  onCreateRoom: () => Promise<boolean>
  onJoinRoom: (roomId: string) => Promise<boolean>
  onWatchRoom: (roomId: string) => Promise<boolean>
  onOpenPastGameResults: (roomId: string) => void
}

export function RoomsPage({
  lobbyRooms,
  codeLength,
  allowDuplicates,
  isPrivate,
  allowLies,
  newRoomName,
  newRoomPassword,
  joinPassword,
  selectedGameMode,
  selectedWordLanguage,
  onCodeLengthChange,
  onAllowDuplicatesChange,
  onIsPrivateChange,
  onAllowLiesChange,
  onGameModeChange,
  onWordLanguageChange,
  onNewRoomNameChange,
  onRegenerateRoomName,
  onNewRoomPasswordChange,
  onJoinPasswordChange,
  onCreateRoom,
  onJoinRoom,
  onWatchRoom,
  onOpenPastGameResults,
}: RoomsPageProps) {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [privateRoomToJoinId, setPrivateRoomToJoinId] = useState<string | null>(null)
  const [showPastGames, setShowPastGames] = useState(false)
  const [showOldOpenGames, setShowOldOpenGames] = useState(false)
  const [roomsViewNow] = useState(() => Date.now())
  const activeLobbyRooms = lobbyRooms.filter((entry) => entry.status !== 'finished')
  const oldOpenLobbyRooms = activeLobbyRooms.filter((entry) => roomsViewNow - entry.createdAt > ONE_DAY_MS)
  const freshActiveLobbyRooms = activeLobbyRooms.filter((entry) => roomsViewNow - entry.createdAt <= ONE_DAY_MS)
  const pastLobbyRooms = lobbyRooms.filter((entry) => entry.status === 'finished')

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
        {freshActiveLobbyRooms.length === 0 ? (
          <div className="flex min-h-[18rem] flex-col items-center justify-center gap-4 px-4 py-8 text-center">
            <div className="relative flex h-44 w-full max-w-sm items-center justify-center" aria-hidden="true">
              <div className="absolute inset-x-8 top-8 h-28 rounded-[2rem] border border-cyan-200/15 bg-slate-950/35 shadow-[0_0_50px_rgba(111,255,233,0.12)]" />
              <div className="absolute left-1/2 top-4 h-5 w-20 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-violet-400 opacity-80 blur-[2px]" />

              <div className="absolute left-12 top-18 h-10 w-10 rotate-[-12deg] rounded-2xl border border-white/10 bg-white/8 shadow-[0_0_24px_rgba(255,255,255,0.08)]" />
              <div className="absolute right-14 top-16 h-12 w-12 rotate-[14deg] rounded-3xl border border-white/10 bg-white/8 shadow-[0_0_24px_rgba(255,255,255,0.08)]" />
              <div className="absolute left-20 top-28 h-6 w-6 rounded-full bg-cyan-300/80 shadow-[0_0_16px_rgba(111,255,233,0.45)]" />
              <div className="absolute right-20 top-30 h-3 w-3 rounded-full bg-fuchsia-300/90 shadow-[0_0_16px_rgba(255,116,216,0.45)]" />

              <div className="absolute bottom-6 left-1/2 flex w-[18rem] -translate-x-1/2 items-end justify-center gap-3">
                <div className="h-12 w-12 rotate-[-10deg] rounded-2xl border border-white/10 bg-slate-900/70" />
                <div className="flex h-28 w-40 flex-col items-center justify-between rounded-[2rem] border border-cyan-200/20 bg-gradient-to-b from-slate-900/95 to-slate-950/85 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
                  <div className="mt-1 h-16 w-full rounded-[1.4rem] border border-cyan-200/20 bg-gradient-to-br from-cyan-300/20 via-slate-900 to-fuchsia-300/15 p-3">
                    <div className="flex h-full items-center justify-center rounded-[1rem] border border-white/8 bg-slate-950/55 text-3xl font-black text-cyan-200">
                      0
                    </div>
                  </div>
                  <div className="h-2 w-16 rounded-full bg-fuchsia-300/60" />
                </div>
                <div className="h-12 w-12 rotate-[10deg] rounded-2xl border border-white/10 bg-slate-900/70" />
              </div>
            </div>

            <div>
              <p className="text-lg font-bold text-white">No active games right now.</p>
              <p className="mt-1 text-sm text-slate-300">Start a new challenge, or open past games below to review completed matches.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {freshActiveLobbyRooms.map((entry) => (
              <ActiveRoomCard
                key={entry.id}
                entry={entry}
                onRequestJoin={(roomId, roomIsPrivate) => {
                  void onRequestJoin(roomId, roomIsPrivate)
                }}
                onWatchRoom={(roomId) => {
                  void onWatchRoom(roomId)
                }}
              />
            ))}
          </div>
        )}

        {oldOpenLobbyRooms.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/35 p-3">
            <button
              type="button"
              onClick={() => setShowOldOpenGames((open) => !open)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              aria-expanded={showOldOpenGames}
            >
              <span>Games started more than 1 day ago ({oldOpenLobbyRooms.length})</span>
              <span>{showOldOpenGames ? 'Hide' : 'Show'}</span>
            </button>

            {showOldOpenGames && (
              <div className="mt-2 space-y-2">
                {oldOpenLobbyRooms.map((entry) => (
                  <ActiveRoomCard
                    key={`old-open-${entry.id}`}
                    entry={entry}
                    onRequestJoin={(roomId, roomIsPrivate) => {
                      void onRequestJoin(roomId, roomIsPrivate)
                    }}
                    onWatchRoom={(roomId) => {
                      void onWatchRoom(roomId)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {pastLobbyRooms.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/35 p-3">
            <button
              type="button"
              onClick={() => setShowPastGames((open) => !open)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              aria-expanded={showPastGames}
            >
              <span>Past games ({pastLobbyRooms.length})</span>
              <span>{showPastGames ? 'Hide' : 'Show'}</span>
            </button>

            {showPastGames && (
              <div className="mt-2 space-y-2">
                {pastLobbyRooms.map((entry) => (
                  <PastRoomCard
                    key={`past-${entry.id}`}
                    entry={entry}
                    onOpenPastGameResults={onOpenPastGameResults}
                  />
                ))}
              </div>
            )}
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

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-fuchsia-300">Game type</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onGameModeChange('numbers')}
                  className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${selectedGameMode === 'numbers' ? 'border-emerald-300/45 bg-emerald-300/15 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
                >
                  Numbers
                </button>
                <button
                  type="button"
                  onClick={() => onGameModeChange('words')}
                  className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${selectedGameMode === 'words' ? 'border-cyan-300/45 bg-cyan-300/15 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
                >
                  Words
                </button>
              </div>
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

            <label className="mt-3 block text-sm font-semibold text-slate-100">
              {selectedGameMode === 'words' ? 'Word length (1-10)' : 'Digits length (1-5)'}
            </label>
            <input
              type="number"
              min={1}
              max={selectedGameMode === 'words' ? MAX_WORD_CODE_LENGTH : 5}
              value={codeLength}
              onChange={(event) => onCodeLengthChange(Number(event.target.value))}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-slate-100 outline-none transition focus:border-fuchsia-300/60"
            />

            {selectedGameMode === 'numbers' ? (
              <label className="mt-3 flex items-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-100 transition hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={allowDuplicates}
                  onChange={(event) => onAllowDuplicatesChange(event.target.checked)}
                />
                Allow duplicated digits
              </label>
            ) : (
              <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
                Word mode always allows repeated letters when the chosen word contains them.
              </div>
            )}

            {selectedGameMode === 'words' && (
              <label className="mt-3 block text-sm font-semibold text-slate-100">
                Word language
                <select
                  value={selectedWordLanguage}
                  onChange={(event) => onWordLanguageChange(event.target.value as WordLanguage)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-slate-100 outline-none transition focus:border-fuchsia-300/60"
                >
                  {WORD_LANGUAGE_OPTIONS.map((language) => (
                    <option key={language} value={language}>
                      {WORD_LANGUAGE_LABELS[language]}
                    </option>
                  ))}
                </select>
              </label>
            )}

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
