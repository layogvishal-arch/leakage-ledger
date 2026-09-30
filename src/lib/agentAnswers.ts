import { ENRICHMENT_VENDORS, DEPARTMENTS, vendorName } from '../config/vendors.config'
import { byDepartment, byVendor, sumCost } from './aggregates'
import { AS_OF_DATE } from './seedData'
import type { EnrichmentRecord } from './schema'
import { fmtUsd, fmtUsdCents } from './format'

export interface AgentAnswer {
  text: string
  table?: { headers: string[]; rows: (string | number)[][] }
  chart?: { data: Array<{ label: string; value: number }>; valueFmt: 'usd' | 'usdCents' | 'number' }
}

function daysUntil(dateIso: string): number {
  const t = new Date(`${dateIso}T00:00:00Z`).getTime()
  return Math.round((t - AS_OF_DATE.getTime()) / (1000 * 60 * 60 * 24))
}

export function answerRecruitingOverspendContactOut(records: EnrichmentRecord[]): AgentAnswer {
  const subset = records.filter((r) => r.department === 'Recruiting' && r.vendor === 'contactout')
  const spend = sumCost(subset)
  const good = subset.filter((r) => r.validity === 'valid' && r.person_match !== 'wrong_person')
  const contracted = ENRICHMENT_VENDORS.find((v) => v.id === 'contactout')!.contractedPrice
  const overspend = spend - contracted * good.length
  return {
    text: `Recruiting spent ${fmtUsd(spend)} with ContactOut across ${subset.length.toLocaleString()} credits. Only ${good.length.toLocaleString()} turned into a verified contact, so at the $${contracted.toFixed(2)} contract price Recruiting overspent by ${fmtUsd(overspend)} on ContactOut alone.`,
    table: {
      headers: ['Metric', 'Value'],
      rows: [
        ['Credits used', subset.length.toLocaleString()],
        ['Total spend', fmtUsd(spend)],
        ['Verified contacts', good.length.toLocaleString()],
        ['Overspend vs. contract', fmtUsd(overspend)],
      ],
    },
  }
}

export function answerWorstVendor(records: EnrichmentRecord[]): AgentAnswer {
  const vendors = byVendor(records).sort((a, b) => b.effectiveCost - a.effectiveCost)
  const worst = vendors[0]
  return {
    text: `${worst.label} has the worst effective cost per verified contact at ${fmtUsdCents(worst.effectiveCost)} — more than ${(worst.effectiveCost / worst.contractedPrice).toFixed(1)}x its $${worst.contractedPrice.toFixed(2)} contract price.`,
    chart: { data: vendors.map((v) => ({ label: v.label, value: v.effectiveCost })), valueFmt: 'usdCents' },
  }
}

export function answerApolloClaimableThisMonth(records: EnrichmentRecord[]): AgentAnswer {
  const monthKey = AS_OF_DATE.toISOString().slice(0, 7)
  const subset = records.filter((r) => r.vendor === 'apollo' && r.claim_eligible && r.created_at.slice(0, 7) === monthKey)
  const amount = subset.reduce((s, r) => s + r.cost_usd, 0)
  return {
    text: `${subset.length.toLocaleString()} Apollo records from this month are claim-eligible (invalid, bounced, or wrong-person), worth ${fmtUsd(amount)} in recoverable credits.`,
    table: {
      headers: ['Metric', 'Value'],
      rows: [
        ['Claimable records', subset.length.toLocaleString()],
        ['Recoverable amount', fmtUsd(amount)],
      ],
    },
  }
}

export function answerClaimsExpiring10Days(records: EnrichmentRecord[]): AgentAnswer {
  const vendorSla = new Map(ENRICHMENT_VENDORS.map((v) => [v.id, v.claimSlaDays]))
  const atRisk = records.filter((r) => {
    if (!r.claim_eligible || r.claim_status === 'credited' || r.claim_status === 'rejected') return false
    const sla = vendorSla.get(r.vendor) ?? 30
    const deadline = new Date(`${r.created_at}T00:00:00Z`)
    deadline.setUTCDate(deadline.getUTCDate() + sla)
    const daysLeft = daysUntil(deadline.toISOString().slice(0, 10))
    return daysLeft >= 0 && daysLeft <= 10
  })
  const amount = atRisk.reduce((s, r) => s + r.cost_usd, 0)
  return {
    text: `${atRisk.length.toLocaleString()} open claims expire within 10 days, worth ${fmtUsd(amount)}. File these before the SLA window closes.`,
    table: {
      headers: ['Metric', 'Value'],
      rows: [
        ['Claims expiring ≤10 days', atRisk.length.toLocaleString()],
        ['At-risk amount', fmtUsd(amount)],
      ],
    },
  }
}

export function answerCostPerVerifiedByDept(records: EnrichmentRecord[]): AgentAnswer {
  const depts = byDepartment(records)
  const sorted = [...depts].sort((a, b) => b.effectiveCost - a.effectiveCost)
  return {
    text: `Cost per verified contact ranges from ${fmtUsdCents(sorted[sorted.length - 1].effectiveCost)} (${sorted[sorted.length - 1].label}) to ${fmtUsdCents(sorted[0].effectiveCost)} (${sorted[0].label}) across departments.`,
    chart: { data: depts.map((d) => ({ label: d.label, value: d.effectiveCost })), valueFmt: 'usdCents' },
  }
}

export const QUESTIONS = [
  { id: 'q1', prompt: 'How much did Recruiting overspend on ContactOut?', run: answerRecruitingOverspendContactOut },
  { id: 'q2', prompt: 'Which vendor has the worst effective cost?', run: answerWorstVendor },
  { id: 'q3', prompt: 'How much can we claim from Apollo this month?', run: answerApolloClaimableThisMonth },
  { id: 'q4', prompt: 'How many claims expire in 10 days?', run: answerClaimsExpiring10Days },
  { id: 'q5', prompt: 'What is our cost per verified contact by department?', run: answerCostPerVerifiedByDept },
] as const

export { DEPARTMENTS, vendorName }
