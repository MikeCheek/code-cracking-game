import { useState, useRef, useEffect } from 'react'
import type { FlyingEmote } from './emoteConstants'
import { EMOTE_PATH_TEMPLATES } from './emoteConstants'

export function useEmoteSystem(roomId: string, onSendEmote: (emote: string) => void) {
  const [showEmotePicker, setShowEmotePicker] = useState(false)
  const [selectedQuickEmote, setSelectedQuickEmote] = useState('❤️')
  const [emotesEnabled, setEmotesEnabled] = useState(true)
  const [emoteScale, setEmoteScale] = useState(1)
  const [flyingEmotes, setFlyingEmotes] = useState<FlyingEmote[]>([])
  const latestQuickEmoteAtRef = useRef<Record<string, number>>({})

  useEffect(() => {
    latestQuickEmoteAtRef.current = {}
  }, [roomId])

  const sendQuickEmote = (emote: string) => {
    setSelectedQuickEmote(emote)
    onSendEmote(emote)
  }

  const createRandomFlight = (emoteId: string, value: string): FlyingEmote => {
    const isSmallViewport = typeof window !== 'undefined' ? window.innerWidth < 640 : true
    const baseLeftInset = isSmallViewport ? 16 : 24
    const baseBottomInset = isSmallViewport ? 80 : 96
    const anchorX = baseLeftInset + 28
    const anchorY = baseBottomInset + 28
    const maxX = Math.max(60, window.innerWidth - anchorX - 20)
    const maxUp = Math.max(100, window.innerHeight - anchorY - 20)

    const template = EMOTE_PATH_TEMPLATES[Math.floor(Math.random() * EMOTE_PATH_TEMPLATES.length)]
    const scale = 0.85 + Math.random() * 0.4
    const jitter = 20

    const clampX = (valueX: number) => Math.max(-anchorX + 8, Math.min(maxX, valueX))
    const clampY = (valueY: number) => Math.max(-maxUp, Math.min(-14, valueY))

    const toPoint = (index: number) => {
      const base = template.points[index]
      const x = clampX(base.x * scale + (Math.random() * 2 - 1) * jitter)
      const y = clampY(base.y * scale + (Math.random() * 2 - 1) * jitter)
      return { x, y }
    }

    const p1 = toPoint(0)
    const p2 = toPoint(1)
    const p3 = toPoint(2)
    const p4 = toPoint(3)

    const swing = Math.random() < 0.5 ? -1 : 1
    const durationMs = 2050 + Math.round(Math.random() * 850)

    return {
      id: emoteId,
      value,
      originX: 28,
      originY: 28,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      x3: p3.x,
      y3: p3.y,
      x4: p4.x,
      y4: p4.y,
      rotate1: swing * 12,
      rotate2: -swing * 8,
      rotate3: swing * 16,
      rotate4: -swing * 10,
      scale1: 0.9,
      scale2: 1.0,
      scale3: 1.1,
      scale4: 0.85,
      durationMs,
    }
  }

  const addFlyingEmote = (emote: string) => {
    const emoteId = `${Date.now()}-${Math.random()}`
    const flight = createRandomFlight(emoteId, emote)

    setFlyingEmotes((current) => [...current, flight])

    setTimeout(() => {
      setFlyingEmotes((current) => current.filter((e) => e.id !== emoteId))
    }, flight.durationMs)
  }

  return {
    showEmotePicker,
    setShowEmotePicker,
    selectedQuickEmote,
    setSelectedQuickEmote,
    emotesEnabled,
    setEmotesEnabled,
    emoteScale,
    setEmoteScale,
    flyingEmotes,
    sendQuickEmote,
    addFlyingEmote,
  }
}
