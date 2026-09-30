import { ENRICHMENT_VENDORS, DEPARTMENTS } from '../config/vendors.config'
import type { Filters } from '../lib/aggregates'

export function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const selectClass =
    'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-text-faint)]'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={selectClass} value={filters.vendor ?? ''} onChange={(e) => onChange({ ...filters, vendor: e.target.value || undefined })}>
        <option value="">All vendors</option>
        {ENRICHMENT_VENDORS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={filters.department ?? ''}
        onChange={(e) => onChange({ ...filters, department: e.target.value || undefined })}
      >
        <option value="">All departments</option>
        {DEPARTMENTS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <input
        type="date"
        className={selectClass}
        value={filters.from ?? ''}
        onChange={(e) => {
          const value = e.target.value || undefined
          // Picking a "from" with no "to" set yet defaults to that single day,
          // rather than silently becoming an open-ended "from X onward" range.
          onChange(value && !filters.to ? { ...filters, from: value, to: value } : { ...filters, from: value })
        }}
        aria-label="From date"
      />
      <span className="text-xs text-[var(--color-text-faint)]">to</span>
      <input
        type="date"
        className={selectClass}
        value={filters.to ?? ''}
        onChange={(e) => {
          const value = e.target.value || undefined
          onChange(value && !filters.from ? { ...filters, to: value, from: value } : { ...filters, to: value })
        }}
        aria-label="To date"
      />
      {(filters.vendor || filters.department || filters.from || filters.to) && (
        <button onClick={() => onChange({})} className="text-xs font-medium text-[var(--color-text-faint)] underline hover:text-[var(--color-text)]">
          Clear filters
        </button>
      )}
    </div>
  )
}
