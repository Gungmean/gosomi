import type { CaseMode, ComplaintType } from './types'

export interface DemoScenario {
  id: string
  label: string
  mode: CaseMode
  type: ComplaintType
  prompt: string
}

// All names and events below are fictional. Selecting one only fills the editor;
// the visitor can review or change it before sending it to an AI provider.
export const demoScenarios: DemoScenario[] = [
  {
    id: 'used-goods', label: '중고거래 사기', mode: 'complainant', type: 'fraud',
    prompt: '저는 김하늘입니다. 판매자 이름은 박민준이고 닉네임은 별빛상점입니다. 2026년 9월 5일 오후 7시쯤 중고거래 앱에서 그 사람에게 이어폰을 7만 원에 사기로 하고 송금했습니다. 9월 8일까지 보내기로 했지만 물건이 오지 않았고 이후 답이 없습니다. 판매 글과 대화 캡처, 송금 내역이 있습니다. 고소장 초안을 작성하고 싶습니다.',
  },
  {
    id: 'group-chat', label: '단체 채팅방 명예훼손', mode: 'complainant', type: 'defamation',
    prompt: '저는 이가은입니다. 상대방 이름은 최민수입니다. 2026년 9월 12일 동아리 단체 채팅방에서 그 사람이 저를 지칭하며 회비를 가져갔다고 썼습니다. 저는 회비를 가져간 적이 없습니다. 채팅방에는 약 20명이 있었고 대화 캡처와 회비 장부를 보관하고 있습니다. 사건을 정리하고 고소장 초안을 보고 싶습니다.',
  },
  {
    id: 'street-assault', label: '길거리 폭행', mode: 'complainant', type: 'assault',
    prompt: '저는 윤서진입니다. 상대방 이름은 정우석입니다. 2026년 9월 20일 오후 5시쯤 지하철역 앞에서 말다툼 중 그 사람이 제 어깨를 밀쳐 넘어졌습니다. 팔에 멍이 들었고 현장 사진이 있습니다. 함께 있던 친구 한 명이 상황을 봤습니다. 고소장 초안을 작성하고 싶습니다.',
  },
  {
    id: 'received-complaint', label: '고소장을 받은 상황', mode: 'respondent', type: 'fraud',
    prompt: '2026년 9월 15일 경찰에서 사기 혐의 고소장이 접수됐다고 전화했습니다. 고소장 원본은 아직 받지 못했습니다. 구매자는 중고거래한 물건을 받지 못했다고 주장하지만, 저는 물건을 발송했습니다. 정확한 출석 일정과 사건번호는 아직 확인하지 못했습니다. 택배 접수증과 채팅 기록을 보관하고 있습니다. 지금 먼저 확인할 일과 대응 메모를 정리해 주세요.',
  },
]
