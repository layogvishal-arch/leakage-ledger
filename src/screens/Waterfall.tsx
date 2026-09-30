import { useEffect, useState } from 'react'
import { PageHeader, Panel, Badge, Button, SyntheticDataFooter } from '../components/ui'
import { fmtUsdCents } from '../lib/format'

interface Step {
  id: string
  actor: string
  title: string
  detail: string
  cost: number
  result: 'fail' | 'success' | 'neutral'
}

const STEPS: Step[] = [
  { id: 'apollo', actor: 'Apollo', title: 'Attempt enrichment', detail: 'Queried on name + company domain.', cost: 0, result: 'neutral' },
  { id: 'apollo-result', actor: 'Apollo', title: 'Nothing found', detail: 'No matching contact in Apollo’s index. Not billed — a vendor that finds nothing doesn’t charge for the attempt.', cost: 0, result: 'fail' },
  { id: 'contactout', actor: 'ContactOut', title: 'Falls to ContactOut', detail: 'Waterfall retries the next vendor in the chain.', cost: 0, result: 'neutral' },
  { id: 'contactout-result', actor: 'ContactOut', title: 'Email returned', detail: 'j.alvarez@brightpath.io, presumed right person. Billed — this credit resolved.', cost: 0.1, result: 'success' },
  { id: 'zerobounce', actor: 'ZeroBounce', title: 'Validate the email', detail: 'Deliverability check against the returned address.', cost: 0.008, result: 'success' },
  { id: 'zerobounce-result', actor: 'ZeroBounce', title: 'Valid, deliverable', detail: 'Mailbox exists and accepts mail.', cost: 0, result: 'success' },
  { id: 'outreach', actor: 'Meridian Sales', title: 'Outreach sent', detail: 'Contact enters the outbound sequence.', cost: 0, result: 'neutral' },
]

export function Waterfall() {
  const [visible, setVisible] = useState(0)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    if (!running || visible >= STEPS.length) {
      if (visible >= STEPS.length) setRunning(false)
      return
    }
    const t = setTimeout(() => setVisible((v) => v + 1), 750)
    return () => clearTimeout(t)
  }, [visible, running])

  function replay() {
    setVisible(0)
    setRunning(true)
  }

  const shown = STEPS.slice(0, visible)
  const costSoFar = shown.reduce((s, step) => s + step.cost, 0)

  return (
    <div>
      <PageHeader
        title="Waterfall View"
        description="One contact, followed through every vendor it touched. Cost only accrues where a vendor actually bills — a miss is free, a resolved credit isn't."
        action={<Button variant="secondary" onClick={replay}>↻ Replay</Button>}
      />

      <Panel>
        <div className="mb-6 flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
          <span className="text-sm text-[var(--color-text-muted)]">Cost accrued so far</span>
          <span className="font-serif-num text-xl text-[var(--color-text)]">{fmtUsdCents(costSoFar)}</span>
        </div>

        <div className="space-y-0">
          {shown.map((step, i) => (
            <div key={step.id} className="fade-slide-in flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                    step.result === 'success'
                      ? 'border-[var(--color-recoverable)] text-[var(--color-recoverable)]'
                      : step.result === 'fail'
                        ? 'border-[var(--color-leaked)] text-[var(--color-leaked)]'
                        : 'border-[var(--color-text-faint)] text-[var(--color-text-faint)]'
                  }`}
                >
                  {i + 1}
                </div>
                {i < shown.length - 1 && <div className="my-1 w-px flex-1 bg-[var(--color-border)]" style={{ minHeight: 24 }} />}
              </div>
              <div className="flex-1 pb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text)]">{step.actor}</span>
                  <Badge tone={step.result === 'success' ? 'recoverable' : step.result === 'fail' ? 'leaked' : 'muted'}>{step.title}</Badge>
                  {step.cost > 0 && <span className="font-serif-num text-xs text-[var(--color-text-faint)]">+{fmtUsdCents(step.cost)}</span>}
                </div>
                <div className="mt-1 text-sm text-[var(--color-text-muted)]">{step.detail}</div>
              </div>
            </div>
          ))}
          {visible < STEPS.length && (
            <div className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center">
                <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-text-faint)]" />
              </div>
              <div className="pt-1.5 text-sm text-[var(--color-text-faint)]">Waiting on next signal…</div>
            </div>
          )}
        </div>

        {visible >= STEPS.length && (
          <div className="fade-slide-in mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
            Total for this contact: <span className="font-serif-num text-[var(--color-text)]">{fmtUsdCents(costSoFar)}</span> — the failed Apollo
            attempt cost nothing, ContactOut's successful one billed {fmtUsdCents(0.1)}, and ZeroBounce's check billed {fmtUsdCents(0.008)}.
          </div>
        )}
      </Panel>

      <SyntheticDataFooter />
    </div>
  )
}
