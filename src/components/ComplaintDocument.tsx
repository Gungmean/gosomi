import type { ComplaintDraft, ComplaintType } from '../types'
import { templateLabels } from '../types'
import { extraDetailFields, privateDetailFields } from '../documentDetails'
import { checklistQuestions, officialFormSource } from '../formConfig'
import { TypedDocumentText } from './TypewriterText'

const policeFormsUrl = 'https://minwon24.police.go.kr/cvlcpt/cvlcptTmpltGdList.do'
const officialPages: Record<Exclude<ComplaintType, 'general'>, [string, string]> = {
  fraud: ['/forms/official/print-04.png', '/forms/official/print-05.png'],
  defamation: ['/forms/official/print-06.png', '/forms/official/print-07.png'],
  assault: ['/forms/official/print-08.png', '/forms/official/print-09.png'],
}

function fraudAmountForForm(damage: string) {
  return damage.match(/(\d[\d,]*(?:\.\d+)?\s*(?:억|천만|백만|십만|만|천|백)?)(?=\s*원)/u)?.[1].replace(/\s+/g, '') || ''
}

function formDateParts(value: string) {
  const full = value.match(/(\d{4})\s*(?:년|[./-])\s*(\d{1,2})\s*(?:월|[./-])\s*(\d{1,2})/u)
  const partial = full ? null : value.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/u)
  const year = full?.[1] || ''
  const month = Number(full?.[2] || partial?.[1])
  const day = Number(full?.[3] || partial?.[2])
  if (!month || month > 12 || !day || day > 31) return { year: '', month: '', day: '' }
  return { year, month: String(month), day: String(day) }
}

function formTimeParts(value: string) {
  const clock = value.match(/(\d{1,2}):(\d{2})/u)
  const spoken = clock ? null : value.match(/(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/u)
  if (!clock && !spoken) return { hour: '', minute: '' }
  let hour = Number(clock?.[1] || spoken?.[1])
  const minute = clock?.[2] || spoken?.[2] || ''
  if (!clock && /오후|저녁|밤/u.test(value) && hour < 12) hour += 12
  if (!clock && /오전|아침|새벽/u.test(value) && hour === 12) hour = 0
  if (!Number.isFinite(hour) || hour > 23 || (minute && Number(minute) > 59)) return { hour: '', minute: '' }
  return { hour: String(hour).padStart(2, '0'), minute: minute ? minute.padStart(2, '0') : '' }
}

function needsSupplementalPage(draft: ComplaintDraft) {
  if (draft.type === 'general') return false
  const dateTimeNeedsNote = Boolean(
    (draft.incidentDate && !formDateParts(draft.incidentDate).month) ||
    (draft.incidentTime && !formTimeParts(draft.incidentTime).hour) ||
    /경|쯤|무렵|대략|약/u.test(`${draft.incidentDate} ${draft.incidentTime}`),
  )
  if (draft.type === 'assault') return Boolean(dateTimeNeedsNote || draft.incidentSummary || draft.damage || draft.evidence || draft.reason || draft.request || draft.relatedCase || draft.selections.assaultType === '기타')
  const singleLineFields = [
    [draft.complainantName, 12], [draft.complainantAddress, 34], [draft.complainantPhone, 20],
    [draft.accusedName, 12], [draft.accusedAddress, 34], [draft.accusedPhone, 20],
    [draft.accusedOnlineId, 28], [draft.accusedAccount, 32], [draft.incidentDate, 20],
    [draft.incidentTime, 18], [draft.incidentPlace, 34],
  ]
  return Boolean(
    draft.reason || draft.evidence || draft.request || draft.relatedCase ||
    dateTimeNeedsNote ||
    (draft.type === 'fraud' && draft.damage && !fraudAmountForForm(draft.damage) && !/모름|알 수 없|불명/u.test(draft.damage)) ||
    /예금주|명의자/u.test(draft.accusedAccount) ||
    singleLineFields.some(([value, limit]) => String(value).length > Number(limit)) ||
    (draft.incidentSummary && draft.incidentSummary.length > 30) ||
    (draft.damage && draft.damage.length > 18),
  )
}

type Position = { left: string; top: string; width?: string; height?: string; size?: string }
type OverlayField = { field: string; value: string; position: Position; multiline?: boolean }

function OfficialPage({
  src, pageNumber, fields, marks = [], animatedFields, onFieldClick,
}: {
  src: string
  pageNumber: number
  fields: OverlayField[]
  marks?: Position[]
  animatedFields?: Record<string, string>
  onFieldClick: (field: string) => void
}) {
  return <div className="official-page" aria-label={`경찰청 간이 고소장 ${pageNumber}쪽`}>
    <img className="official-page-image" src={src} alt={`경찰청 간이 고소장 원본 ${pageNumber}쪽`} />
    {marks.map((position, index) => <span key={`mark-${index}`} className="official-checkmark" style={{ left: position.left, top: position.top, width: position.width, height: position.height }} aria-hidden="true">✓</span>)}
    {fields.filter(({ value }) => value.trim()).map(({ field, value, position, multiline }) => <button
      type="button"
      key={`${field}-${position.left}-${position.top}`}
      className={`official-value${multiline ? ' official-value-multiline' : ''}`}
      style={{ left: position.left, top: position.top, width: position.width, height: position.height, fontSize: position.size, backgroundColor: field === 'accusedBank' || field.startsWith('details.') ? '#fff' : undefined }}
      title={`${field} 내용 수정: ${value}`}
      aria-label={`${field} 내용 수정: ${value}`}
      onClick={() => onFieldClick(field === 'accusedBank' ? 'accusedAccount' : field.startsWith('writtenDate-') ? 'details.writtenDate' : field)}
    ><TypedDocumentText text={value} animateKey={animatedFields?.[field]} /></button>)}
  </div>
}

function OfficialComplaint({
  draft,
  animatedFields,
  onFieldClick,
}: {
  draft: ComplaintDraft
  animatedFields?: Record<string, string>
  onFieldClick: (field: string) => void
}) {
  const type = draft.type as Exclude<ComplaintType, 'general'>
  const positions: Record<Exclude<ComplaintType, 'general'>, { first: Record<string, Position>; second: Record<string, Position> }> = {
    fraud: {
      first: {
        complainantName: { left: '24.5%', top: '16.3%', width: '20%' },
        complainantAddress: { left: '24.5%', top: '19.3%', width: '71%' },
        complainantPhone: { left: '24.5%', top: '22.4%', width: '71%' },
        // The fraud form has an explanatory header row above the accused fields.
        accusedName: { left: '24.5%', top: '39.6%', width: '20%' },
        accusedAddress: { left: '24.5%', top: '42.7%', width: '71%' },
        accusedPhone: { left: '24.5%', top: '45.8%', width: '71%' },
        accusedOnlineId: { left: '47%', top: '53.1%', width: '40%' },
        accusedBank: { left: '23.5%', top: '56.2%', width: '19%' },
        accusedAccount: { left: '59%', top: '56.2%', width: '28%' },
      },
      second: {
        complainantName: { left: '42.5%', top: '84.9%', width: '19%' },
        incidentPlace: { left: '36%', top: '8.7%', width: '52%' },
        incidentSummary: { left: '36%', top: '12%', width: '51.5%', height: '3.2%', size: '1.45cqw' },
        damage: { left: '42%', top: '15.9%', width: '32%' },
      },
    },
    defamation: {
      first: {
        complainantName: { left: '24.5%', top: '16%', width: '20%' },
        complainantAddress: { left: '24.5%', top: '19.3%', width: '71%' },
        complainantPhone: { left: '24.5%', top: '22.4%', width: '71%' },
        accusedName: { left: '24.5%', top: '37%', width: '20%' },
        accusedAddress: { left: '24.5%', top: '40.1%', width: '71%' },
        accusedOnlineId: { left: '47%', top: '46%', width: '47%' },
        accusedPhone: { left: '24.5%', top: '48.8%', width: '71%' },
        incidentPlace: { left: '57%', top: '66%', width: '37%' },
        incidentSummary: { left: '42%', top: '86%', width: '52%', height: '2.2%' },
      },
      second: {
        complainantName: { left: '42.5%', top: '84.8%', width: '19%' },
      },
    },
    assault: {
      first: {
        complainantName: { left: '25%', top: '17.8%', width: '20%' },
        complainantAddress: { left: '25%', top: '20.9%', width: '71%' },
        complainantPhone: { left: '25%', top: '24%', width: '71%' },
        accusedName: { left: '25%', top: '39.7%', width: '20%' },
        accusedAddress: { left: '25%', top: '43.1%', width: '71%' },
        accusedPhone: { left: '25%', top: '46.5%', width: '71%' },
        incidentPlace: { left: '35%', top: '73%', width: '60%' },
        assaultBodyPart: { left: '37.5%', top: '75.4%', width: '56%', height: '4%' },
      },
      second: {
        complainantName: { left: '42.5%', top: '85.4%', width: '19%' },
      },
    },
  }
  const { first, second } = positions[type]
  const accusedBank = draft.accusedAccount.match(/(?:[가-힣A-Za-z]{2,20}(?:은행|뱅크|증권|금고))|농협|수협|우체국/u)?.[0] || ''
  const accusedAccountNumber = draft.accusedAccount.match(/[0-9Xx*＊][0-9Xx*＊-]{4,40}[0-9Xx*＊]/u)?.[0] || draft.accusedAccount
  const values: Record<string, string> = {
    complainantName: draft.complainantName,
    complainantAddress: draft.complainantAddress,
    complainantPhone: draft.complainantPhone,
    accusedName: draft.accusedName,
    accusedAddress: draft.accusedAddress,
    accusedPhone: draft.accusedPhone,
    accusedOnlineId: draft.accusedOnlineId,
    accusedBank,
    accusedAccount: accusedAccountNumber,
    incidentDate: draft.incidentDate,
    incidentTime: draft.incidentTime,
    incidentPlace: draft.incidentPlace,
    incidentSummary: draft.incidentSummary,
    assaultBodyPart: draft.selections.assaultBodyPart || '',
    damage: type === 'fraud' ? fraudAmountForForm(draft.damage) : draft.damage,
    request: draft.request,
    evidence: draft.evidence,
  }
  const details = draft.documentDetails || {}
  const firstPositions = { ...first }
  const detailPosition = (key: string, left: number, top: number, width: number) => {
    firstPositions[`details.${key}`] = { left: `${left}%`, top: `${top}%`, width: `${width}%`, size: '1.65cqw' }
    values[`details.${key}`] = details[key] || ''
  }
  const rowTop = { fraud: [16.3, 39.6, 25.1], defamation: [16.6, 37, 25.4], assault: [18.2, 40, 27] }[type]
  detailPosition('complainantResidentId', 61, rowTop[0], 26)
  detailPosition('accusedResidentId', 61, rowTop[1], 26)
  detailPosition('agentName', 38, rowTop[2], 12)
  detailPosition('agentRelation', 69, rowTop[2], 15)
  detailPosition('agentPhone', 41, rowTop[2] + 2, 16)
  detailPosition('agentOfficePhone', 65, rowTop[2] + 2, 20)
  if (type !== 'assault') detailPosition('accusedSite', 47, type === 'fraud' ? 50.2 : 43.2, 40)
  if (type === 'defamation' && draft.selections.defamationKnownHow === '기타') detailPosition('defamationKnownDetail', 64, 79, 21)
  if (type === 'assault') {
    if (draft.selections.assaultRelation === '기타') detailPosition('assaultRelationDetail', 75, 68, 10)
    if (draft.selections.assaultCondition === '기타') detailPosition('assaultConditionDetail', 47, 89, 27)
  }
  const secondPositions = { ...second }
  const secondDetail = (key: string, left: number, top: number, width: number) => {
    secondPositions[`details.${key}`] = { left: `${left}%`, top: `${top}%`, width: `${width}%`, size: '1.65cqw' }
    values[`details.${key}`] = details[key] || ''
  }
  if (type === 'assault') {
    if (draft.selections.assaultMethod === '물건을 던짐') secondDetail('assaultObject', 64, 13.3, 14)
    if (draft.selections.assaultMethod === '흉기를 휘두름') secondDetail('assaultWeapon', 64, 15.4, 14)
    if (draft.selections.assaultMethod === '기타') secondDetail('assaultMethodDetail', 45, 17.5, 34)
    if (draft.selections.assaultHospital === '치료받음') secondDetail('hospitalVisits', 59, 20.2, 3)
  }
  const writtenDate = formDateParts(details.writtenDate || '')
  const writtenTop = type === 'assault' ? 83.1 : 82.5
  for (const [part, left] of [['year', 33.5], ['month', 44.5], ['day', 54.5]] as const) {
    secondPositions[`writtenDate-${part}`] = { left: `${left}%`, top: `${writtenTop}%`, width: part === 'year' ? '5%' : '3%', size: '1.7cqw' }
    values[`writtenDate-${part}`] = writtenDate[part]
  }
  if (details.policeStation) secondDetail('policeStation', 35, type === 'assault' ? 89.5 : 89, 18)

  if (type === 'defamation') {
    const channel = draft.selections.defamationChannel?.replace(/\s/g, '')
    const detailPositions: Record<string, Position> = {
      직접들음: { left: '58%', top: '63.4%', width: '34%' },
      인터넷: { left: '58%', top: '65.7%', width: '34%' },
      게임채팅: { left: '58%', top: '70.2%', width: '34%' },
      기타: { left: '53%', top: '74.8%', width: '39%' },
    }
    const detail = channel && Object.entries(detailPositions).find(([key]) => channel.includes(key))?.[1]
    if (detail) firstPositions.incidentPlace = detail
    else delete firstPositions.incidentPlace
  }
  const makeFields = (mapping: Record<string, Position>) => Object.entries(mapping)
    .filter(([field]) => values[field])
    .map(([field, position]) => {
      const value = values[field]
      const previewLengths: Record<string, number> = {
        complainantName: 12, complainantAddress: 34, complainantPhone: 20,
        accusedName: 12, accusedAddress: 34, accusedPhone: 20,
        accusedOnlineId: 28, accusedAccount: 32, incidentDate: 20,
        incidentTime: 18, incidentPlace: 34, incidentSummary: 30, damage: 18,
      }
      const maxPreviewLength = previewLengths[field]
      const previewValue = maxPreviewLength && value.length > maxPreviewLength
        ? `${value.slice(0, maxPreviewLength - 1).trimEnd()}…`
        : value
      return { field, value: previewValue, position, multiline: field === 'incidentSummary' || field === 'evidence' }
    })

  const date = formDateParts(draft.incidentDate)
  const time = formTimeParts(draft.incidentTime || draft.incidentDate)
  const dateTimeTop = { fraud: '87%', defamation: '59.2%', assault: '70.2%' }[type]
  const dateTimeFields: OverlayField[] = [
    { field: 'incidentDate', value: date.year, position: { left: '38.4%', top: dateTimeTop, width: '4.8%', size: '1.7cqw' } },
    { field: 'incidentDate', value: date.month, position: { left: '46.9%', top: dateTimeTop, width: '3%', size: '1.7cqw' } },
    { field: 'incidentDate', value: date.day, position: { left: '55%', top: dateTimeTop, width: '2.9%', size: '1.7cqw' } },
    { field: 'incidentTime', value: time.hour, position: { left: '63%', top: dateTimeTop, width: '3%', size: '1.7cqw' } },
    { field: 'incidentTime', value: time.minute, position: { left: '70.8%', top: dateTimeTop, width: '3.3%', size: '1.7cqw' } },
  ]

  const needsAttachment = needsSupplementalPage(draft) || Boolean(draft.complainantBirth) || [...privateDetailFields, ...extraDetailFields].some(({ key }) => Boolean(details[key]))
  const attachmentRows = [
    ...[...privateDetailFields, ...extraDetailFields].filter((field) => !('types' in field) || !field.types || field.types.includes(type)).map(({ key, label }) => ({ key: `details.${key}`, label, value: details[key] || '', animateKey: undefined })),
    { key: 'complainantBirth', label: '고소인 생년월일', value: draft.complainantBirth, animateKey: undefined },
    { key: 'assaultType', label: '폭행 종류', value: type === 'assault' && draft.selections.assaultType === '기타' ? '기타' : '', animateKey: undefined },
    { key: 'complainantName', label: '고소인 성명', value: draft.complainantName, animateKey: animatedFields?.complainantName },
    { key: 'complainantAddress', label: '고소인 주소', value: draft.complainantAddress, animateKey: animatedFields?.complainantAddress },
    { key: 'complainantPhone', label: '고소인 연락처', value: draft.complainantPhone, animateKey: animatedFields?.complainantPhone },
    { key: 'accusedName', label: '피고소인 성명', value: draft.accusedName, animateKey: animatedFields?.accusedName },
    { key: 'accusedAddress', label: '피고소인 주소', value: draft.accusedAddress, animateKey: animatedFields?.accusedAddress },
    { key: 'accusedPhone', label: '피고소인 연락처', value: draft.accusedPhone, animateKey: animatedFields?.accusedPhone },
    { key: 'accusedOnlineId', label: '피고소인 ID·닉네임', value: draft.accusedOnlineId, animateKey: animatedFields?.accusedOnlineId },
    { key: 'accusedAccount', label: '피고소인 계좌번호', value: draft.accusedAccount, animateKey: animatedFields?.accusedAccount },
    { key: 'incidentDate', label: '피해 일시', value: `${draft.incidentDate} ${draft.incidentTime}`.trim(), animateKey: animatedFields?.incidentDate || animatedFields?.incidentTime },
    { key: 'incidentPlace', label: '피해 장소', value: draft.incidentPlace, animateKey: animatedFields?.incidentPlace },
    { key: 'incidentSummary', label: '사건 경위', value: draft.incidentSummary, animateKey: animatedFields?.incidentSummary },
    { key: 'damage', label: '피해·손해', value: draft.damage, animateKey: animatedFields?.damage },
    { key: 'evidence', label: '증거자료', value: draft.evidence, animateKey: animatedFields?.evidence },
    { key: 'reason', label: '고소 이유', value: draft.reason, animateKey: animatedFields?.reason },
    { key: 'request', label: '처벌 희망·요청', value: draft.request, animateKey: animatedFields?.request },
    { key: 'relatedCase', label: '관련 사건', value: draft.relatedCase, animateKey: animatedFields?.relatedCase },
  ]

  const firstMarks: Position[] = []
  const secondMarks: Position[] = []
  const addMark = (target: Position[], left: number, top: number) => target.push({ left: `${left}%`, top: `${top}%`, width: '2.3%', height: '1.6%' })
  if (type === 'fraud') {
    if (fraudAmountForForm(draft.damage)) addMark(secondMarks, 37.1, 16.3)
    else if (/모름|알 수 없|불명/u.test(draft.damage)) addMark(secondMarks, 37.1, 18.5)
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
      가정: [37.1, 57.9], 교제: [51.1, 57.9], 아동: [74.5, 57.9], 학교: [37.1, 60.2], 노인: [51.1, 60.2], 의료: [67.1, 60.2], 항공: [37.1, 62.4], 운전자: [57.1, 62.4], 일반: [74.2, 62.4],
    }
    const relationship: Record<string, [number, number]> = { 배우자: [37.1, 65.2], 가족: [50.1, 65.2], 연인: [68.4, 65.2], 친구: [37.1, 67.5], 모르는사람: [47.8, 67.5], 기타: [65, 67.5] }
    const markChoice = (selected: string | undefined, table: Record<string, [number, number]>, target = firstMarks) => {
      if (!selected) return
      const match = Object.entries(table).find(([label]) => selected.replace(/\s/g, '').includes(label))
      if (match) addMark(target, ...match[1])
    }
    markChoice(draft.selections.assaultType, assaultType)
    markChoice(draft.selections.assaultRelation, relationship)
    const injuryMark: Record<string, [number, number]> = { 부어오름: [37.1, 84.7], 피가남: [51.1, 84.7], 뼈가부러짐: [64, 84.7], 멍: [37.1, 86.7], 외부상처없음: [45, 86.7], 기타: [37.1, 88.7] }
    const condition = draft.selections.assaultCondition?.replace(/\s/g, '')
    const conditionMatch = Object.entries(injuryMark).find(([label]) => condition?.includes(label))
    if (conditionMatch) addMark(firstMarks, ...conditionMatch[1])
    const methodMark: Record<string, [number, number]> = { 멱살: [37.1, 9], 밀침: [56.1, 9], 잡아당김: [69, 9], 주먹: [37.1, 11.2], 발로: [56.1, 11.2], 물건: [37.1, 13.3], 흉기: [37.1, 15.5], 기타: [37.1, 17.6] }
    const method = draft.selections.assaultMethod?.replace(/\s/g, '')
    const methodMatch = Object.entries(methodMark).find(([label]) => method?.includes(label))
    if (methodMatch) addMark(secondMarks, ...methodMatch[1])
    const hospital = draft.selections.assaultHospital
    if (hospital === '치료받음') addMark(secondMarks, 37.1, 20.1)
    if (hospital === '치료받지 않음') addMark(secondMarks, 68.1, 20.1)
    const mutual = draft.selections.assaultMutual?.replace(/\s/g, '')
    const mutualOptions: Record<string, [number, number]> = {
      저도때렸습니다: [37.1, 22.5], 벗어나기위해힘을행사했습니다: [37.1, 24.5], 전혀때리지않았습니다: [37.1, 26.5], 모름: [37.1, 28.5],
    }
    const mutualMatch = Object.entries(mutualOptions).find(([label]) => mutual?.includes(label))
    if (mutualMatch) addMark(secondMarks, ...mutualMatch[1])
  }
  if (type === 'defamation') {
    const channel = draft.selections.defamationChannel
    const channelMarks: Record<string, [number, number]> = {
      직접들음: [39, 63.4], 인터넷: [39, 65.7], 메신저: [39, 68.2], 게임채팅: [39, 70.5], 출판물: [39, 72.8], 기타: [39, 75.2],
    }
    const channelMark = Object.entries(channelMarks).find(([label]) => channel?.replace(/\s/g, '').includes(label))
    if (channelMark) addMark(firstMarks, ...channelMark[1])
    const knownHow = draft.selections.defamationKnownHow
    const howMarks: Record<string, [number, number]> = { 직접들음: [39, 76.7], 직접목격: [53, 76.7], 지인이알려줌: [39, 79], 기타: [53, 79] }
    const howMark = Object.entries(howMarks).find(([label]) => knownHow?.replace(/\s/g, '').includes(label))
    if (howMark) addMark(firstMarks, ...howMark[1])
    const publicity = draft.selections.defamationPublicity
    if (publicity?.includes('여러 명')) addMark(secondMarks, 38, 9)
    if (publicity?.includes('고소인만')) addMark(secondMarks, 38, 11)
    const civil = draft.selections.civilCase
    if (civil === '진행 중') addMark(secondMarks, 38, 17.7)
    if (civil === '진행하지 않음') addMark(secondMarks, 38, 19.8)
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
    if (/영상|사진/.test(evidenceText)) addMark(secondMarks, 38, 22)
    if (/목격자|진술서/.test(evidenceText)) addMark(secondMarks, 57, 22)
    if (/자료없음|없음/.test(evidenceText)) addMark(secondMarks, 76, 22)
  }
  if (type === 'assault') {
    if (/진단서|병원/.test(evidenceText)) addMark(secondMarks, 38.1, 35.3)
    if (/상처사진|사진/.test(evidenceText)) addMark(secondMarks, 48.9, 35.3)
    if (/문자|통화/.test(evidenceText)) addMark(secondMarks, 62.5, 35.3)
    if (/영상|폭행영상/.test(evidenceText)) addMark(secondMarks, 38.1, 37.3)
    if (/목격자|진술서/.test(evidenceText)) addMark(secondMarks, 55.9, 37.3)
    if (/자료없음|없음/.test(evidenceText)) addMark(secondMarks, 72.5, 37.3)
  }
  const wantsPunishment = /처벌.{0,12}(원|희망)/.test(draft.request) && !draft.request.includes('원하지')
  const doesNotWantPunishment = draft.request.includes('원하지')
  if (type === 'fraud' && (wantsPunishment || doesNotWantPunishment)) addMark(secondMarks, 37, wantsPunishment ? 20.6 : 22.8)
  if (type === 'defamation' && (wantsPunishment || doesNotWantPunishment)) addMark(secondMarks, 38, wantsPunishment ? 13.1 : 15.5)
  if (type === 'assault' && (wantsPunishment || doesNotWantPunishment)) addMark(secondMarks, 37.1, wantsPunishment ? 30.9 : 32.9)
  const checklistRows: Record<Exclude<ComplaintType, 'general'>, Record<string, number>> = {
    fraud: { fraudFamily: 48.1, fraudLivedTogether: 50.6, fraudKnewLong: 53, fraudContactable: 55.5, fraudPreviousTrade: 58.8, fraudPromise: 63.1, previousComplaint: 67.4, withdrawnComplaint: 71.6 },
    defamation: { defamationFamily: 37.3, defamationKnown: 39.6, defamationIdentifiable: 42.8, defamationReputation: 46.8, defamationPublicPlace: 49.8, defamationOthersKnew: 52.8, defamationOneToOne: 57.7, previousComplaint: 66.6 },
    assault: { assaultSudden: 52.9, assaultArgument: 55.6, assaultWitness: 58.3, assaultCctv: 60.9, assaultWithdraw: 64.4, previousComplaint: 68.7, withdrawnComplaint: 72.9 },
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
    const truthMark: Record<string, [number, number]> = { 사실: [38, 89], '사실 아님': [54, 89], 모름: [75, 89] }
    const selectedTruth = Object.entries(truthMark).find(([label]) => truth?.replace(/\s/g, '') === label.replace(/\s/g, ''))
    if (selectedTruth) addMark(firstMarks, ...selectedTruth[1])
  }

  return <div className="document-print-root official-document" aria-label={`${templateLabels[type]} 경찰청 간이 고소장 미리보기`}>
    <div className="official-form-note">{details.containsDummyData === 'true' ? '더미 데이터가 포함된 시연용 문서 · ' : ''}경찰청 원본 서식 · 입력한 내용은 빈칸에 표시됩니다{needsAttachment ? ' · 별지 포함' : ''}</div>
    <OfficialPage src={officialPages[type][0]} pageNumber={1} fields={[...makeFields(firstPositions), ...dateTimeFields]} marks={firstMarks} animatedFields={animatedFields} onFieldClick={onFieldClick} />
    <OfficialPage src={officialPages[type][1]} pageNumber={2} fields={makeFields(secondPositions)} marks={secondMarks} animatedFields={animatedFields} onFieldClick={onFieldClick} />
    {needsAttachment && <article className="paper official-attachment">
      <h1>별지 · 사건 경위 및 추가 내용</h1>
      <p className="document-note">원본 양식에 들어가지 않거나 칸을 넘는 내용은 빠짐없이 별지에 정리했습니다. 제출 전 사실과 표현을 확인해주세요.</p>
      <div className="document-table">
        {attachmentRows.filter(({ value }) => value).map(({ key, label, value, animateKey }) => <Row key={key} label={label} value={value} animateKey={animateKey} tall={['complainantAddress', 'accusedAddress', 'incidentSummary', 'evidence', 'reason', 'request'].includes(key)} onClick={() => onFieldClick(key)} />)}
      </div>
      <div className="document-signature"><span>고소인: <Value value={draft.complainantName} animateKey={animatedFields?.complainantName} /> (인)</span></div>
    </article>}
    <div className="official-source"><a href={officialFormSource} target="_blank" rel="noreferrer">경찰청 원본 서식 출처</a> · {checklistQuestions[type].length}개 체크리스트 항목도 원본에 포함되어 있습니다.</div>
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
  </article></div>
}
