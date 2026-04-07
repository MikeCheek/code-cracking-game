export type FlyingEmote = {
  id: string
  value: string
  originX: number
  originY: number
  x1: number
  y1: number
  x2: number
  y2: number
  x3: number
  y3: number
  x4: number
  y4: number
  rotate1: number
  rotate2: number
  rotate3: number
  rotate4: number
  scale1: number
  scale2: number
  scale3: number
  scale4: number
  durationMs: number
}

export type EmotePathTemplate = {
  points: Array<{ x: number; y: number }>
}

export const QUICK_EMOTES = [
  '❤️', '😍', '🧐', '😈', '🕒', '🔥', '😂', '😤', '🤯', '🥶',
  '😎', '👏', '💀', '👀', '🤝', '🙃', '😅', '😭', '💥', '🫡',
] as const

export const EMOTE_PATH_TEMPLATES: EmotePathTemplate[] = [
  {
    points: [
      { x: 58, y: -72 },
      { x: 132, y: -166 },
      { x: 220, y: -254 },
      { x: 304, y: -338 },
    ],
  },
  {
    points: [
      { x: 44, y: -68 },
      { x: 170, y: -142 },
      { x: 132, y: -254 },
      { x: 268, y: -334 },
    ],
  },
  {
    points: [
      { x: 72, y: -56 },
      { x: 96, y: -198 },
      { x: 248, y: -212 },
      { x: 214, y: -352 },
    ],
  },
  {
    points: [
      { x: 50, y: -86 },
      { x: 186, y: -126 },
      { x: 208, y: -282 },
      { x: 326, y: -310 },
    ],
  },
]
