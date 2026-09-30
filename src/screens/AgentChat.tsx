import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../state/DataContext'
import { QUESTIONS, type AgentAnswer } from '../lib/agentAnswers'
import { fmtUsd, fmtUsdCents } from '../lib/format'
import { PageHeader, Panel, SyntheticDataFooter } from '../components/ui'

interface Turn {
  id: number
  question: string
  answer: AgentAnswer
}

function MiniChart({ chart }: { chart: NonNullable<AgentAnswer['chart']> }) {
  const fmt: (n: number) => string =
    chart.valueFmt === 'usd' ? (n) => fmtUsd(n) : chart.valueFmt === 'usdCents' ? fmtUsdCents : (n) => n.toLocaleString()
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chart.data} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--color-text-faint)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} />
        <YAxis tickFormatter={(v: number) => fmt(v)} stroke="var(--color-text-faint)" fontSize={10} tickLine={false} axisLine={false} width={54} />
        <Tooltip
          formatter={(v: unknown) => fmt(typeof v === 'number' ? v : Number(v) || 0)}
          contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--color-text)' }}
          cursor={{ fill: 'var(--color-surface-2)' }}
        />
        <Bar dataKey="value" fill="var(--color-recoverable)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function AgentChat() {
  const { records } = useData()
  const [turns, setTurns] = useState<Turn[]>([])
  const [thinking, setThinking] = useState(false)

  const askedIds = useMemo(() => new Set(turns.map((t) => t.id)), [turns])

  function ask(q: (typeof QUESTIONS)[number]) {
    setThinking(true)
    setTimeout(() => {
      const answer = q.run(records)
      setTurns((t) => [...t, { id: t.length, question: q.prompt, answer }])
      setThinking(false)
    }, 500)
  }

  return (
    <div>
      <PageHeader
        title="Agent Chat"
        description="Ask a quantified question, get an answer computed live from the same 100k-record dataset every other screen reads from."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Panel title="Suggested prompts">
          <div className="space-y-2">
            {QUESTIONS.map((q, i) => (
              <button
                key={q.id}
                disabled={askedIds.has(i) && turns[turns.length - 1]?.question === q.prompt}
                onClick={() => ask(q)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-left text-sm text-[var(--color-text-muted)] transition hover:border-[var(--color-text-faint)] hover:text-[var(--color-text)]"
              >
                {q.prompt}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Conversation">
          <div className="scrollbar-thin max-h-[520px] space-y-5 overflow-y-auto pr-1">
            {turns.length === 0 && !thinking && (
              <div className="text-sm text-[var(--color-text-faint)]">Pick a prompt on the left to get started.</div>
            )}
            {turns.map((t) => (
              <div key={t.id} className="fade-slide-in">
                <div className="mb-2 inline-block rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text)]">{t.question}</div>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                  <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{t.answer.text}</p>
                  {t.answer.table && (
                    <table className="mt-3 w-full text-sm">
                      <tbody>
                        {t.answer.table.rows.map((row, ri) => (
                          <tr key={ri} className="border-b border-[var(--color-border-soft)] last:border-0">
                            <td className="py-1.5 pr-4 text-[var(--color-text-faint)]">{row[0]}</td>
                            <td className="py-1.5 font-serif-num text-[var(--color-text)]">{row[1]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {t.answer.chart && (
                    <div className="mt-3">
                      <MiniChart chart={t.answer.chart} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {thinking && <div className="text-sm text-[var(--color-text-faint)]">Computing from 100,000 records…</div>}
          </div>
        </Panel>
      </div>

      <SyntheticDataFooter />
    </div>
  )
}
