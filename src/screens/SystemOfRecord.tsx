import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { PageHeader, Panel, Badge, SyntheticDataFooter } from '../components/ui'
import { fmtDate, fmtUsdCents } from '../lib/format'
import { vendorName } from '../config/vendors.config'
import type { EnrichmentRecord } from '../lib/schema'

const SCHEMA_FIELDS: Array<{ field: string; type: string; note?: string }> = [
  { field: 'record_id', type: 'string' },
  { field: 'vendor', type: 'enum' },
  { field: 'department', type: 'enum' },
  { field: 'waterfall_step', type: 'string', note: 'attempt chain that produced this record' },
  { field: 'credits', type: 'number' },
  { field: 'cost_usd', type: 'number' },
  { field: 'enrichment', type: 'enriched | not_found' },
  { field: 'validity', type: 'unvalidated | valid | invalid | bounced | unknown' },
  { field: 'person_match', type: 'presumed_right | right_person | wrong_person' },
  { field: 'created_at', type: 'date' },
  { field: 'validated_at', type: 'date | null' },
  { field: 'reply_analyzed_at', type: 'date | null' },
  { field: 'claim_eligible', type: 'boolean' },
  { field: 'claim_status', type: 'none | submitted | acknowledged | credited | rejected' },
]

function statusBadge(r: EnrichmentRecord, atStage: 'created' | 'validated' | 'reply') {
  if (atStage === 'created') return <Badge tone="muted">unvalidated · presumed_right</Badge>
  if (atStage === 'validated') {
    if (r.enrichment === 'not_found') return <Badge tone="leaked">not_found</Badge>
    return <Badge tone={r.validity === 'valid' ? 'recoverable' : 'leaked'}>{r.validity} · presumed_right</Badge>
  }
  return (
    <Badge tone={r.validity === 'valid' && r.person_match !== 'wrong_person' ? 'recoverable' : 'leaked'}>
      {r.validity} · {r.person_match}
    </Badge>
  )
}

export function SystemOfRecord() {
  const { records } = useData()

  const sample = useMemo(() => {
    const buckets = ['not_found', 'invalid', 'bounced', 'wrong_person', 'right_person', 'presumed_right', 'unvalidated_residual']
    const picks: EnrichmentRecord[] = []
    for (const b of buckets) {
      const found = records.find((r) => r.bucket === b)
      if (found) picks.push(found)
    }
    return picks
  }, [records])

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(sample[4]?.record_id ?? sample[0]?.record_id)

  const selected = useMemo(() => {
    if (search.trim()) {
      return records.find((r) => r.record_id.toLowerCase() === search.trim().toLowerCase()) ?? null
    }
    return records.find((r) => r.record_id === selectedId) ?? null
  }, [records, search, selectedId])

  return (
    <div>
      <PageHeader
        eyebrow="Screen 3"
        title="System of Record"
        description="Every field that makes up a record, and how one record's status resolves signal by signal."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.3fr]">
        <Panel title="Enrichment record schema">
          <div className="space-y-2">
            {SCHEMA_FIELDS.map((f) => (
              <div key={f.field} className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border-soft)] py-1.5 text-sm last:border-0">
                <code className="text-[var(--color-text)]">{f.field}</code>
                <span className="text-right text-xs text-[var(--color-text-faint)]">{f.type}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Status timeline"
          action={
            <div className="flex gap-2">
              <select
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-text)] outline-none"
                value={selectedId}
                onChange={(e) => {
                  setSearch('')
                  setSelectedId(e.target.value)
                }}
              >
                {sample.map((r) => (
                  <option key={r.record_id} value={r.record_id}>
                    {r.record_id} — {r.bucket.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <input
                className="w-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)]"
                placeholder="Search LL-000123"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          }
        >
          {!selected ? (
            <div className="text-sm text-[var(--color-text-faint)]">No record matches that ID.</div>
          ) : (
            <div key={selected.record_id} className="fade-slide-in">
              <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[var(--color-text-muted)]">
                <div>
                  <span className="text-[var(--color-text-faint)]">Record</span> <code className="text-[var(--color-text)]">{selected.record_id}</code>
                </div>
                <div>
                  <span className="text-[var(--color-text-faint)]">Vendor</span> {vendorName(selected.vendor)}
                </div>
                <div>
                  <span className="text-[var(--color-text-faint)]">Dept</span> {selected.department}
                </div>
                <div>
                  <span className="text-[var(--color-text-faint)]">Cost</span> {fmtUsdCents(selected.cost_usd + selected.validation_cost_usd)}
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="w-24 shrink-0 pt-0.5 text-xs text-[var(--color-text-faint)]">{fmtDate(selected.created_at)}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--color-text)]">Day 0 — enrichment attempted</div>
                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">{selected.waterfall_step}</div>
                    <div className="mt-2">{statusBadge(selected, 'created')}</div>
                  </div>
                </div>

                {selected.enrichment === 'not_found' ? (
                  <div className="flex gap-4">
                    <div className="w-24 shrink-0 pt-0.5 text-xs text-[var(--color-text-faint)]">{fmtDate(selected.created_at)}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--color-text)]">Final — no match found</div>
                      <div className="mt-1 text-xs text-[var(--color-text-muted)]">Credit charged, not claimable per vendor policy.</div>
                      <div className="mt-2">
                        <Badge tone="muted">not claimable</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-4">
                      <div className="w-24 shrink-0 pt-0.5 text-xs text-[var(--color-text-faint)]">
                        {selected.validated_at ? fmtDate(selected.validated_at) : 'pending'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[var(--color-text)]">
                          {selected.validated_at ? 'After ZeroBounce' : 'Awaiting validation'}
                        </div>
                        <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {selected.validated_at ? 'Deliverability signal resolved.' : 'No paid validation run yet on this record.'}
                        </div>
                        <div className="mt-2">{statusBadge(selected, 'validated')}</div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-24 shrink-0 pt-0.5 text-xs text-[var(--color-text-faint)]">
                        {selected.reply_analyzed_at ? fmtDate(selected.reply_analyzed_at) : 'no reply yet'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[var(--color-text)]">
                          {selected.reply_analyzed_at ? 'After LLM reply analysis' : 'Still presumed right'}
                        </div>
                        <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {selected.reply_analyzed_at
                            ? 'A reply confirmed (or overturned) the person match.'
                            : 'Until someone replies, we do not actually know — shown honestly, not counted as confirmed.'}
                        </div>
                        <div className="mt-2">{statusBadge(selected, 'reply')}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <SyntheticDataFooter />
    </div>
  )
}
