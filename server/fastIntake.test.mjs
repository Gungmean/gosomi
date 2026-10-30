import test from 'node:test'
import assert from 'node:assert/strict'
import app from './index.mjs'

test('간단한 후속 답변은 AI 제공자 호출 없이 초안을 채우고 다음 질문으로 이동한다', async () => {
  const server = app.listen(0, '127.0.0.1')
  try {
    await new Promise((resolve) => server.once('listening', resolve))
    const address = server.address()
    const response = await fetch(`http://127.0.0.1:${address.port}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: { provider: 'openai', model: 'gpt-4.1-mini', apiKey: 'invalid-test-key' },
        caseMode: 'complainant',
        draft: { type: 'fraud', selections: {}, complainantName: '한서윤', complainantAddress: '서울', complainantPhone: '010-0000-0000', accusedName: '김도윤', incidentSummary: '중고거래 후 물건을 받지 못함' },
        messages: [
          { role: 'assistant', followUpSubmitted: true, followUpQuestions: [{ id: 'accusedAddress' }], followUpAnswers: { accusedAddress: { text: '모름 / 건너뛰기' } } },
          { role: 'user', text: '알고 있는 상대방 주소가 있나요? 답변: 모름 / 건너뛰기' },
        ],
        intakeSubmission: { questionId: 'accusedAddress', text: '모름 / 건너뛰기' },
      }),
    })
    const result = await response.json()
    assert.equal(response.status, 200)
    assert.equal(result.instant, true)
    assert.equal(result.followUpQuestions[0].id, 'accusedPhone')
    assert.equal(result.draftPatch.accusedAddress, undefined)
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
