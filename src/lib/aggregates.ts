import { ENRICHMENT_VENDORS, vendorName, DEPARTMENTS } from '../config/vendors.config'
import { isVerifiedGood, type EnrichmentRecord } from './schema'

export interface Money {
  count: number
  costUsd: number
}

export function sumCost(records: EnrichmentRecord[]): number {
  let total = 0
  for (const r of records) total += r.cost_usd + r.validation_cost_usd
  return total
}

export function enrichmentSpend(records: EnrichmentRecord[]): number {
  let total = 0
  for (const r of records) total += r.cost_usd
  return total
}

export function validationSpend(records: EnrichmentRecord[]): number {
  let total = 0
  for (const r of records) total += r.validation_cost_usd
  return total
}

export function goodRecords(records: EnrichmentRecord[]): EnrichmentRecord[] {
  return records.filter(isVerifiedGood)
}

export function claimableRecords(records: EnrichmentRecord[]): EnrichmentRecord[] {
  return records.filter((r) => r.claim_eligible)
}

export function recoverableUsd(records: EnrichmentRecord[]): number {
  return claimableRecords(records).reduce((sum, r) => sum + r.cost_usd, 0)
}

export function effectiveCostPerVerified(records: EnrichmentRecord[]): number {
  const good = goodRecords(records)
  if (good.length === 0) return 0
  return sumCost(records) / good.length
}

export interface FunnelStage {
  key: string
  label: string
  count: number
  dollars: number
  /** baseline = the billed starting population; loss = a stop-point where
   * the process halts (no outreach) but the credit was already billed, so
   * it's evidence for a vendor claim; final = the surviving good outcome. */
  kind: 'baseline' | 'loss' | 'final'
}

// A credit-to-cost funnel that follows the real operational sequence: a
// credit is billed once a contact is enriched, and if ZeroBounce or a reply
// stops the process, that's a distinct, individually-costed loss — not a
// blended "didn't become valid" number. Records still awaiting ZeroBounce
// (see pendingValidation below) are neither a pass nor a loss yet, so they
// aren't part of this sequence.
export function funnel(records: EnrichmentRecord[]): FunnelStage[] {
  const consumed = records.filter((r) => r.credits > 0)
  const invalidOrBounced = records.filter((r) => r.bucket === 'invalid' || r.bucket === 'bounced')
  const wrongPerson = records.filter((r) => r.bucket === 'wrong_person')
  const rightPerson = goodRecords(records)
  const dollarsFor = (set: EnrichmentRecord[]) => sumCost(set)
  return [
    { key: 'consumed', label: 'Credits consumed', count: consumed.length, dollars: dollarsFor(consumed), kind: 'baseline' },
    {
      key: 'invalid_bounced',
      label: 'Invalid / bounced — stops here, billed to vendor',
      count: invalidOrBounced.length,
      dollars: dollarsFor(invalidOrBounced),
      kind: 'loss',
    },
    {
      key: 'wrong_person',
      label: 'Wrong person — stops here, billed to vendor',
      count: wrongPerson.length,
      dollars: dollarsFor(wrongPerson),
      kind: 'loss',
    },
    { key: 'right_person', label: 'Verified right person', count: rightPerson.length, dollars: dollarsFor(rightPerson), kind: 'final' },
  ]
}

/** Enriched records still awaiting a ZeroBounce check — billed, but neither
 * a confirmed pass nor a confirmed loss yet. Reported separately from the
 * funnel above so the two loss stages stay clean, single-cause numbers. */
export function pendingValidation(records: EnrichmentRecord[]): { count: number; dollars: number } {
  const pending = records.filter((r) => r.bucket === 'unvalidated_residual')
  return { count: pending.length, dollars: sumCost(pending) }
}

export interface GroupBreakdown {
  key: string
  label: string
  totalRecords: number
  totalSpend: number
  leaked: number
  recoverable: number
  verifiedCount: number
  effectiveCost: number
  contractedPrice: number
}

export function byVendor(records: EnrichmentRecord[]): GroupBreakdown[] {
  return ENRICHMENT_VENDORS.map((v) => {
    const subset = records.filter((r) => r.vendor === v.id)
    const spend = sumCost(subset)
    const good = goodRecords(subset)
    const goodSpend = sumCost(good)
    return {
      key: v.id,
      label: v.name,
      totalRecords: subset.length,
      totalSpend: spend,
      leaked: spend - goodSpend,
      recoverable: recoverableUsd(subset),
      verifiedCount: good.length,
      effectiveCost: good.length ? spend / good.length : 0,
      contractedPrice: v.contractedPrice,
    }
  })
}

export function byDepartment(records: EnrichmentRecord[]): GroupBreakdown[] {
  return DEPARTMENTS.map((d) => {
    const subset = records.filter((r) => r.department === d)
    const spend = sumCost(subset)
    const good = goodRecords(subset)
    const goodSpend = sumCost(good)
    return {
      key: d,
      label: d,
      totalRecords: subset.length,
      totalSpend: spend,
      leaked: spend - goodSpend,
      recoverable: recoverableUsd(subset),
      verifiedCount: good.length,
      effectiveCost: good.length ? spend / good.length : 0,
      contractedPrice: 0.1,
    }
  })
}

export interface TrendPoint {
  month: string
  spend: number
  leaked: number
  recoverable: number
}

export function monthKey(dateIso: string): string {
  return dateIso.slice(0, 7) // YYYY-MM
}

export function trend(records: EnrichmentRecord[]): TrendPoint[] {
  const map = new Map<string, EnrichmentRecord[]>()
  for (const r of records) {
    const k = monthKey(r.created_at)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(r)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, subset]) => {
      const spend = sumCost(subset)
      const good = goodRecords(subset)
      const goodSpend = sumCost(good)
      return { month, spend, leaked: spend - goodSpend, recoverable: recoverableUsd(subset) }
    })
}

export interface Headline {
  totalSpend: number
  leaked: number
  recoverable: number
  contractedCost: number
  effectiveCost: number
  verifiedCount: number
  totalRecords: number
}

export function headline(records: EnrichmentRecord[]): Headline {
  const spend = sumCost(records)
  const good = goodRecords(records)
  const goodSpend = sumCost(good)
  const contracted = ENRICHMENT_VENDORS[0].contractedPrice
  return {
    totalSpend: spend,
    leaked: spend - goodSpend,
    recoverable: recoverableUsd(records),
    contractedCost: contracted,
    effectiveCost: effectiveCostPerVerified(records),
    verifiedCount: good.length,
    totalRecords: records.length,
  }
}

export interface Filters {
  vendor?: string
  department?: string
  from?: string
  to?: string
}

export function applyFilters(records: EnrichmentRecord[], filters: Filters): EnrichmentRecord[] {
  return records.filter((r) => {
    if (filters.vendor && r.vendor !== filters.vendor) return false
    if (filters.department && r.department !== filters.department) return false
    if (filters.from && r.created_at < filters.from) return false
    if (filters.to && r.created_at > filters.to) return false
    return true
  })
}

export { vendorName }
