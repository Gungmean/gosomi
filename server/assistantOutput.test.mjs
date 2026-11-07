import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanAssistantMetadata, extractAssistantQuestions } from '../shared/assistantOutput.mjs'

test('JSON 배열로 노출된 질문 메타데이터를 추가 질문 카드 데이터로 복구한다', () => {
  const text = 'searchQuery: 폭행 피해 고소\nquestions: [{ "id": "incidentDate", "text": "사건이 발생한 날짜를 알려주세요.", "answerType": "text" }]'
  assert.deepEqual(extractAssistantQuestions(text).map(({ id, text: question, answerType }) => ({ id, text: question, answerType })), [
    { id: 'incidentDate', text: '사건이 발생한 날짜를 알려주세요.', answerType: 'text' },
  ])
  assert.equal(cleanAssistantMetadata(text), '')
})

test('일반 문장 아래에 출력된 질문도 복구하고 화면 문장에서 메타데이터를 제거한다', () => {
  const text = '말씀하신 내용을 작성에 반영하겠습니다.\n\n---\nquestions:\n폭행이 발생한 날짜와 장소를 알려주실 수 있나요? (answerType: text)'
  assert.equal(cleanAssistantMetadata(text), '말씀하신 내용을 작성에 반영하겠습니다.')
  assert.deepEqual(extractAssistantQuestions(text).map(({ id, answerType }) => ({ id, answerType })), [
    { id: 'incidentDate', answerType: 'text' },
  ])
})
