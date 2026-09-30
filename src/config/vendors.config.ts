// Single source of truth for vendor identity. Swap display names here to
// anonymize (Vendor A/B/C) before publishing — nothing else references
// vendor names directly.

export interface EnrichmentVendor {
  id: string
  name: string
  type: 'enrichment'
  contractedPrice: number // $ per credit
  claimSlaDays: number
  badSignals: Array<'bounced' | 'invalid' | 'wrong_person'>
  connectedAt: string
}

export interface ValidationVendor {
  id: string
  name: string
  type: 'validation'
  contractedPrice: number
  claimSlaDays: number
  connectedAt: string
}

export const ENRICHMENT_VENDORS: EnrichmentVendor[] = [
  {
    id: 'apollo',
    name: 'Apollo',
    type: 'enrichment',
    contractedPrice: 0.1,
    claimSlaDays: 30,
    badSignals: ['bounced', 'invalid', 'wrong_person'],
    connectedAt: '2026-03-12',
  },
  {
    id: 'wiza',
    name: 'Wiza',
    type: 'enrichment',
    contractedPrice: 0.1,
    claimSlaDays: 45,
    badSignals: ['bounced', 'invalid', 'wrong_person'],
    connectedAt: '2026-03-18',
  },
  {
    id: 'contactout',
    name: 'ContactOut',
    type: 'enrichment',
    contractedPrice: 0.1,
    claimSlaDays: 30,
    badSignals: ['bounced', 'invalid'],
    connectedAt: '2026-04-02',
  },
]

export const VALIDATION_VENDOR: ValidationVendor = {
  id: 'zerobounce',
  name: 'ZeroBounce',
  type: 'validation',
  contractedPrice: 0.008,
  claimSlaDays: 14,
  connectedAt: '2026-03-12',
}

export const ALL_VENDORS = [...ENRICHMENT_VENDORS, VALIDATION_VENDOR]

export const DEPARTMENTS = ['Recruiting', 'Sales', 'Marketing', 'Partnerships'] as const
export type Department = (typeof DEPARTMENTS)[number]

export function vendorName(id: string): string {
  return ALL_VENDORS.find((v) => v.id === id)?.name ?? id
}
