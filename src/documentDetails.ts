import type { ComplaintDraft, ComplaintType } from './types'

export const privateDetailFields = [
  { key: 'complainantResidentId', label: '고소인 주민등록번호', group: '고소인', residentId: true },
  { key: 'accusedResidentId', label: '피고소인 주민등록번호', group: '피고소인', residentId: true },
  { key: 'agentName', label: '대리인 성명', group: '대리인' },
  { key: 'agentRelation', label: '고소인과의 관계', group: '대리인' },
  { key: 'agentPhone', label: '대리인 휴대전화', group: '대리인' },
  { key: 'agentOfficePhone', label: '대리인 사무실 전화', group: '대리인' },
]

export const extraDetailFields: { key: string; label: string; placeholder: string; types?: ComplaintType[]; when?: string; option?: string }[] = [
  { key: 'accusedSite', label: '피고소인이 사용하는 사이트·SNS 이름', placeholder: '예: 중고나라, 인스타그램', types: ['fraud', 'defamation', 'general'] },
  { key: 'assaultRelationDetail', label: '피고소인과의 관계 (기타)', placeholder: '알고 있는 관계를 입력해주세요', types: ['assault'], when: 'assaultRelation', option: '기타' },
  { key: 'assaultConditionDetail', label: '피해 상태 (기타)', placeholder: '구체적인 피해 상태를 입력해주세요', types: ['assault'], when: 'assaultCondition', option: '기타' },
  { key: 'assaultObject', label: '던진 물건의 종류', placeholder: '예: 유리컵', types: ['assault'], when: 'assaultMethod', option: '물건을 던짐' },
  { key: 'assaultWeapon', label: '흉기의 종류', placeholder: '알고 있는 종류를 입력해주세요', types: ['assault'], when: 'assaultMethod', option: '흉기를 휘두름' },
  { key: 'assaultMethodDetail', label: '폭행 방법 (기타)', placeholder: '구체적인 폭행 방법을 입력해주세요', types: ['assault'], when: 'assaultMethod', option: '기타' },
  { key: 'hospitalVisits', label: '병원 방문 횟수', placeholder: '예: 3', types: ['assault'], when: 'assaultHospital', option: '치료받음' },
  { key: 'defamationKnownDetail', label: '피해 사실을 알게 된 방법 (기타)', placeholder: '어떻게 알게 되었는지 입력해주세요', types: ['defamation'], when: 'defamationKnownHow', option: '기타' },
  { key: 'writtenDate', label: '작성일', placeholder: '예: 2026. 11. 07.' },
  { key: 'policeStation', label: '제출 경찰서', placeholder: '예: 서울강남경찰서' },
]

/** Fill only empty personal/form fields; case facts and existing input stay intact. */
export function fillDummyPersonalInfo(draft: ComplaintDraft): Partial<ComplaintDraft> {
  const examples = {
    complainantName: '김고소',
    complainantBirth: '1990. 01. 01.',
    complainantAddress: '서울특별시 예시구 예시로 123, 101동 1001호',
    complainantPhone: '010-0000-0000',
    accusedName: '이예시',
    accusedAddress: '서울특별시 예시구 가상로 456, 202호',
    accusedPhone: '010-0000-0001',
    accusedOnlineId: 'sample_user',
    accusedAccount: '예시은행 000-000000-00000',
  }
  const patch: Partial<ComplaintDraft> = {}
  for (const [key, value] of Object.entries(examples)) {
    const field = key as keyof typeof examples
    if (!draft[field]?.trim()) patch[field] = value
  }
  const details = { ...draft.documentDetails }
  const detailExamples: Record<string, string> = {
    complainantResidentId: '000000-0000000',
    accusedResidentId: '000000-0000001',
    agentName: '박대리', agentRelation: '법률대리인',
    agentPhone: '010-0000-0002', agentOfficePhone: '02-000-0000',
    accusedSite: '예시 중고거래 사이트',
    assaultRelationDetail: '직장 동료 (예시)', assaultConditionDetail: '찰과상 (예시)',
    assaultObject: '플라스틱 컵 (예시)', assaultWeapon: '가위 (예시)',
    assaultMethodDetail: '팔을 비틂 (예시)', hospitalVisits: '2',
    defamationKnownDetail: '게시물 알림을 통해 확인 (예시)',
    writtenDate: new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }),
    policeStation: '예시경찰서',
  }
  for (const field of [...privateDetailFields, ...extraDetailFields]) {
    if ('types' in field && field.types && !field.types.includes(draft.type)) continue
    if ('when' in field && field.when && !String(draft.selections[field.when] || '').split(' | ').includes(field.option || '')) continue
    if (!details[field.key]?.trim()) details[field.key] = detailExamples[field.key]
  }
  if (Object.keys(patch).length || Object.entries(details).some(([key, value]) => value !== draft.documentDetails?.[key])) {
    details.containsDummyData = 'true'
  }
  patch.documentDetails = details
  return patch
}
