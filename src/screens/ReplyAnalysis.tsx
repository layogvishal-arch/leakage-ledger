import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { headline } from '../lib/aggregates'
import { fmtUsd } from '../lib/format'
import { PageHeader, Panel, Badge, Button, SyntheticDataFooter } from '../components/ui'

interface Scenario {
  id: string
  label: string
  from: string
  reply: string
  verdict: {
    personMatch: 'right_person' | 'wrong_person' | 'ambiguous'
    rule: string
    reason: string
  }
}

// Three-way classification, deliberately not a confidence score: a reply
// either explicitly confirms the person, explicitly denies it, or does
// neither — in which case it's ambiguous and nothing gets written back.
const SCENARIOS: Scenario[] = [
  {
    id: 'right',
    label: 'Right person',
    from: 'J. Alvarez',
    reply: '"Yep, this is me — happy to grab 15 minutes Thursday if that works."',
    verdict: { personMatch: 'right_person', rule: 'Explicitly confirms identity', reason: 'Reply confirms this is the right person and engages with the ask.' },
  },
  {
    id: 'wrong',
    label: 'Wrong person',
    from: 'M. Torres',
    reply: '"Wrong person — whoever you\'re after left the company last year. This inbox got reassigned to me after that, so I\'m the one seeing it now."',
    verdict: {
      personMatch: 'wrong_person',
      rule: 'Explicitly denies identity',
      reason: "The reply is from the inbox's current owner, not the original target — the departed employee's address was reassigned rather than deactivated, which is exactly why the message was delivered at all.",
    },
  },
  {
    id: 'ambiguous',
    label: 'Ambiguous',
    from: 'Auto-reply (R. Kim)',
    reply: '"I am currently out of the office with limited access to email and will respond to your message when I return on Monday."',
    verdict: {
      personMatch: 'ambiguous',
      rule: "Doesn't address identity either way",
      reason: "System-generated out-of-office notice — not a decision by the person at all, so it carries no identity signal either way. A reply that sounds like a deliberate human answer but never confirms or denies identity would land here too; this one just makes the \"no signal\" case unambiguous.",
    },
  },
]

export function ReplyAnalysis() {
  const { records, writeBackPersonMatch } = useData()
  const [applied, setApplied] = useState<Record<string, boolean>>({})
  const [active, setActive] = useState('right')

  const boundRecords = useMemo(() => {
    const pool = records.filter((r) => r.bucket === 'presumed_right')
    return {
      right: pool[10],
      wrong: pool[20],
      ambiguous: pool[30],
    }
  }, [records])

  const h = useMemo(() => headline(records), [records, applied])
  const scenario = SCENARIOS.find((s) => s.id === active)!
  const record = boundRecords[active as keyof typeof boundRecords]

  function apply() {
    if (!record) return
    if (scenario.verdict.personMatch === 'right_person' || scenario.verdict.personMatch === 'wrong_person') {
      writeBackPersonMatch(record.record_id, scenario.verdict.personMatch)
      setApplied((a) => ({ ...a, [scenario.id]: true }))
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Screen 4"
        title="LLM Reply Analysis"
        description="A reply comes in. The model reads it, decides whether the person is confirmed, and only the label — not the message — ever leaves this screen."
      />

      <div className="mb-4 flex gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
              active === s.id
                ? 'border-transparent bg-[var(--color-surface-2)] text-[var(--color-text)]'
                : 'border-[var(--color-border)] text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]'
            }`}
          >
            {s.label}
            {applied[s.id] && <span className="ml-1.5 text-[var(--color-recoverable)]">✓</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Inbound reply">
          <div className="text-xs text-[var(--color-text-faint)]">From</div>
          <div className="mt-0.5 text-sm text-[var(--color-text)]">{scenario.from}</div>
          <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm leading-relaxed text-[var(--color-text)]">
            {scenario.reply}
          </div>
          <div className="mt-4 text-xs italic text-[var(--color-text-faint)]">
            Only the label leaves this message — the reply content stays internal to Meridian.
          </div>
        </Panel>

        <Panel title="Structured verdict">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-faint)]">person_match</span>
              <Badge tone={scenario.verdict.personMatch === 'right_person' ? 'recoverable' : scenario.verdict.personMatch === 'wrong_person' ? 'leaked' : 'muted'}>
                {scenario.verdict.personMatch}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-faint)]">rule applied</span>
              <span className="text-right text-[var(--color-text)]">{scenario.verdict.rule}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-faint)]">reason</span>
              <p className="mt-1 text-[var(--color-text-muted)]">{scenario.verdict.reason}</p>
            </div>
          </div>

          {record && (
            <div className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-xs text-[var(--color-text-faint)]">
              Target record <code className="text-[var(--color-text)]">{record.record_id}</code> — currently{' '}
              <span className="text-[var(--color-text)]">{record.person_match}</span>
            </div>
          )}

          <div className="mt-4">
            {scenario.verdict.personMatch === 'ambiguous' ? (
              <Button variant="secondary" disabled>
                Flagged for human review — no auto write-back
              </Button>
            ) : (
              <Button onClick={apply} disabled={applied[scenario.id]}>
                {applied[scenario.id] ? 'Written back ✓' : 'Write back to record'}
              </Button>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Leakage totals — live" className="mt-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">Leaked $</div>
            <div key={h.leaked} className="flash-update font-serif-num mt-1 rounded text-xl text-[var(--color-leaked)]">
              {fmtUsd(h.leaked)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">Recoverable $</div>
            <div key={h.recoverable} className="flash-update font-serif-num mt-1 rounded text-xl text-[var(--color-recoverable)]">
              {fmtUsd(h.recoverable)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">Verified contacts</div>
            <div key={h.verifiedCount} className="flash-update font-serif-num mt-1 rounded text-xl text-[var(--color-text)]">
              {h.verifiedCount.toLocaleString()}
            </div>
          </div>
        </div>
      </Panel>

      <SyntheticDataFooter />
    </div>
  )
}
