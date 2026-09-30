import { generateSeedData, TOTAL_RECORDS } from '../src/lib/seedData'
import { byDepartment, byVendor, funnel, headline, pendingValidation, sumCost, validationSpend } from '../src/lib/aggregates'

const EPS = 0.02 // cents-level float tolerance
let failures = 0

function assertClose(label: string, actual: number, expected: number, eps = EPS) {
  const diff = Math.abs(actual - expected)
  if (diff > eps) {
    failures++
    console.error(`✗ ${label}: expected ${expected.toFixed(4)}, got ${actual.toFixed(4)} (diff ${diff.toFixed(4)})`)
  } else {
    console.log(`✓ ${label}: ${actual.toFixed(4)}`)
  }
}

function assertTrue(label: string, cond: boolean) {
  if (!cond) {
    failures++
    console.error(`✗ ${label}`)
  } else {
    console.log(`✓ ${label}`)
  }
}

const records = generateSeedData()
const h = headline(records)
const vendors = byVendor(records)
const depts = byDepartment(records)
const f = funnel(records)
const pending = pendingValidation(records)

console.log(`\nGenerated ${records.length} records (target ${TOTAL_RECORDS})\n`)

assertTrue('record count matches TOTAL_RECORDS', records.length === TOTAL_RECORDS)

// --- Reconciliation: every rollup must equal the sum of the underlying records ---
assertClose('sum(vendor totalRecords) == total records', vendors.reduce((s, v) => s + v.totalRecords, 0), TOTAL_RECORDS, 0)
assertClose('sum(vendor totalSpend) == headline totalSpend', vendors.reduce((s, v) => s + v.totalSpend, 0), h.totalSpend)
assertClose('sum(vendor leaked) == headline leaked', vendors.reduce((s, v) => s + v.leaked, 0), h.leaked)
assertClose('sum(vendor recoverable) == headline recoverable', vendors.reduce((s, v) => s + v.recoverable, 0), h.recoverable)

assertClose('sum(dept totalRecords) == total records', depts.reduce((s, d) => s + d.totalRecords, 0), TOTAL_RECORDS, 0)
assertClose('sum(dept totalSpend) == headline totalSpend', depts.reduce((s, d) => s + d.totalSpend, 0), h.totalSpend)
assertClose('sum(dept leaked) == headline leaked', depts.reduce((s, d) => s + d.leaked, 0), h.leaked)
assertClose('sum(dept recoverable) == headline recoverable', depts.reduce((s, d) => s + d.recoverable, 0), h.recoverable)

// --- Funnel: a credit-to-cost funnel, so it starts at credits consumed
// (not_found searches never consumed one, so they're excluded entirely).
// The loss stages (invalid/bounced, wrong_person) are independent,
// single-cause segments of the baseline, not cumulative survivors, so what
// must hold is reconciliation — baseline == losses + final + pending —
// not a monotonic decrease across all four rows. Every stage's dollars are
// enrichment cost ONLY (count x $0.10) — ZeroBounce's validation fee is a
// separate vendor line, reported via validationSpend(), not folded in. ---
const [consumedStage, invalidBouncedStage, wrongPersonStage, rightPersonStage] = f
assertTrue('funnel has exactly 4 stages', f.length === 4)
assertTrue('funnel first stage count == billed (non-not_found) records', consumedStage.count === records.filter((r) => r.bucket !== 'not_found').length)
assertClose('funnel first stage $ == credits consumed x $0.10 (enrichment only)', consumedStage.dollars, consumedStage.count * 0.1)
assertClose('funnel first stage $ + validation spend == headline totalSpend', consumedStage.dollars + validationSpend(records), h.totalSpend)
assertTrue('funnel last stage count == headline verifiedCount', rightPersonStage.count === h.verifiedCount)
assertTrue(
  'invalid/bounced stage count == invalid + bounced buckets',
  invalidBouncedStage.count === records.filter((r) => r.bucket === 'invalid' || r.bucket === 'bounced').length,
)
assertTrue('wrong_person stage count == wrong_person bucket', wrongPersonStage.count === records.filter((r) => r.bucket === 'wrong_person').length)
assertClose(
  'reconciliation: consumed == invalid/bounced + wrong_person + verified + pending (count)',
  invalidBouncedStage.count + wrongPersonStage.count + rightPersonStage.count + pending.count,
  consumedStage.count,
  0,
)
assertClose(
  'reconciliation: consumed == invalid/bounced + wrong_person + verified + pending ($)',
  invalidBouncedStage.dollars + wrongPersonStage.dollars + rightPersonStage.dollars + pending.dollars,
  consumedStage.dollars,
)

// --- Headline reconciles internally ---
assertClose('leaked + (totalSpend - leaked) == totalSpend', h.leaked + (h.totalSpend - h.leaked), h.totalSpend)
assertTrue('recoverable <= leaked (claims are a subset of leaked spend)', h.recoverable <= h.leaked + EPS)

// --- No double counting: claim eligibility follows final state only ---
const badBuckets = new Set(['invalid', 'bounced', 'wrong_person'])
assertTrue(
  'claim_eligible true iff bucket in {invalid, bounced, wrong_person}',
  records.every((r) => r.claim_eligible === badBuckets.has(r.bucket)),
)
assertTrue(
  'not_found records are never claimable',
  records.filter((r) => r.enrichment === 'not_found').every((r) => !r.claim_eligible),
)
assertTrue(
  'valid + right_person/presumed_right records are never claimable',
  records
    .filter((r) => r.validity === 'valid' && r.person_match !== 'wrong_person')
    .every((r) => !r.claim_eligible),
)

// --- Headline lands near the numbers the brief targets ---
assertClose('effective cost per verified contact is exactly 2x contracted ($0.20)', h.effectiveCost, 0.2, 0.005)
assertClose('recoverable total lands near $2,900', h.recoverable, 2900, 50)
assertTrue('contracted cost is $0.10', h.contractedCost === 0.1)

// --- cost sanity: sumCost over all records matches headline ---
assertClose('sumCost(all records) == headline totalSpend', sumCost(records), h.totalSpend)

// --- not_found records are never billed: vendors don't charge for a credit
// that returns no email or phone data ---
assertTrue(
  'not_found records always cost $0',
  records.filter((r) => r.bucket === 'not_found').every((r) => r.cost_usd === 0 && r.validation_cost_usd === 0),
)
assertTrue('every non-not_found record is billed at the contracted price', records.filter((r) => r.bucket !== 'not_found').every((r) => r.cost_usd > 0))
assertTrue(
  'credits and cost_usd always move together (a search is either a credit or it isn\'t)',
  records.every((r) => (r.credits === 0) === (r.cost_usd === 0)),
)
assertClose('sum(credits) == count of billed (non-not_found) records', records.reduce((s, r) => s + r.credits, 0), records.filter((r) => r.bucket !== 'not_found').length, 0)

console.log(`\n${failures === 0 ? '✓ All checks passed' : `✗ ${failures} check(s) failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
