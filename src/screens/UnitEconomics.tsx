import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../state/DataContext'
import { byVendor } from '../lib/aggregates'
import { fmtUsd, fmtUsdCents } from '../lib/format'
import { PageHeader, Panel, Badge, SyntheticDataFooter } from '../components/ui'

function EconTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-medium text-[var(--color-text)]">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2" style={{ color: p.fill }}>
          <span>{p.name}:</span>
          <span className="font-serif-num">{fmtUsdCents(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function UnitEconomics() {
  const { records } = useData()
  const vendors = useMemo(() => byVendor(records), [records])
  const [showInternalPrice, setShowInternalPrice] = useState(true)

  const chartData = vendors.map((v) => ({ name: v.label, Contracted: v.contractedPrice, Effective: v.effectiveCost }))

  return (
    <div>
      <PageHeader
        eyebrow="Screen 6"
        title="Unit Economics"
        description="What's on the invoice vs. what a usable contact actually costs, per vendor — plus what it's been quietly costing Meridian since day one."
      />

      <Panel title="Contracted vs. effective cost per verified contact">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ left: -12, right: 8, top: 8 }} barGap={6}>
            <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--color-text-faint)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} />
            <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<EconTooltip />} cursor={{ fill: 'var(--color-surface-2)' }} />
            <Bar dataKey="Contracted" radius={[4, 4, 0, 0]} fill="var(--color-text-faint)" maxBarSize={36} />
            <Bar dataKey="Effective" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="var(--color-leaked)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        title="Cumulative overspend since contract start"
        className="mt-4"
        action={
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--color-text-faint)]">
            <input type="checkbox" checked={showInternalPrice} onChange={(e) => setShowInternalPrice(e.target.checked)} />
            Show internal chargeback price
          </label>
        }
      >
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-soft)] text-left text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
                <th className="py-2 pr-4 font-medium">Vendor</th>
                <th className="py-2 pr-4 font-medium">Contracted</th>
                <th className="py-2 pr-4 font-medium">Effective</th>
                <th className="py-2 pr-4 font-medium">Verified contacts</th>
                <th className="py-2 pr-4 font-medium">Cumulative overspend</th>
                {showInternalPrice && <th className="py-2 pr-0 font-medium">Charge internal depts</th>}
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => {
                const overspend = v.totalSpend - v.contractedPrice * v.verifiedCount
                return (
                  <tr key={v.key} className="border-b border-[var(--color-border-soft)] last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-[var(--color-text)]">{v.label}</td>
                    <td className="py-2.5 pr-4 font-serif-num text-[var(--color-text-faint)]">{fmtUsdCents(v.contractedPrice)}</td>
                    <td className="py-2.5 pr-4 font-serif-num text-[var(--color-leaked)]">{fmtUsdCents(v.effectiveCost)}</td>
                    <td className="py-2.5 pr-4 font-serif-num text-[var(--color-text-muted)]">{v.verifiedCount.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 font-serif-num text-[var(--color-leaked)]">{fmtUsd(overspend)}</td>
                    {showInternalPrice && (
                      <td className="py-2.5 pr-0">
                        <Badge tone="leaked">{fmtUsdCents(v.effectiveCost)} / contact</Badge>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-[var(--color-text-muted)]">
          Example: a vendor contracted at $0.10/credit where only ~half of credits yield a usable contact has a true cost near $0.20 per usable
          contact. Charging internal departments the contract price hides that gap — Meridian absorbs it silently instead.
        </p>
      </Panel>

      <SyntheticDataFooter />
    </div>
  )
}
