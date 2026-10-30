import { typeQuestions, checklistQuestions } from '../shared/formQuestions.mjs'

export const complaintIntakeSteps = [
  { field: 'incidentDate', text: '사건이 발생한 날짜를 알고 계신가요? 연·월·일 중 기억나는 범위만 적어도 됩니다.' },
  { field: 'incidentTime', text: '사건이 발생한 시간대를 기억하시나요? 정확한 시각을 모르면 건너뛰어도 됩니다.' },
  { field: 'incidentPlace', text: '사건이 발생한 장소나 거래 앱·사이트를 알려주세요.' },
  { field: 'incidentSummary', text: '어떤 일이 있었는지 기억나는 순서대로 한두 문장으로 설명해 주세요.' },
  { field: 'damage', text: '이번 일로 실제로 입거나 부담한 피해가 무엇인가요? 금액이 아직 불확실하면 그렇게 적어도 됩니다.' },
  { field: 'reason', text: '고소를 통해 확인하거나 해결하고 싶은 점이 있나요? 아직 정하지 않았다면 건너뛰어도 됩니다.' },
  { field: 'evidence', text: '현재 가지고 있거나 확보할 수 있는 자료는 무엇인가요? 예: 대화 캡처, 이체 내역, 사진, 목격자.' },
  { field: 'request', text: '처벌에 관한 의사를 정하셨나요? 아직 정하지 않았다면 건너뛰어도 됩니다.' },
  { field: 'relatedCase', text: '같은 사건으로 신고·수사·재판이 진행 중이거나 접수한 적이 있나요? 모르면 건너뛰어도 됩니다.' },
]

const identitySteps = [
  ['complainantName', '고소인의 성명을 알려주세요. 직접 입력하거나 건너뛰어도 됩니다.'],
  ['complainantAddress', '고소인의 주소를 알려주세요. 미리보기에서 직접 입력하거나 건너뛰어도 됩니다.'],
  ['complainantPhone', '고소인의 연락처를 알려주세요. 직접 입력하거나 건너뛰어도 됩니다.'],
  ['accusedName', '상대방의 성명을 알고 계신가요? 모르면 건너뛰어도 됩니다.'],
  ['accusedAddress', '알고 있는 상대방 주소가 있나요? 모르면 건너뛰어도 됩니다.'],
  ['accusedPhone', '알고 있는 상대방 연락처가 있나요?'],
  ['accusedOnlineId', '상대방의 아이디나 닉네임을 알고 계신가요?'],
  ['accusedAccount', '상대방 계좌 정보를 알고 계신가요? 모르면 건너뛰어도 됩니다.'],
].map(([field, text]) => ({ field, text }))
const selectionSteps = Object.fromEntries(Object.keys(typeQuestions).map(type => [type, [
  ...typeQuestions[type].map(item => ({ field: item.id, text: `${item.label}을 알려주세요. ${item.options.join(' / ')}`, selection: true })),
  ...(type === 'assault' ? [{ field: 'assaultBodyPart', text: '폭행을 당한 부위를 알려주세요.', selection: true }] : []),
  ...checklistQuestions[type].map(item => ({ field: item.id, text: item.label, selection: true, answerType: 'yes_no' })),
]]))
const stepsByField = new Map([...identitySteps, ...complaintIntakeSteps, ...Object.values(selectionSteps).flat()].map((step) => [step.field, step]))

function isSkipAnswer(value, field) {
  const text = String(value || '').trim().toLowerCase().replace(/[.!。！？?\s]/g, '')
  if (!text) return true
  if (text === '모름/건너뛰기') return true
  if (/^(모름|잘모르겠어요|잘모르겠습니다|모르겠어요|모르겠습니다|건너뛰기|건너뛸게요|나중에직접입력|아직정하지않았어요|아직정하지않았습니다|정하지않았어요|정하지않았습니다|skip|unknown|없음|없어요|없습니다|해당없음)$/.test(text)) return true
  if (field === 'evidence' && /^(증거|증거자료|자료)(는|가)?(없어요|없습니다|없음)$/.test(text)) return true
  if (field === 'relatedCase' && /^(신고|수사|재판|접수한적)(는|가)?(없어요|없습니다|없음)$/.test(text)) return true
  return false
}

function valueForAnswer(field, answer) {
  const text = String(answer?.text || '').trim()
  if (answer?.choice === 'unknown' || isSkipAnswer(text, field)) {
    if (field === 'evidence' && /없/.test(text)) return '현재 확보한 증거 자료 없음'
    if (field === 'relatedCase' && /없/.test(text)) return '관련 신고·수사·재판 없음'
    return ''
  }
  if (answer?.choice === 'no') return '아니오'
  if (answer?.choice === 'yes') return text || '예'
  return text
}

export function collectSubmittedIntake(messages) {
  const answers = new Map()
  for (const message of Array.isArray(messages) ? messages : []) {
    if (message?.role !== 'assistant' || !message.followUpSubmitted) continue
    for (const question of message.followUpQuestions || []) {
      if (!stepsByField.has(question?.id)) continue
      const value = valueForAnswer(question.id, message.followUpAnswers?.[question.id] || {})
      answers.set(question.id, value)
    }
  }
  return { answeredFields: new Set(answers.keys()) }
}

function answerChoiceValue(answer, value) {
  return answer?.choice === 'yes' ? '예' : answer?.choice === 'no' ? '아니오' : answer?.choice === 'unknown' ? '모름' : value
}

export function applyCurrentIntakeAnswer(draftPatch, draft, intakeSubmission) {
  const field = String(intakeSubmission?.questionId || '')
  if (!stepsByField.has(field)) return draftPatch
  const value = valueForAnswer(field, { text: intakeSubmission?.text, choice: intakeSubmission?.choice })
  const nextPatch = { ...draftPatch }
  if (stepsByField.get(field).selection) {
    const selectionValue = answerChoiceValue(intakeSubmission, value)
    nextPatch.selections = { ...draft?.selections, ...nextPatch.selections, [field]: selectionValue }
  } else if (value) nextPatch[field] = value
  else if (!String(draft?.[field] || '').trim()) delete nextPatch[field]
  return nextPatch
}

export function isSimpleIntakeSubmission(intakeSubmission) {
  const field = String(intakeSubmission?.questionId || '')
  if (!stepsByField.has(field)) return false
  const choice = intakeSubmission?.choice
  const answer = String(intakeSubmission?.text || '').trim()
  if (choice === 'unknown') return true
  if ((choice === 'yes' || choice === 'no') && !answer) return true
  if (choice === 'yes' || choice === 'no') return false
  if (isSkipAnswer(answer, field)) return true
  // A short value for one form cell can be entered directly. Longer narratives
  // still go through the model so details in other fields are not overlooked.
  return answer.length > 0 && answer.length <= 50
    && !/[\n?？]|(?:그리고|또한|하지만|그런데|참고로|추가로)/u.test(answer)
    && !/[,.，、].{4,}/u.test(answer)
    && !/(?:입니다|이에요|예요|아니라|수정|정정|바꿔|같아요)/u.test(answer)
}

export function nextComplaintIntakeQuestion(draft, messages) {
  const conversation = Array.isArray(messages) ? messages : []
  const latestUserText = [...conversation].reverse().find((message) => message?.role === 'user')?.text || ''
  const describesCase = /고소장.{0,8}(작성|초안)|고소.{0,8}(하고 싶|하려)|피해|사건|사기|폭행|명예훼손|모욕|경찰.{0,8}(연락|신고)|돈을 보냈|이체|계약/.test(latestUserText) || latestUserText.trim().length >= 70
  const submitted = collectSubmittedIntake(conversation)
  const hasSubmittedIntake = conversation.some((message) => message?.role === 'assistant' && message.followUpSubmitted && (message.followUpQuestions || []).some((question) => stepsByField.has(question?.id)))
  const hasDraft = complaintIntakeSteps.some(step => String(draft?.[step.field] || '').trim())
  if (!describesCase && !hasSubmittedIntake && !hasDraft) return null

  const steps = [...identitySteps, ...complaintIntakeSteps, ...(selectionSteps[draft?.type] || [])]
  const next = steps.find((step) => !String((step.selection ? draft?.selections?.[step.field] : draft?.[step.field]) || '').trim() && !submitted.answeredFields.has(step.field))
  if (!next) return null
  return [{ id: next.field, text: next.text, answerType: next.answerType || 'text', placeholder: '답변을 입력하거나 아래 버튼으로 건너뛸 수 있어요' }]
}

export function alignMessageWithIntakeQuestion(message, questions) {
  if (!questions?.length) return message
  const currentField = questions[0]?.id
  const currentFieldPattern = currentField === 'incidentDate' ? /날짜|일시/u
    : currentField === 'incidentTime' ? /시간/u
      : currentField === 'incidentPlace' ? /장소|앱|사이트/u
        : currentField === 'incidentSummary' ? /경위|어떤 일이/u
          : currentField === 'damage' ? /피해|금액/u
            : currentField === 'reason' ? /고소 이유|해결/u
              : currentField === 'evidence' ? /증거|자료/u
                : currentField === 'request' ? /처벌 의사|처벌/u
                  : currentField === 'relatedCase' ? /관련 신고|수사|재판/u
                    : null
  const sentences = String(message || '').match(/[^\n.!?。！？]+[.!?。！？]?/gu) || []
  const kept = sentences.filter((sentence) => {
    const text = sentence.trim()
    if (!text) return false
    if (/[?？]|(?:인가요|나요|까요|습니까|습니까요|주시겠어요|알려주세요|말씀해주세요)[.!。！？]?$/u.test(text)) return false
    if (/(?:다음(?:으로|은|에)|확인할\s*(?:사항|항목|내용)|(?:마지막|다음|추가)\s*(?:확인\s*)?질문)/u.test(text)) return false
    if (/(?:고소장|초안).*(?:완성|모두\s*채워|마무리)/u.test(text)) return false
    if (/^[（(]\s*예[:：]/u.test(text)) return false
    if (currentFieldPattern?.test(text) && /(?:초안|고소장).*(?:기재|반영|작성|입력|적어|넣)/u.test(text)) return false
    return true
  })
  return kept.join(' ').trim() || '말씀해 주신 내용을 초안에 반영했습니다.'
}
