import type { ComplaintDraft } from '../types'
import { templateLabels } from '../types'
import { extraDetailFields, privateDetailFields } from '../documentDetails'
import { checklistQuestions, officialFormSource, typeQuestions, evidenceQuestions, punishmentQuestion } from '../formConfig'
import { getOfficialDocumentModel } from '../../shared/officialForm.mjs'
import type { TextPosition, ChoicePosition } from '../../shared/officialLayout.mjs'
import SupplementalLists from './SupplementalLists'
import { TypedDocumentText } from './TypewriterText'

const policeFormsUrl = 'https://minwon24.police.go.kr/cvlcpt/cvlcptTmpltGdList.do'
type DocumentField = TextPosition & { value: string }
const labels: Record<string, string> = {
  complainantName: '고소인 성명', complainantBirth: '고소인 생년월일', complainantAddress: '고소인 주소', complainantPhone: '고소인 연락처',
  accusedName: '피고소인 성명', accusedAddress: '피고소인 주소', accusedPhone: '피고소인 연락처', accusedOnlineId: '피고소인 ID·닉네임', accusedAccount: '피고소인 계좌번호', accusedBank: '은행명',
  incidentDate: '피해 날짜', incidentTime: '피해 시간', incidentPlace: '피해 장소', incidentSummary: '사건 경위', damage: '피해 내용·금액', reason: '고소 이유', evidence: '증거자료', request: '처벌 희망·요청', relatedCase: '관련 수사·재판',
  'selections.assaultBodyPart': '폭행을 당한 부위', 'selections.defamationQuote': '피고소인이 실제 말하거나 기재한 내용',
  ...Object.fromEntries([...privateDetailFields, ...extraDetailFields].map(({ key, label }) => [`details.${key}`, label])),
}

export function OfficialPage({ number, fields, marks = [], animatedFields, onFieldClick }: {
  number: number; fields: DocumentField[]; marks?: ChoicePosition[]; animatedFields?: Record<string, string>; onFieldClick: (field: string) => void
}) {
  return <div className="official-page" data-source-page={number} aria-label={`경찰청 원본 고소장 ${number}쪽`}>
    <img className="official-page-image" src={`/forms/official/print-${String(number).padStart(2, '0')}.png`} alt={`경찰청 원본 서식 ${number}쪽`} />
    {marks.map((mark) => <button type="button" key={`${mark.field}-${mark.option}`} className="official-checkmark" data-field={mark.field} data-option={mark.option} aria-label={`${mark.field}: ${mark.option} 수정`} onClick={() => onFieldClick(mark.field)} style={{ left: `${mark.x}%`, top: `${mark.y}%`, width: `${mark.w}%`, height: `${mark.h}%` }}>✓</button>)}
    {fields.map((item) => {
      const capacity = Math.max(7, Math.floor(item.w / 1.65) * Math.max(1, Math.floor(item.h * 1.414 / 2.1)))
      const textUnits = [...item.value].reduce((total, char) => total + (/[^\u0000-\u00ff]/u.test(char) ? 1 : /\s/u.test(char) ? .3 : .55), 0)
      const displayed = textUnits > capacity ? '별지 참조' : item.value
      return <button type="button" key={`${item.field}-${item.x}-${item.y}`} data-field={item.field} data-full-value={item.value} className={`official-value${item.multiline ? ' official-value-multiline' : ''}${item.value ? '' : ' is-empty'}`} style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, height: `${item.h}%`, fontSize: item.recipient ? '2.5cqw' : '1.65cqw' }} title={`${labels[item.field] || item.field}: ${item.value || '입력하기'}`} aria-label={`${labels[item.field] || item.field} 수정`} onClick={() => onFieldClick(item.field === 'accusedBank' ? 'accusedAccount' : item.field)}><TypedDocumentText text={displayed} animateKey={animatedFields?.[item.field]} /></button>
    })}
  </div>
}

function OfficialComplaint({ draft, animatedFields, onFieldClick }: { draft: ComplaintDraft; animatedFields?: Record<string, string>; onFieldClick: (field: string) => void }) {
  if (draft.type === 'general') return null
  const type = draft.type
  const pages = getOfficialDocumentModel(draft) || []
  const questions = [...typeQuestions[type], evidenceQuestions[type], punishmentQuestion, ...checklistQuestions[type], ...(type === 'fraud' ? [{ id: 'damageKnown', label: '피해 금액 확인 여부' }] : type === 'assault' ? [{ id: 'assaultBodyPart', label: '폭행을 당한 부위' }] : [{ id: 'defamationQuote', label: '피고소인이 실제 말하거나 기재한 내용' }])]
  const rows = [
    ...Object.entries(labels).filter(([key]) => !key.startsWith('details.') && !key.startsWith('selections.') && key !== 'accusedBank').map(([key, label]) => ({ key, label, value: String(draft[key as keyof ComplaintDraft] || '') })),
    ...[...privateDetailFields, ...extraDetailFields.filter((field) => !field.types || field.types.includes(type))].map(({ key, label }) => ({ key: `details.${key}`, label, value: draft.documentDetails?.[key] || '' })),
    ...questions.map(({ id, label }) => ({ key: `selections.${id}`, label, value: draft.selections[id] || '' })),
  ].filter(({ value }) => value)
  return <div className="document-print-root official-document" aria-label={`${templateLabels[type]} 경찰청 간이 고소장 미리보기`}>
    <div className="official-form-note">{draft.documentDetails?.containsDummyData === 'true' ? '더미 데이터가 포함된 시연용 문서 · ' : ''}경찰청 원본 서식 · 긴 내용과 추가 정보는 별지에 전체 표시됩니다.</div>
    {pages.map((page) => <OfficialPage key={page.number} {...page} animatedFields={animatedFields} onFieldClick={onFieldClick} />)}
    <SupplementalLists draft={draft} onFieldClick={onFieldClick} />
    {rows.length > 0 && <article className="paper official-attachment">
      <h1>별지 · 사건 경위 및 추가 내용</h1>
      {draft.documentDetails?.containsDummyData === 'true' && <p className="document-note">더미 데이터가 포함된 시연용 문서입니다.</p>}
      <p className="document-note">원본 칸에 길이상 담지 못한 내용까지 전체를 정리했습니다. 제출 전 사실과 표현을 확인해주세요.</p>
      <div className="document-table">{rows.map(({ key, label, value }) => <Row key={key} label={label} value={value} animateKey={animatedFields?.[key]} onClick={() => onFieldClick(key)} />)}</div>
      <div className="document-signature"><span>고소인: <Value value={draft.complainantName} /> (인)</span></div>
    </article>}
    <div className="official-source"><a href={officialFormSource} target="_blank" rel="noreferrer">경찰청 원본 서식 출처</a> · 체크리스트 {checklistQuestions[type].length}개 항목</div>
  </div>
}

function Value({ value, placeholder = '미작성', multiline = false, animateKey }: { value: string; placeholder?: string; multiline?: boolean; animateKey?: string }) {
  return <span className={`${value ? 'document-value' : 'document-placeholder'} ${multiline ? 'multiline' : ''}`}>
    {value ? <TypedDocumentText text={value} animateKey={animateKey} /> : placeholder}
  </span>
}

function Row({ label, value, onClick, placeholder, animateKey, tall = false }: { label: string; value: string; onClick: () => void; placeholder?: string; animateKey?: string; tall?: boolean }) {
  return <div className={`document-row${tall ? ' document-row-tall' : ''}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onClick()}>
    <div className="document-row-label">{label}</div><div className="document-row-content"><Value value={value} placeholder={placeholder} animateKey={animateKey} /></div>
  </div>
}

export default function ComplaintDocument({
  draft,
  animatedFields,
  onFieldClick,
}: {
  draft: ComplaintDraft
  animatedFields?: Record<string, string>
  onFieldClick: (field: string) => void
}) {
  if (draft.type !== 'general') return <OfficialComplaint draft={draft} animatedFields={animatedFields} onFieldClick={onFieldClick} />
  return <div className="document-print-root"><article className="paper" aria-label="일반 고소장 초안 미리보기">
    <div className="paper-head"><h1>고소장 초안</h1><p className="paper-subtitle">일반 사건{draft.documentDetails?.containsDummyData === 'true' ? ' · 더미 데이터가 포함된 시연용 문서' : ''}</p></div>
    <section className="document-section"><h2>1. 고소인</h2><div className="document-table">
      <Row label="성명" value={draft.complainantName} animateKey={animatedFields?.complainantName} onClick={() => onFieldClick('complainantName')} />
      <Row label="생년월일" value={draft.complainantBirth} onClick={() => onFieldClick('complainantBirth')} />
      {draft.documentDetails?.complainantResidentId && <Row label="주민등록번호" value={draft.documentDetails.complainantResidentId} onClick={() => onFieldClick('details.complainantResidentId')} />}
      <Row label="주소" value={draft.complainantAddress} animateKey={animatedFields?.complainantAddress} onClick={() => onFieldClick('complainantAddress')} />
      <Row label="연락처" value={draft.complainantPhone} animateKey={animatedFields?.complainantPhone} onClick={() => onFieldClick('complainantPhone')} />
    </div></section>
    <section className="document-section"><h2>2. 피고소인</h2><div className="document-table">
      <Row label="성명" value={draft.accusedName} animateKey={animatedFields?.accusedName} onClick={() => onFieldClick('accusedName')} placeholder="성명 미상" />
      {draft.documentDetails?.accusedResidentId && <Row label="주민등록번호" value={draft.documentDetails.accusedResidentId} onClick={() => onFieldClick('details.accusedResidentId')} />}
      <Row label="주소" value={draft.accusedAddress} animateKey={animatedFields?.accusedAddress} onClick={() => onFieldClick('accusedAddress')} />
      <Row label="연락처" value={draft.accusedPhone} animateKey={animatedFields?.accusedPhone} onClick={() => onFieldClick('accusedPhone')} />
    </div></section>
    <section className="document-section"><h2>3. 사건 내용</h2><div className="document-table">
      <Row label="피해 일시" value={`${draft.incidentDate} ${draft.incidentTime}`.trim()} animateKey={animatedFields?.incidentDate || animatedFields?.incidentTime} onClick={() => onFieldClick('incidentDate')} />
      <Row label="피해 장소" value={draft.incidentPlace} animateKey={animatedFields?.incidentPlace} onClick={() => onFieldClick('incidentPlace')} />
      <Row label="사건 경위" value={draft.incidentSummary} animateKey={animatedFields?.incidentSummary} onClick={() => onFieldClick('incidentSummary')} />
      <Row label="피해 내용·금액" value={draft.damage} animateKey={animatedFields?.damage} onClick={() => onFieldClick('damage')} />
      <Row label="처벌 희망" value={draft.request} animateKey={animatedFields?.request} onClick={() => onFieldClick('request')} placeholder="피고소인에 대한 처벌을 원합니다." />
      <Row label="증거자료" value={draft.evidence} animateKey={animatedFields?.evidence} onClick={() => onFieldClick('evidence')} />
    </div></section>
    <section className="document-section"><h2>4. 고소 이유</h2><div className="document-paragraph" onClick={() => onFieldClick('reason')} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onFieldClick('reason')}><Value value={draft.reason} animateKey={animatedFields?.reason} placeholder="고소에 이르게 된 경위와 이유를 작성합니다." multiline /></div></section>
    <section className="document-section"><h2>5. 추가 정보</h2><div className="document-table">
      <Row label="ID·닉네임" value={draft.accusedOnlineId} onClick={() => onFieldClick('accusedOnlineId')} />
      <Row label="계좌번호" value={draft.accusedAccount} onClick={() => onFieldClick('accusedAccount')} />
      <Row label="관련 수사·재판" value={draft.relatedCase} onClick={() => onFieldClick('relatedCase')} />
      {[...privateDetailFields.filter(({ residentId }) => !residentId), ...extraDetailFields.filter((field) => !field.types || field.types.includes('general'))].filter(({ key }) => draft.documentDetails?.[key]).map(({ key, label }) => <Row key={key} label={label} value={draft.documentDetails[key]} onClick={() => onFieldClick(`details.${key}`)} />)}
    </div></section>
    <p className="document-declaration">위 내용은 고소인이 알고 있는 사실에 기초하여 작성한 초안입니다. 제출 전에 사실관계와 첨부자료를 직접 확인해 주세요.</p>
    <div className="document-signature"><span>작성일: <Value value={draft.documentDetails?.writtenDate || new Date().toLocaleDateString('ko-KR')} /></span><span>고소인: <Value value={draft.complainantName} animateKey={animatedFields?.complainantName} /> (인)</span></div>
    <div className="document-recipient">{draft.documentDetails?.policeStation || '○○경찰서'} 귀중</div>
    <div className="document-source">서식 기준: <a href={policeFormsUrl} target="_blank" rel="noreferrer">경찰민원24 민원 서식</a> · 제출 전 관할 경찰서 서식을 확인해 주세요.</div>
  </article><SupplementalLists draft={draft} onFieldClick={onFieldClick} /></div>
}
