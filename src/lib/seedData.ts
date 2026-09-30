import { Rng } from './prng'
import { DEPARTMENTS, ENRICHMENT_VENDORS, VALIDATION_VENDOR } from '../config/vendors.config'
import type { BucketKey, EnrichmentRecord, PersonMatch, Validity } from './schema'

export const SEED = 'leakage-ledger-v1'
export const TOTAL_RECORDS = 100_000
/** Fixed "today" for the demo so every derived number (SLA countdowns,
 * trend windows) is stable no matter when the dataset is viewed. */
export const AS_OF_DATE = new Date('2026-09-30T00:00:00Z')

const VENDOR_IDS = ENRICHMENT_VENDORS.map((v) => v.id)

// Target bucket sizes. These are the ONLY hand-picked numbers in the whole
// dataset — everything else (every dollar figure, every chart) is derived
// from the records these buckets produce. Change a count here and every
// screen updates together.
//
// not_found records are never billed (see cost_usd below) — vendors don't
// charge for a credit that returns no email or phone data — so they're kept
// a minority bucket rather than the dominant one; the other bucket sizes are
// tuned so effective cost per verified contact lands at exactly 2x the $0.10
// contracted price (a clean "Meridian is paying double" story) once that
// billing fix is applied.
const BUCKETS: Record<BucketKey, number> = {
  not_found: 4_800,
  invalid: 12_000,
  bounced: 8_000,
  wrong_person: 9_000,
  right_person: 18_000,
  presumed_right: 32_000,
  unvalidated_residual: 16_200,
}

// Vendor mix per bucket [apollo, wiza, contactout] — this is what makes bad
// rates vary by vendor. Wiza is the best of the three; Apollo is highest
// volume but sloppiest on person-match; ContactOut has the weakest coverage.
const VENDOR_WEIGHTS: Record<BucketKey, number[]> = {
  not_found: [0.4, 0.2, 0.4],
  invalid: [0.45, 0.2, 0.35],
  bounced: [0.45, 0.2, 0.35],
  wrong_person: [0.55, 0.15, 0.3],
  right_person: [0.35, 0.4, 0.25],
  presumed_right: [0.4, 0.35, 0.25],
  unvalidated_residual: [0.4, 0.3, 0.3],
}

// Department mix per bucket [Recruiting, Sales, Marketing, Partnerships].
const DEPT_WEIGHTS: Record<BucketKey, number[]> = {
  not_found: [0.4, 0.2, 0.3, 0.1],
  invalid: [0.3, 0.3, 0.3, 0.1],
  bounced: [0.3, 0.3, 0.3, 0.1],
  wrong_person: [0.2, 0.5, 0.2, 0.1],
  right_person: [0.28, 0.32, 0.3, 0.1],
  presumed_right: [0.3, 0.35, 0.25, 0.1],
  unvalidated_residual: [0.3, 0.3, 0.3, 0.1],
}

const BUCKET_TO_VALIDITY: Record<BucketKey, Validity> = {
  not_found: 'unvalidated',
  invalid: 'invalid',
  bounced: 'bounced',
  wrong_person: 'valid',
  right_person: 'valid',
  presumed_right: 'valid',
  unvalidated_residual: 'unvalidated',
}

const BUCKET_TO_PERSON_MATCH: Record<BucketKey, PersonMatch> = {
  not_found: 'presumed_right',
  invalid: 'presumed_right',
  bounced: 'presumed_right',
  wrong_person: 'wrong_person',
  right_person: 'right_person',
  presumed_right: 'presumed_right',
  unvalidated_residual: 'presumed_right',
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function clampToNow(d: Date): Date {
  return d.getTime() > AS_OF_DATE.getTime() ? AS_OF_DATE : d
}

export function generateSeedData(seed: string = SEED): EnrichmentRecord[] {
  const rng = new Rng(seed)
  const records: EnrichmentRecord[] = []
  const resolvedIndices: number[] = [] // eligible for the ZeroBounce metering sample
  const hasReplyIndices: number[] = [] // records whose reply_analyzed_at gets filled in below

  let seq = 0
  ;(Object.keys(BUCKETS) as BucketKey[]).forEach((bucket) => {
    const count = BUCKETS[bucket]
    for (let i = 0; i < count; i++) {
      seq++
      const vendor = rng.weightedPick(VENDOR_IDS, VENDOR_WEIGHTS[bucket])
      const department = rng.weightedPick(DEPARTMENTS, DEPT_WEIGHTS[bucket])
      const enrichmentResult = bucket === 'not_found' ? 'not_found' : 'enriched'

      // Waterfall: most records land directly; a slice had one failed
      // fallback attempt on a different vendor first (illustrated in the
      // Waterfall screen, doesn't add extra billed credits here).
      let attempted_vendors: string[]
      let waterfall_step: string
      if (bucket === 'not_found') {
        const n = rng.int(1, 3)
        const pool = rng.shuffle([...VENDOR_IDS])
        attempted_vendors = pool.slice(0, n)
        waterfall_step = `${attempted_vendors.join(' → ')} — no match`
      } else if (rng.float() < 0.25) {
        const fallbackFrom = rng.pick(VENDOR_IDS.filter((v) => v !== vendor))
        attempted_vendors = [fallbackFrom, vendor]
        waterfall_step = `${fallbackFrom} (no match) → ${vendor}`
      } else {
        attempted_vendors = [vendor]
        waterfall_step = `${vendor} (direct)`
      }

      const createdOffset = rng.int(0, 183)
      const created_at = addDays(AS_OF_DATE, -createdOffset)

      const isResolved = bucket !== 'not_found' && bucket !== 'unvalidated_residual'
      if (isResolved) resolvedIndices.push(records.length)

      const validity = BUCKET_TO_VALIDITY[bucket]
      const person_match = BUCKET_TO_PERSON_MATCH[bucket]

      const claim_eligible = bucket === 'invalid' || bucket === 'bounced' || bucket === 'wrong_person'

      let claim_status: EnrichmentRecord['claim_status'] = 'none'
      if (claim_eligible) {
        claim_status = rng.weightedPick(
          ['none', 'submitted', 'acknowledged', 'credited', 'rejected'] as const,
          [0.35, 0.25, 0.15, 0.2, 0.05],
        )
      }

      const hasReply = bucket === 'right_person' || bucket === 'wrong_person'

      const enrichmentVendor = ENRICHMENT_VENDORS.find((v) => v.id === vendor)!

      records.push({
        record_id: `LL-${String(seq).padStart(6, '0')}`,
        vendor,
        department,
        waterfall_step,
        attempted_vendors,
        credits: 1,
        // Vendors don't charge for a credit that returns no email or phone
        // data — only a resolved (enriched) record is billed.
        cost_usd: bucket === 'not_found' ? 0 : enrichmentVendor.contractedPrice,
        enrichment: enrichmentResult,
        validity,
        validated: false, // filled in below via the metering pass
        validation_cost_usd: 0,
        person_match,
        created_at: iso(created_at),
        validated_at: null, // filled in below
        reply_analyzed_at: null, // filled in below for records where hasReply
        claim_eligible,
        claim_status,
        bucket,
      })

      if (hasReply) hasReplyIndices.push(records.length - 1)
    }
  })

  const hasReplySet = new Set(hasReplyIndices)

  // ZeroBounce metering pass: exactly 60,000 of the "resolved" pool were a
  // paid validation credit (~$0.008), matching the contract volume.
  const VALIDATED_TARGET = 60_000
  const shuffledResolved = rng.shuffle([...resolvedIndices])
  const validatedSet = new Set(shuffledResolved.slice(0, VALIDATED_TARGET))

  for (const idx of resolvedIndices) {
    const r = records[idx]
    const created = new Date(`${r.created_at}T00:00:00Z`)
    if (validatedSet.has(idx)) {
      r.validated = true
      r.validation_cost_usd = VALIDATION_VENDOR.contractedPrice
      r.validated_at = iso(clampToNow(addDays(created, rng.int(1, 3))))
    }
    if (hasReplySet.has(idx)) {
      const base = r.validated_at ? new Date(`${r.validated_at}T00:00:00Z`) : created
      r.reply_analyzed_at = iso(clampToNow(addDays(base, rng.int(1, 14))))
    }
  }

  return records
}

let cached: EnrichmentRecord[] | null = null
export function getSeedData(): EnrichmentRecord[] {
  if (!cached) cached = generateSeedData()
  return cached
}
