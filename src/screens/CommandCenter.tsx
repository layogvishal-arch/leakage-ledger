import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../state/DataContext'
import { applyFilters, byDepartment, byVendor, funnel, headline, type Filters } from '../lib/aggregates'
import { fmtCompact, fmtDate, fmtNumber, fmtUsd, fmtUsdCents } from '../lib/format'
import { PageHeader, Panel, SyntheticDataFooter } from '../components/ui'
import { StatCard } from '../components/StatCard'
import { FilterBar } from '../components/FilterBar'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-medium text-[var(--color-text)]">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <span className="font-serif-num">{fmtUsd(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function FunnelViz({ stages }: { stages: ReturnType<typeof funnel> }) {
  const max = stages[0]?.count || 1
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const pct = s.count / max
        const dropFromPrev = i > 0 ? stages[i - 1].count - s.count : 0
        return (
          <div key={s.key}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-[var(--color-text)]">{s.label}</span>
              <span className="font-serif-num text-[var(--color-text-muted)]">
                {i === 0 ? (
                  <>{fmtNumber(s.count)} attempted — billed once resolved</>
                ) : (
                  <>
                    {fmtNumber(s.count)} · {fmtUsd(s.dollars)}
                  </>
                )}
              </span>
            </div>
            <div className="h-8 w-full overflow-hidden rounded-md bg-[var(--color-surface-2)]">
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{
                  width: `${Math.max(pct * 100, 2)}%`,
                  background: i === stages.length - 1 ? 'var(--color-recoverable)' : 'color-mix(in srgb, var(--color-recoverable) ' + (40 + i * 15) + '%, var(--color-surface-2))',
                }}
              />
            </div>
            {i > 0 && dropFromPrev > 0 && (
              <div className="mt-1 text-xs text-[var(--color-leaked)]">
                {stages[i - 1].dollars - s.dollars > 0 ? (
                  <>
                    −{fmtNumber(dropFromPrev)} dropped here — {fmtUsd(stages[i - 1].dollars - s.dollars)} spent for nothing
                  </>
                ) : (
                  <span className="text-[var(--color-text-faint)]">
                    −{fmtNumber(dropFromPrev)} dropped here — not billed (no email or phone data returned)
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function BreakdownTable({ rows }: { rows: ReturnType<typeof byVendor> }) {
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border-soft)] text-left text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Records</th>
            <th className="py-2 pr-4 font-medium">Spend</th>
            <th className="py-2 pr-4 font-medium">Leaked</th>
            <th className="py-2 pr-4 font-medium">Recoverable</th>
            <th className="py-2 pr-4 font-medium">Contracted</th>
            <th className="py-2 pr-0 font-medium">Effective</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-[var(--color-border-soft)] last:border-0">
              <td className="py-2.5 pr-4 font-medium text-[var(--color-text)]">{r.label}</td>
              <td className="py-2.5 pr-4 font-serif-num text-[var(--color-text-muted)]">{fmtNumber(r.totalRecords)}</td>
              <td className="py-2.5 pr-4 font-serif-num">{fmtUsd(r.totalSpend)}</td>
              <td className="py-2.5 pr-4 font-serif-num text-[var(--color-leaked)]">{fmtUsd(r.leaked)}</td>
              <td className="py-2.5 pr-4 font-serif-num text-[var(--color-recoverable)]">{fmtUsd(r.recoverable)}</td>
              <td className="py-2.5 pr-4 font-serif-num text-[var(--color-text-faint)]">{fmtUsdCents(r.contractedPrice)}</td>
              <td
                className={`py-2.5 pr-0 font-serif-num ${r.effectiveCost > r.contractedPrice * 1.5 ? 'text-[var(--color-leaked)]' : 'text-[var(--color-text)]'}`}
              >
                {fmtUsdCents(r.effectiveCost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CommandCenter() {
  const { records, version } = useData()
  const [filters, setFilters] = useState<Filters>({})

  const filtered = useMemo(() => applyFilters(records, filters), [records, filters, version])
  const h = useMemo(() => headline(filtered), [filtered])
  const stages = useMemo(() => funnel(filtered), [filtered])
  const vendors = useMemo(() => byVendor(filtered), [filtered])
  const depts = useMemo(() => byDepartment(filtered), [filtered])
  const trendData = useMemo(() => {
    const map = new Map<string, { month: string; spend: number; leaked: number; recoverable: number }>()
    for (const r of filtered) {
      const k = r.created_at.slice(0, 7)
      if (!map.has(k)) map.set(k, { month: k, spend: 0, leaked: 0, recoverable: 0 })
      const entry = map.get(k)!
      const cost = r.cost_usd + r.validation_cost_usd
      entry.spend += cost
      const isGood = r.validity === 'valid' && (r.person_match === 'right_person' || r.person_match === 'presumed_right')
      if (!isGood) entry.leaked += cost
      if (r.claim_eligible) entry.recoverable += r.cost_usd
    }
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month))
  }, [filtered])

  return (
    <div>
      <PageHeader
        eyebrow="Screen 5 · Hero"
        title="Leakage Command Center"
        description="What Meridian is spending on enrichment, how much of it never turned into a usable contact, and how much is still recoverable — filtered live."
        action={<FilterBar filters={filters} onChange={setFilters} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total spend" value={fmtUsd(h.totalSpend)} sublabel={`${fmtNumber(h.totalRecords)} records`} flashKey={h.totalSpend} />
        <StatCard label="Leaked $" value={fmtUsd(h.leaked)} tone="leaked" sublabel="Spend with no verified contact" flashKey={h.leaked} />
        <StatCard
          label="Recoverable $"
          value={fmtUsd(h.recoverable)}
          tone="recoverable"
          sublabel="Claimable against vendor SLAs"
          flashKey={h.recoverable}
        />
        <StatCard
          label="Contracted vs effective"
          value={
            <span>
              {fmtUsdCents(h.contractedCost)} <span className="text-[var(--color-text-faint)]">→</span>{' '}
              <span className="text-[var(--color-leaked)]">{fmtUsdCents(h.effectiveCost)}</span>
            </span>
          }
          sublabel="Per verified, right-person contact"
          flashKey={h.effectiveCost}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel title="Funnel — credits attempted to verified contact">
          <FunnelViz stages={stages} />
        </Panel>
        <Panel title="Trend over time">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ left: -12, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-text-faint)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-text-faint)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="leakGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-leaked)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-leaked)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={(m) => fmtDate(`${m}-01`).replace(/,.*/, '')}
                stroke="var(--color-text-faint)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                tickFormatter={(v) => fmtCompact(v)}
                stroke="var(--color-text-faint)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="spend" name="Total spend" stroke="var(--color-text-faint)" fill="url(#spendGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="leaked" name="Leaked" stroke="var(--color-leaked)" fill="url(#leakGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="By vendor">
          <BreakdownTable rows={vendors} />
        </Panel>
        <Panel title="By department">
          <BreakdownTable rows={depts} />
        </Panel>
      </div>

      <SyntheticDataFooter />
    </div>
  )
}
