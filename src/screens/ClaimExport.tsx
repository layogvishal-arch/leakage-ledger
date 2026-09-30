import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { ENRICHMENT_VENDORS } from '../config/vendors.config'
import { AS_OF_DATE } from '../lib/seedData'
import { fmtDate, fmtUsd } from '../lib/format'
import { PageHeader, Panel, Button, SyntheticDataFooter } from '../components/ui'
import type { EnrichmentRecord } from '../lib/schema'

function monthOptions(): { key: string; label: string }[] {
  const opts: { key: string; label: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(AS_OF_DATE)
    d.setUTCMonth(d.getUTCMonth() - i)
    const key = d.toISOString().slice(0, 7)
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    opts.push({ key, label })
  }
  return opts
}

function evidenceLabel(r: EnrichmentRecord): string {
  if (r.bucket === 'invalid') return 'Invalid email (ZeroBounce)'
  if (r.bucket === 'bounced') return 'Hard bounce (ZeroBounce)'
  if (r.bucket === 'wrong_person') return 'Reply confirmed wrong person'
  return '—'
}

function toCsv(records: EnrichmentRecord[]): string {
  const headers = ['record_id', 'vendor', 'department', 'created_at', 'credits', 'cost_usd', 'final_status', 'evidence']
  const lines = [headers.join(',')]
  for (const r of records) {
    const finalStatus = r.enrichment === 'not_found' ? 'not_found' : `${r.validity}/${r.person_match}`
    const row = [r.record_id, r.vendor, r.department, r.created_at, r.credits, r.cost_usd.toFixed(2), finalStatus, evidenceLabel(r)]
    lines.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
  }
  return lines.join('\n')
}

const STATUS_ORDER: EnrichmentRecord['claim_status'][] = ['none', 'submitted', 'acknowledged', 'credited', 'rejected']
const STATUS_LABEL: Record<string, string> = { none: 'Not yet filed', submitted: 'Submitted', acknowledged: 'Acknowledged', credited: 'Credited', rejected: 'Rejected' }

export function ClaimExport() {
  const { records } = useData()
  const months = useMemo(() => monthOptions(), [])
  const [vendorId, setVendorId] = useState(ENRICHMENT_VENDORS[0].id)
  const [monthKey, setMonthKey] = useState(months[0].key)
  const [showEmail, setShowEmail] = useState(false)

  const vendor = ENRICHMENT_VENDORS.find((v) => v.id === vendorId)!

  const eligible = useMemo(
    () => records.filter((r) => r.vendor === vendorId && r.claim_eligible && r.created_at.slice(0, 7) === monthKey),
    [records, vendorId, monthKey],
  )

  const totalAmount = eligible.reduce((s, r) => s + r.cost_usd, 0)
  const soonestDeadlineDays = useMemo(() => {
    if (eligible.length === 0) return null
    let min = Infinity
    for (const r of eligible) {
      const deadline = new Date(`${r.created_at}T00:00:00Z`)
      deadline.setUTCDate(deadline.getUTCDate() + vendor.claimSlaDays)
      const days = Math.round((deadline.getTime() - AS_OF_DATE.getTime()) / (1000 * 60 * 60 * 24))
      if (days < min) min = days
    }
    return min
  }, [eligible, vendor.claimSlaDays])

  const tracker = useMemo(() => {
    const vendorEligible = records.filter((r) => r.vendor === vendorId && r.claim_eligible)
    return STATUS_ORDER.map((status) => ({
      status,
      count: vendorEligible.filter((r) => r.claim_status === status).length,
    }))
  }, [records, vendorId])

  function downloadCsv() {
    const csv = toCsv(eligible)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${vendorId}-${monthKey}-claim-evidence.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const emailBody = `Subject: Credit reconciliation request — ${monthKey}\n\nHi ${vendor.name} team,\n\nWhile reconciling our ${monthKey} usage, we found ${eligible.length.toLocaleString()} credits (${fmtUsd(totalAmount)}) that resolved to invalid, bounced, or wrong-person contacts under our agreed bad-signal definitions. Evidence for each record is attached (record ID, validation result, and reply confirmation where applicable).\n\nPer our ${vendor.claimSlaDays}-day claim SLA, could you confirm these for credit?\n\nThanks,\nMeridian RevOps`

  return (
    <div>
      <PageHeader
        eyebrow="Screen 8"
        title="Claim Export"
        description="Turn claim-eligible records into evidence a vendor can act on — export it, or draft the email for a human to send."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none"
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
        >
          {ENRICHMENT_VENDORS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none"
          value={monthKey}
          onChange={(e) => setMonthKey(e.target.value)}
        >
          {months.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">Claimable records</div>
          <div className="font-serif-num mt-2 text-2xl">{eligible.length.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">Total value</div>
          <div className="font-serif-num mt-2 text-2xl text-[var(--color-recoverable)]">{fmtUsd(totalAmount)}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">SLA countdown</div>
          <div className={`font-serif-num mt-2 text-2xl ${soonestDeadlineDays !== null && soonestDeadlineDays <= 10 ? 'text-[var(--color-leaked)]' : ''}`}>
            {soonestDeadlineDays === null ? '—' : soonestDeadlineDays < 0 ? 'Expired' : `${soonestDeadlineDays}d`}
          </div>
        </div>
      </div>

      <Panel
        title="Evidence preview"
        className="mt-4"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEmail((s) => !s)}>
              {showEmail ? 'Hide draft email' : 'Draft email'}
            </Button>
            <Button onClick={downloadCsv} disabled={eligible.length === 0}>
              Download CSV
            </Button>
          </div>
        }
      >
        {showEmail && (
          <div className="fade-slide-in mb-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              Draft — for human review, never auto-sent
            </div>
            <pre className="scrollbar-thin overflow-x-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--color-text)]">{emailBody}</pre>
          </div>
        )}

        <div className="scrollbar-thin max-h-96 overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="sticky top-0 border-b border-[var(--color-border-soft)] bg-[var(--color-surface)] text-left text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
                <th className="py-2 pr-4 font-medium">Record</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Credits</th>
                <th className="py-2 pr-4 font-medium">Final status</th>
                <th className="py-2 pr-0 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {eligible.slice(0, 200).map((r) => (
                <tr key={r.record_id} className="border-b border-[var(--color-border-soft)] last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs text-[var(--color-text)]">{r.record_id}</td>
                  <td className="py-2 pr-4 text-[var(--color-text-muted)]">{fmtDate(r.created_at)}</td>
                  <td className="py-2 pr-4 font-serif-num text-[var(--color-text-muted)]">{r.credits}</td>
                  <td className="py-2 pr-4 text-[var(--color-text)]">
                    {r.validity}/{r.person_match}
                  </td>
                  <td className="py-2 pr-0 text-[var(--color-text-muted)]">{evidenceLabel(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {eligible.length > 200 && (
            <div className="py-2 text-center text-xs text-[var(--color-text-faint)]">Showing first 200 of {eligible.length.toLocaleString()} — CSV export includes all.</div>
          )}
          {eligible.length === 0 && <div className="py-8 text-center text-sm text-[var(--color-text-faint)]">No claimable records for this vendor and period.</div>}
        </div>
      </Panel>

      <Panel title={`Claim tracker — all-time, ${vendor.name}`} className="mt-4">
        <div className="grid grid-cols-5 gap-3">
          {tracker.map((t) => (
            <div key={t.status} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-center">
              <div className="font-serif-num text-2xl text-[var(--color-text)]">{t.count.toLocaleString()}</div>
              <div className="mt-1 text-xs text-[var(--color-text-faint)]">{STATUS_LABEL[t.status]}</div>
            </div>
          ))}
        </div>
      </Panel>

      <SyntheticDataFooter />
    </div>
  )
}
