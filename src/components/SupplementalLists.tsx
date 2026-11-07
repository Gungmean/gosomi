import type { AdditionalIncident, AdditionalParty, ComplaintDraft } from '../types'
import type { TextPosition } from '../../shared/officialLayout.mjs'
import { OfficialPage } from './ComplaintDocument'

const partyLabels = { name: '성명', residentId: '주민등록번호', address: '주소', phone: '연락처', other: '기타 (계좌번호·아이디 등)' }
const incidentLabels = { date: '날짜·시간', place: '장소', damage: '피해금액', summary: '피해사실', account: '계좌번호' }
type Field = TextPosition & { value: string }
function field(key: string, value: string, x: number, y: number, w: number, h = 1.8): Field {
  return { field: key, value, x, y, w, h, multiline: h > 2 }
}

export default function SupplementalLists({ draft, onFieldClick }: { draft: ComplaintDraft; onFieldClick: (field: string) => void }) {
  const pages: { number: number; fields: Field[]; key: string }[] = []
  const fullRows: { key: string; label: string; entries: { label: string; value: string }[] }[] = []
  for (const [key, label, count, number] of [['additionalComplainants', '고소인', 5, 10], ['additionalAccused', '피고소인', 3, 11]] as const) {
    const parties = draft[key] || []
    for (let offset = 0; offset < parties.length; offset += count) {
      const fields: Field[] = []
      parties.slice(offset, offset + count).forEach((party: AdditionalParty, row) => {
        const start = number === 10 ? 16.8 + row * 16.307 : 16.8 + row * 24.486
        const step = number === 10 ? 3.436 : 3.777
        fields.push(field(`${key}.${offset + row}.name`, party.name, 24, start, 19), field(`${key}.${offset + row}.residentId`, party.residentId, 60.5, start, 27), field(`${key}.${offset + row}.address`, party.address, 24, start + step, 63), field(`${key}.${offset + row}.phone`, party.phone, 24, start + step * 2, 63))
        if (number === 11) fields.push(field(`${key}.${offset + row}.other`, party.other, 24, start + step * 3, 63, 5))
        fields.push(field(`${key}.${offset + row}.name`, String(offset + row + 2), number === 10 ? 20.4 : 46, start - 4.4, 3))
        fullRows.push({ key: `${key}.${offset + row}.name`, label: `${label} ${offset + row + 2}`, entries: Object.entries(partyLabels).filter(([k]) => number === 11 || k !== 'other').map(([k, label]) => ({ label, value: party[k as keyof AdditionalParty] || '' })) })
      })
      pages.push({ number, fields, key: `${key}-${offset}` })
    }
  }
  const incidents = draft.additionalIncidents || []
  for (let offset = 0; offset < incidents.length; offset += 10) {
    const fields: Field[] = [], fraud = draft.type === 'fraud'
    const columns = fraud ? { date: [15.8, 9.1], place: [26, 9.1], damage: [36.4, 11], summary: [48.6, 23.4], account: [73.2, 16.3] } : { date: [15.1, 16.5], place: [32.9, 21.2], summary: [55.5, 34] }
    incidents.slice(offset, offset + 10).forEach((incident: AdditionalIncident, row) => {
      const y = (fraud ? 16.9 : 17.4) + row * 7.48
      for (const [key, [x, w]] of Object.entries(columns)) fields.push(field(`additionalIncidents.${offset + row}.${key}`, incident[key as keyof AdditionalIncident] || '', x, y, w, 6.4))
      fields.push(field(`additionalIncidents.${offset + row}.date`, String(offset + row + 1), 11.5, y + 2.4, 2.8))
      fullRows.push({ key: `additionalIncidents.${offset + row}.date`, label: `피해사실 ${offset + row + 1}`, entries: Object.entries(incidentLabels).map(([key, label]) => ({ label, value: incident[key as keyof AdditionalIncident] || '' })) })
    })
    if (draft.type !== 'general') pages.push({ number: fraud ? 12 : draft.type === 'defamation' ? 13 : 14, fields, key: `incidents-${offset}` })
  }
  return <>
    {pages.map(({ key, ...page }) => <OfficialPage key={key} {...page} onFieldClick={onFieldClick} />)}
    {fullRows.length > 0 && <article className="paper official-attachment"><h1>별지 · 추가 명단 및 피해사실 전체 내용</h1>{fullRows.map((row) => <section className="supplemental-full-entry" key={row.key}><h2>{row.label}</h2>{row.entries.filter(({ value }) => value).map(({ label, value }) => <p key={label}><strong>{label}</strong><span>{value}</span></p>)}</section>)}</article>}
  </>
}
