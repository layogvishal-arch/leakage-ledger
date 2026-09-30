import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Panel({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}>
      {title ? (
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
          {action}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'recoverable' | 'leaked' | 'danger' | 'muted' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)]',
    recoverable: 'bg-[var(--color-recoverable-soft)] text-[var(--color-recoverable)] border-transparent',
    leaked: 'bg-[var(--color-leaked-soft)] text-[var(--color-leaked)] border-transparent',
    danger: 'bg-[color-mix(in_srgb,var(--color-danger)_18%,transparent)] text-[var(--color-danger)] border-transparent',
    muted: 'bg-transparent text-[var(--color-text-faint)] border-[var(--color-border)]',
  }
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        {eyebrow ? <div className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-faint)]">{eyebrow}</div> : null}
        <h1 className={`font-serif-num text-2xl text-[var(--color-text)] ${eyebrow ? 'mt-1' : ''}`}>{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function Button({ children, variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const variants: Record<string, string> = {
    primary: 'bg-[var(--color-recoverable)] text-[#06120d] hover:brightness-110',
    secondary: 'bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-text-faint)]',
    ghost: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
  }
  return (
    <button className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function SyntheticDataFooter() {
  return (
    <div className="mt-10 border-t border-[var(--color-border-soft)] py-5 text-center text-xs text-[var(--color-text-faint)]">
      Synthetic demo data
    </div>
  )
}
