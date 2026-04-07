import { QUICK_EMOTES } from './emoteConstants'

interface EmotePickerPanelProps {
  isOpen: boolean
  emotesEnabled: boolean
  emoteScale: number
  onToggleEmotes: () => void
  onScaleChange: (scale: number) => void
  onEmoteSelect: (emote: string) => void
}

export function EmotePickerPanel({
  isOpen,
  emotesEnabled,
  emoteScale,
  onToggleEmotes,
  onScaleChange,
  onEmoteSelect,
}: EmotePickerPanelProps) {
  if (!isOpen) return null

  return (
    <div className="glass-panel-strong w-[18.5rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 p-3 space-y-3">
      <div className="space-y-2">
        <button
          type="button"
          onClick={onToggleEmotes}
          className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition ${
            emotesEnabled
              ? 'bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
              : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30'
          }`}
        >
          {emotesEnabled ? '✓ Emotes On' : '✗ Emotes Off'}
        </button>

        <div className="px-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <label className="text-xs font-medium text-slate-300">Size</label>
            <span className="text-xs text-slate-400">{Math.round(emoteScale * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={emoteScale}
            onChange={(e) => onScaleChange(parseFloat(e.currentTarget.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      <div className="overflow-y-auto max-h-44">
        <div className="grid grid-cols-5 gap-2">
          {QUICK_EMOTES.map((emote) => (
            <button
              key={emote}
              type="button"
              onClick={() => onEmoteSelect(emote)}
              className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-xl leading-none transition hover:scale-105 hover:bg-white/10"
            >
              {emote}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
