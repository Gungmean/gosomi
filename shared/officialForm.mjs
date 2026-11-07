import { officialLayouts } from './officialLayout.mjs'
import { selectedOptions } from './formQuestions.mjs'

export function dateParts(value) {
  const full = String(value || '').match(/(\d{4})\s*(?:년|[./-])\s*(\d{1,2})\s*(?:월|[./-])\s*(\d{1,2})/u)
  const partial = full ? null : String(value || '').match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/u)
  const month = Number(full?.[2] || partial?.[1]), day = Number(full?.[3] || partial?.[2])
  if (!month || month > 12 || !day || day > 31) return { year: '', month: '', day: '' }
  return { year: full?.[1] || '', month: String(month), day: String(day) }
}

export function timeParts(value) {
  const source = String(value || '')
  const match = source.match(/(\d{1,2}):(\d{2})/u) || source.match(/(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/u)
  if (!match) return { hour: '', minute: '' }
  let hour = Number(match[1]); const minute = match[2] || ''
  if (/오후|저녁|밤/u.test(source) && hour < 12) hour += 12
  if (/오전|아침|새벽/u.test(source) && hour === 12) hour = 0
  if (hour > 23 || Number(minute) > 59) return { hour: '', minute: '' }
  return { hour: String(hour).padStart(2, '0'), minute: minute ? minute.padStart(2, '0') : '' }
}

export function selectedFormValues(draft) {
  const values = { ...draft.selections }
  const manual = new Set(draft.manualSelections || [])
  if (!values.damageKnown && !manual.has('damageKnown') && draft.damage) values.damageKnown = /모름|알 수 없|불명/u.test(draft.damage) ? '모름' : /\d.*원/u.test(draft.damage) ? '금액 확인' : ''
  if (!values.punishment && !manual.has('punishment') && draft.request) {
    if (/처벌.{0,12}(원하지|희망하지|바라지)/u.test(draft.request)) values.punishment = '처벌을 원하지 않음'
    else if (/처벌.{0,12}(원|희망|바랍|바라)/u.test(draft.request)) values.punishment = '처벌을 원함'
  }
  if (!values.evidenceTypes && !manual.has('evidenceTypes')) {
    const text = String(draft.evidence || '')
    const has = (pattern) => {
      for (const clause of text.split(/[,，.\n]|그리고|하지만/u)) {
        const match = clause.match(pattern)
        if (!match) continue
        const suffix = clause.slice(match.index + match[0].length)
        if (/^.{0,8}(?:없|않|미확보|못)/u.test(suffix)) continue
        return true
      }
      return false
    }
    const options = []
    if (/^(?:현재\s*)?(?:확보한\s*)?(?:증거\s*)?(?:자료|증거자료|증거)(?:는|가)?\s*없(?:음|어요|습니다|다)?[.\s]*$/u.test(text)) options.push('자료 없음')
    else if (draft.type === 'fraud') {
      if (has(/차용증/u)) options.push('차용증')
      if (has(/계좌거래|이체\s*내역|송금\s*내역|입금\s*내역/u)) options.push('계좌거래내역')
      if (has(/계약서/u)) options.push('계약서 등')
      if (has(/문자|통화|대화|메신저|채팅|캡처/u)) options.push('문자·통화내역')
    } else if (draft.type === 'defamation') {
      if (has(/영상|사진|캡처/u)) options.push('모욕 영상·사진')
      if (has(/목격자\s*진술서/u)) options.push('목격자 진술서')
    } else if (draft.type === 'assault') {
      if (has(/진단서/u)) options.push('진단서')
      if (has(/상처\s*사진/u)) options.push('상처 사진')
      if (has(/문자|통화/u)) options.push('문자·통화내역')
      if (has(/폭행\s*(영상|사진)|CCTV\s*영상/u)) options.push('폭행 영상·사진')
      if (has(/목격자\s*진술서/u)) options.push('목격자 진술서')
    }
    values.evidenceTypes = options.join(' | ')
  }
  return values
}

export function getOfficialDocumentModel(draft) {
  const layout = officialLayouts[draft.type]
  if (!layout) return null
  const selections = selectedFormValues(draft)
  const details = draft.documentDetails || {}
  const bank = String(draft.accusedAccount || '').match(/(?:[가-힣A-Za-z]{2,20}(?:은행|뱅크|증권|금고))|농협|수협|우체국/u)?.[0] || ''
  const account = String(draft.accusedAccount || '').match(/[0-9Xx*＊][0-9Xx*＊-]{4,40}[0-9Xx*＊]/u)?.[0] || draft.accusedAccount || ''
  const amount = String(draft.damage || '').match(/(\d[\d,]*(?:\.\d+)?\s*(?:억|천만|백만|십만|만|천|백)?)(?=\s*원)/u)?.[1].replace(/\s+/g, '') || ''
  return layout.pages.map((number, index) => ({
    number,
    fields: layout.texts[index].filter((item) => !item.when || selectedOptions(selections[item.when]).includes(item.option)).map((item) => {
      let value = item.field.startsWith('details.') ? details[item.field.slice(8)] || ''
        : item.field.startsWith('selections.') ? selections[item.field.slice(11)] || ''
          : item.field === 'accusedBank' ? bank : item.field === 'accusedAccount' ? account
            : item.field === 'damage' ? amount : draft[item.field] || ''
      if (item.part) value = (item.field === 'incidentTime' ? timeParts(value) : dateParts(value))[item.part] || ''
      if (item.recipient && value) value = `${value.replace(/\s*귀중\s*$/u, '')} 귀중`
      return { ...item, value }
    }),
    marks: layout.choices.filter((item) => item.page === index && selectedOptions(selections[item.field]).includes(item.option)),
  }))
}
