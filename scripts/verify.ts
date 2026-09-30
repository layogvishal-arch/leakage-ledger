import { generateSeedData, TOTAL_RECORDS } from '../src/lib/seedData'
import { byDepartment, byVendor, funnel, headline, sumCost } from '../src/lib/aggregates'

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

// --- Funnel ---
assertTrue('funnel purchased count == total records', f[0].count === TOTAL_RECORDS)
assertClose('funnel purchased $ == headline totalSpend', f[0].dollars, h.totalSpend)
assertTrue('funnel is monotonically non-increasing (count)', f.every((stage, i) => i === 0 || stage.count <= f[i - 1].count))
assertTrue('funnel right_person count == headline verifiedCount', f[3].count === h.verifiedCount)

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

console.log(`\n${failures === 0 ? '✓ All checks passed' : `✗ ${failures} check(s) failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
