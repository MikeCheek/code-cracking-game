interface CodeDisplayProps {
  value: string
  maxLength: number
  label?: string
}

export function CodeDisplay({ value, maxLength, label }: CodeDisplayProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-slate-100">
        {(value || '').padEnd(maxLength, '•')}
      </div>
    </div>
  )
}
