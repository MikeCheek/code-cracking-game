import { useEffect, useMemo, useRef, useState } from 'react'
import { AVATARS } from '../constants'
import { generateRandomUsername } from '../utils/profile'
import type { UserProfile } from '../types'

type WelcomePageProps = {
  user: UserProfile | null
  username: string
  avatar: string
  isFirstVisit: boolean
  onUsernameChange: (value: string) => void
  onAvatarChange: (value: string) => void
  onSetAudioEnabled: (enabled: boolean) => void
  onAudioConsentDone: () => void
  onEnterLobby: () => void
  onUseSavedProfile: () => void
}

export function WelcomePage({
  user,
  username,
  avatar,
  isFirstVisit,
  onUsernameChange,
  onAvatarChange,
  onSetAudioEnabled,
  onAudioConsentDone,
  onEnterLobby,
  onUseSavedProfile,
}: WelcomePageProps) {
  const [consentShown, setConsentShown] = useState(!isFirstVisit)
  const [editingProfile, setEditingProfile] = useState(!user)
  const [isTouchPrimary, setIsTouchPrimary] = useState(true)
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const circleDragPointerIdRef = useRef<number | null>(null)
  const circleDragStartXRef = useRef(0)
  const circleDragStartScrollLeftRef = useRef(0)
  const isCircleDraggingRef = useRef(false)
  const selectingFromScrollRef = useRef(false)

  const displayName = useMemo(() => {
    if (editingProfile) return username || 'Choose your name'
    return user?.username || username || 'Choose your name'
  }, [editingProfile, user, username])

  const selectedAvatarIndex = useMemo(() => {
    const index = AVATARS.indexOf(avatar)
    return index >= 0 ? index : 0
  }, [avatar])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(pointer: coarse)')
    const apply = () => setIsTouchPrimary(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const container = carouselRef.current
    if (!container || !editingProfile) return

    if (selectingFromScrollRef.current) {
      selectingFromScrollRef.current = false
      return
    }

    const selected = container.querySelector<HTMLButtonElement>(`[data-avatar-index="${selectedAvatarIndex}"]`)
    if (!selected) return

    const containerCenter = container.clientWidth / 2
    const selectedCenter = selected.offsetLeft + selected.offsetWidth / 2
    const left = Math.max(0, selectedCenter - containerCenter)
    container.scrollTo({ left, behavior: 'smooth' })
  }, [editingProfile, selectedAvatarIndex])

  const pickAvatarFromScrollPosition = () => {
    const container = carouselRef.current
    if (!container || !editingProfile) return

    const centerX = container.scrollLeft + container.clientWidth / 2
    const items = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-avatar-index]'))
    if (items.length === 0) return

    let closestIndex = selectedAvatarIndex
    let closestDistance = Number.POSITIVE_INFINITY

    for (const item of items) {
      const itemCenter = item.offsetLeft + item.offsetWidth / 2
      const distance = Math.abs(itemCenter - centerX)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = Number(item.dataset.avatarIndex ?? selectedAvatarIndex)
      }
    }

    if (Number.isFinite(closestIndex) && closestIndex !== selectedAvatarIndex) {
      selectingFromScrollRef.current = true
      onAvatarChange(AVATARS[closestIndex])
    }
  }

  const onCarouselScroll = () => {
    pickAvatarFromScrollPosition()
  }

  const scrollByOne = (direction: -1 | 1) => {
    const container = carouselRef.current
    if (!container) return
    const firstItem = container.querySelector<HTMLButtonElement>('[data-avatar-index]')
    const step = (firstItem?.offsetWidth ?? 48) * 0.7
    container.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  const onCirclePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editingProfile) return
    const container = carouselRef.current
    if (!container) return
    circleDragPointerIdRef.current = event.pointerId
    circleDragStartXRef.current = event.clientX
    circleDragStartScrollLeftRef.current = container.scrollLeft
    isCircleDraggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onCirclePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editingProfile || !isCircleDraggingRef.current) return
    if (circleDragPointerIdRef.current !== event.pointerId) return
    const container = carouselRef.current
    if (!container) return
    const deltaX = event.clientX - circleDragStartXRef.current
    container.scrollLeft = circleDragStartScrollLeftRef.current - deltaX
  }

  const onCirclePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (circleDragPointerIdRef.current !== event.pointerId) return
    isCircleDraggingRef.current = false
    circleDragPointerIdRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    pickAvatarFromScrollPosition()
  }

  const getAvatarItemClassName = (index: number) => {
    const directDistance = Math.abs(index - selectedAvatarIndex)
    const circularDistance = Math.min(directDistance, AVATARS.length - directDistance)

    if (circularDistance === 0) {
      return 'scale-[2.6] opacity-100 z-10'
    }
    if (circularDistance === 1) {
      return 'scale-[1.45] opacity-86 hover:opacity-95 z-[7]'
    }
    if (circularDistance === 2) {
      return 'scale-100 opacity-68 hover:opacity-80 z-[5]'
    }
    return 'scale-90 opacity-32 hover:opacity-52 z-[3]'
  }

  const getAvatarItemSpacingClassName = (index: number) => {
    const directDistance = Math.abs(index - selectedAvatarIndex)
    const circularDistance = Math.min(directDistance, AVATARS.length - directDistance)

    if (circularDistance === 0) {
      return 'mx-6 sm:mx-8'
    }
    if (circularDistance === 1) {
      return 'mx-2.5 sm:mx-3.5'
    }
    if (circularDistance === 2) {
      return 'mx-1.5 sm:mx-2'
    }
    return 'mx-0.5'
  }

  return (
    <>
      {isFirstVisit && !consentShown && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-md rounded-[1.75rem] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.34em] text-fuchsia-300">Audio Prompt</p>
            <h3 className="mt-2 text-3xl font-bold text-white">Turn the sound on?</h3>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  onSetAudioEnabled(false)
                  setConsentShown(true)
                  onAudioConsentDone()
                }}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Keep Muted
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetAudioEnabled(true)
                  setConsentShown(true)
                  onAudioConsentDone()
                }}
                className="flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-300 to-violet-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                Enable Audio
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto grid h-full w-full max-w-3xl grid-rows-[auto_1fr_auto] gap-4 overflow-hidden">
        <p className="text-center text-2xl font-black tracking-tight text-white sm:text-4xl">Code Cracking Game</p>

        <article className="glass-panel-strong flex flex-col items-center justify-center rounded-3xl p-4 sm:p-6">
          <div className="relative flex h-56 w-full max-w-xl items-center justify-center sm:h-64">
            {editingProfile && (
              <>
                {!isTouchPrimary && (
                  <button
                    type="button"
                    onClick={() => scrollByOne(-1)}
                    className="absolute left-0 z-30 h-10 w-10 rounded-full border border-white/20 bg-slate-900/70 text-lg font-bold text-white transition hover:bg-slate-800"
                    aria-label="Previous emote"
                  >
                    {'<'}
                  </button>
                )}

                <div className="pointer-events-none absolute z-0 h-44 w-44 rounded-full border border-fuchsia-200/20 bg-slate-900/70 shadow-[0_0_30px_rgba(255,116,216,0.2)] sm:h-52 sm:w-52" />

                <div
                  ref={carouselRef}
                  onScroll={onCarouselScroll}
                  onPointerUp={onCirclePointerEnd}
                  onPointerDown={onCirclePointerDown}
                  onPointerMove={onCirclePointerMove}
                  onPointerCancel={onCirclePointerEnd}
                  className="relative z-20 w-[15.5rem] max-w-[92vw] touch-pan-x cursor-grab snap-x snap-mandatory overflow-x-auto overflow-y-visible py-8 scroll-smooth active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none]"
                  style={{ paddingInline: 'calc(50% - 1.25rem)' }}
                >
                  <div className="flex w-max items-center gap-0">
                    {AVATARS.map((item, index) => (
                      <button
                        type="button"
                        key={`${item}-${index}`}
                        data-avatar-index={index}
                        onClick={() => onAvatarChange(item)}
                        className={`relative h-10 w-10 shrink-0 snap-center rounded-2xl bg-transparent text-2xl transition duration-200 ease-out sm:h-12 sm:w-12 sm:text-3xl ${getAvatarItemClassName(index)} ${getAvatarItemSpacingClassName(index)}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {!isTouchPrimary && (
                  <button
                    type="button"
                    onClick={() => scrollByOne(1)}
                    className="absolute right-0 z-30 h-10 w-10 rounded-full border border-white/20 bg-slate-900/70 text-lg font-bold text-white transition hover:bg-slate-800"
                    aria-label="Next emote"
                  >
                    {'>'}
                  </button>
                )}
              </>
            )}

            {!editingProfile && (
              <div className="relative z-10 flex h-44 w-44 select-none items-center justify-center rounded-full border border-white/15 bg-slate-900/75 text-7xl shadow-2xl sm:h-52 sm:w-52 sm:text-8xl">
                {user?.avatar ?? avatar}
              </div>
            )}

          </div>
          <p className="mt-4 text-lg font-bold text-white">{displayName}</p>

          {!editingProfile && user ? (
            <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Modify
              </button>
              <button
                type="button"
                onClick={onUseSavedProfile}
                className="rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110"
              >
                Start game
              </button>
            </div>
          ) : (
            <div className="mt-4 w-full max-w-xl space-y-3">
              <div className="flex gap-2">
                <input
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  placeholder="Write your name"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-fuchsia-300/60"
                />
                <button
                  type="button"
                  onClick={() => onUsernameChange(generateRandomUsername())}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-fuchsia-200 transition hover:bg-white/10"
                >
                  Random
                </button>
              </div>

              <p className="text-center text-xs text-slate-400">Swipe the emote rail or use arrows on desktop. Centered emote becomes active.</p>

              <button
                type="button"
                onClick={onEnterLobby}
                className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-4 py-3 text-base font-bold text-slate-950 transition hover:brightness-110"
              >
                Start game
              </button>
            </div>
          )}
        </article>
      </section>
    </>
  )
}
