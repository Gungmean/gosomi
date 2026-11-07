import { Plus, Trash2 } from 'lucide-react'
import type { AdditionalParty, AdditionalIncident, ComplaintDraft } from '../types'

const partyFields = [['name', '성명'], ['residentId', '주민등록번호'], ['address', '주소'], ['phone', '연락처'], ['other', '계좌번호·아이디 등 기타 정보']] as const
const incidentFields = [['date', '날짜·시간'], ['place', '장소'], ['damage', '피해금액'], ['summary', '피해사실'], ['account', '계좌번호']] as const

export default function SupplementalEditor({ draft, onChange }: { draft: ComplaintDraft; onChange: (patch: Partial<ComplaintDraft>) => void }) {
  return <div className="form-group"><h3>추가 명단과 범죄 일람표</h3><p className="form-checklist-note">여러 명이 관련되거나 피해가 여러 번 발생했다면 추가하세요. 원본 PDF의 별지에 반영됩니다.</p>
    {(['additionalComplainants', 'additionalAccused'] as const).map((key) => <section className="supplemental-editor" key={key}><h4>{key === 'additionalComplainants' ? '추가 고소인' : '추가 피고소인'}</h4>
      {(draft[key] || []).map((party, index) => <fieldset key={index} className="supplemental-entry"><legend>{key === 'additionalComplainants' ? '고소인' : '피고소인'} {index + 2}</legend>
        {partyFields.filter(([field]) => key === 'additionalAccused' || field !== 'other').map(([field, label]) => <label className="form-field" key={field}><span>{label}</span><input id={`draft-${key}.${index}.${field}`} value={party[field]} onChange={(event) => onChange({ [key]: draft[key].map((item, row) => row === index ? { ...item, [field]: event.target.value } : item) })} /></label>)}
        <button type="button" className="supplemental-remove" onClick={() => onChange({ [key]: draft[key].filter((_, row) => row !== index) })}><Trash2 size={14} /> 명단 삭제</button>
      </fieldset>)}
      <button type="button" className="supplemental-add" onClick={() => onChange({ [key]: [...(draft[key] || []), { name: '', residentId: '', address: '', phone: '', other: '' } satisfies AdditionalParty] })}><Plus size={15} /> {key === 'additionalComplainants' ? '고소인' : '피고소인'} 추가</button>
    </section>)}
    <section className="supplemental-editor"><h4>범죄 일람표</h4>{(draft.additionalIncidents || []).map((incident, index) => <fieldset className="supplemental-entry" key={index}><legend>피해사실 {index + 1}</legend>
      {incidentFields.filter(([field]) => (draft.type === 'fraud' || draft.type === 'general') || !['damage', 'account'].includes(field)).map(([field, label]) => <label className="form-field" key={field}><span>{label}</span><textarea rows={field === 'summary' ? 4 : 2} id={`draft-additionalIncidents.${index}.${field}`} value={incident[field]} onChange={(event) => onChange({ additionalIncidents: draft.additionalIncidents.map((item, row) => row === index ? { ...item, [field]: event.target.value } : item) })} /></label>)}
      <button type="button" className="supplemental-remove" onClick={() => onChange({ additionalIncidents: draft.additionalIncidents.filter((_, row) => row !== index) })}><Trash2 size={14} /> 피해사실 삭제</button>
    </fieldset>)}<button type="button" className="supplemental-add" onClick={() => onChange({ additionalIncidents: [...(draft.additionalIncidents || []), { date: '', place: '', damage: '', summary: '', account: '' } satisfies AdditionalIncident] })}><Plus size={15} /> 피해사실 추가</button></section>
  </div>
}
