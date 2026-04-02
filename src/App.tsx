import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Navigate, Route, Routes, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { DEFAULT_CODE_LENGTH } from './constants'
import {
  answerGuess,
  chooseRps,
  createRoom,
  deleteRoom,
  joinRoom,
  joinOwnRoomAsGuest,
  keepWaitingForRejoin,
  leaveRoom as leaveRoomRealtime,
  lockSecret,
  unlockSecret,
  submitGuess,
  subscribeLobby,
  subscribeRoom,
} from './lib/realtime'
import { getTelegramUserProfile, isTelegramWebApp, prepareTelegramWebApp } from './lib/platform'
import {
  shareInviteSmart,
  shareInviteViaTelegram,
  shareInviteViaWhatsApp,
} from './lib/share'
import { configureAudio, ensureAudioReady, playAlert, playClick, playLie, playSuccess } from './lib/sfx'
import { clearUser, hasAudioConsent, loadAudioSettings, loadUser, saveAudioSettings, saveUser, setAudioConsent } from './lib/storage'
import { generateRandomAvatar } from './utils/profile'
import { GameplayPage } from './pages/GameplayPage'
import { RoomsPage } from './pages/RoomsPage'
import { WaitingRoomPage } from './pages/WaitingRoomPage'
import { WelcomePage } from './pages/WelcomePage'
import { generateRoomName } from './utils/roomName'
import type { AudioSettings, LobbyRoomSummary, RoomData, RpsChoice, UserProfile } from './types'

const initialTelegramUser = typeof window !== 'undefined' ? getTelegramUserProfile() : null
const initialStoredUser = initialTelegramUser ?? loadUser()
const initialAudioSettings = loadAudioSettings()

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const roomMatch = useMatch('/room/:roomId/*')
  const routeRoomId = roomMatch?.params.roomId ?? null
  const inviteRoomId = useMemo(() => {
    const inviteId = new URLSearchParams(location.search).get('room')
    return inviteId?.trim() || null
  }, [location.search])

  const [user, setUser] = useState<UserProfile | null>(initialStoredUser)
  const [username, setUsername] = useState(initialStoredUser?.username ?? '')
  const [avatar, setAvatar] = useState(initialStoredUser?.avatar ?? generateRandomAvatar())

  const [rooms, setRooms] = useState<LobbyRoomSummary[]>([])
  const [room, setRoom] = useState<RoomData | null>(null)

  const [codeLength, setCodeLength] = useState<number>(DEFAULT_CODE_LENGTH)
  const [allowDuplicates, setAllowDuplicates] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [allowLies, setAllowLies] = useState(true)
  const [newRoomName, setNewRoomName] = useState(() => generateRoomName(initialStoredUser?.username))
  const [newRoomPassword, setNewRoomPassword] = useState('')
  const [joinPassword, setJoinPassword] = useState('')

  const [rpsChoice, setRpsChoice] = useState<RpsChoice | ''>('')
  const [secretInput, setSecretInput] = useState('')
  const [secretLocked, setSecretLocked] = useState(false)
  const [guessInput, setGuessInput] = useState('')
  const [claimedBulls, setClaimedBulls] = useState(0)
  const [claimedCows, setClaimedCows] = useState(0)

  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(initialAudioSettings)
  const lastHandledHistoryIdRef = useRef<string | null>(null)
  const lastSeenRpsRoundRef = useRef<number | null>(null)
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const [hotseatGuestProfile, setHotseatGuestProfile] = useState<UserProfile | null>(null)
  const [hotseatRevealedPlayerId, setHotseatRevealedPlayerId] = useState<string | null>(null)
  const [waitingRoomP2SetupId, setWaitingRoomP2SetupId] = useState<string | null>(null)
  const [waitingRoomP2Name, setWaitingRoomP2Name] = useState('Player 2')
  const [waitingRoomP2Avatar, setWaitingRoomP2Avatar] = useState('😎')
  const [isFirstVisit, setIsFirstVisit] = useState(!hasAudioConsent())
  const [dismissedPausePromptAt, setDismissedPausePromptAt] = useState<number | null>(null)
  const [lastLeftRoomId, setLastLeftRoomId] = useState<string | null>(null)
  const inviteJoinHandledRef = useRef<string | null>(null)

  const signedInUserId = user?.id ?? null
  const inRoomsRoute = location.pathname === '/rooms'
  const isWelcomeRoute = location.pathname === '/welcome'

  const isHotseatMode = Boolean(
    room &&
    signedInUserId &&
    hotseatGuestProfile &&
    room.hostId === signedInUserId &&
    room.guestId === hotseatGuestProfile.id,
  )

  const hotseatPendingPlayerId = useMemo(() => {
    if (!room || !isHotseatMode || !room.guestId) return null

    if (room.status === 'rps') {
      const hostPicked = Boolean(room.rpsChoices?.[room.hostId])
      const guestPicked = Boolean(room.rpsChoices?.[room.guestId])
      if (!hostPicked) return room.hostId
      if (!guestPicked) return room.guestId
      return null
    }

    if (room.status === 'secrets') {
      const hostReady = Boolean(room.secrets?.[room.hostId])
      const guestReady = Boolean(room.secrets?.[room.guestId])
      if (!hostReady) return room.hostId
      if (!guestReady) return room.guestId
      return null
    }

    if (room.status === 'playing') {
      if (room.pendingGuess) {
        return room.pendingGuess.fromPlayerId === room.hostId ? room.guestId : room.hostId
      }
      return room.currentTurnPlayerId ?? null
    }

    return null
  }, [isHotseatMode, room])

  const currentPlayerId = isHotseatMode
    ? hotseatRevealedPlayerId ?? hotseatPendingPlayerId ?? signedInUserId
    : signedInUserId

  const showHotseatPassOverlay = Boolean(
    isHotseatMode &&
    hotseatPendingPlayerId &&
    hotseatRevealedPlayerId !== hotseatPendingPlayerId,
  )

  useEffect(() => {
    configureAudio(audioSettings)
    saveAudioSettings(audioSettings)
  }, [audioSettings])

  useEffect(() => {
    if (!isTelegramWebApp()) return
    prepareTelegramWebApp()

    const telegramUser = getTelegramUserProfile()
    if (!telegramUser) return

    if (!loadUser()) {
      saveUser(telegramUser)
    }
  }, [])

  // Clear RPS choice, secret lock, and code inputs when hotseat player changes (fixes privacy in hotseat mode)
  useEffect(() => {
    if (!isHotseatMode || !hotseatRevealedPlayerId) return
    // Use setTimeout to avoid setState in effect warnings
    const timer = setTimeout(() => {
      setRpsChoice('')
      setSecretLocked(false)
      setSecretInput('')
      setGuessInput('')
    }, 0)
    return () => clearTimeout(timer)
  }, [hotseatRevealedPlayerId, isHotseatMode])

  useEffect(() => {
    const onFirstInteraction = () => {
      void ensureAudioReady()
      window.removeEventListener('pointerdown', onFirstInteraction)
    }

    window.addEventListener('pointerdown', onFirstInteraction, { passive: true })
    return () => window.removeEventListener('pointerdown', onFirstInteraction)
  }, [])

  useEffect(() => {
    if (!user || !inRoomsRoute) {
      return
    }

    const unsub = subscribeLobby((list) => {
      setRooms(list)
    })

    return unsub
  }, [user, inRoomsRoute])

  useEffect(() => {
    if (!routeRoomId) return

    const unsub = subscribeRoom(routeRoomId, (nextRoom) => {
      if (!nextRoom) {
        toast.error('This room no longer exists.')
        setRoom(null)
        setHotseatGuestProfile(null)
        setHotseatRevealedPlayerId(null)
        navigate('/rooms', { replace: true })
        return
      }

      if (nextRoom.status === 'rps') {
        if (lastSeenRpsRoundRef.current === null) {
          lastSeenRpsRoundRef.current = nextRoom.rpsRound
        } else if (nextRoom.rpsRound > lastSeenRpsRoundRef.current) {
          setRpsChoice('')
          toast('RPS tie! Choose again for the next round.')
          playAlert()
          lastSeenRpsRoundRef.current = nextRoom.rpsRound
        }
      }

      setRoom(nextRoom)
    })

    return unsub
  }, [navigate, routeRoomId])

  useEffect(() => {
    if (!routeRoomId || !room || room.id !== routeRoomId) return

    const waitingPath = `/room/${routeRoomId}/waiting`
    const playPath = `/room/${routeRoomId}/play`

    if (room.status === 'waiting' && location.pathname !== waitingPath) {
      navigate(waitingPath, { replace: true })
      return
    }

    if (room.status !== 'waiting' && location.pathname !== playPath) {
      navigate(playPath, { replace: true })
    }
  }, [location.pathname, navigate, routeRoomId, room])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!showUserMenu) return
      const target = event.target as Node | null
      if (!target) return
      if (userMenuRef.current?.contains(target)) return
      setShowUserMenu(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [showUserMenu])

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
  }, [room])

  const pendingForResponder = useMemo(() => {
    if (!room?.pendingGuess || !currentPlayerId) return false
    if (!room.guestId) return false
    const targetId = room.pendingGuess.fromPlayerId === room.hostId ? room.guestId : room.hostId
    return targetId === currentPlayerId
  }, [room, currentPlayerId])

  const myTurn = room?.currentTurnPlayerId === currentPlayerId
  const mySecret = room && currentPlayerId ? room.secrets?.[currentPlayerId] : undefined
  const shouldShowDisconnectPauseModal = Boolean(
    room?.pausedByDisconnect?.playerId &&
    currentPlayerId &&
    room.pausedByDisconnect.playerId !== currentPlayerId &&
    room.pausedByDisconnect.at !== dismissedPausePromptAt,
  )

  const myHostedRooms = useMemo(() => {
    if (!user) return []
    return rooms.filter((entry) => entry.hostId === user.id)
  }, [rooms, user])

  const joinableRooms = useMemo(() => rooms.filter((entry) => !entry.hasGuest), [rooms])

  useEffect(() => {
    lastHandledHistoryIdRef.current = null
    lastSeenRpsRoundRef.current = null
  }, [room?.id])

  useEffect(() => {
    const latestRecord = sortedHistory[sortedHistory.length - 1]
    if (!latestRecord) return
    if (lastHandledHistoryIdRef.current === latestRecord.id) return

    lastHandledHistoryIdRef.current = latestRecord.id
    if (latestRecord.lieDetected) {
      playLie()
    }
  }, [sortedHistory])

  const headerMeta = useMemo(() => {
    if (location.pathname === '/welcome') {
      return {
        section: 'Identity',
        title: 'Player Profile',
        subtitle: 'Pick your name and avatar before entering the arena rooms.',
        accent: 'from-emerald-100 via-cyan-50 to-white border-emerald-200/70',
      }
    }

    if (location.pathname === '/rooms') {
      return {
        section: 'Lobby',
        title: 'Create Or Join Room',
        subtitle: 'Open rooms, private matches, and hosted room controls all live here.',
        accent: 'from-violet-100 via-fuchsia-50 to-white border-fuchsia-200/70',
      }
    }

    if (location.pathname.endsWith('/waiting')) {
      return {
        section: 'Staging',
        title: 'Waiting Room',
        subtitle: 'Share your invite while the room syncs before kickoff.',
        accent: 'from-sky-100 via-blue-50 to-white border-sky-200/70',
      }
    }

    return {
      section: 'Battle',
      title: 'Live Match',
      subtitle: 'RPS, secret setup, guesses, and lie tracking happen in this view.',
      accent: 'from-amber-100 via-orange-50 to-white border-amber-200/70',
    }
  }, [location.pathname])

  const persistUser = (): UserProfile | null => {
    if (!username.trim()) {
      toast.error('Choose a username first.')
      return null
    }

    const nextUser: UserProfile = {
      id: user?.id ?? crypto.randomUUID(),
      username: username.trim().slice(0, 24),
      avatar,
    }

    saveUser(nextUser)
    setUser(nextUser)
    return nextUser
  }

  const onEnterLobby = () => {
    const saved = persistUser()
    if (!saved) return
    toast.success('Profile saved.')
    playSuccess()
    navigate('/rooms')
  }

  const onUseSavedProfile = () => {
    const existing = loadUser()
    if (!existing) {
      toast.error('No saved profile found.')
      return
    }

    setUser(existing)
    setUsername(existing.username)
    setAvatar(existing.avatar)
    toast.success('Entered with saved profile.')
    playSuccess()
    navigate('/rooms')
  }

  const onCreateRoom = async (): Promise<boolean> => {
    if (!user) return false
    try {
      const nextRoomId = await createRoom(
        user,
        {
          codeLength,
          allowDuplicates,
          isPrivate,
          allowLies,
        },
        newRoomPassword,
        newRoomName,
      )
      toast.success('Room created!')
      playSuccess()
      setNewRoomName(generateRoomName(user.username))
      navigate(`/room/${nextRoomId}/waiting`)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create room')
      playAlert()
      return false
    }
  }

  const onJoinRoom = useCallback(async (targetRoomId: string): Promise<boolean> => {
    if (!user) return false
    try {
      await joinRoom(targetRoomId, user, joinPassword)
      setHotseatGuestProfile(null)
      setHotseatRevealedPlayerId(null)
      toast.success('Joined!')
      playSuccess()
      navigate(`/room/${targetRoomId}/play`)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join room')
      playAlert()
      return false
    }
  }, [joinPassword, navigate, user])

  useEffect(() => {
    if (!user || !inRoomsRoute || !inviteRoomId) return
    if (inviteJoinHandledRef.current === inviteRoomId) return

    inviteJoinHandledRef.current = inviteRoomId

    const tryInviteJoin = async () => {
      const joined = await onJoinRoom(inviteRoomId)
      if (!joined) {
        toast('Open room list and join manually if this invite is private.')
      }

      const params = new URLSearchParams(location.search)
      params.delete('room')
      const nextSearch = params.toString()
      navigate({ pathname: '/rooms', search: nextSearch ? `?${nextSearch}` : '' }, { replace: true })
    }

    void tryInviteJoin()
  }, [inviteRoomId, inRoomsRoute, location.search, navigate, onJoinRoom, user])

  const onJoinOwnRoomAsGuest = async (
    targetRoomId: string,
    guestName: string,
    guestAvatar: string,
  ): Promise<boolean> => {
    if (!user) return false

    const normalizedName = guestName.trim().slice(0, 24)
    if (!normalizedName) {
      toast.error('Player 2 needs a name.')
      playAlert()
      return false
    }

    const nextGuest: UserProfile = {
      id: crypto.randomUUID(),
      username: normalizedName,
      avatar: guestAvatar || (user.avatar === '😀' ? '😎' : '😀'),
    }

    try {
      await joinOwnRoomAsGuest(targetRoomId, user.id, nextGuest)
      setHotseatGuestProfile(nextGuest)
      setHotseatRevealedPlayerId(null)
      toast.success('Same-phone mode enabled. Pass the phone each turn.')
      playSuccess()
      navigate(`/room/${targetRoomId}/play`)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not enable same-phone mode')
      playAlert()
      return false
    }
  }

  const onOpenWaitingRoomP2Setup = () => {
    if (!room || !user) return
    setWaitingRoomP2SetupId(room.id)
    setWaitingRoomP2Name(`${user.username.slice(0, 16)} (P2)`)
    setWaitingRoomP2Avatar(user.avatar === '😀' ? '😎' : '😀')
  }

  const onConfirmWaitingRoomP2Setup = async () => {
    if (!waitingRoomP2SetupId) return
    const joined = await onJoinOwnRoomAsGuest(waitingRoomP2SetupId, waitingRoomP2Name, waitingRoomP2Avatar)
    if (joined) {
      setWaitingRoomP2SetupId(null)
    }
  }

  const onDeleteHostedRoom = async (targetRoomId: string) => {
    if (!user) return

    try {
      await deleteRoom(targetRoomId, user.id)
      if (routeRoomId === targetRoomId) {
        resetRoomStateAndGoLobby()
      }
      toast.success('Room deleted.')
      playSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete room')
      playAlert()
    }
  }

  const onPickRps = async (choice: RpsChoice) => {
    if (!room || !currentPlayerId) return
    try {
      setRpsChoice(choice)
      await chooseRps(room.id, currentPlayerId, choice)
      if (isHotseatMode) {
        // Hide the selected RPS option before handing the phone over.
        setRpsChoice('')
        setHotseatRevealedPlayerId(null)
      }
      playClick()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send RPS choice')
    }
  }

  const onSubmitSecret = async () => {
    if (!room || !currentPlayerId) return
    try {
      await lockSecret(room.id, currentPlayerId, secretInput.trim())
      setSecretLocked(true)
      toast.success('Code locked! Opponent will see a notification.')
      playSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not lock secret')
    }
  }

  const onUnlockSecret = async () => {
    if (!room || !currentPlayerId) return
    try {
      await unlockSecret(room.id, currentPlayerId)
      setSecretLocked(false)
      toast('Code unlocked. You can edit your code again.')
      playClick()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not unlock secret')
    }
  }

  const onSubmitGuess = async () => {
    if (!room || !currentPlayerId) return
    try {
      await submitGuess(room.id, currentPlayerId, guessInput.trim())
      setGuessInput('')
      if (isHotseatMode) {
        setHotseatRevealedPlayerId(null)
      }
      playClick()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit guess')
    }
  }

  const onAnswerGuess = async () => {
    if (!room || !currentPlayerId) return
    try {
      await answerGuess(room.id, currentPlayerId, claimedBulls, claimedCows)
      setClaimedBulls(0)
      setClaimedCows(0)
      if (isHotseatMode) {
        setHotseatRevealedPlayerId(null)
      }
      playClick()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not answer guess')
    }
  }

  const resetRoomStateAndGoLobby = () => {
    setRoom(null)
    setHotseatGuestProfile(null)
    setHotseatRevealedPlayerId(null)
    setJoinPassword('')
    setRpsChoice('')
    setSecretInput('')
    setSecretLocked(false)
    setGuessInput('')
    navigate('/rooms')
  }

  const requestLeaveRoom = () => {
    setShowLeaveConfirmModal(true)
  }

  const leaveRoom = async () => {
    if (!room || !currentPlayerId) {
      setShowLeaveConfirmModal(false)
      resetRoomStateAndGoLobby()
      return
    }

    try {
      await leaveRoomRealtime(room.id, currentPlayerId)
      setShowLeaveConfirmModal(false)
      setLastLeftRoomId(room.id)
      toast.success('You left the room.')
      playAlert()
      resetRoomStateAndGoLobby()
    } catch (err) {
      setShowLeaveConfirmModal(false)
      toast.error(err instanceof Error ? err.message : 'Could not leave room')
    }
  }

  const onCopyInvite = async () => {
    if (!room) return
    try {
      const channel = await shareInviteSmart(room.id, room.roomName)
      if (channel === 'clipboard') {
        toast.success('Invite copied')
      } else {
        toast.success('Invite shared')
      }
      playSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not share invite')
      playAlert()
    }
  }

  const onShareInviteTelegram = () => {
    if (!room) return
    shareInviteViaTelegram(room.id, room.roomName)
    toast.success('Opened Telegram share')
    playClick()
  }

  const onShareInviteWhatsApp = () => {
    if (!room) return
    shareInviteViaWhatsApp(room.id, room.roomName)
    toast.success('Opened WhatsApp share')
    playClick()
  }

  const onKeepWaitingForOpponent = async () => {
    if (!room || !currentPlayerId) return
    try {
      await keepWaitingForRejoin(room.id, currentPlayerId)
      setDismissedPausePromptAt(room.pausedByDisconnect?.at ?? Date.now())
      toast('Waiting for opponent to rejoin...')
      playClick()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not keep waiting')
    }
  }

  const onRejoinLastMatch = async () => {
    if (!user || !lastLeftRoomId) return
    try {
      await joinRoom(lastLeftRoomId, user, '')
      toast.success('Rejoined match!')
      playSuccess()
      navigate(`/room/${lastLeftRoomId}/play`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not rejoin match')
      playAlert()
      setLastLeftRoomId(null)
    }
  }

  const setMusicEnabled = (nextEnabled: boolean) => {
    setAudioSettings((current) => ({ ...current, musicEnabled: nextEnabled }))
  }

  const setSfxEnabled = (nextEnabled: boolean) => {
    setAudioSettings((current) => ({ ...current, sfxEnabled: nextEnabled }))
  }

  const setMusicVolume = (nextVolume: number) => {
    setAudioSettings((current) => ({ ...current, musicVolume: nextVolume }))
  }

  const setSfxVolume = (nextVolume: number) => {
    setAudioSettings((current) => ({ ...current, sfxVolume: nextVolume }))
  }

  const setMusicTheme = (nextTheme: AudioSettings['musicTheme']) => {
    setAudioSettings((current) => ({ ...current, musicTheme: nextTheme }))
  }

  const setAudioEnabledQuick = (enabled: boolean) => {
    setAudioSettings((current) => ({
      ...current,
      musicEnabled: enabled,
      sfxEnabled: enabled,
    }))
    if (enabled) {
      void ensureAudioReady()
    }
  }

  const onLogout = () => {
    clearUser()
    setUser(null)
    setUsername('')
    setAvatar('😀')
    setRoom(null)
    setRooms([])
    setJoinPassword('')
    setRpsChoice('')
    setGuessInput('')
    setSecretInput('')
    setClaimedBulls(0)
    setClaimedCows(0)
    setShowSettingsPanel(false)
    setShowUserMenu(false)
    setHotseatGuestProfile(null)
    setHotseatRevealedPlayerId(null)
    toast.success('Logged out.')
    navigate('/welcome')
  }

  return (
    <div className="min-h-screen bg-orchid-pattern px-4 py-6 text-fuchsia-950">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#ffffff',
            color: '#4a044e',
            border: '1px solid #e9d5ff',
            boxShadow: '0 10px 28px rgba(91, 33, 182, 0.22)',
            minWidth: '380px',
            maxWidth: '92vw',
            minHeight: '72px',
            padding: '16px 18px',
            borderRadius: '14px',
            fontSize: '15px',
            lineHeight: 1.35,
          },
          success: {
            iconTheme: {
              primary: '#a21caf',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#e11d48',
              secondary: '#ffffff',
            },
          },
        }}
      />

      <div className="mx-auto max-w-6xl">
        <header className={`mb-6 rounded-3xl border bg-gradient-to-r shadow-xl backdrop-blur ${headerMeta.accent} ${isWelcomeRoute ? 'p-5' : 'p-3'} `}>
          {isWelcomeRoute ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-fuchsia-700">{headerMeta.section}</p>
                {user && (
                  <div ref={userMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setShowUserMenu((open) => !open)}
                      className="flex items-center gap-2 rounded-full border border-violet-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-violet-900 shadow-sm hover:bg-white"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-base">{user.avatar}</span>
                      <span className="max-w-[140px] truncate">{user.username}</span>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-violet-200 bg-white p-2 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false)
                            navigate('/welcome')
                          }}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-violet-900 hover:bg-violet-50"
                        >
                          Edit Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false)
                            navigate('/rooms')
                          }}
                          className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-violet-900 hover:bg-violet-50"
                        >
                          Go To Rooms
                        </button>
                        <button
                          type="button"
                          onClick={onLogout}
                          className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Log Out
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <h1 className="mt-2 text-3xl font-black text-fuchsia-950 md:text-5xl">{headerMeta.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-fuchsia-800/80 md:text-base">{headerMeta.subtitle}</p>
            </>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 text-xl">
                <span className="font-mono uppercase tracking-[0.12em] whitespace-nowrap text-fuchsia-700">{headerMeta.section}</span>
                <span className="text-fuchsia-500">|</span>
                <span className="whitespace-nowrap font-extrabold text-fuchsia-950">{headerMeta.title}</span>
              </div>
              {user && (
                <div ref={userMenuRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowUserMenu((open) => !open)}
                    className="flex items-center gap-2 rounded-full border border-violet-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-violet-900 shadow-sm hover:bg-white"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-base">{user.avatar}</span>
                    <span className="max-w-[140px] truncate">{user.username}</span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-violet-200 bg-white p-2 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false)
                          navigate('/welcome')
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-violet-900 hover:bg-violet-50"
                      >
                        Edit Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false)
                          navigate('/rooms')
                        }}
                        className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-violet-900 hover:bg-violet-50"
                      >
                        Go To Rooms
                      </button>
                      <button
                        type="button"
                        onClick={onLogout}
                        className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </header>

        {inRoomsRoute && lastLeftRoomId && (
          <section className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-md">
            <p className="text-sm font-semibold text-amber-900">You recently left an active match.</p>
            <p className="mt-1 text-xs text-amber-800">If it was by mistake, you can rejoin and resume the game.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void onRejoinLastMatch()
                }}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500"
              >
                Rejoin Last Match
              </button>
              <button
                type="button"
                onClick={() => setLastLeftRoomId(null)}
                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Dismiss
              </button>
            </div>
          </section>
        )}

        <Routes>
          <Route
            path="/"
            element={<Navigate to={user ? '/rooms' : '/welcome'} replace />}
          />

          <Route
            path="/welcome"
            element={
              <WelcomePage
                user={user}
                username={username}
                avatar={avatar}
                isFirstVisit={isFirstVisit}
                onUsernameChange={setUsername}
                onAvatarChange={setAvatar}
                onSetAudioEnabled={setAudioEnabledQuick}
                onAudioConsentDone={() => {
                  setAudioConsent(true)
                  setIsFirstVisit(false)
                }}
                onEnterLobby={onEnterLobby}
                onUseSavedProfile={onUseSavedProfile}
              />
            }
          />

          <Route
            path="/rooms"
            element={
              user ? (
                <RoomsPage
                  currentUserAvatar={user.avatar}
                  joinableRooms={joinableRooms}
                  myHostedRooms={myHostedRooms}
                  codeLength={codeLength}
                  allowDuplicates={allowDuplicates}
                  isPrivate={isPrivate}
                  allowLies={allowLies}
                  newRoomName={newRoomName}
                  newRoomPassword={newRoomPassword}
                  joinPassword={joinPassword}
                  onCodeLengthChange={setCodeLength}
                  onAllowDuplicatesChange={setAllowDuplicates}
                  onIsPrivateChange={(nextPrivate) => {
                    setIsPrivate(nextPrivate)
                    if (!nextPrivate) {
                      setNewRoomPassword('')
                    }
                  }}
                  onAllowLiesChange={setAllowLies}
                  onNewRoomNameChange={setNewRoomName}
                  onRegenerateRoomName={() => setNewRoomName(generateRoomName(user.username))}
                  onNewRoomPasswordChange={setNewRoomPassword}
                  onJoinPasswordChange={setJoinPassword}
                  onCreateRoom={onCreateRoom}
                  onJoinRoom={onJoinRoom}
                  onJoinOwnRoomAsGuest={onJoinOwnRoomAsGuest}
                  onDeleteHostedRoom={onDeleteHostedRoom}
                />
              ) : (
                <Navigate to="/welcome" replace />
              )
            }
          />

          <Route
            path="/room/:roomId"
            element={<Navigate to={routeRoomId ? `/room/${routeRoomId}/waiting` : '/rooms'} replace />}
          />

          <Route
            path="/room/:roomId/waiting"
            element={
              user ? (
                room ? (
                  <WaitingRoomPage
                    user={user}
                    room={room}
                    myProfile={myProfile}
                    opponentProfile={opponentProfile}
                    onCopyInvite={onCopyInvite}
                    onShareTelegram={onShareInviteTelegram}
                    onShareWhatsApp={onShareInviteWhatsApp}
                    onLeaveRoom={requestLeaveRoom}
                    onDeleteRoom={() => onDeleteHostedRoom(room.id)}
                    onJoinAsPlayer2={onOpenWaitingRoomP2Setup}
                  />
                ) : (
                  <section className="rounded-3xl border border-violet-200 bg-white p-6 shadow-xl">
                    <h2 className="text-2xl font-bold text-fuchsia-900">Loading Room...</h2>
                    <p className="mt-2 text-sm text-fuchsia-800/80">Connecting to game state.</p>
                  </section>
                )
              ) : (
                <Navigate to="/welcome" replace />
              )
            }
          />

          <Route
            path="/room/:roomId/play"
            element={
              user ? (
                room ? (
                  <GameplayPage
                    user={user}
                    room={room}
                    myProfile={myProfile}
                    opponentProfile={opponentProfile}
                    sortedHistory={sortedHistory}
                    pendingForResponder={pendingForResponder}
                    myTurn={Boolean(myTurn)}
                    rpsChoice={rpsChoice}
                    secretInput={secretInput}
                    secretLocked={secretLocked}
                    guessInput={guessInput}
                    claimedBulls={claimedBulls}
                    claimedCows={claimedCows}
                    mySecret={mySecret}
                    onRpsChoice={onPickRps}
                    onSecretInputChange={setSecretInput}
                    onGuessInputChange={setGuessInput}
                    onClaimedBullsChange={setClaimedBulls}
                    onClaimedCowsChange={setClaimedCows}
                    onSubmitSecret={onSubmitSecret}
                    onUnlockSecret={onUnlockSecret}
                    onSubmitGuess={onSubmitGuess}
                    onAnswerGuess={onAnswerGuess}
                    onCopyInvite={onCopyInvite}
                    onShareTelegram={onShareInviteTelegram}
                    onShareWhatsApp={onShareInviteWhatsApp}
                    onLeaveRoom={requestLeaveRoom}
                    onDeleteRoom={() => onDeleteHostedRoom(room.id)}
                  />
                ) : (
                  <section className="rounded-3xl border border-violet-200 bg-white p-6 shadow-xl">
                    <h2 className="text-2xl font-bold text-fuchsia-900">Loading Room...</h2>
                    <p className="mt-2 text-sm text-fuchsia-800/80">Connecting to game state.</p>
                  </section>
                )
              ) : (
                <Navigate to="/welcome" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to={user ? '/rooms' : '/welcome'} replace />} />
        </Routes>
      </div>

      <a
        href="https://ko-fi.com/K3K21X43RG"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 left-5 z-40 inline-block transition-transform duration-200 hover:scale-105 active:scale-95"
        aria-label="Buy Me a Coffee at ko-fi.com"
      >
        <img
          height="36"
          style={{ border: 0, height: '36px' }}
          src="https://storage.ko-fi.com/cdn/kofi4.png?v=6"
          alt="Buy Me a Coffee at ko-fi.com"
        />
      </a>

      <button
        type="button"
        onClick={() => setShowSettingsPanel((open) => !open)}
        className="fixed bottom-5 right-5 z-40 rounded-full border border-violet-300 bg-white/95 px-4 py-3 text-sm font-bold text-violet-900 shadow-xl backdrop-blur hover:bg-violet-50"
      >
        ⚙️ Settings
      </button>

      {showSettingsPanel && (
        <section className="fixed bottom-20 right-5 z-50 w-[min(92vw,340px)] rounded-2xl border border-violet-200 bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold text-fuchsia-900">Audio Settings</h3>
            <button
              type="button"
              onClick={() => setShowSettingsPanel(false)}
              className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-2 py-1 text-xs font-semibold text-fuchsia-800 hover:bg-fuchsia-100"
            >
              Close
            </button>
          </div>

          <label className="mt-4 flex items-center justify-between text-sm font-semibold text-fuchsia-900">
            <span>Music theme</span>
            <select
              value={audioSettings.musicTheme}
              onChange={(event) => {
                setMusicTheme(event.target.value === 'calm' ? 'calm' : 'arcade')
                void ensureAudioReady()
              }}
              className="rounded-lg border border-violet-300 bg-white px-2 py-1 text-sm"
            >
              <option value="arcade">Arcade</option>
              <option value="calm">Calm</option>
            </select>
          </label>

          <label className="mt-4 flex items-center justify-between text-sm font-semibold text-fuchsia-900">
            <span>Background music</span>
            <input
              type="checkbox"
              checked={audioSettings.musicEnabled}
              onChange={(event) => {
                setMusicEnabled(event.target.checked)
                void ensureAudioReady()
              }}
            />
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(audioSettings.musicVolume * 100)}
            onChange={(event) => setMusicVolume(Number(event.target.value) / 100)}
            className="mt-2 w-full"
          />
          <p className="mt-1 text-xs text-fuchsia-700">Music volume: {Math.round(audioSettings.musicVolume * 100)}%</p>

          <label className="mt-4 flex items-center justify-between text-sm font-semibold text-fuchsia-900">
            <span>Sound effects</span>
            <input
              type="checkbox"
              checked={audioSettings.sfxEnabled}
              onChange={(event) => {
                setSfxEnabled(event.target.checked)
                void ensureAudioReady()
              }}
            />
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(audioSettings.sfxVolume * 100)}
            onChange={(event) => setSfxVolume(Number(event.target.value) / 100)}
            className="mt-2 w-full"
          />
          <p className="mt-1 text-xs text-fuchsia-700">SFX volume: {Math.round(audioSettings.sfxVolume * 100)}%</p>
        </section>
      )}

      {showLeaveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-fuchsia-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-fuchsia-200 bg-white p-5 shadow-2xl">
            <h3 className="text-xl font-extrabold text-fuchsia-900">Leave Room?</h3>
            <p className="mt-2 text-sm text-fuchsia-800/90">
              If you leave now, the match will be paused and your opponent can decide to wait for you or leave too.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirmModal(false)}
                className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void leaveRoom()
                }}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500"
              >
                Confirm Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {shouldShowDisconnectPauseModal && room?.pausedByDisconnect?.playerId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-fuchsia-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-5 shadow-2xl">
            <h3 className="text-xl font-extrabold text-amber-900">Opponent Disconnected</h3>
            <p className="mt-2 text-sm text-amber-900/90">
              {room.profiles[room.pausedByDisconnect.playerId]?.username ?? 'Your opponent'} left the match. The game is paused.
            </p>
            <p className="mt-1 text-sm text-amber-900/90">Do you want to keep waiting for them to rejoin, or leave too?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  void onKeepWaitingForOpponent()
                }}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500"
              >
                Keep Waiting
              </button>
              <button
                type="button"
                onClick={() => {
                  void leaveRoom()
                }}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500"
              >
                Leave Too
              </button>
            </div>
          </div>
        </div>
      )}

      {showHotseatPassOverlay && room && hotseatPendingPlayerId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-fuchsia-950 p-4">
          <button
            type="button"
            onClick={() => {
              // Clear sensitive local inputs before revealing the next player's screen.
              setRpsChoice('')
              setSecretLocked(false)
              setSecretInput('')
              setGuessInput('')
              setHotseatRevealedPlayerId(hotseatPendingPlayerId)
            }}
            className="w-full max-w-xl rounded-3xl border border-fuchsia-200 bg-white px-6 py-8 text-center shadow-2xl"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-700">Same-Phone Turn</p>
            <h3 className="mt-2 text-2xl font-black text-fuchsia-950">
              {room.profiles[hotseatPendingPlayerId]?.avatar} {room.profiles[hotseatPendingPlayerId]?.username} plays now
            </h3>
            <p className="mt-2 text-sm text-fuchsia-800/90">Pass the phone, then tap to reveal this player's view.</p>
            <p className="mt-5 rounded-xl bg-fuchsia-100 px-4 py-2 text-sm font-semibold text-fuchsia-900">Tap To Continue</p>
          </button>
        </div>
      )}

      {waitingRoomP2SetupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-fuchsia-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-fuchsia-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-xl font-extrabold text-fuchsia-900">Same-Phone Player Setup</h3>
              <button
                type="button"
                onClick={() => setWaitingRoomP2SetupId(null)}
                className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-sm font-semibold text-fuchsia-800 hover:bg-fuchsia-100"
              >
                Close
              </button>
            </div>

            <label className="block text-sm font-semibold text-fuchsia-900">Player 2 name</label>
            <input
              value={waitingRoomP2Name}
              onChange={(event) => setWaitingRoomP2Name(event.target.value)}
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
                  onClick={() => setWaitingRoomP2Avatar(icon)}
                  className={`rounded-lg border px-2 py-2 text-lg transition ${waitingRoomP2Avatar === icon ? 'border-fuchsia-500 bg-fuchsia-100' : 'border-violet-200 bg-violet-50 hover:bg-violet-100'}`}
                >
                  {icon}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                void onConfirmWaitingRoomP2Setup()
              }}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 font-semibold text-white hover:brightness-110"
            >
              Start Same-Phone Match
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
