import type { ComplaintDraft } from '../src/types'
export const publicDetailFields: string[]
export function normalizeSupplementalData(draft: unknown): Pick<ComplaintDraft, 'additionalComplainants' | 'additionalAccused' | 'additionalIncidents' | 'manualSelections' | 'selectionEvidence'>
