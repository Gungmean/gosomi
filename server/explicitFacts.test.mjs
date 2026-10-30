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
