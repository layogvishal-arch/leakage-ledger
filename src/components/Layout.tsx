import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'How it works', icon: '◇' },
  { to: '/command-center', label: 'Command Center', icon: '◆' },
  { to: '/onboarding', label: 'Vendor Onboarding', icon: '①' },
  { to: '/waterfall', label: 'Waterfall View', icon: '②' },
  { to: '/system-of-record', label: 'System of Record', icon: '③' },
  { to: '/reply-analysis', label: 'LLM Reply Analysis', icon: '④' },
  { to: '/unit-economics', label: 'Unit Economics', icon: '⑥' },
  { to: '/agent-chat', label: 'Agent Chat', icon: '⑦' },
  { to: '/claim-export', label: 'Claim Export', icon: '⑧' },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[var(--color-border-soft)] bg-[var(--color-surface)]">
        <div className="px-5 py-6">
          <div className="font-serif-num text-lg tracking-tight">Leakage Ledger</div>
          <div className="mt-0.5 text-xs text-[var(--color-text-faint)]">Meridian · RevOps</div>
        </div>
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'
                }`
              }
            >
              <span className="w-4 text-center text-[var(--color-text-faint)]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[var(--color-border-soft)] px-5 py-4 text-xs text-[var(--color-text-faint)]">Synthetic demo data</div>
      </aside>
      <main className="scrollbar-thin h-screen flex-1 overflow-y-auto overflow-x-hidden px-10 py-8">
        <div key={typeof window !== 'undefined' ? window.location.pathname : 'x'} className="fade-slide-in mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}
