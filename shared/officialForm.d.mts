import type { ComplaintDraft } from '../src/types'
import type { TextPosition, ChoicePosition } from './officialLayout.mjs'
export function dateParts(value: string): { year: string; month: string; day: string }
export function timeParts(value: string): { hour: string; minute: string }
export function selectedFormValues(draft: ComplaintDraft): Record<string, string>
export function getOfficialDocumentModel(draft: ComplaintDraft): null | { number: number; fields: (TextPosition & { value: string })[]; marks: ChoicePosition[] }[]
