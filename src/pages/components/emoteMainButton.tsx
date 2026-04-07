import { useEffect, useRef } from 'react'

interface EmoteMainButtonProps {
  selectedEmote: string
  isOpen: boolean
  onToggleMenu: () => void
  onSendEmote: () => void
}

export function EmoteMainButton({
  selectedEmote,
  isOpen,
  onToggleMenu,
  onSendEmote,
}: EmoteMainButtonProps) {
  const holdTimeoutRef = useRef<number | null>(null)
  const holdIntervalRef = useRef<number | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const longPressActiveRef = useRef(false)

  const stopHold = () => {
    if (holdTimeoutRef.current !== null) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    if (holdIntervalRef.current !== null) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
    pointerIdRef.current = null
    longPressActiveRef.current = false
  }

  useEffect(() => stopHold, [])

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return

    stopHold()
    pointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)

    holdTimeoutRef.current = window.setTimeout(() => {
      longPressActiveRef.current = true
      onSendEmote()
      holdIntervalRef.current = window.setInterval(() => {
        onSendEmote()
      }, 180)
    }, 280)
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const wasLongPress = longPressActiveRef.current
    stopHold()
    if (!wasLongPress) {
      onToggleMenu()
    }
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      className="flex h-14 w-14 items-center select-none justify-center rounded-full border border-cyan-200/35 bg-gradient-to-br from-cyan-300 via-sky-300 to-fuchsia-300 text-2xl shadow-[0_14px_34px_rgba(34,211,238,0.38)] transition hover:scale-105"
      aria-label="Toggle quick emotes"
      aria-expanded={isOpen}
    >
      {selectedEmote}
    </button>
  )
}
