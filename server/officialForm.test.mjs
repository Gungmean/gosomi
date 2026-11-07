import test from 'node:test'
import assert from 'node:assert/strict'
import { getOfficialDocumentModel, selectedFormValues } from '../shared/officialForm.mjs'
import { normalizeSupplementalData } from '../shared/draftData.mjs'

const base = { type: 'assault', selections: {}, documentDetails: {}, evidence: '', request: '', damage: '' }
test('폭행의 여러 부위 상태·방법·증거를 각각 원본에 모두 표시한다', () => {
  const pages = getOfficialDocumentModel({ ...base, selections: { assaultCondition: '멍 | 피가 남', assaultMethod: '밀침 | 물건을 던짐', evidenceTypes: '진단서 | 상처 사진' }, documentDetails: { assaultObject: '컵' } })
  assert.deepEqual(pages[0].marks.map((item) => item.option), ['피가 남', '멍'])
  assert.deepEqual(pages[1].marks.map((item) => item.option), ['밀침', '물건을 던짐', '진단서', '상처 사진'])
  assert.equal(pages[1].fields.find((item) => item.field === 'details.assaultObject').value, '컵')
})
test('새 명예훼손 체크리스트 2개의 예·아니오·모름을 원본에 표시한다', () => {
  for (const answer of ['예', '아니오', '모름']) {
    const page = getOfficialDocumentModel({ ...base, type: 'defamation', selections: { defamationWithdraw: answer, withdrawnComplaint: answer } })[1]
    assert.deepEqual(page.marks.map((item) => item.field), ['defamationWithdraw', 'withdrawnComplaint'])
    assert.ok(page.marks.every((item) => item.option === answer))
  }
})
test('처벌 미정이나 수동으로 지운 증거는 자동 선택하지 않는다', () => {
  assert.equal(selectedFormValues({ ...base, request: '처벌 의사는 아직 미정입니다.' }).punishment, undefined)
  assert.equal(selectedFormValues({ ...base, evidence: '상처 사진', manualSelections: ['evidenceTypes'], selections: { evidenceTypes: '' } }).evidenceTypes, '')
})
test('작성일과 피해 시간은 원본의 각 연월일·시분 칸으로 분리된다', () => {
  const pages = getOfficialDocumentModel({ ...base, incidentDate: '2026. 11. 7.', incidentTime: '오후 3시 20분', documentDetails: { writtenDate: '2026. 11. 8.' } })
  assert.deepEqual(pages[0].fields.filter((item) => item.field === 'incidentTime').map((item) => item.value), ['15', '20'])
  assert.deepEqual(pages[1].fields.filter((item) => item.field === 'details.writtenDate').map((item) => item.value), ['2026', '11', '8'])
})
test('예전 대화·QR도 추가 명단 기본값을 갖고 긴 내용은 손실 없이 유지된다', () => {
  assert.deepEqual(normalizeSupplementalData({}).additionalIncidents, [])
  const text = '전체 피해사실 '.repeat(3000)
  assert.equal(normalizeSupplementalData({ additionalIncidents: [{ summary: text }] }).additionalIncidents[0].summary, text)
})
