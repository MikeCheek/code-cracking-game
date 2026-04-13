import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInAnonymously, signInWithPopup, signOut } from 'firebase/auth'
import toast, { Toaster, ToastBar } from 'react-hot-toast'
import { Navigate, Route, Routes, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { DEFAULT_CODE_LENGTH, DEFAULT_GAME_MODE, DEFAULT_WORD_LANGUAGE, MAX_WORD_CODE_LENGTH } from './constants'
import {
  answerGuess,
  chooseRps,
  createRoom,
  deleteRoom,
  finalizeTurnTimeout,
  joinRoom,
  joinRoomAsSpectator,
  joinOwnRoomAsGuest,
  keepWaitingForRejoin,
  leaveRoom as leaveRoomRealtime,
  lockSecret,
  finalizeRpsRound,
  sendQuickEmote,
  subscribePastGames,
  votePlayAgain,
  unlockSecret,
  submitGuess,
  subscribeLobby,
  subscribeRoom,
  updateGuessTypingStatus,
} from './lib/realtime'
import { getTelegramUserProfile, isTelegramWebApp, prepareTelegramWebApp } from './lib/platform'
import {
  shareInviteSmart,
  shareInviteViaTelegram,
  shareInviteViaWhatsApp,
} from './lib/share'
import { auth } from './lib/firebase'
import { configureAudio, ensureAudioReady, playAlert, playClick, playLie, playSuccess } from './lib/sfx'
import { clearUser, hasAudioConsent, loadAudioSettings, loadUser, saveAudioSettings, saveUser, setAudioConsent } from './lib/storage'
import { generateRandomAvatar, generateRandomUsername } from './utils/profile'
import { GameplayPage } from './pages/GameplayPage'
import { HistoryPage } from './pages/HistoryPage'
import { LandingPage } from './pages/LandingPage'
import { RoomsPage } from './pages/RoomsPage'
import { ResultsPage } from './pages/ResultsPage'
import { PracticePage } from './pages/PracticePage'
import { WaitingRoomPage } from './pages/WaitingRoomPage'
import { WelcomePage } from './pages/WelcomePage'
import { generateRoomName } from './utils/roomName'
import { getRoomGameMode } from './utils/gameMode'
import { normalizeWordInput } from './lib/wordValidation'
import type { AudioSettings, GameMode, LobbyRoomSummary, PastGameSummary, RoomData, RpsChoice, UserProfile, WordLanguage } from './types'

const initialTelegramUser = typeof window !== 'undefined' ? getTelegramUserProfile() : null
const initialStoredUser = initialTelegramUser ?? loadUser()
const initialAudioSettings = loadAudioSettings()
const googleAuthProvider = new GoogleAuthProvider()

const UI_THEME_OPTIONS: Array<{ id: AudioSettings['uiTheme']; label: string }> = [
  { id: 'neon-pink', label: 'Neon Pink' },
  { id: 'midnight-purple', label: 'Midnight Purple' },
  { id: 'arcade-cyan', label: 'Arcade Cyan' },
  { id: 'sunset-pop', label: 'Sunset Pop' },
]

const RPS_SYMBOLS: Record<RpsChoice, string> = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
}

type RpsShowdownState = {
  hostChoice: RpsChoice
  guestChoice: RpsChoice
  result: 'host' | 'guest' | 'tie'
  hostName: string
  guestName: string
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const roomMatch = useMatch('/room/:roomId/*')
  const routeRoomId = roomMatch?.params.roomId ?? null
  const isWatchRoute = location.pathname.endsWith('/watch')
  const isPastResultsView = useMemo(() => new URLSearchParams(location.search).get('past') === '1', [location.search])
  const inviteRoomId = useMemo(() => {
    const inviteId = new URLSearchParams(location.search).get('room')
    return inviteId?.trim() || null
  }, [location.search])

  const [user, setUser] = useState<UserProfile | null>(initialStoredUser)
  const [username, setUsername] = useState(initialStoredUser?.username ?? '')
  const [avatar, setAvatar] = useState(initialStoredUser?.avatar ?? generateRandomAvatar())
  const [isAuthInitializing, setIsAuthInitializing] = useState(() => location.pathname !== '/')
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [isAnonymousSession, setIsAnonymousSession] = useState(true)

  const [rooms, setRooms] = useState<LobbyRoomSummary[]>([])
  const [pastGames, setPastGames] = useState<PastGameSummary[]>([])
  const [room, setRoom] = useState<RoomData | null>(null)

  const [codeLength, setCodeLength] = useState<number>(DEFAULT_CODE_LENGTH)
  const [allowDuplicates, setAllowDuplicates] = useState(false)
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>(DEFAULT_GAME_MODE)
  const [selectedWordLanguage, setSelectedWordLanguage] = useState<WordLanguage>(DEFAULT_WORD_LANGUAGE)
  const [isPrivate, setIsPrivate] = useState(false)
  const [allowLies, setAllowLies] = useState(true)
  const [maxTurnSeconds, setMaxTurnSeconds] = useState<number | ''>('')
  const [newRoomName, setNewRoomName] = useState(() => generateRoomName(initialStoredUser?.username))
  const [newRoomPassword, setNewRoomPassword] = useState('')
  const [joinPassword, setJoinPassword] = useState('')

  const [rpsChoice, setRpsChoice] = useState<RpsChoice | ''>('')
  const [secretInput, setSecretInput] = useState('')
  const [secretLocked, setSecretLocked] = useState(false)
  const [guessInput, setGuessInput] = useState('')
  const [isCheckingWordSecret, setIsCheckingWordSecret] = useState(false)
  const [isCheckingWordGuess, setIsCheckingWordGuess] = useState(false)
  const [claimedBulls, setClaimedBulls] = useState(0)
  const [claimedCows, setClaimedCows] = useState(0)

  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(initialAudioSettings)
  const lastHandledHistoryIdRef = useRef<string | null>(null)
  const lastSeenRpsRoundRef = useRef<number | null>(null)
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const toastSwipeStateRef = useRef<Record<string, { startX: number; startY: number; active: boolean }>>({})
  const [hotseatGuestProfile, setHotseatGuestProfile] = useState<UserProfile | null>(null)
  const [hotseatRevealedPlayerId, setHotseatRevealedPlayerId] = useState<string | null>(null)
  const [waitingRoomP2SetupId, setWaitingRoomP2SetupId] = useState<string | null>(null)
  const [waitingRoomP2Name, setWaitingRoomP2Name] = useState('Player 2')
  const [waitingRoomP2Avatar, setWaitingRoomP2Avatar] = useState('😎')
  const [isFirstVisit, setIsFirstVisit] = useState(!hasAudioConsent())
  const [dismissedPausePromptAt, setDismissedPausePromptAt] = useState<number | null>(null)
  const [lastLeftRoomId, setLastLeftRoomId] = useState<string | null>(null)
  const [rpsShowdown, setRpsShowdown] = useState<RpsShowdownState | null>(null)
  const inviteJoinHandledRef = useRef<string | null>(null)
  const lastShownRpsResultAtRef = useRef<number | null>(null)

  const signedInUserId = user?.id ?? null
  const isStandaloneDisplay = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  }, [])
  const inRoomsRoute = location.pathname === '/rooms'
  const inHistoryRoute = location.pathname === '/history'
  const isLandingRoute = location.pathname === '/'
  const isWelcomeRoute = location.pathname === '/welcome'

  useEffect(() => {
    if (selectedGameMode === 'words' && codeLength > MAX_WORD_CODE_LENGTH) {
      setCodeLength(MAX_WORD_CODE_LENGTH)
    }
    if (selectedGameMode === 'numbers' && codeLength > 5) {
      setCodeLength(5)
    }
  }, [codeLength, selectedGameMode])

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
  const isCurrentUserParticipant = Boolean(
    room && signedInUserId && (room.hostId === signedInUserId || room.guestId === signedInUserId),
  )

  const showHotseatPassOverlay = Boolean(
    isHotseatMode &&
    hotseatPendingPlayerId &&
    hotseatRevealedPlayerId !== hotseatPendingPlayerId,
  )
  const activeRpsRoomId = room?.status === 'rps' ? room.id : null
  const activeTurnTimerRoomId = room?.status === 'playing' && room.settings.maxTurnSeconds ? room.id : null

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

  useEffect(() => {
    if (isLandingRoute) {
      setIsAuthInitializing(false)
      return
    }

    setIsAuthInitializing(true)

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setIsAnonymousSession(true)
        void signInAnonymously(auth)
          .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : 'Anonymous login failed')
          })
          .finally(() => {
            setIsAuthInitializing(false)
          })
        return
      }

      setIsAnonymousSession(firebaseUser.isAnonymous)

      const stored = loadUser()
      const isSameIdentity = stored?.id === firebaseUser.uid
      const preferredUsername = isSameIdentity
        ? stored?.username?.trim()
        : firebaseUser.displayName?.trim() || stored?.username?.trim()
      const nextUser: UserProfile = {
        id: firebaseUser.uid,
        username: (preferredUsername || generateRandomUsername()).slice(0, 24),
        avatar: isSameIdentity ? (stored?.avatar || generateRandomAvatar()) : generateRandomAvatar(),
      }

      saveUser(nextUser)
      setUser(nextUser)
      setUsername(nextUser.username)
      setAvatar(nextUser.avatar)
      setIsAuthInitializing(false)
    })

    return unsubscribe
  }, [isLandingRoute])

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
    if (!user || isAnonymousSession || !inHistoryRoute) {
      setPastGames([])
      return
    }

    const unsub = subscribePastGames(user.id, (list) => {
      setPastGames(list)
    })

    return unsub
  }, [inHistoryRoute, isAnonymousSession, user])

  useEffect(() => {
    if (!routeRoomId) return

    const unsub = subscribeRoom(routeRoomId, (nextRoom) => {
      if (!nextRoom) {
        toast.error('This room no longer exists.')
        setRoom(null)
        setHotseatGuestProfile(null)
        setHotseatRevealedPlayerId(null)
        lastShownRpsResultAtRef.current = null
        navigate('/rooms', { replace: true })
        return
      }

      if (
        nextRoom.lastRpsResult &&
        nextRoom.lastRpsResult.at !== lastShownRpsResultAtRef.current &&
        nextRoom.guestId
      ) {
        const hostName = nextRoom.profiles[nextRoom.hostId]?.username ?? 'Host'
        const guestName = nextRoom.profiles[nextRoom.guestId]?.username ?? 'Guest'
        setRpsShowdown({
          hostChoice: nextRoom.lastRpsResult.hostChoice,
          guestChoice: nextRoom.lastRpsResult.guestChoice,
          result: nextRoom.lastRpsResult.winner,
          hostName,
          guestName,
        })
        lastShownRpsResultAtRef.current = nextRoom.lastRpsResult.at
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
    if (!activeRpsRoomId) return

    const tryFinalize = () => {
      void finalizeRpsRound(activeRpsRoomId)
    }

    tryFinalize()
    const interval = setInterval(tryFinalize, 300)
    return () => clearInterval(interval)
  }, [activeRpsRoomId])

  useEffect(() => {
    if (!activeTurnTimerRoomId) return

    const tryFinalizeTimeout = () => {
      void finalizeTurnTimeout(activeTurnTimerRoomId)
    }

    tryFinalizeTimeout()
    const interval = setInterval(tryFinalizeTimeout, 350)
    return () => clearInterval(interval)
  }, [activeTurnTimerRoomId])

  useEffect(() => {
    if (!routeRoomId || !room || room.id !== routeRoomId) return

    if (isWatchRoute) {
      if (room.status === 'finished') {
        navigate(`/room/${routeRoomId}/results?past=1`, { replace: true })
      }
      return
    }

    const waitingPath = `/room/${routeRoomId}/waiting`
    const playPath = `/room/${routeRoomId}/play`
    const resultsPath = `/room/${routeRoomId}/results`

    if (room.status === 'waiting' && location.pathname !== waitingPath) {
      navigate(waitingPath, { replace: true })
      return
    }

    if (room.status === 'finished' && location.pathname !== resultsPath) {
      navigate(resultsPath, { replace: true })
      return
    }

    if (room.status !== 'waiting' && room.status !== 'finished' && location.pathname !== playPath) {
      navigate(playPath, { replace: true })
    }
  }, [isWatchRoute, location.pathname, navigate, routeRoomId, room])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (userMenuRef.current?.contains(target)) return
      setShowUserMenu(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [])

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

  const isCurrentSecretLocked = Boolean(
    room &&
    currentPlayerId &&
    room.status === 'secrets' &&
    room.lockedSecrets?.[currentPlayerId],
  )

  const myTurn = room?.currentTurnPlayerId === currentPlayerId
  const mySecret = room && currentPlayerId ? room.secrets?.[currentPlayerId] : undefined
  const shouldShowDisconnectPauseModal = Boolean(
    isCurrentUserParticipant &&
    room?.pausedByDisconnect?.playerId &&
    currentPlayerId &&
    room.pausedByDisconnect.playerId !== currentPlayerId &&
    room.pausedByDisconnect.at !== dismissedPausePromptAt,
  )

  const lobbyRooms = useMemo(
    () =>
      [...rooms].sort((a, b) => {
        if (a.hasGuest !== b.hasGuest) {
          return a.hasGuest ? 1 : -1
        }
        return b.createdAt - a.createdAt
      }),
    [rooms],
  )

  useEffect(() => {
    lastHandledHistoryIdRef.current = null
    lastSeenRpsRoundRef.current = null
    lastShownRpsResultAtRef.current = null
    setRpsShowdown(null)
  }, [room?.id])

  useEffect(() => {
    if (!rpsShowdown) return
    const timer = setTimeout(() => {
      setRpsShowdown(null)
    }, 2300)
    return () => clearTimeout(timer)
  }, [rpsShowdown])

  useEffect(() => {
    const latestRecord = sortedHistory[sortedHistory.length - 1]
    if (!latestRecord) return
    if (lastHandledHistoryIdRef.current === latestRecord.id) return

    lastHandledHistoryIdRef.current = latestRecord.id
    if (latestRecord.lieDetected) {
      playLie()
    }
  }, [sortedHistory])

  useEffect(() => {
    setSecretLocked(isCurrentSecretLocked)
  }, [isCurrentSecretLocked])

  const persistUser = (): UserProfile | null => {
    if (!username.trim()) {
      toast.error('Choose a username first.')
      return null
    }

    const authUserId = auth.currentUser?.uid
    if (!authUserId) {
      toast.error('Still connecting your session. Try again in a moment.')
      return null
    }

    const nextUser: UserProfile = {
      id: authUserId,
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

  const onCreateAccountOrLogin = async () => {
    setIsAuthBusy(true)
    try {
      googleAuthProvider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, googleAuthProvider)
      toast.success('Signed in with Google.')
      playSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed')
      playAlert()
    } finally {
      setIsAuthBusy(false)
    }
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
          ...(typeof maxTurnSeconds === 'number' && maxTurnSeconds > 0 ? { maxTurnSeconds } : {}),
          gameMode: selectedGameMode,
          ...(selectedGameMode === 'words' ? { wordLanguage: selectedWordLanguage } : {}),
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

  const onQuickStartRoom = async (): Promise<boolean> => {
    if (!user) return false
    try {
      const nextRoomId = await createRoom(
        user,
        {
          codeLength: DEFAULT_CODE_LENGTH,
          allowDuplicates: false,
          isPrivate: false,
          allowLies: true,
          gameMode: DEFAULT_GAME_MODE,
        },
        '',
        generateRoomName(user.username),
      )
      toast.success('Quick match created!')
      playSuccess()
      setCodeLength(DEFAULT_CODE_LENGTH)
      setAllowDuplicates(false)
      setIsPrivate(false)
      setAllowLies(true)
      setSelectedGameMode(DEFAULT_GAME_MODE)
      setSelectedWordLanguage(DEFAULT_WORD_LANGUAGE)
      setMaxTurnSeconds('')
      setNewRoomPassword('')
      setNewRoomName(generateRoomName(user.username))
      navigate(`/room/${nextRoomId}/waiting`)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start quick match')
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

  const onWatchRoom = useCallback(async (targetRoomId: string): Promise<boolean> => {
    if (!user) return false
    try {
      await joinRoomAsSpectator(targetRoomId, user)
      toast.success('Watching game')
      navigate(`/room/${targetRoomId}/watch`)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start watch mode')
      return false
    }
  }, [navigate, user])

  const onOpenPastGameResults = useCallback((targetRoomId: string) => {
    navigate(`/room/${targetRoomId}/results?past=1`)
  }, [navigate])

  const onOpenHistoryMatch = useCallback((targetRoomId: string) => {
    navigate(`/room/${targetRoomId}/results?past=1`)
  }, [navigate])

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
    if (isCurrentSecretLocked) {
      toast('Code is already locked.')
      return
    }

    const shouldValidateWord = getRoomGameMode(room) === 'words'
    if (shouldValidateWord) {
      setIsCheckingWordSecret(true)
    }

    try {
      await lockSecret(room.id, currentPlayerId, secretInput.trim(), room.settings)
      setSecretLocked(true)
      toast.success('Code locked! Opponent will see a notification.')
      playSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not lock secret')
    } finally {
      if (shouldValidateWord) {
        setIsCheckingWordSecret(false)
      }
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

    const shouldValidateWord = getRoomGameMode(room) === 'words'
    if (shouldValidateWord) {
      setIsCheckingWordGuess(true)
    }

    try {
      void updateGuessTypingStatus(room.id, currentPlayerId, false).catch(() => {})
      await submitGuess(room.id, currentPlayerId, guessInput.trim(), room.settings)
      setGuessInput('')
      if (isHotseatMode) {
        setHotseatRevealedPlayerId(null)
      }
      playClick()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit guess')
    } finally {
      if (shouldValidateWord) {
        setIsCheckingWordGuess(false)
      }
    }
  }

  const onAnswerGuess = async () => {
    if (!room || !currentPlayerId) return
    const codeLengthLimit = room.settings.codeLength
    if (
      claimedBulls < 0 ||
      claimedCows < 0 ||
      claimedBulls > codeLengthLimit ||
      claimedCows > codeLengthLimit ||
      claimedBulls + claimedCows > codeLengthLimit
    ) {
      toast.error(`Strikes + Balls must be <= ${codeLengthLimit}`)
      return
    }
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

  const onSendQuickEmote = async (emote: string) => {
    if (!room || !signedInUserId) return
    const senderId = isWatchRoute ? signedInUserId : (currentPlayerId ?? signedInUserId)
    try {
      await sendQuickEmote(room.id, senderId, emote)
      playClick()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send emote')
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
    setIsCheckingWordSecret(false)
    setIsCheckingWordGuess(false)
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

  const onBackToGames = async () => {
    if (!room || !currentPlayerId) {
      resetRoomStateAndGoLobby()
      return
    }
    try {
      await leaveRoomRealtime(room.id, currentPlayerId)
    } catch {
      // If leave fails due to a race condition, still return to lobby locally.
    }
    resetRoomStateAndGoLobby()
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
      setLastLeftRoomId(null)
      toast.success('Rejoined match!')
      playSuccess()
      navigate(`/room/${lastLeftRoomId}/play`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not rejoin match')
      playAlert()
      setLastLeftRoomId(null)
    }
  }

  const onPlayAgain = async () => {
    if (!room || !currentPlayerId) return
    try {
      await votePlayAgain(room.id, currentPlayerId)
      toast.success('Replay request sent.')
      playClick()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not request replay')
      playAlert()
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

  const setUiTheme = (nextTheme: AudioSettings['uiTheme']) => {
    setAudioSettings((current) => ({ ...current, uiTheme: nextTheme }))
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

  const onSecretInputChange = (value: string) => {
    if (isCurrentSecretLocked || !room) return
    if (getRoomGameMode(room) === 'words') {
      setSecretInput(normalizeWordInput(value, room.settings.codeLength))
      return
    }

    const digitsOnly = value.replace(/\D/g, '').slice(0, room.settings.codeLength)
    setSecretInput(digitsOnly)
  }

  const onGuessInputChange = (value: string) => {
    if (!room) return
    let normalizedGuess = ''

    if (getRoomGameMode(room) === 'words') {
      normalizedGuess = normalizeWordInput(value, room.settings.codeLength)
    } else {
      normalizedGuess = value.replace(/\D/g, '').slice(0, room.settings.codeLength)
    }

    setGuessInput(normalizedGuess)

    if (room.status === 'playing' && currentPlayerId && myTurn && !room.pendingGuess) {
      void updateGuessTypingStatus(room.id, currentPlayerId, normalizedGuess.length > 0).catch(() => {})
    }
  }

  useEffect(() => {
    if (!room || !currentPlayerId) return
    if (room.status === 'playing' && myTurn && !room.pendingGuess) return
    void updateGuessTypingStatus(room.id, currentPlayerId, false).catch(() => {})
  }, [currentPlayerId, myTurn, room?.id, room?.pendingGuess?.at, room?.status])

  const onLogout = async () => {
    setIsAuthBusy(true)
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
    setIsCheckingWordSecret(false)
    setIsCheckingWordGuess(false)
    setClaimedBulls(0)
    setClaimedCows(0)
    setSelectedGameMode(DEFAULT_GAME_MODE)
    setSelectedWordLanguage(DEFAULT_WORD_LANGUAGE)
    setMaxTurnSeconds('')
    setShowSettingsModal(false)
    setShowUserMenu(false)
    setHotseatGuestProfile(null)
    setHotseatRevealedPlayerId(null)
    try {
      await signOut(auth)
      toast.success('Logged out. Anonymous mode is active.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Logout failed')
    } finally {
      setIsAuthBusy(false)
      navigate('/welcome')
    }
  }

  return (
    <div className={`theme-${audioSettings.uiTheme} min-h-dvh bg-orchid-pattern px-3 py-3 text-slate-100 app-noise sm:px-4 sm:py-4`}>
      <div className="fixed top-4 left-4 z-[1300] sm:top-5 sm:left-5">
        <img
          src="/codecracking.png"
          alt="Code Cracking logo"
          className="h-12 w-12 rounded-xl border border-white/20 object-cover shadow-[0_10px_28px_rgba(0,0,0,0.45)] sm:h-14 sm:w-14"
        />
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'rgba(8, 18, 30, 0.92)',
            color: '#f4f9ff',
            border: '1px solid rgba(161, 196, 255, 0.25)',
            boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35)',
            minWidth: '380px',
            maxWidth: '92vw',
            minHeight: '72px',
            padding: '16px 18px',
            borderRadius: '14px',
            fontSize: '15px',
            lineHeight: 1.35,
            backdropFilter: 'blur(10px)',
          },
          success: {
            iconTheme: {
              primary: '#6fffe9',
              secondary: '#031220',
            },
          },
          error: {
            iconTheme: {
              primary: '#fb7185',
              secondary: '#08121d',
            },
          },
        }}
      >
        {(t) => {
          const dismissToast = () => toast.dismiss(t.id)

          const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
            toastSwipeStateRef.current[t.id] = {
              startX: event.clientX,
              startY: event.clientY,
              active: true,
            }
          }

          const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
            const state = toastSwipeStateRef.current[t.id]
            if (!state?.active) return

            const deltaX = event.clientX - state.startX
            const deltaY = event.clientY - state.startY
            if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY)) return

            state.active = false
            dismissToast()
          }

          const onPointerUp = () => {
            delete toastSwipeStateRef.current[t.id]
          }

          return (
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="pointer-events-auto"
              style={{ touchAction: 'pan-y' }}
            >
              <ToastBar toast={t}>
                {({ icon, message }) => (
                  <div className="flex min-w-[320px] items-start gap-3 rounded-[14px] shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur">
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div className="min-w-0 flex-1 pr-2">{message}</div>
                    <button
                      type="button"
                      onClick={dismissToast}
                      aria-label="Dismiss notification"
                      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                )}
              </ToastBar>
            </div>
          )
        }}
      </Toaster>

      <div className="mx-auto flex h-full max-w-6xl flex-col pt-24">

        {isAuthInitializing && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/90 px-6 backdrop-blur-xl">
            <div className="relative flex w-full max-w-sm flex-col items-center rounded-3xl border border-white/15 bg-slate-900/75 px-8 py-10 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
              <div className="pointer-events-none absolute -top-24 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 h-48 w-48 rounded-full bg-violet-400/20 blur-3xl" />

              <div className="relative h-24 w-24">
                <div className="loader-ring absolute inset-0 rounded-full border-2 border-fuchsia-200/20" />
                <div className="loader-ring loader-ring-spin absolute inset-1 rounded-full border-t-2 border-r-2 border-fuchsia-300" />
                <div className="loader-ring loader-ring-reverse absolute inset-4 rounded-full border-l-2 border-violet-300/90" />
                <div className="loader-core-glow absolute inset-[34%] rounded-full bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-300" />
              </div>

              <p className="mt-7 text-center text-sm font-bold uppercase tracking-[0.22em] text-fuchsia-200/90">Secure Session</p>
              <h2 className="mt-2 text-center text-2xl font-black tracking-tight text-white">Initializing...</h2>
              <p className="mt-3 text-center text-sm text-slate-300">Encrypting lobby access and preparing your realtime connection.</p>
            </div>
          </div>
        )}

        {inRoomsRoute && lastLeftRoomId && (
          <section className="mb-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 shadow-md backdrop-blur">
            <p className="text-sm font-semibold text-amber-100">You recently left an active match.</p>
            <p className="mt-1 text-xs text-amber-100/80">If it was by mistake, you can rejoin and resume the game.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void onRejoinLastMatch()
                }}
                className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                Rejoin Last Match
              </button>
              <button
                type="button"
                onClick={() => setLastLeftRoomId(null)}
                className="rounded-lg border border-amber-300/25 bg-transparent px-3 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/10"
              >
                Dismiss
              </button>
            </div>
          </section>
        )}

        <main className="flex-1 overflow-y-auto pb-24">
          <Routes>
            <Route
              path="/"
              element={isStandaloneDisplay ? <Navigate to="/welcome" replace /> : (
                <LandingPage
                  onStartPlaying={() => navigate('/welcome')}
                  onTryDemo={() => navigate('/practice')}
                  onSetUpProfile={() => navigate('/welcome')}
                />
              )}
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
                onCreateAccountOrLogin={onCreateAccountOrLogin}
                onTryDemo={() => navigate('/practice')}
                isAuthBusy={isAuthBusy}
                isAnonymousSession={isAnonymousSession}
              />
            }
          />

          <Route
            path="/practice"
            element={
              <PracticePage
                onBackToWelcome={() => navigate('/welcome')}
                onStartLobby={() => navigate('/rooms')}
              />
            }
          />

          <Route
            path="/rooms"
            element={
              user ? (
                <RoomsPage
                  lobbyRooms={lobbyRooms}
                  codeLength={codeLength}
                  allowDuplicates={allowDuplicates}
                  isPrivate={isPrivate}
                  allowLies={allowLies}
                  maxTurnSeconds={maxTurnSeconds}
                  newRoomName={newRoomName}
                  newRoomPassword={newRoomPassword}
                  joinPassword={joinPassword}
                  selectedGameMode={selectedGameMode}
                  selectedWordLanguage={selectedWordLanguage}
                  onCodeLengthChange={setCodeLength}
                  onAllowDuplicatesChange={setAllowDuplicates}
                  onIsPrivateChange={(nextPrivate) => {
                    setIsPrivate(nextPrivate)
                    if (!nextPrivate) {
                      setNewRoomPassword('')
                    }
                  }}
                  onAllowLiesChange={setAllowLies}
                  onMaxTurnSecondsChange={setMaxTurnSeconds}
                  onGameModeChange={setSelectedGameMode}
                  onWordLanguageChange={setSelectedWordLanguage}
                  onNewRoomNameChange={setNewRoomName}
                  onRegenerateRoomName={() => setNewRoomName(generateRoomName(user.username))}
                  onNewRoomPasswordChange={setNewRoomPassword}
                  onJoinPasswordChange={setJoinPassword}
                  onCreateRoom={onCreateRoom}
                  onQuickStartRoom={onQuickStartRoom}
                  onJoinRoom={onJoinRoom}
                  onWatchRoom={onWatchRoom}
                  onOpenPastGameResults={onOpenPastGameResults}
                />
              ) : (
                <Navigate to="/welcome" replace />
              )
            }
          />

          <Route
            path="/history"
            element={
              user ? (
                isAnonymousSession ? (
                  <Navigate to="/rooms" replace />
                ) : (
                  <HistoryPage games={pastGames} onOpenPastResult={onOpenHistoryMatch} />
                )
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
                    onLeaveRoom={requestLeaveRoom}
                    onDeleteRoom={() => onDeleteHostedRoom(room.id)}
                    canDeleteRoom={room.hostId === user.id}
                    onCopyInvite={onCopyInvite}
                    onShareTelegram={onShareInviteTelegram}
                    onShareWhatsApp={onShareInviteWhatsApp}
                    onJoinAsPlayer2={onOpenWaitingRoomP2Setup}
                  />
                ) : (
                  <section className="glass-panel rounded-3xl p-6">
                    <h2 className="text-2xl font-bold text-white">Loading room...</h2>
                    <p className="mt-2 text-sm text-slate-300">Connecting to game state.</p>
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
                      room={room}
                      myProfile={myProfile}
                      opponentProfile={opponentProfile}
                      sortedHistory={sortedHistory}
                      pendingForResponder={pendingForResponder}
                      myTurn={Boolean(myTurn)}
                      rpsChoice={rpsChoice}
                      secretInput={secretInput}
                      secretLocked={isCurrentSecretLocked || secretLocked}
                      guessInput={guessInput}
                      claimedBulls={claimedBulls}
                      claimedCows={claimedCows}
                      mySecret={mySecret}
                      onRpsChoice={onPickRps}
                      onSecretInputChange={onSecretInputChange}
                      onGuessInputChange={onGuessInputChange}
                      onClaimedBullsChange={setClaimedBulls}
                      onClaimedCowsChange={setClaimedCows}
                      onSubmitSecret={onSubmitSecret}
                      onUnlockSecret={onUnlockSecret}
                      onSubmitGuess={onSubmitGuess}
                      onAnswerGuess={onAnswerGuess}
                      onSendQuickEmote={onSendQuickEmote}
                      onBackToRooms={onBackToGames}
                      onLeaveRoom={requestLeaveRoom}
                      onDeleteRoom={() => onDeleteHostedRoom(room.id)}
                      canDeleteRoom={room.hostId === user.id}
                      isCheckingWordSecret={isCheckingWordSecret}
                      isCheckingWordGuess={isCheckingWordGuess}
                    />
                  ) : (
                    <section className="glass-panel rounded-3xl p-6">
                      <h2 className="text-2xl font-bold text-white">Loading room...</h2>
                      <p className="mt-2 text-sm text-slate-300">Connecting to game state.</p>
                    </section>
                  )
                ) : (
                  <Navigate to="/welcome" replace />
                )
              }
            />

            <Route
              path="/room/:roomId/watch"
              element={
                user ? (
                  room ? (
                    <GameplayPage
                      room={room}
                      myProfile={myProfile}
                      opponentProfile={opponentProfile}
                      sortedHistory={sortedHistory}
                      pendingForResponder={false}
                      myTurn={false}
                      rpsChoice={''}
                      secretInput=""
                      secretLocked
                      guessInput=""
                      claimedBulls={0}
                      claimedCows={0}
                      onRpsChoice={() => {}}
                      onSecretInputChange={() => {}}
                      onGuessInputChange={() => {}}
                      onClaimedBullsChange={() => {}}
                      onClaimedCowsChange={() => {}}
                      onSubmitSecret={() => {}}
                      onUnlockSecret={() => {}}
                      onSubmitGuess={() => {}}
                      onAnswerGuess={() => {}}
                      onSendQuickEmote={onSendQuickEmote}
                      onBackToRooms={onBackToGames}
                      onLeaveRoom={requestLeaveRoom}
                      onDeleteRoom={() => {}}
                      canDeleteRoom={false}
                      isCheckingWordSecret={false}
                      isCheckingWordGuess={false}
                      isWatchMode
                      hostProfile={room.profiles[room.hostId] ?? null}
                      guestProfile={room.guestId ? room.profiles[room.guestId] ?? null : null}
                      watcherProfile={
                        signedInUserId
                          ? room.spectatorProfiles?.[signedInUserId] ?? room.profiles[signedInUserId] ?? null
                          : null
                      }
                    />
                  ) : (
                    <section className="glass-panel rounded-3xl p-6">
                      <h2 className="text-2xl font-bold text-white">Loading room...</h2>
                      <p className="mt-2 text-sm text-slate-300">Connecting to game state.</p>
                    </section>
                  )
                ) : (
                  <Navigate to="/welcome" replace />
                )
              }
            />

            <Route
              path="/room/:roomId/results"
              element={
                user ? (
                  room ? (
                    <ResultsPage
                      room={room}
                      myProfile={myProfile}
                      opponentProfile={opponentProfile}
                      sortedHistory={sortedHistory}
                      onBackToRooms={onBackToGames}
                      onPlayAgain={onPlayAgain}
                      canPlayAgain={!isPastResultsView && isCurrentUserParticipant}
                    />
                  ) : (
                    <section className="glass-panel rounded-3xl p-6">
                      <h2 className="text-2xl font-bold text-white">Loading room...</h2>
                      <p className="mt-2 text-sm text-slate-300">Connecting to game state.</p>
                    </section>
                  )
                ) : (
                  <Navigate to="/welcome" replace />
                )
              }
            />

            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </main>
      </div>

       {!isWelcomeRoute? <a
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
      :<></>
      }

      {!isWelcomeRoute && !isLandingRoute && user && (
        <div ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu((open) => !open)}
            className="fixed top-4 right-4 z-40 flex items-center gap-3 rounded-full border border-white/20 bg-slate-900/85 px-4 py-3 text-sm font-bold text-slate-100 shadow-xl backdrop-blur transition hover:bg-slate-900 sm:top-5 sm:right-5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300/10 text-base">{user.avatar}</span>
            <span className="max-w-[120px] truncate hidden sm:inline">{user.username}</span>
          </button>

          {showUserMenu && (
            <div className="glass-panel-strong fixed top-20 right-3 w-[200px] z-50 rounded-xl p-2 sm:top-24 sm:right-5 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false)
                  navigate('/welcome')
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false)
                  navigate('/rooms')
                }}
                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Games Page
              </button>
              {!isAnonymousSession && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false)
                    navigate('/history')
                  }}
                  className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Match History
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false)
                  setShowInfoModal(true)
                }}
                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Info
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false)
                  setShowSettingsModal(true)
                }}
                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={onLogout}
                disabled={isAuthBusy}
                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-200 transition hover:bg-rose-400/15"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      )}

      {showInfoModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-2xl max-h-[85vh] rounded-3xl  flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Game Info</h3>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4 text-sm text-slate-200">
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white">Rules</h4>
                <p>Set your secret code first, then alternate turns to crack your opponent's code before they crack yours.</p>
                <p><strong>Strikes:</strong> Correct symbol in the correct position.</p>
                <p><strong>Balls:</strong> Correct symbol but placed in the wrong position.</p>
                <p><strong>Winning:</strong> You win instantly when your guess matches every position in the opponent's secret.</p>
                <p><strong>Duplicates:</strong> If duplicate symbols are enabled, the same symbol can appear more than once in a secret.</p>
                <p><strong>Lies Mode:</strong> If lies are allowed, players may fake Bulls/Cows feedback, but lying too many times causes an automatic loss.</p>
              </div>

              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <h4 className="text-base font-bold text-white">Creator</h4>
                <p>Made by Michele Pulvirenti.</p>
                <p>If you enjoy the game and want to support it, donations are appreciated.</p>
                <a
                  href="https://ko-fi.com/K3K21X43RG"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:brightness-110"
                >
                  Support With a Donation
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-2xl max-h-[85vh] rounded-3xl  flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Settings</h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Audio & Visual</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Theme</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {UI_THEME_OPTIONS.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setUiTheme(item.id)}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                              audioSettings.uiTheme === item.id
                                ? 'border-fuchsia-300/40 bg-fuchsia-300/20 text-white'
                                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-sm font-semibold text-slate-100 mb-2">
                        <span>Music theme</span>
                        <select
                          value={audioSettings.musicTheme}
                          onChange={(event) => {
                            setMusicTheme(event.target.value === 'calm' ? 'calm' : 'arcade')
                            void ensureAudioReady()
                          }}
                          className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                        >
                          <option value="arcade">Arcade</option>
                          <option value="calm">Calm</option>
                        </select>
                      </label>
                    </div>

                    <div>
                      <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 mb-2">
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
                        className="w-full"
                      />
                      <p className="mt-1 text-xs text-slate-300">Volume: {Math.round(audioSettings.musicVolume * 100)}%</p>
                    </div>

                    <div>
                      <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 mb-2">
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
                        className="w-full"
                      />
                      <p className="mt-1 text-xs text-slate-300">Volume: {Math.round(audioSettings.sfxVolume * 100)}%</p>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}
      {showLeaveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-md rounded-3xl p-5">
            <h3 className="text-xl font-extrabold text-white">Leave room?</h3>
            <p className="mt-2 text-sm text-slate-300">
              If you leave now, the match will be paused and your opponent can decide to wait for you or leave too.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirmModal(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void leaveRoom()
                }}
                className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Confirm Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {shouldShowDisconnectPauseModal && room?.pausedByDisconnect?.playerId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-md rounded-3xl p-5">
            <h3 className="text-xl font-extrabold text-amber-100">Opponent disconnected</h3>
            <p className="mt-2 text-sm text-amber-100/90">
              {room.profiles[room.pausedByDisconnect.playerId]?.username ?? 'Your opponent'} left the match. The game is paused.
            </p>
            <p className="mt-1 text-sm text-amber-100/90">Do you want to keep waiting for them to rejoin, or leave too?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  void onKeepWaitingForOpponent()
                }}
                className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                Keep Waiting
              </button>
              <button
                type="button"
                onClick={() => {
                  void leaveRoom()
                }}
                className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Leave Too
              </button>
            </div>
          </div>
        </div>
      )}

      {showHotseatPassOverlay && room && hotseatPendingPlayerId && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xl">
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
            className="glass-panel-strong w-full max-w-xl rounded-3xl px-6 py-8 text-center"
          >
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-fuchsia-300">Same-phone turn</p>
            <h3 className="mt-2 text-2xl font-black text-white">
              {room.profiles[hotseatPendingPlayerId]?.avatar} {room.profiles[hotseatPendingPlayerId]?.username} plays now
            </h3>
            <p className="mt-2 text-sm text-slate-300">Pass the phone, then tap to reveal this player's view.</p>
            <p className="mt-5 rounded-xl bg-fuchsia-300/20 px-4 py-2 text-sm font-semibold text-fuchsia-100">Tap to continue</p>
          </button>
        </div>
      )}

      {rpsShowdown && (
        <div className="fixed inset-0 z-[995] flex items-center justify-center bg-slate-950/88 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-xl rounded-3xl px-6 py-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.34em] text-fuchsia-300">Rock Paper Scissors</p>
            <p className="mt-2 text-sm text-slate-300">{rpsShowdown.result === 'tie' ? 'Tie round. Play again.' : 'Winner gets first turn'}</p>

            <div className="relative mt-6 h-28 ">
              <div
                className={`rps-showdown-token rps-showdown-left ${
                  rpsShowdown.result === 'host' ? 'rps-showdown-left-win' : rpsShowdown.result === 'tie' ? 'rps-showdown-left-tie' : 'rps-showdown-left-lose'
                }`}
                aria-label={`${rpsShowdown.hostName} played ${rpsShowdown.hostChoice}`}
              >
                {RPS_SYMBOLS[rpsShowdown.hostChoice]}
              </div>
              <div
                className={`rps-showdown-token rps-showdown-right ${
                  rpsShowdown.result === 'guest' ? 'rps-showdown-right-win' : rpsShowdown.result === 'tie' ? 'rps-showdown-right-tie' : 'rps-showdown-right-lose'
                }`}
                aria-label={`${rpsShowdown.guestName} played ${rpsShowdown.guestChoice}`}
              >
                {RPS_SYMBOLS[rpsShowdown.guestChoice]}
              </div>
            </div>

            <p className="mt-3 text-sm font-semibold text-cyan-200">
              {rpsShowdown.result === 'host'
                ? `${rpsShowdown.hostName} wins the clash!`
                : rpsShowdown.result === 'guest'
                  ? `${rpsShowdown.guestName} wins the clash!`
                  : `${rpsShowdown.hostName} and ${rpsShowdown.guestName} tied!`}
            </p>
          </div>
        </div>
      )}

      {waitingRoomP2SetupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-md rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-xl font-extrabold text-white">Same-phone player setup</h3>
              <button
                type="button"
                onClick={() => setWaitingRoomP2SetupId(null)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <label className="block text-sm font-semibold text-slate-100">Player 2 name</label>
            <input
              value={waitingRoomP2Name}
              onChange={(event) => setWaitingRoomP2Name(event.target.value)}
              maxLength={24}
              placeholder="Enter Player 2 name"
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-slate-100 placeholder:text-slate-500"
            />

            <label className="mt-4 block text-sm font-semibold text-slate-100">Player 2 avatar</label>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {['😀', '😎', '🤖', '🧠', '🦊', '🐼', '🐯', '🐸', '🦄', '🐙', '🚀', '⚡'].map((icon) => (
                <button
                  type="button"
                  key={icon}
                  onClick={() => setWaitingRoomP2Avatar(icon)}
                  className={`rounded-lg border px-2 py-2 text-lg transition ${waitingRoomP2Avatar === icon ? 'border-fuchsia-300/50 bg-fuchsia-300/15' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                  {icon}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                void onConfirmWaitingRoomP2Setup()
              }}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110"
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
