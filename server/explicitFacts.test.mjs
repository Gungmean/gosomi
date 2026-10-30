import test from 'node:test'
import assert from 'node:assert/strict'
import { enrichAccusedAccount, extractAccusedIdentity } from './explicitFacts.mjs'
import { supplementExplicitFacts } from './index.mjs'

test('extracts the seller nickname without the Korean case particle', () => {
  assert.equal(
    extractAccusedIdentity('중고거래 앱에서 판매자 닉네임 별빛에게 5만 원을 이체했습니다.').accusedOnlineId,
    '별빛',
  )
})

test('extracts an explicitly supplied nickname and masked transfer account', () => {
  const facts = extractAccusedIdentity('판매자 닉네임은 푸른바다였고 카카오뱅크 계좌번호(3333-XX-XXXXXXX, 예금주 박나리)로 입금했습니다.')
  assert.equal(facts.accusedOnlineId, '푸른바다')
  assert.equal(facts.accusedAccount, '카카오뱅크 3333-XX-XXXXXXX (예금주 박나리)')
  assert.equal(facts.accusedName, undefined)
})

test('extracts explicitly labelled name and contact number', () => {
  const facts = extractAccusedIdentity('피고소인 이름은 홍길동이고 연락처는 010-1234-5678입니다.')
  assert.equal(facts.accusedName, '홍길동')
  assert.equal(facts.accusedPhone, '010-1234-5678')
})

test('extracts both seller identifiers from the short demonstration prompt', () => {
  const facts = extractAccusedIdentity('판매자 이름은 박민준이고 닉네임은 별빛상점입니다. 2026년 9월 5일 중고거래 앱에서 송금했습니다.')
  assert.equal(facts.accusedName, '박민준')
  assert.equal(facts.accusedOnlineId, '별빛상점')
})

test('does not classify the complainant account as an accused account', () => {
  assert.equal(extractAccusedIdentity('판매자에게 송금했지만 제 계좌번호 123-456-7890은 알려주지 않았습니다.').accusedAccount, undefined)
})

test('fills the complaint draft even when the AI omitted explicit accused identity', () => {
  const result = { message: '사건을 정리했습니다.', draftPatch: {}, responsePatch: {} }
  const messages = [{ role: 'user', text: '판매자 닉네임은 푸른바다였고 카카오뱅크 계좌번호(3333-XX-XXXXXXX, 예금주 박나리)로 입금했습니다.' }]
  const supplemented = supplementExplicitFacts(result, messages, {}, {}, 'complainant')
  assert.equal(supplemented.draftPatch.accusedOnlineId, '푸른바다')
  assert.equal(supplemented.draftPatch.accusedAccount, '카카오뱅크 3333-XX-XXXXXXX (예금주 박나리)')
  assert.equal(supplemented.draftPatch.accusedName, undefined)
})

test('keeps bank and account holder when the AI returned only the number', () => {
  const explicit = '카카오뱅크 3333-XX-XXXXXXX (예금주 박나리)'
  assert.equal(enrichAccusedAccount('3333-XX-XXXXXXX, 박나리', explicit), explicit)
  assert.equal(enrichAccusedAccount('1111-22-333333', explicit), '1111-22-333333')
  const result = supplementExplicitFacts(
    { message: '사건을 정리했습니다.', draftPatch: { accusedAccount: '3333-XX-XXXXXXX, 박나리' }, responsePatch: {} },
    [{ role: 'user', text: '판매자 닉네임은 푸른바다였고 카카오뱅크 계좌번호(3333-XX-XXXXXXX, 예금주 박나리)로 입금했습니다.' }],
    {}, {}, 'complainant',
  )
  assert.equal(result.draftPatch.accusedAccount, explicit)
})

test('keeps a received-complaint demo grounded in the stated phone call and available records', () => {
  const text = '2026년 9월 15일 경찰에서 사기 혐의 고소장이 접수됐다고 전화했습니다. 고소장 원본은 아직 받지 못했습니다. 구매자는 중고거래한 물건을 받지 못했다고 주장하지만, 저는 물건을 발송했습니다. 정확한 출석 일정과 사건번호는 아직 확인하지 못했습니다. 택배 접수증과 채팅 기록을 보관하고 있습니다. 지금 먼저 확인할 일과 대응 메모를 정리해 주세요.'
  const result = supplementExplicitFacts(
    { message: '사용자에게 보일 충분하고 구체적인 한국어 답변', draftPatch: {}, responsePatch: {} },
    [{ role: 'user', text }], {}, {}, 'respondent',
  )
  assert.match(result.responsePatch.receivedDocument, /경찰 연락.*원본 미수령/u)
  assert.match(result.responsePatch.allegation, /사기 혐의/u)
  assert.match(result.responsePatch.appearanceDate, /미확인/u)
  assert.match(result.responsePatch.evidenceToPreserve, /택배 접수증, 채팅 기록/u)
  assert.match(result.message, /공식 대표번호/u)
  assert.doesNotMatch(result.responsePatch.confirmedFacts, /정리해 주세요/u)
  assert.doesNotMatch(result.responsePatch.confirmedFacts, /지금 먼저 확인할 일/u)
})
