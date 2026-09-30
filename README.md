# Leakage Ledger

A case study prototype: how an internal RevOps team would track dud contact data across enrichment vendors, recover the money, and see true unit economics — instead of trusting the number on the invoice.

**Live demo:** https://leakage-ledger.vercel.app
**Case study write-up:** [docs/CASE_STUDY.md](docs/CASE_STUDY.md)

> Synthetic demo data. Meridian, Apollo, Wiza, ContactOut, and ZeroBounce are fictional / used as neutral stand-ins for real enrichment and validation vendors.

## The headline

> Contracted cost: **$0.10** per credit. Effective cost per verified, right-person contact: **~$0.21**. Meridian has been paying double — and charging nothing for it.

Enrichment vendors bill per credit, whether or not the credit resolves to a real, reachable, correct person. "Contracted cost per credit" and "effective cost per verified contact" are treated as the same number almost everywhere. They aren't, and the gap between them is money already spent for nothing.

## What's in here

| Screen | What it shows |
|---|---|
| How it works | Four-step framing: Capture → Detect → Reconcile → Act |
| Leakage Command Center | The hero screen — total spend, leaked $, recoverable $, contracted vs. effective cost, a funnel, and vendor/department/trend breakdowns, all filterable live |
| Vendor Onboarding | Adding a vendor as a repeatable 4-step config flow (connect, price, bad-signal definition, claim SLA) |
| Waterfall View | One contact followed through every vendor attempt, with cost accruing at each step — including the failed one |
| System of Record | The record schema, plus a status timeline showing how a record's state resolves signal by signal |
| LLM Reply Analysis | A reply comes in, a model reads it, and "Write back to record" updates the record — and every downstream total — live |
| Unit Economics | Contracted vs. effective cost per vendor, cumulative overspend, and an internal-chargeback price behind a config flag |
| Agent Chat | Five pre-scripted questions, answered live from the same dataset every other screen reads from |
| Claim Export | Evidence table, CSV export, a draft claim email (human-reviewed, never auto-sent), and a claim tracker |

## The data model

Everything on every screen is derived from one seed dataset of **100,000 synthetic enrichment records** — nothing is hand-typed per screen. Each record carries three independent signals:

- `enrichment`: `enriched` | `not_found`
- `validity`: `unvalidated` | `valid` | `invalid` | `bounced` | `unknown`
- `person_match`: `presumed_right` | `right_person` | `wrong_person`

Only the **final state** counts toward dollar loss — no double-counting across signals. The initial state is always `presumed_right`, never `right_person`: until someone replies, the system doesn't actually know, and the UI says so.

The dataset is generated deterministically (seeded PRNG) from a small set of target bucket sizes in [`src/lib/seedData.ts`](src/lib/seedData.ts) — that's the *only* place numbers are hand-picked. Every dollar figure on every screen — funnel drops, vendor/department breakdowns, trend lines, agent chat answers, CSV exports — is computed from the record array at read time in [`src/lib/aggregates.ts`](src/lib/aggregates.ts).

Landed numbers (deterministic given the seed):

- Total spend: **$10,480** (100,000 enrichment credits × $0.10 + 60,000 ZeroBounce validations × $0.008)
- Verified right-person contacts: **50,000** (~half of enrichments, as specified)
- Effective cost per verified contact: **~$0.21**
- Recoverable: **$2,900** (invalid / bounced / wrong-person records, at contract price)

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run verify   # asserts every rollup reconciles against the record-level data
npm run build    # production build
```

`npm run verify` is the acceptance gate: it regenerates the dataset and asserts that vendor and department breakdowns sum to the headline totals, the funnel is monotonic and sums to total spend, claim eligibility follows final state only (no double-counting), and the headline numbers land where the brief targets ($0.21 effective cost, $2,900 recoverable).

## Stack

React + TypeScript + Vite, Tailwind v4, Recharts, React Router (hash routing, so it deploys as a static site with no server-side rewrites needed). No backend — everything is client-side and synthetic.

## Project structure

```
src/
  config/vendors.config.ts   # vendor identity — swap names here to anonymize
  lib/
    seedData.ts               # the ~100 hand-picked numbers everything else derives from
    aggregates.ts              # every rollup (headline, funnel, by-vendor, by-department, trend)
    agentAnswers.ts             # the 5 pre-scripted Agent Chat questions, computed live
    schema.ts, prng.ts, format.ts
  state/DataContext.tsx       # holds the record array; "write back to record" mutates it live
  screens/                    # one file per screen
scripts/verify.ts             # npm run verify
```
