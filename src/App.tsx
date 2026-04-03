import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import toast, { Toaster, ToastBar } from 'react-hot-toast'
import { Navigate, Route, Routes, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { DEFAULT_CODE_LENGTH, DEFAULT_GAME_MODE, DEFAULT_WORD_LANGUAGE, MAX_WORD_CODE_LENGTH } from './constants'
import {
  answerGuess,
  chooseRps,
  createRoom,
  deleteRoom,
  joinRoom,
  joinRoomAsSpectator,
  joinOwnRoomAsGuest,
  keepWaitingForRejoin,
  leaveRoom as leaveRoomRealtime,
  lockSecret,
  finalizeRpsRound,
  sendQuickEmote,
  votePlayAgain,
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
import { ResultsPage } from './pages/ResultsPage'
import { WaitingRoomPage } from './pages/WaitingRoomPage'
import { WelcomePage } from './pages/WelcomePage'
import { generateRoomName } from './utils/roomName'
import { getRoomGameMode } from './utils/gameMode'
import { normalizeWordInput } from './lib/wordValidation'
import type { AudioSettings, GameMode, LobbyRoomSummary, RoomData, RpsChoice, UserProfile, WordLanguage } from './types'

const initialTelegramUser = typeof window !== 'undefined' ? getTelegramUserProfile() : null
const initialStoredUser = initialTelegramUser ?? loadUser()
const initialAudioSettings = loadAudioSettings()

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

  const [rooms, setRooms] = useState<LobbyRoomSummary[]>([])
  const [room, setRoom] = useState<RoomData | null>(null)

  const [codeLength, setCodeLength] = useState<number>(DEFAULT_CODE_LENGTH)
  const [allowDuplicates, setAllowDuplicates] = useState(false)
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>(DEFAULT_GAME_MODE)
  const [selectedWordLanguage, setSelectedWordLanguage] = useState<WordLanguage>(DEFAULT_WORD_LANGUAGE)
  const [isPrivate, setIsPrivate] = useState(false)
  const [allowLies, setAllowLies] = useState(true)
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

  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [showRulesPanel, setShowRulesPanel] = useState(false)
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
  const inRoomsRoute = location.pathname === '/rooms'
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

  const headerMeta = useMemo(() => {
    if (location.pathname === '/welcome') {
      return {
        title: 'Welcome',
      }
    }

    if (location.pathname === '/rooms') {
      return {
        title: 'Create Or Join Room',
      }
    }

    if (location.pathname.endsWith('/waiting')) {
      return {
        title: 'Waiting Room',
      }
    }

    if (location.pathname.endsWith('/results')) {
      return {
        title: 'Match Summary',
      }
    }

    if (location.pathname.endsWith('/watch')) {
      return {
        title: 'Spectator View',
      }
    }

    return {
      title: 'Live Match',
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
    if (getRoomGameMode(room) === 'words') {
      setGuessInput(normalizeWordInput(value, room.settings.codeLength))
      return
    }

    const digitsOnly = value.replace(/\D/g, '').slice(0, room.settings.codeLength)
    setGuessInput(digitsOnly)
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
    setIsCheckingWordSecret(false)
    setIsCheckingWordGuess(false)
    setClaimedBulls(0)
    setClaimedCows(0)
    setSelectedGameMode(DEFAULT_GAME_MODE)
    setSelectedWordLanguage(DEFAULT_WORD_LANGUAGE)
    setShowSettingsPanel(false)
    setShowRulesPanel(false)
    setShowUserMenu(false)
    setHotseatGuestProfile(null)
    setHotseatRevealedPlayerId(null)
    toast.success('Logged out.')
    navigate('/welcome')
  }

  return (
    <div className={`theme-${audioSettings.uiTheme} h-dvh overflow-hidden bg-orchid-pattern px-3 py-3 text-slate-100 app-noise sm:px-4 sm:py-4`}>
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

      <div className="mx-auto flex h-full max-w-6xl flex-col">
        <header className={`glass-panel-strong relative z-1 mb-3 rounded-3xl ${isWelcomeRoute ? 'p-4' : 'p-3 sm:p-4'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-base lg:text-xl font-semibold uppercase tracking-[0.2em] text-cyan-300">{headerMeta.title}</p>
              {/* <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Code Cracking Game</p> */}
            </div>

            {!isWelcomeRoute && user && (
              <div ref={userMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowUserMenu((open) => !open)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 shadow-sm transition hover:bg-white/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-300/10 text-base">{user.avatar}</span>
                  <span className="max-w-[120px] truncate">{user.username}</span>
                </button>

                {showUserMenu && (
                  <div className="glass-panel-strong absolute right-0 top-10 z-[888] w-44 rounded-xl p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false)
                        navigate('/welcome')
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                    >
                      Edit Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false)
                        navigate('/rooms')
                      }}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                    >
                      Games Page
                    </button>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-200 transition hover:bg-rose-400/15"
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

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
                  lobbyRooms={lobbyRooms}
                  codeLength={codeLength}
                  allowDuplicates={allowDuplicates}
                  isPrivate={isPrivate}
                  allowLies={allowLies}
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
                  onGameModeChange={setSelectedGameMode}
                  onWordLanguageChange={setSelectedWordLanguage}
                  onNewRoomNameChange={setNewRoomName}
                  onRegenerateRoomName={() => setNewRoomName(generateRoomName(user.username))}
                  onNewRoomPasswordChange={setNewRoomPassword}
                  onJoinPasswordChange={setJoinPassword}
                  onCreateRoom={onCreateRoom}
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

            <Route path="*" element={<Navigate to={user ? '/rooms' : '/welcome'} replace />} />
          </Routes>
        </main>
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
        onClick={() => setShowRulesPanel((open) => !open)}
        className="fixed bottom-16 right-4 z-40 rounded-full border border-white/20 bg-slate-900/85 px-4 py-2.5 text-sm font-bold text-slate-100 shadow-xl backdrop-blur transition hover:bg-slate-900 sm:bottom-[88px] sm:right-5"
      >
        Rules
      </button>

      <button
        type="button"
        onClick={() => setShowSettingsPanel((open) => !open)}
        className="fixed bottom-4 right-4 z-40 rounded-full border border-white/20 bg-slate-900/85 px-4 py-2.5 text-sm font-bold text-slate-100 shadow-xl backdrop-blur transition hover:bg-slate-900 sm:bottom-5 sm:right-5"
      >
        Settings
      </button>

      {showRulesPanel && (
        <section className="glass-panel-strong fixed bottom-28 right-3 z-50 w-[min(95vw,360px)] rounded-2xl p-4 sm:bottom-36 sm:right-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold text-white">Rules</h3>
            <button
              type="button"
              onClick={() => setShowRulesPanel(false)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Close
            </button>
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-200">
            <p>Guess the opponent code.</p>
            <p>Strikes: right digit in right position.</p>
            <p>Balls: right digit in wrong position.</p>
            <p>Too many lies lose the game.</p>
          </div>
        </section>
      )}

      {showSettingsPanel && (
        <section className="glass-panel-strong fixed bottom-16 right-3 z-50 w-[min(95vw,360px)] rounded-2xl p-4 sm:bottom-20 sm:right-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold text-white">Quick Settings</h3>
            <button
              type="button"
              onClick={() => setShowSettingsPanel(false)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Close
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Theme</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {UI_THEME_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setUiTheme(item.id)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
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

          <label className="mt-4 flex items-center justify-between text-sm font-semibold text-slate-100">
            <span>Music theme</span>
            <select
              value={audioSettings.musicTheme}
              onChange={(event) => {
                setMusicTheme(event.target.value === 'calm' ? 'calm' : 'arcade')
                void ensureAudioReady()
              }}
              className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            >
              <option value="arcade">Arcade</option>
              <option value="calm">Calm</option>
            </select>
          </label>

          <label className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100">
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
          <p className="mt-1 text-xs text-slate-300">Music volume: {Math.round(audioSettings.musicVolume * 100)}%</p>

          <label className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100">
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
          <p className="mt-1 text-xs text-slate-300">SFX volume: {Math.round(audioSettings.sfxVolume * 100)}%</p>
        </section>
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

            <div className="relative mt-6 h-28 overflow-hidden">
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
