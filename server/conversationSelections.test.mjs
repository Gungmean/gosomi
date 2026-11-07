import test from 'node:test'
import assert from 'node:assert/strict'
import { applyConversationSelections } from './conversationSelections.mjs'
import { nextComplaintIntakeQuestion } from './complaintIntake.mjs'

const run = (type, text, draft = {}, patch = {}) => applyConversationSelections(patch, { type, ...draft }, [{ role: 'user', text }])

test('폭행 설명에서 목격자·CCTV·다툼을 질문 없이 반영하고 근거를 보존한다', () => {
  const result = run('assault', '갑자기 폭행했습니다. 말싸움은 없었어요. 목격자가 있었어요. CCTV는 없었습니다.')
  assert.equal(result.selections.assaultSudden, '예')
  assert.equal(result.selections.assaultArgument, '아니오')
  assert.equal(result.selections.assaultWitness, '예')
  assert.equal(result.selections.assaultCctv, '아니오')
  assert.equal(result.selectionEvidence.assaultCctv, 'CCTV는 없었습니다')
  assert.equal(result.selections.previousComplaint, undefined)
})

test('새 명예훼손 체크리스트의 미래 취소 의사와 과거 취소 이력을 구분한다', () => {
  const result = run('defamation', '합의하면 고소를 취소할 생각입니다. 고소를 취소한 적은 없어요.')
  assert.equal(result.selections.defamationWithdraw, '예')
  assert.equal(result.selections.withdrawnComplaint, '아니오')
})

test('근거 없는 모델 체크, 도우미 발언, 불확실한 표현은 체크하지 않는다', () => {
  assert.equal(run('assault', '피해를 입었습니다.', {}, { selections: { assaultCctv: '예' } }).selections, undefined)
  assert.equal(run('assault', 'CCTV가 있는지 모르겠어요. 목격자가 없을 수도 있어요.').selections, undefined)
  const result = applyConversationSelections({}, { type: 'assault' }, [{ role: 'assistant', text: 'CCTV가 있었습니다.' }])
  assert.equal(result.selections, undefined)
})

test('정확한 사용자 원문이 근거인 모델 체크만 수용한다', () => {
  const result = run('defamation', '직장 동료들이 게시물을 모두 읽었습니다.', {}, { selections: { defamationOthersKnew: '예' }, selectionEvidence: { defamationOthersKnew: '직장 동료들이 게시물을 모두 읽었습니다.' } })
  assert.equal(result.selections.defamationOthersKnew, '예')
  assert.equal(run('defamation', '게시물을 봤어요.', {}, { selections: { defamationOthersKnew: '예' }, selectionEvidence: { defamationOthersKnew: '다른 사람들이 봤어요.' } }).selections, undefined)
})

test('직접 고친 값과 직접 지운 값은 자동 추출로 덮어쓰지 않는다', () => {
  for (const value of ['아니오', '']) {
    const result = run('assault', 'CCTV가 있었습니다.', { manualSelections: ['assaultCctv'], selections: { assaultCctv: value } }, { selections: { assaultCctv: '예' }, selectionEvidence: { assaultCctv: 'CCTV가 있었습니다.' } })
    assert.equal(result.selections?.assaultCctv, undefined)
  }
})

test('핵심 내용이 채워지면 미확인 체크리스트를 대화에서 묻지 않는다', () => {
  const draft = { type: 'defamation', incidentDate: '2026. 11. 1.', incidentPlace: '게시판', incidentSummary: '비방 게시물', damage: '평판 피해', evidence: '캡처', selections: {} }
  assert.equal(nextComplaintIntakeQuestion(draft, [{ role: 'user', text: '다음' }]), null)
})

test('유사 단어나 부정문을 관계·식별 정보로 오인하지 않는다', () => {
  const result = run('defamation', '상대방은 가족사진을 올렸습니다. 제 이름을 언급하지 않았어요.')
  assert.equal(result.selections?.defamationFamily, undefined)
  assert.equal(result.selections?.defamationIdentifiable, undefined)
  assert.equal(run('defamation', '피고소인은 모르는 사람이에요.').selections.defamationKnown, '아니오')
})
