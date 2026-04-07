const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const

interface DigitPadProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  onBackspace?: () => void
  onClear?: () => void
  showControls?: boolean
}

export function DigitPad({
  value,
  onChange,
  disabled = false,
  onBackspace,
  onClear,
  showControls = true,
}: DigitPadProps) {
  const handleDigitClick = (digit: string) => {
    if (!disabled && !value.includes(digit)) {
      onChange(value + digit)
    }
  }

  const handleBackspace = () => {
    if (!disabled && onBackspace) {
      onBackspace()
    }
  }

  const handleClear = () => {
    if (!disabled && onClear) {
      onClear()
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        {DIGIT_KEYS.map((digit) => (
          <button
            key={`digit-${digit}`}
            type="button"
            onClick={() => handleDigitClick(digit)}
            disabled={disabled || value.includes(digit)}
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {digit}
          </button>
        ))}
      </div>

      {showControls && (onBackspace || onClear) && (
        <div className="grid grid-cols-2 gap-2">
          {onBackspace && (
            <button
              type="button"
              onClick={handleBackspace}
              disabled={disabled || value.length === 0}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Backspace
            </button>
          )}
          {onClear && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled || value.length === 0}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
