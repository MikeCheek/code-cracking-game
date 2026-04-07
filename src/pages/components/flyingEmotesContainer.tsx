import type { FlyingEmote } from './emoteConstants'

interface FlyingEmotesContainerProps {
  emotes: FlyingEmote[]
  enabled: boolean
  scale: number
}

export function FlyingEmotesContainer({ emotes, enabled, scale }: FlyingEmotesContainerProps) {
  if (!enabled) return null

  return (
    <div className="pointer-events-none fixed bottom-20 left-4 z-[985] h-0 w-0 sm:bottom-24 sm:left-6">
      {emotes.map((entry) => (
        <span
          key={entry.id}
          className="quick-emote-fly"
          style={{
            ['--emote-origin-x' as string]: `${entry.originX}px`,
            ['--emote-origin-y' as string]: `${entry.originY}px`,
            ['--emote-x1' as string]: `${entry.x1}px`,
            ['--emote-y1' as string]: `${entry.y1}px`,
            ['--emote-x2' as string]: `${entry.x2}px`,
            ['--emote-y2' as string]: `${entry.y2}px`,
            ['--emote-x3' as string]: `${entry.x3}px`,
            ['--emote-y3' as string]: `${entry.y3}px`,
            ['--emote-x4' as string]: `${entry.x4}px`,
            ['--emote-y4' as string]: `${entry.y4}px`,
            ['--emote-rotate1' as string]: `${entry.rotate1}deg`,
            ['--emote-rotate2' as string]: `${entry.rotate2}deg`,
            ['--emote-rotate3' as string]: `${entry.rotate3}deg`,
            ['--emote-rotate4' as string]: `${entry.rotate4}deg`,
            ['--emote-scale1' as string]: `${entry.scale1}`,
            ['--emote-scale2' as string]: `${entry.scale2}`,
            ['--emote-scale3' as string]: `${entry.scale3}`,
            ['--emote-scale4' as string]: `${entry.scale4}`,
            ['--emote-duration' as string]: `${entry.durationMs}ms`,
            ['--emote-base-scale' as string]: `${scale}`,
          }}
        >
          {entry.value}
        </span>
      ))}
    </div>
  )
}
