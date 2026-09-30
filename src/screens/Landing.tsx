import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { headline } from '../lib/aggregates'
import { fmtUsd, fmtUsdCents } from '../lib/format'
import { Button, SyntheticDataFooter } from '../components/ui'

const STEPS = [
  {
    n: '01',
    title: 'Capture',
    body: 'Every enrichment credit, validation check, and reply lands in one record — vendor, department, cost, and outcome, all tied together.',
  },
  {
    n: '02',
    title: 'Detect',
    body: 'Three independent signals — enrichment, validity, person match — resolve into a final state. Only the final state counts toward loss.',
  },
  {
    n: '03',
    title: 'Reconcile',
    body: 'Contracted price per credit vs. effective cost per verified contact. The gap between them is money already spent for nothing.',
  },
  {
    n: '04',
    title: 'Act',
    body: 'Bad contacts become claims with evidence attached, an SLA countdown, and a tracker — from "flagged" to "credited."',
  },
]

export function Landing() {
  const { records } = useData()
  const h = headline(records)
  const navigate = useNavigate()

  return (
    <div>
      <div className="pt-6 pb-10">
        <div className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-faint)]">Meridian · Leakage Ledger</div>
        <h1 className="font-serif-num mt-3 max-w-3xl text-4xl leading-tight text-[var(--color-text)]">
          Contracted cost per credit is not effective cost per verified contact.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-text-muted)]">
          Meridian pays enrichment vendors <span className="font-serif-num text-[var(--color-text)]">{fmtUsdCents(h.contractedCost)}</span> per
          credit. But once you follow a credit through validation and reply confirmation, the real cost per verified, right-person contact lands
          near <span className="font-serif-num text-[var(--color-text)]">{fmtUsdCents(h.effectiveCost)}</span> — and Meridian has been paying
          double while charging nothing for it.
        </p>
        <div className="mt-7 flex gap-3">
          <Button onClick={() => navigate('/command-center')}>Open Command Center</Button>
          <Button variant="secondary" onClick={() => navigate('/onboarding')}>
            See how a vendor is onboarded
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <div key={step.n} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="font-serif-num text-sm text-[var(--color-text-faint)]">{step.n}</div>
            <div className="mt-2 text-base font-semibold text-[var(--color-text)]">{step.title}</div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">Total spend, last 6 months</div>
          <div className="font-serif-num mt-2 text-2xl">{fmtUsd(h.totalSpend)}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">Leaked</div>
          <div className="font-serif-num mt-2 text-2xl text-[var(--color-leaked)]">{fmtUsd(h.leaked)}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-faint)]">Recoverable now</div>
          <div className="font-serif-num mt-2 text-2xl text-[var(--color-recoverable)]">{fmtUsd(h.recoverable)}</div>
        </div>
      </div>

      <SyntheticDataFooter />
    </div>
  )
}
