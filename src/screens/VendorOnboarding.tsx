import { useState } from 'react'
import { ALL_VENDORS } from '../config/vendors.config'
import { PageHeader, Panel, Badge, Button, SyntheticDataFooter } from '../components/ui'
import { fmtDate, fmtUsdCents } from '../lib/format'

const STEPS = ['Connect vendor', 'Set price per credit', 'Define "bad"', 'Set claim SLA']

const VENDOR_CATEGORIES = ['Enrichment', 'Validation', 'Firmographic', 'Intent data'] as const

const DEFAULT_BAD_SIGNALS = [
  { id: 'bounced', label: 'Bounced' },
  { id: 'invalid', label: 'Invalid' },
  { id: 'wrong_person', label: 'Wrong person' },
]

export function VendorOnboarding() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('Lusha')
  const [category, setCategory] = useState<(typeof VENDOR_CATEGORIES)[number]>('Enrichment')
  const [price, setPrice] = useState('0.12')
  const [signalOptions, setSignalOptions] = useState(DEFAULT_BAD_SIGNALS)
  const [badSignals, setBadSignals] = useState<Set<string>>(new Set(['bounced', 'invalid']))
  const [newSignal, setNewSignal] = useState('')
  const [sla, setSla] = useState('30')
  const [justOnboarded, setJustOnboarded] = useState(false)

  function toggleSignal(id: string) {
    setBadSignals((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addCustomSignal() {
    const label = newSignal.trim()
    if (!label) return
    const id = label.toLowerCase().replace(/\s+/g, '_')
    if (signalOptions.some((opt) => opt.id === id)) {
      setNewSignal('')
      return
    }
    setSignalOptions((prev) => [...prev, { id, label }])
    setBadSignals((prev) => new Set(prev).add(id))
    setNewSignal('')
  }

  function finish() {
    setJustOnboarded(true)
    setStep(0)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Screen 1"
        title="Vendor Onboarding"
        description="Adding a vendor is a repeatable configuration step — not a one-off integration. Every vendor below went through the same four-step flow."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Panel title="Add a vendor">
          <div className="mb-6 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    i <= step ? 'bg-[var(--color-recoverable)] text-[#06120d]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-faint)]'
                  }`}
                >
                  {i + 1}
                </div>
                {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? 'bg-[var(--color-recoverable)]' : 'bg-[var(--color-border)]'}`} />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-[var(--color-text)]">Connect the vendor</div>
              <p className="text-sm text-[var(--color-text-muted)]">Authenticate against the vendor's API to start pulling usage and credit data.</p>
              <input
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-faint)]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vendor name"
              />
              <div>
                <label className="mb-1 block text-xs text-[var(--color-text-faint)]">Category</label>
                <select
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-text-faint)]"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as (typeof VENDOR_CATEGORIES)[number])}
                >
                  {VENDOR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-recoverable)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-recoverable)]" /> API key verified
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-[var(--color-text)]">Set contracted price per credit</div>
              <p className="text-sm text-[var(--color-text-muted)]">This is the number on the invoice. It's rarely the number that matters.</p>
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-text-faint)]">$</span>
                <input
                  className="w-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-faint)]"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <span className="text-sm text-[var(--color-text-faint)]">per credit</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-[var(--color-text)]">Define what "bad" means for this vendor</div>
              <p className="text-sm text-[var(--color-text-muted)]">Toggle which signals should trigger a claim against this vendor.</p>
              <div className="flex flex-wrap gap-2">
                {signalOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => toggleSignal(opt.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      badSignals.has(opt.id)
                        ? 'border-transparent bg-[var(--color-leaked-soft)] text-[var(--color-leaked)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-faint)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-faint)]"
                  value={newSignal}
                  onChange={(e) => setNewSignal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomSignal()
                    }
                  }}
                  placeholder="Define another bad signal…"
                />
                <Button variant="secondary" onClick={addCustomSignal} disabled={!newSignal.trim()}>
                  Add signal
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-[var(--color-text)]">Set claim SLA window</div>
              <p className="text-sm text-[var(--color-text-muted)]">How many days after the credit is charged can a claim still be filed?</p>
              <div className="flex items-center gap-2">
                <input
                  className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-faint)]"
                  value={sla}
                  onChange={(e) => setSla(e.target.value)}
                />
                <span className="text-sm text-[var(--color-text-faint)]">days</span>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Continue</Button>
            ) : (
              <Button onClick={finish}>Finish onboarding</Button>
            )}
          </div>

          {justOnboarded && (
            <div className="fade-slide-in mt-4 rounded-lg border border-[var(--color-recoverable)]/30 bg-[var(--color-recoverable-soft)] px-4 py-3 text-sm text-[var(--color-recoverable)]">
              {name} ({category}) onboarded at {fmtUsdCents(Number(price) || 0)}/credit, {sla}-day claim SLA, {badSignals.size} bad signal
              {badSignals.size === 1 ? '' : 's'} defined. It now behaves exactly like the vendors on the right.
            </div>
          )}
        </Panel>

        <Panel title="Onboarded vendors">
          <div className="space-y-3">
            {ALL_VENDORS.map((v) => (
              <div key={v.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-[var(--color-text)]">{v.name}</div>
                  <Badge tone="recoverable">Onboarded</Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-xs text-[var(--color-text-muted)]">
                  <div>
                    Type: <span className="text-[var(--color-text)]">{v.type === 'enrichment' ? 'Enrichment' : 'Validation'}</span>
                  </div>
                  <div>
                    Price: <span className="font-serif-num text-[var(--color-text)]">{fmtUsdCents(v.contractedPrice)}</span>/credit
                  </div>
                  <div>
                    Claim SLA: <span className="text-[var(--color-text)]">{v.claimSlaDays} days</span>
                  </div>
                  <div>
                    Connected: <span className="text-[var(--color-text)]">{fmtDate(v.connectedAt)}</span>
                  </div>
                </div>
                {'badSignals' in v && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {v.badSignals.map((s) => (
                      <Badge key={s} tone="leaked">
                        {s.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <SyntheticDataFooter />
    </div>
  )
}
