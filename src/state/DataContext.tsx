import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { getSeedData, AS_OF_DATE } from '../lib/seedData'
import type { EnrichmentRecord, PersonMatch } from '../lib/schema'

interface DataContextValue {
  records: EnrichmentRecord[]
  version: number
  writeBackPersonMatch: (recordId: string, match: Exclude<PersonMatch, 'presumed_right'>) => void
  getRecord: (recordId: string) => EnrichmentRecord | undefined
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const recordsRef = useRef<EnrichmentRecord[]>(getSeedData())
  const [version, setVersion] = useState(0)

  const writeBackPersonMatch = useCallback((recordId: string, match: Exclude<PersonMatch, 'presumed_right'>) => {
    const record = recordsRef.current.find((r) => r.record_id === recordId)
    if (!record || record.person_match !== 'presumed_right') return
    record.person_match = match
    record.reply_analyzed_at = AS_OF_DATE.toISOString().slice(0, 10)
    if (match === 'wrong_person') {
      record.claim_eligible = true
      record.claim_confidence = 'medium'
      record.claim_status = 'none'
      record.bucket = 'wrong_person'
    } else {
      record.claim_eligible = false
      record.claim_confidence = null
      record.bucket = 'right_person'
    }
    setVersion((v) => v + 1)
  }, [])

  const getRecord = useCallback((recordId: string) => recordsRef.current.find((r) => r.record_id === recordId), [])

  const value = useMemo<DataContextValue>(
    () => ({ records: recordsRef.current, version, writeBackPersonMatch, getRecord }),
    [version, writeBackPersonMatch, getRecord],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
