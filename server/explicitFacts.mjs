const unknownValue = /^(?:모름|모릅니다|모르겠어요|없음|없습니다|미상)$/

function cleanIdentifier(value) {
  const cleaned = value
    .replace(/["'“”‘’]+$/g, '')
    .replace(/(?:이었는데|이었고|였으며|였는데|였어요|였고|이라는|이라고|에게|한테|라고|라는|이며|이고|입니다|이었음|였음)$/u, '')
  return cleaned.length >= 2 && !unknownValue.test(cleaned) ? cleaned : ''
}

/** Only copy identity details explicitly tied to the other party or a transfer recipient. */
export function extractAccusedIdentity(text) {
  const source = String(text || '')
  const result = {}
  const party = '(?:피고소인|판매자|상대방|가해자|피의자)'

  const nickname = source.match(new RegExp(`${party}(?:의)?[^\n.!?]{0,45}?(?:닉네임|아이디|ID)\\s*(?:은|는|이|가|:|：|=)?\\s*["'“‘]?([^\\s,.;()"“”‘’]{2,40})`, 'iu'))
  if (nickname) {
    const value = cleanIdentifier(nickname[1])
    if (value) result.accusedOnlineId = value
  }

  const name = source.match(new RegExp(`${party}(?:의)?\\s*(?:성명|실명|이름)\\s*(?:은|는|이|가|:|：)?\\s*([가-힣]{2,10})`, 'u'))
  if (name) {
    const value = cleanIdentifier(name[1])
    if (value) result.accusedName = value
  }

  const phone = source.match(new RegExp(`${party}(?:의)?[^\n.!?]{0,30}?(?:연락처|전화번호|휴대전화)\\s*(?:은|는|이|가|:|：)?\\s*((?:0\\d{1,2})[- ]?(?:\\d|[Xx*]){3,4}[- ]?(?:\\d|[Xx*]){4})`, 'u'))
  if (phone) result.accusedPhone = phone[1]

  const account = /(?:계좌번호|입금계좌)\s*(?:는|은|이|가|:|：)?\s*[(\[]?\s*([0-9Xx*＊][0-9Xx*＊\s-]{4,38}[0-9Xx*＊])/u.exec(source)
  if (account && /(?:판매자|상대방|피고소인|가해자|피의자|송금|입금|이체)/u.test(source)) {
    const preceding = source.slice(Math.max(0, account.index - 30), account.index)
    if (!/(?:제|내|본인|고소인)(?:\s*명의)?\s*$/u.test(preceding)) {
      const bank = preceding.match(/((?:[가-힣A-Za-z]{2,20}(?:은행|뱅크|증권|금고))|농협|수협|우체국)\s*$/u)?.[1]
      const following = source.slice(account.index + account[0].length, account.index + account[0].length + 50)
      const holder = following.match(/(?:예금주|명의자)\s*[:：]?\s*([가-힣A-Za-z]{2,10})/u)?.[1]
      result.accusedAccount = [bank, account[1].replace(/\s+/g, ''), holder && `(예금주 ${holder})`].filter(Boolean).join(' ')
    }
  }

  return result
}

export function enrichAccusedAccount(current, explicit) {
  if (!current || !explicit) return current || explicit || ''
  const accountNumber = explicit.match(/[0-9Xx*＊][0-9Xx*＊-]{4,40}[0-9Xx*＊]/u)?.[0]
  if (!accountNumber || !current.includes(accountNumber)) return current
  const explicitHasMore = (/(?:은행|뱅크|증권|금고|농협|수협|우체국)/u.test(explicit) && !/(?:은행|뱅크|증권|금고|농협|수협|우체국)/u.test(current))
    || (/(?:예금주|명의자)/u.test(explicit) && !/(?:예금주|명의자)/u.test(current))
  return explicitHasMore ? explicit : current
}
