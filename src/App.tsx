import { useEffect, useMemo, useState } from 'react'
import { AVATARS, DEFAULT_CODE_LENGTH, MAX_PENALTIES } from './constants'
import {
  answerGuess,
  buildInviteLink,
  chooseRps,
  copyInviteLink,
  createRoom,
  joinRoom,
  submitGuess,
  submitSecret,
  subscribeLobby,
  subscribeRoom,
} from './lib/realtime'
import { playAlert, playClick, playSuccess } from './lib/sfx'
import { loadUser, saveUser } from './lib/storage'
import type { LobbyRoomSummary, RoomData, RpsChoice, UserProfile } from './types'

const randomAvatar = () => AVATARS[Math.floor(Math.random() * AVATARS.length)]

function App() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState(randomAvatar)
  const [rooms, setRooms] = useState<LobbyRoomSummary[]>([])
  const [room, setRoom] = useState<RoomData | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [status, setStatus] = useState<string>('')

  const [codeLength, setCodeLength] = useState<number>(DEFAULT_CODE_LENGTH)
  const [allowDuplicates, setAllowDuplicates] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [newRoomPassword, setNewRoomPassword] = useState('')
  const [joinPassword, setJoinPassword] = useState('')

  const [rpsChoice, setRpsChoice] = useState<RpsChoice | ''>('')
  const [secretInput, setSecretInput] = useState('')
  const [guessInput, setGuessInput] = useState('')
  const [claimedBulls, setClaimedBulls] = useState(0)
  const [claimedCows, setClaimedCows] = useState(0)

  const isInRoom = Boolean(roomId)
  const currentPlayerId = user?.id

  useEffect(() => {
    const existing = loadUser()
    if (existing) {
      setUser(existing)
      setUsername(existing.username)
      setAvatar(existing.avatar)
    }

    const params = new URLSearchParams(window.location.search)
    const initialRoom = params.get('room')
    if (initialRoom) {
      setRoomId(initialRoom)
    }
  }, [])

  useEffect(() => {
    if (!user || isInRoom) {
      return
    }

    const unsub = subscribeLobby((list) => {
      setRooms(list.filter((entry) => !entry.hasGuest || entry.id === roomId))
    })

    return unsub
  }, [user, isInRoom, roomId])

  useEffect(() => {
    if (!roomId) {
      setRoom(null)
      return
    }

    const unsub = subscribeRoom(roomId, (nextRoom) => {
      if (!nextRoom) {
        setError('This room no longer exists.')
        setRoomId(null)
        return
      }

      setRoom(nextRoom)
    })

    return unsub
  }, [roomId])

  useEffect(() => {
    if (!roomId) {
      const url = new URL(window.location.href)
      url.searchParams.delete('room')
      window.history.replaceState({}, '', url)
      return
    }

    const url = new URL(window.location.href)
    url.searchParams.set('room', roomId)
    window.history.replaceState({}, '', url)
  }, [roomId])

  const myProfile = useMemo(() => {
    if (!room || !currentPlayerId) return null
    return room.profiles[currentPlayerId] ?? null
  }, [room, currentPlayerId])

  const opponentProfile = useMemo(() => {
    if (!room || !currentPlayerId) return null
    const ids = [room.hostId, room.guestId].filter(Boolean) as string[]
    const opponentId = ids.find((id) => id !== currentPlayerId)
    return opponentId ? room.profiles[opponentId] : null
  }, [room, currentPlayerId])

  const sortedHistory = useMemo(() => {
    if (!room?.guessHistory) return []
    return Object.values(room.guessHistory).sort((a, b) => a.turnNumber - b.turnNumber)
  }, [room?.guessHistory])

  const pendingForResponder = useMemo(() => {
    if (!room?.pendingGuess || !currentPlayerId) return false
    if (!room.guestId) return false
    const targetId = room.pendingGuess.fromPlayerId === room.hostId ? room.guestId : room.hostId
    return targetId === currentPlayerId
  }, [room, currentPlayerId])

  const myTurn = room?.currentTurnPlayerId === currentPlayerId

  const onSaveUser = () => {
    if (!username.trim()) {
      setError('Choose a username first.')
      return
    }

    const nextUser: UserProfile = {
      id: user?.id ?? crypto.randomUUID(),
      username: username.trim().slice(0, 24),
      avatar,
    }

    saveUser(nextUser)
    setUser(nextUser)
    setError('')
    playSuccess()
  }

  const onCreateRoom = async () => {
    if (!user) return
    try {
      setError('')
      setStatus('Creating room...')
      const nextRoomId = await createRoom(
        user,
        {
          codeLength,
          allowDuplicates,
          isPrivate,
        },
        newRoomPassword,
      )
      setStatus('Room created!')
      setRoomId(nextRoomId)
      playSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
      playAlert()
    }
  }

  const onJoinRoom = async (targetRoomId: string) => {
    if (!user) return
    try {
      setError('')
      setStatus('Joining room...')
      await joinRoom(targetRoomId, user, joinPassword)
      setRoomId(targetRoomId)
      setStatus('Joined!')
      playSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
      playAlert()
    }
  }

  const onPickRps = async (choice: RpsChoice) => {
    if (!room || !currentPlayerId) return
    try {
      setRpsChoice(choice)
      await chooseRps(room.id, currentPlayerId, choice)
      playClick()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send RPS choice')
    }
  }

  const onSubmitSecret = async () => {
    if (!room || !currentPlayerId) return
    try {
      await submitSecret(room.id, currentPlayerId, secretInput.trim())
      setSecretInput('')
      playSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit secret')
    }
  }

  const onSubmitGuess = async () => {
    if (!room || !currentPlayerId) return
    try {
      await submitGuess(room.id, currentPlayerId, guessInput.trim())
      setGuessInput('')
      playClick()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit guess')
    }
  }

  const onAnswerGuess = async () => {
    if (!room || !currentPlayerId) return
    try {
      await answerGuess(room.id, currentPlayerId, claimedBulls, claimedCows)
      setClaimedBulls(0)
      setClaimedCows(0)
      playClick()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not answer guess')
    }
  }

  const leaveRoom = () => {
    setRoomId(null)
    setRoom(null)
    setJoinPassword('')
    setRpsChoice('')
    setGuessInput('')
    setSecretInput('')
    setError('')
    setStatus('')
  }

  const onCopyInvite = async () => {
    if (!room) return
    await copyInviteLink(room.id)
    setStatus('Invite link copied')
    playSuccess()
  }

  return (
    <div className="min-h-screen bg-cream-pattern px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-3xl border border-orange-300/50 bg-white/85 p-5 shadow-xl backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-orange-600">Mindbreaker Arena</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 md:text-5xl">Code Cracking Multiplayer Duel</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
            Challenge friends in real-time. Pick secret digit combinations, duel turn by turn, and expose bluffing players
            with automatic lie detection.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-400 bg-rose-100 px-4 py-3 text-sm text-rose-800">{error}</div>
        )}
        {status && (
          <div className="mb-4 rounded-xl border border-cyan-400 bg-cyan-100 px-4 py-3 text-sm text-cyan-800">{status}</div>
        )}

        {!user && (
          <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-2xl font-bold">Create Your Player</h2>
              <p className="mt-1 text-slate-600">Choose username and avatar before entering the lobby.</p>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
                className="mt-4 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-orange-500"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {AVATARS.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => {
                      setAvatar(item)
                      playClick()
                    }}
                    className={`h-11 w-11 rounded-xl text-2xl transition ${
                      avatar === item ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <button
                onClick={onSaveUser}
                className="rounded-2xl bg-gradient-to-r from-orange-500 to-cyan-500 px-8 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.02]"
              >
                Enter Lobby {avatar}
              </button>
            </div>
          </section>
        )}

        {user && !isInRoom && (
          <section className="grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold">Create Game</h2>
              <p className="mt-1 text-sm text-slate-600">Configure rules and open a room for opponents.</p>

              <label className="mt-4 block text-sm font-medium">Digits length (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={codeLength}
                onChange={(event) => setCodeLength(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2"
              />

              <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowDuplicates}
                  onChange={(event) => setAllowDuplicates(event.target.checked)}
                />
                Allow duplicated digits
              </label>

              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />
                Private room
              </label>

              <input
                value={newRoomPassword}
                onChange={(event) => setNewRoomPassword(event.target.value)}
                placeholder="Optional password"
                className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2"
              />

              <button
                onClick={onCreateRoom}
                className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700"
              >
                Create Room
              </button>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold">Open Games</h2>
              <p className="mt-1 text-sm text-slate-600">Join a waiting match or use an invite link.</p>

              <input
                value={joinPassword}
                onChange={(event) => setJoinPassword(event.target.value)}
                placeholder="Password for private game"
                className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2"
              />

              <ul className="mt-4 space-y-3">
                {rooms.length === 0 && <li className="rounded-xl bg-slate-100 p-3 text-sm text-slate-500">No open rooms yet.</li>}
                {rooms.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{entry.hostName}</p>
                        <p className="text-xs text-slate-500">
                          {entry.codeLength} digits • {entry.allowDuplicates ? 'duplicates allowed' : 'unique digits'} •{' '}
                          {entry.isPrivate ? 'private' : 'public'}
                        </p>
                      </div>
                      <button
                        onClick={() => onJoinRoom(entry.id)}
                        className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-cyan-500"
                      >
                        Join
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        )}

        {user && room && (
          <section className="space-y-5">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-600">Room #{room.id.slice(0, 6)}</p>
                  <h2 className="text-2xl font-bold">{room.status.toUpperCase()}</h2>
                  <p className="text-sm text-slate-600">{room.message ?? 'Game in progress'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onCopyInvite}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
                  >
                    Copy Invite
                  </button>
                  <a
                    href={buildInviteLink(room.id)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
                  >
                    Open Invite
                  </a>
                  <button
                    onClick={leaveRoom}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                  >
                    Leave
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="font-semibold">You: {myProfile?.avatar} {myProfile?.username}</p>
                  <p className="text-sm text-slate-600">Penalties: {room.penalties[currentPlayerId ?? ''] ?? 0}/{MAX_PENALTIES}</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="font-semibold">Opponent: {opponentProfile?.avatar ?? '❔'} {opponentProfile?.username ?? 'Waiting...'}</p>
                  <p className="text-sm text-slate-600">Penalties: {opponentProfile ? room.penalties[opponentProfile.id] ?? 0 : 0}/{MAX_PENALTIES}</p>
                </div>
              </div>
            </article>

            {room.status === 'waiting' && (
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <h3 className="text-lg font-bold">Waiting for opponent</h3>
                <p className="mt-1 text-sm text-slate-600">Share your invite link. The match starts as soon as someone joins.</p>
              </article>
            )}

            {room.status === 'rps' && (
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <h3 className="text-lg font-bold">Rock Paper Scissors - round {room.rpsRound}</h3>
                <p className="mt-1 text-sm text-slate-600">Winner starts the code-cracking duel.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(['rock', 'paper', 'scissors'] as RpsChoice[]).map((item) => (
                    <button
                      key={item}
                      onClick={() => onPickRps(item)}
                      className={`rounded-xl px-4 py-2 font-semibold ${
                        rpsChoice === item ? 'bg-orange-500 text-white' : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </article>
            )}

            {room.status === 'secrets' && (
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <h3 className="text-lg font-bold">Set your secret combination</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Length: {room.settings.codeLength} • {room.settings.allowDuplicates ? 'duplicates allowed' : 'no duplicates'}
                </p>
                <div className="mt-4 flex gap-2">
                  <input
                    value={secretInput}
                    onChange={(event) => setSecretInput(event.target.value.replace(/\D/g, ''))}
                    placeholder={`e.g. ${'1'.repeat(room.settings.codeLength)}`}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2"
                  />
                  <button
                    onClick={onSubmitSecret}
                    className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                  >
                    Lock Secret
                  </button>
                </div>
              </article>
            )}

            {room.status === 'playing' && (
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <h3 className="text-lg font-bold">Battle Phase</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Current turn: {room.profiles[room.currentTurnPlayerId ?? '']?.username ?? 'n/a'}
                </p>

                {myTurn && !room.pendingGuess && (
                  <div className="mt-4 flex gap-2">
                    <input
                      value={guessInput}
                      onChange={(event) => setGuessInput(event.target.value.replace(/\D/g, ''))}
                      placeholder="Your guess"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2"
                    />
                    <button
                      onClick={onSubmitGuess}
                      className="rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500"
                    >
                      Send Guess
                    </button>
                  </div>
                )}

                {room.pendingGuess && pendingForResponder && (
                  <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <p className="font-medium">Opponent guessed: {room.pendingGuess.guess}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 md:max-w-xs">
                      <label className="text-sm">
                        Bulls
                        <input
                          type="number"
                          min={0}
                          max={room.settings.codeLength}
                          value={claimedBulls}
                          onChange={(event) => setClaimedBulls(Number(event.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1"
                        />
                      </label>
                      <label className="text-sm">
                        Cows
                        <input
                          type="number"
                          min={0}
                          max={room.settings.codeLength}
                          value={claimedCows}
                          onChange={(event) => setClaimedCows(Number(event.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1"
                        />
                      </label>
                    </div>
                    <button
                      onClick={onAnswerGuess}
                      className="mt-3 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500"
                    >
                      Submit Answer
                    </button>
                  </div>
                )}

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="px-3 py-2">Turn</th>
                        <th className="px-3 py-2">By</th>
                        <th className="px-3 py-2">Guess</th>
                        <th className="px-3 py-2">Claimed</th>
                        <th className="px-3 py-2">Actual</th>
                        <th className="px-3 py-2">Lie?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHistory.map((item) => (
                        <tr key={item.id} className="border-b border-slate-200">
                          <td className="px-3 py-2">{item.turnNumber}</td>
                          <td className="px-3 py-2">{room.profiles[item.fromPlayerId]?.username}</td>
                          <td className="px-3 py-2 font-mono">{item.guess}</td>
                          <td className="px-3 py-2">{item.claimedBulls} / {item.claimedCows}</td>
                          <td className="px-3 py-2">{item.actualBulls} / {item.actualCows}</td>
                          <td className="px-3 py-2">{item.lieDetected ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )}

            {room.status === 'finished' && (
              <article className="rounded-3xl border border-emerald-300 bg-emerald-50 p-6 shadow-xl">
                <h3 className="text-xl font-bold">Game Over</h3>
                <p className="mt-2 text-sm text-slate-700">
                  Winner: {room.profiles[room.winnerId ?? '']?.username ?? 'Unknown'}
                </p>
                <button
                  onClick={leaveRoom}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                >
                  Back to Lobby
                </button>
              </article>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default App
