import test from 'node:test'
import assert from 'node:assert/strict'
import app from './index.mjs'

test('채팅 API는 대화로 새 체크리스트와 세부 빈칸을 채우고 체크리스트를 다시 묻지 않는다', async (t) => {
  const realFetch = globalThis.fetch
  let prompt = ''
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).startsWith('https://api.openai.com/')) {
      prompt = JSON.parse(options.body).messages[0].content
      return Response.json({ choices: [{ message: { content: JSON.stringify({ message: '말씀하신 사건을 정리했습니다.', draftPatch: { selections: { defamationWithdraw: '예', withdrawnComplaint: '아니오', defamationIdentifiable: '예', defamationQuote: '거짓말쟁이' }, selectionEvidence: { defamationWithdraw: '합의하면 고소를 취소할 생각입니다.', withdrawnComplaint: '고소를 취소한 적은 없어요.' }, documentDetails: { accusedSite: '예시 게시판', complainantResidentId: '금지' } }, questions: [] }) } }] })
    }
    return realFetch(url, options)
  })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  try {
    const response = await realFetch(`http://127.0.0.1:${server.address().port}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        settings: { provider: 'openai', model: 'gpt-4.1-mini', apiKey: 'sk-test-key-not-real' }, caseMode: 'complainant',
        draft: { type: 'defamation', incidentDate: '2026. 11. 1.', incidentPlace: '게시판', incidentSummary: '비방 게시물', damage: '평판 피해', evidence: '게시물 캡처', selections: {}, documentDetails: { complainantResidentId: 'PRIVATE_TEST_SENTINEL' } },
        messages: [{ role: 'user', text: '합의하면 고소를 취소할 생각입니다. 고소를 취소한 적은 없어요. 예시 게시판에 거짓말쟁이라고 썼어요.' }],
      }),
    })
    const result = await response.json()
    assert.equal(response.status, 200)
    assert.equal(result.draftPatch.selections.defamationWithdraw, '예')
    assert.equal(result.draftPatch.selections.withdrawnComplaint, '아니오')
    assert.equal(result.draftPatch.selections.defamationIdentifiable, undefined)
    assert.equal(result.draftPatch.documentDetails.accusedSite, '예시 게시판')
    assert.equal(result.draftPatch.documentDetails.complainantResidentId, undefined)
    assert.deepEqual(result.followUpQuestions, [])
    assert.ok(prompt.includes('원만히 해결되면 고소를 취소할 의사가 있나요?'))
    assert.ok(!prompt.includes('PRIVATE_TEST_SENTINEL'))
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
