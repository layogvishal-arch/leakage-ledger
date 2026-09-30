export type Enrichment = 'enriched' | 'not_found'
export type Validity = 'unvalidated' | 'valid' | 'invalid' | 'bounced' | 'unknown'
export type PersonMatch = 'presumed_right' | 'right_person' | 'wrong_person'
export type ClaimConfidence = 'high' | 'medium' | null
export type ClaimStatus = 'none' | 'submitted' | 'acknowledged' | 'credited' | 'rejected'

export interface EnrichmentRecord {
  record_id: string
  vendor: string
  department: string
  waterfall_step: string
  attempted_vendors: string[]
  credits: number
  cost_usd: number
  enrichment: Enrichment
  validity: Validity
  validated: boolean
  validation_cost_usd: number
  person_match: PersonMatch
  created_at: string
  validated_at: string | null
  reply_analyzed_at: string | null
  claim_eligible: boolean
  claim_confidence: ClaimConfidence
  claim_status: ClaimStatus
  // bucket label used only for generation bookkeeping / demo narrative
  bucket: BucketKey
}

export type BucketKey =
  | 'not_found'
  | 'invalid'
  | 'bounced'
  | 'wrong_person'
  | 'right_person'
  | 'presumed_right'
  | 'unvalidated_residual'

/** Is this record's final state a "good" outcome — valid contact info reaching
 * the right (or presumed-right) person? This is the demo's core reconciling
 * definition: it drives the "verified contact" denominator everywhere. */
export function isVerifiedGood(r: EnrichmentRecord): boolean {
  return r.validity === 'valid' && (r.person_match === 'right_person' || r.person_match === 'presumed_right')
}
