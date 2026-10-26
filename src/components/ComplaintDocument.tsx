import type { ComplaintDraft, ComplaintType } from '../types'
import { templateLabels } from '../types'
import { checklistQuestions, officialFormSource } from '../formConfig'

const policeFormsUrl = 'https://minwon24.police.go.kr/cvlcpt/cvlcptTmpltGdList.do'
const officialPages: Record<Exclude<ComplaintType, 'general'>, [string, string]> = {
  fraud: ['/forms/official/print-04.png', '/forms/official/print-05.png'],
  defamation: ['/forms/official/print-06.png', '/forms/official/print-07.png'],
  assault: ['/forms/official/print-08.png', '/forms/official/print-09.png'],
}

type Position = { left: string; top: string; width?: string; height?: string; size?: string }
type OverlayField = { field: string; value: string; position: Position; multiline?: boolean }

function OfficialPage({
  src, pageNumber, fields, marks = [], onFieldClick,
}: {
  src: string
  pageNumber: number
  fields: OverlayField[]
  marks?: Position[]
  onFieldClick: (field: string) => void
}) {
  return <div className="official-page" aria-label={`경찰청 간이 고소장 ${pageNumber}쪽`}>
    <img className="official-page-image" src={src} alt={`경찰청 간이 고소장 원본 ${pageNumber}쪽`} />
    {marks.map((position, index) => <span key={`mark-${index}`} className="official-checkmark" style={{ left: position.left, top: position.top, width: position.width, height: position.height }} aria-hidden="true">✓</span>)}
    {fields.filter(({ value }) => value.trim()).map(({ field, value, position, multiline }) => <button
      type="button"
      key={field}
      className={`official-value${multiline ? ' official-value-multiline' : ''}`}
      style={{ left: position.left, top: position.top, width: position.width, height: position.height, fontSize: position.size }}
      title={`${field} 내용 수정`}
      onClick={() => onFieldClick(field)}
    >{value}</button>)}
  </div>
}

function OfficialComplaint({ draft, onFieldClick }: { draft: ComplaintDraft; onFieldClick: (field: string) => void }) {
  const type = draft.type as Exclude<ComplaintType, 'general'>
  const positions: Record<Exclude<ComplaintType, 'general'>, { first: Record<string, Position>; second: Record<string, Position> }> = {
    fraud: {
      first: {
        complainantName: { left: '24.5%', top: '16.3%', width: '20%' },
        complainantAddress: { left: '24.5%', top: '19.3%', width: '71%' },
        complainantPhone: { left: '24.5%', top: '22.4%', width: '71%' },
        accusedName: { left: '24.5%', top: '40.1%', width: '20%' },
        accusedAddress: { left: '24.5%', top: '43.2%', width: '71%' },
        accusedPhone: { left: '24.5%', top: '46.3%', width: '71%' },
        accusedOnlineId: { left: '47%', top: '54.5%', width: '47%' },
        accusedAccount: { left: '40%', top: '56.7%', width: '54%' },
        incidentDate: { left: '42%', top: '89.2%', width: '42%' },
        incidentTime: { left: '67%', top: '89.2%', width: '18%' },
      },
      second: {
        complainantName: { left: '43%', top: '91.2%', width: '37%' },
        incidentPlace: { left: '36%', top: '8.7%', width: '59%' },
        incidentSummary: { left: '36%', top: '11.6%', width: '60%', height: '4%' },
        damage: { left: '39%', top: '17%', width: '45%' },
      },
    },
    defamation: {
      first: {
        complainantName: { left: '24.5%', top: '16%', width: '20%' },
        complainantAddress: { left: '24.5%', top: '19.1%', width: '71%' },
        complainantPhone: { left: '24.5%', top: '22.1%', width: '71%' },
        accusedName: { left: '24.5%', top: '38.4%', width: '20%' },
        accusedAddress: { left: '24.5%', top: '41.5%', width: '71%' },
        accusedOnlineId: { left: '47%', top: '47.7%', width: '47%' },
        accusedPhone: { left: '24.5%', top: '50.8%', width: '71%' },
        incidentDate: { left: '47%', top: '59.7%', width: '45%' },
        incidentPlace: { left: '57%', top: '66%', width: '37%' },
        incidentTime: { left: '74%', top: '59.7%', width: '20%' },
        incidentSummary: { left: '42%', top: '86%', width: '52%', height: '7%' },
      },
      second: {
        complainantName: { left: '43%', top: '87.5%', width: '37%' },
      },
    },
    assault: {
      first: {
        complainantName: { left: '25%', top: '16.1%', width: '20%' },
        complainantAddress: { left: '25%', top: '19.1%', width: '71%' },
        complainantPhone: { left: '25%', top: '22.2%', width: '71%' },
        accusedName: { left: '25%', top: '39.2%', width: '20%' },
        accusedAddress: { left: '25%', top: '42.3%', width: '71%' },
        accusedPhone: { left: '25%', top: '45.3%', width: '71%' },
        incidentDate: { left: '35%', top: '68.7%', width: '48%' },
        incidentTime: { left: '68%', top: '68.7%', width: '26%' },
        incidentPlace: { left: '35%', top: '71.8%', width: '60%' },
        assaultBodyPart: { left: '37.5%', top: '77%', width: '56%', height: '4%' },
      },
      second: {
        complainantName: { left: '43%', top: '87.5%', width: '37%' },
      },
    },
  }
  const { first, second } = positions[type]
  const values: Record<string, string> = {
    complainantName: draft.complainantName,
    complainantAddress: draft.complainantAddress,
    complainantPhone: draft.complainantPhone,
    accusedName: draft.accusedName,
    accusedAddress: draft.accusedAddress,
    accusedPhone: draft.accusedPhone,
    accusedOnlineId: draft.accusedOnlineId,
    accusedAccount: draft.accusedAccount,
    incidentDate: draft.incidentDate,
    incidentTime: draft.incidentTime,
    incidentPlace: draft.incidentPlace,
    incidentSummary: draft.incidentSummary,
    assaultBodyPart: draft.selections.assaultBodyPart || '',
    damage: draft.damage,
    request: draft.request,
    evidence: draft.evidence,
  }
  const firstPositions = { ...first }
  if (type === 'defamation') {
    const channel = draft.selections.defamationChannel?.replace(/\s/g, '')
    const detailPositions: Record<string, Position> = {
      직접들음: { left: '58%', top: '64.2%', width: '34%' },
      인터넷: { left: '58%', top: '66.5%', width: '34%' },
      게임채팅: { left: '58%', top: '71.4%', width: '34%' },
      기타: { left: '53%', top: '76%', width: '39%' },
    }
    const detail = channel && Object.entries(detailPositions).find(([key]) => channel.includes(key))?.[1]
    if (detail) firstPositions.incidentPlace = detail
  }
  const makeFields = (mapping: Record<string, Position>) => Object.entries(mapping)
    .filter(([field]) => values[field])
    .map(([field, position]) => ({ field, value: values[field], position, multiline: field === 'incidentSummary' || field === 'evidence' }))

  const firstMarks: Position[] = []
  const secondMarks: Position[] = []
  const addMark = (target: Position[], left: number, top: number) => target.push({ left: `${left}%`, top: `${top}%`, width: '2.3%', height: '1.6%' })
  if (type === 'fraud') {
    const fraudMarks: Record<string, [number, number]> = {
      회원모집: [37.8, 64.5], 알선빙자: [37.8, 67], 부동산: [37.8, 69.5], 신용카드: [59.7, 69.5],
      공사대금: [37.8, 72.2], 물품대금: [59.7, 72.2], 기타용역: [37.8, 74.5], 일반매매: [59.7, 74.5],
      무전취식: [37.8, 77], 차용금: [37.8, 79.5], 선불금: [52, 79.5], 투자금: [37.8, 82], 계금: [52, 82],
      소송사기: [37.8, 84.5], 보조금: [52, 84.5], 사칭: [68.4, 84.5], 보험사기: [37.8, 87], 기타: [52, 87],
    }
    const selected = Object.entries(fraudMarks).find(([text]) => draft.selections.fraudMethod?.replace(/[·\s/]/g, '').includes(text.replace(/[·\s/]/g, '')))
    if (selected) addMark(firstMarks, ...selected[1])
  }
  if (type === 'assault') {
    const assaultType: Record<string, [number, number]> = {
      가정: [38, 58.2], 교제: [51.5, 58.2], 아동: [75, 58.2], 학교: [38, 60.8], 노인: [51.5, 60.8], 의료: [68.8, 60.8], 항공: [38, 63.1], 운전자: [57, 63.1], 일반: [75, 63.1],
    }
    const relationship: Record<string, [number, number]> = { 배우자: [38, 66], 가족: [50.4, 66], 연인: [68.8, 66], 친구: [38, 68.3], 모르는사람: [48.4, 68.3], 기타: [65.5, 68.3] }
    const markChoice = (selected: string | undefined, table: Record<string, [number, number]>, target = firstMarks) => {
      if (!selected) return
      const match = Object.entries(table).find(([label]) => selected.replace(/\s/g, '').includes(label))
      if (match) addMark(target, ...match[1])
    }
    markChoice(draft.selections.assaultType, assaultType)
    markChoice(draft.selections.assaultRelation, relationship)
    const injuryMark: Record<string, [number, number]> = { 부어오름: [38, 85.3], 피가남: [51.5, 85.3], 뼈가부러짐: [64.5, 85.3], 멍: [38, 87.7], 외부상처없음: [45.5, 87.7] }
    const condition = draft.selections.assaultCondition?.replace(/\s/g, '')
    const conditionMatch = Object.entries(injuryMark).find(([label]) => condition?.includes(label))
    if (conditionMatch) addMark(firstMarks, ...conditionMatch[1])
    const methodMark: Record<string, [number, number]> = { 멱살: [37.8, 6.6], 밀침: [57, 6.6], 잡아당김: [76, 6.6], 주먹: [37.8, 9.2], 발로: [58, 9.2], 물건: [37.8, 11.8], 흉기: [37.8, 14.3], 기타: [37.8, 16.7] }
    const method = draft.selections.assaultMethod?.replace(/\s/g, '')
    const methodMatch = Object.entries(methodMark).find(([label]) => method?.includes(label))
    if (methodMatch) addMark(secondMarks, ...methodMatch[1])
    const hospital = draft.selections.assaultHospital
    if (hospital === '치료받음') addMark(secondMarks, 38, 19.2)
    if (hospital === '치료받지 않음') addMark(secondMarks, 69, 19.2)
    const mutual = draft.selections.assaultMutual?.replace(/\s/g, '')
    const mutualOptions: Record<string, [number, number]> = {
      저도때렸습니다: [38, 21.8], 벗어나기위해힘을행사했습니다: [38, 23.7], 전혀때리지않았습니다: [38, 26.2], 모름: [38, 28.5],
    }
    const mutualMatch = Object.entries(mutualOptions).find(([label]) => mutual?.includes(label))
    if (mutualMatch) addMark(secondMarks, ...mutualMatch[1])
  }
  if (type === 'defamation') {
    const channel = draft.selections.defamationChannel
    const channelMarks: Record<string, [number, number]> = {
      직접들음: [39, 64.2], 인터넷: [39, 66.5], 메신저: [39, 69], 게임채팅: [39, 71.3], 출판물: [39, 73.6], 기타: [39, 76],
    }
    const channelMark = Object.entries(channelMarks).find(([label]) => channel?.replace(/\s/g, '').includes(label))
    if (channelMark) addMark(firstMarks, ...channelMark[1])
    const knownHow = draft.selections.defamationKnownHow
    const howMarks: Record<string, [number, number]> = { 직접들음: [39, 78.8], 직접목격: [53, 78.8], 지인이알려줌: [39, 81.2], 기타: [53, 81.2] }
    const howMark = Object.entries(howMarks).find(([label]) => knownHow?.replace(/\s/g, '').includes(label))
    if (howMark) addMark(firstMarks, ...howMark[1])
    const publicity = draft.selections.defamationPublicity
    if (publicity?.includes('여러 명')) addMark(secondMarks, 38, 1.3)
    if (publicity?.includes('고소인만')) addMark(secondMarks, 38, 3.5)
    const civil = draft.selections.civilCase
    if (civil === '진행 중') addMark(secondMarks, 38, 9.7)
    if (civil === '진행하지 않음') addMark(secondMarks, 38, 12)
  }
  if (type === 'fraud') {
    const civil = draft.selections.civilCase
    if (civil === '진행 중') addMark(secondMarks, 38, 25.6)
    if (civil === '진행하지 않음') addMark(secondMarks, 38, 28)
  }
  const evidenceText = draft.evidence.replace(/\s/g, '')
  if (type === 'fraud') {
    if (/차용증/.test(evidenceText)) addMark(secondMarks, 38, 31.1)
    if (/계좌|이체/.test(evidenceText)) addMark(secondMarks, 48.3, 31.1)
    if (/계약서/.test(evidenceText)) addMark(secondMarks, 65, 31.1)
    if (/문자|통화|대화|메신저|캡처/.test(evidenceText)) addMark(secondMarks, 38, 33.4)
    if (/자료없음|없음/.test(evidenceText)) addMark(secondMarks, 73, 33.4)
  }
  if (type === 'defamation') {
    if (/영상|사진/.test(evidenceText)) addMark(secondMarks, 38, 15.2)
    if (/목격자|진술서/.test(evidenceText)) addMark(secondMarks, 57, 15.2)
    if (/자료없음|없음/.test(evidenceText)) addMark(secondMarks, 76, 15.2)
  }
  if (type === 'assault') {
    if (/진단서|병원/.test(evidenceText)) addMark(secondMarks, 38, 36.7)
    if (/상처사진|사진/.test(evidenceText)) addMark(secondMarks, 49, 36.7)
    if (/문자|통화/.test(evidenceText)) addMark(secondMarks, 65, 36.7)
    if (/영상|폭행영상/.test(evidenceText)) addMark(secondMarks, 38, 39.2)
    if (/목격자|진술서/.test(evidenceText)) addMark(secondMarks, 56, 39.2)
    if (/자료없음|없음/.test(evidenceText)) addMark(secondMarks, 75, 39.2)
  }
  const wantsPunishment = /처벌.{0,12}(원|희망)/.test(draft.request) && !draft.request.includes('원하지')
  const doesNotWantPunishment = draft.request.includes('원하지')
  if (type === 'fraud' && (wantsPunishment || doesNotWantPunishment)) addMark(secondMarks, 42, wantsPunishment ? 22 : 24.2)
  if (type === 'defamation' && (wantsPunishment || doesNotWantPunishment)) addMark(secondMarks, 38, wantsPunishment ? 5.8 : 7.8)
  if (type === 'assault' && (wantsPunishment || doesNotWantPunishment)) addMark(secondMarks, 38, wantsPunishment ? 31.8 : 34)
  const checklistRows: Record<Exclude<ComplaintType, 'general'>, Record<string, number>> = {
    fraud: { fraudFamily: 49.5, fraudLivedTogether: 52, fraudKnewLong: 54.5, fraudContactable: 57, fraudPreviousTrade: 59.5, fraudPromise: 63.5, previousComplaint: 68, withdrawnComplaint: 72 },
    defamation: { defamationFamily: 40.5, defamationKnown: 43, defamationIdentifiable: 46.2, defamationReputation: 49.7, defamationPublicPlace: 53, defamationOthersKnew: 57, defamationOneToOne: 63, previousComplaint: 73 },
    assault: { assaultSudden: 56, assaultArgument: 59.5, assaultWitness: 63, assaultCctv: 66, assaultWithdraw: 71, previousComplaint: 77, withdrawnComplaint: 82 },
  }
  const answerColumns: Record<Exclude<ComplaintType, 'general'>, Record<string, number>> = {
    fraud: { 예: 71.5, 아니오: 79, 모름: 86.5 },
    defamation: { 예: 71.5, 아니오: 79, 모름: 86.5 },
    assault: { 예: 71.5, 아니오: 79, 모름: 86.5 },
  }
  for (const [key, top] of Object.entries(checklistRows[type])) {
    const answer = draft.selections[key]
    const left = answerColumns[type][answer]
    if (left !== undefined) addMark(secondMarks, left, top)
  }
  if (type === 'defamation') {
    const truth = draft.selections.defamationTruth
    const truthMark: Record<string, [number, number]> = { 사실: [38, 92], '사실 아님': [54, 92], 모름: [78, 92] }
    const selectedTruth = Object.entries(truthMark).find(([label]) => truth?.replace(/\s/g, '') === label.replace(/\s/g, ''))
    if (selectedTruth) addMark(firstMarks, ...selectedTruth[1])
  }

  return <div className="document-print-root official-document" aria-label={`${templateLabels[type]} 경찰청 간이 고소장 미리보기`}>
    <div className="official-form-note">경찰청 원본 서식 · 입력한 내용은 빈칸에 표시됩니다 · 주민등록번호 등 민감한 정보는 출력 후 직접 작성하세요</div>
    <OfficialPage src={officialPages[type][0]} pageNumber={1} fields={makeFields(firstPositions)} marks={firstMarks} onFieldClick={onFieldClick} />
    <OfficialPage src={officialPages[type][1]} pageNumber={2} fields={makeFields(second)} marks={secondMarks} onFieldClick={onFieldClick} />
    {type === 'assault' && (draft.incidentSummary || draft.damage || draft.evidence || draft.reason) && <article className="paper official-attachment">
      <h1>별지 · 사건 경위 및 추가 내용</h1>
      <p className="document-note">경찰청 폭행 간이 고소장 원본에는 자유 서술란이 없어, 아래 내용은 별지 초안으로 정리했습니다.</p>
      <div className="document-table">
        <Row label="피해 일시" value={`${draft.incidentDate} ${draft.incidentTime}`.trim()} onClick={() => onFieldClick('incidentDate')} />
        <Row label="피해 장소" value={draft.incidentPlace} onClick={() => onFieldClick('incidentPlace')} />
        <Row label="사건 경위" value={draft.incidentSummary} onClick={() => onFieldClick('incidentSummary')} />
        <Row label="피해·손해" value={draft.damage} onClick={() => onFieldClick('damage')} />
        <Row label="증거자료" value={draft.evidence} onClick={() => onFieldClick('evidence')} />
        <Row label="추가 고소 이유" value={draft.reason} onClick={() => onFieldClick('reason')} />
      </div>
      <div className="document-signature"><span>고소인: <Value value={draft.complainantName} /> (인)</span></div>
    </article>}
    <div className="official-source"><a href={officialFormSource} target="_blank" rel="noreferrer">경찰청 원본 서식 출처</a> · {checklistQuestions[type].length}개 체크리스트 항목도 원본에 포함되어 있습니다.</div>
  </div>
}

function Value({ value, placeholder = '미작성', multiline = false }: { value: string; placeholder?: string; multiline?: boolean }) {
  return <span className={`${value ? 'document-value' : 'document-placeholder'} ${multiline ? 'multiline' : ''}`}>{value || placeholder}</span>
}

function Row({ label, value, onClick, placeholder }: { label: string; value: string; onClick: () => void; placeholder?: string }) {
  return <div className="document-row" onClick={onClick} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onClick()}>
    <div className="document-row-label">{label}</div><div className="document-row-content"><Value value={value} placeholder={placeholder} /></div>
  </div>
}

export default function ComplaintDocument({ draft, onFieldClick }: { draft: ComplaintDraft; onFieldClick: (field: string) => void }) {
  if (draft.type !== 'general') return <OfficialComplaint draft={draft} onFieldClick={onFieldClick} />
  return <div className="document-print-root"><article className="paper" aria-label="일반 고소장 초안 미리보기">
    <div className="paper-head"><h1>고소장 초안</h1><p className="paper-subtitle">일반 사건</p></div>
    <section className="document-section"><h2>1. 고소인</h2><div className="document-table">
      <Row label="성명" value={draft.complainantName} onClick={() => onFieldClick('complainantName')} />
      <Row label="주소" value={draft.complainantAddress} onClick={() => onFieldClick('complainantAddress')} />
      <Row label="연락처" value={draft.complainantPhone} onClick={() => onFieldClick('complainantPhone')} />
    </div></section>
    <section className="document-section"><h2>2. 피고소인</h2><div className="document-table">
      <Row label="성명" value={draft.accusedName} onClick={() => onFieldClick('accusedName')} placeholder="성명 미상" />
      <Row label="주소" value={draft.accusedAddress} onClick={() => onFieldClick('accusedAddress')} />
      <Row label="연락처" value={draft.accusedPhone} onClick={() => onFieldClick('accusedPhone')} />
    </div></section>
    <section className="document-section"><h2>3. 사건 내용</h2><div className="document-table">
      <Row label="피해 일시" value={`${draft.incidentDate} ${draft.incidentTime}`.trim()} onClick={() => onFieldClick('incidentDate')} />
      <Row label="피해 장소" value={draft.incidentPlace} onClick={() => onFieldClick('incidentPlace')} />
      <Row label="사건 경위" value={draft.incidentSummary} onClick={() => onFieldClick('incidentSummary')} />
      <Row label="피해 내용·금액" value={draft.damage} onClick={() => onFieldClick('damage')} />
      <Row label="처벌 희망" value={draft.request} onClick={() => onFieldClick('request')} placeholder="피고소인에 대한 처벌을 원합니다." />
      <Row label="증거자료" value={draft.evidence} onClick={() => onFieldClick('evidence')} />
    </div></section>
    <section className="document-section"><h2>4. 고소 이유</h2><div className="document-paragraph" onClick={() => onFieldClick('reason')} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onFieldClick('reason')}><Value value={draft.reason} placeholder="고소에 이르게 된 경위와 이유를 작성합니다." multiline /></div></section>
    <p className="document-declaration">위 내용은 고소인이 알고 있는 사실에 기초하여 작성한 초안입니다. 제출 전에 사실관계와 첨부자료를 직접 확인해 주세요.</p>
    <div className="document-signature"><span>작성일: <Value value={new Date().toLocaleDateString('ko-KR')} /></span><span>고소인: <Value value={draft.complainantName} /> (인)</span></div>
    <div className="document-recipient">○○경찰서 귀중</div>
    <div className="document-source">서식 기준: <a href={policeFormsUrl} target="_blank" rel="noreferrer">경찰민원24 민원 서식</a> · 제출 전 관할 경찰서 서식을 확인해 주세요.</div>
  </article></div>
}
