export const publicDetailFields = ['accusedSite', 'assaultRelationDetail', 'assaultConditionDetail', 'assaultObject', 'assaultWeapon', 'assaultMethodDetail', 'hospitalVisits', 'defamationKnownDetail', 'writtenDate', 'policeStation']

export function normalizeSupplementalData(draft) {
  const records = (value, keys) => Array.isArray(value) ? value.filter((item) => item && typeof item === 'object' && !Array.isArray(item)).map((item) => Object.fromEntries(keys.map((key) => [key, typeof item[key] === 'string' ? item[key] : '']))) : []
  return {
    additionalComplainants: records(draft?.additionalComplainants, ['name', 'residentId', 'address', 'phone', 'other']),
    additionalAccused: records(draft?.additionalAccused, ['name', 'residentId', 'address', 'phone', 'other']),
    additionalIncidents: records(draft?.additionalIncidents, ['date', 'place', 'damage', 'summary', 'account']),
    manualSelections: Array.isArray(draft?.manualSelections) ? draft.manualSelections.filter((value) => typeof value === 'string') : [],
    selectionEvidence: draft?.selectionEvidence && typeof draft.selectionEvidence === 'object' && !Array.isArray(draft.selectionEvidence) ? Object.fromEntries(Object.entries(draft.selectionEvidence).filter(([, value]) => typeof value === 'string')) : {},
  }
}
