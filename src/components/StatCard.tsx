import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  sublabel,
  tone = 'neutral',
  flashKey,
}: {
  label: string
  value: ReactNode
  sublabel?: ReactNode
  tone?: 'neutral' | 'recoverable' | 'leaked'
  flashKey?: string | number
}) {
  const toneClass =
    tone === 'recoverable' ? 'text-[var(--color-recoverable)]' : tone === 'leaked' ? 'text-[var(--color-leaked)]' : 'text-[var(--color-text)]'
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">{label}</div>
      <div key={flashKey} className={`font-serif-num mt-2 text-3xl ${toneClass} ${flashKey !== undefined ? 'flash-update rounded' : ''}`}>
        {value}
      </div>
      {sublabel ? <div className="mt-1.5 text-sm text-[var(--color-text-muted)]">{sublabel}</div> : null}
    </div>
  )
}
