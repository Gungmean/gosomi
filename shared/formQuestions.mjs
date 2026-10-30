export const typeQuestions = {
  fraud: [
    { id: 'fraudMethod', label: '사기 수법', options: ['회원모집', '알선빙자', '부동산 거래', '물품대금·납품', '일반 매매', '차용금', '투자금', '사칭·빙자', '기타/모름'] },
    { id: 'civilCase', label: '관련 민사소송', options: ['진행 중', '진행하지 않음', '모름'] },
  ],
  defamation: [
    { id: 'defamationChannel', label: '피해 장소·매체', options: ['직접 들음', '인터넷', '메신저', '게임 채팅', '출판물', '기타'] },
    { id: 'defamationKnownHow', label: '피해 사실을 알게 된 방법', options: ['직접 들음', '직접 목격', '지인이 알려줌', '기타'] },
    { id: 'defamationTruth', label: '해당 내용의 사실 여부', options: ['사실', '사실 아님', '모름'] },
    { id: 'defamationPublicity', label: '다른 사람에게 공개되었나요?', options: ['여러 명이 보거나 들음', '고소인만 알 수 있었음', '모름'] },
    { id: 'civilCase', label: '관련 민사소송', options: ['진행 중', '진행하지 않음', '모름'] },
  ],
  assault: [
    { id: 'assaultType', label: '폭행 종류', options: ['가정폭력', '교제폭력', '아동 폭행', '학교폭력', '노인폭행', '의료인 폭행', '운전자 폭행', '일반폭력', '기타'] },
    { id: 'assaultRelation', label: '피고소인과의 관계', options: ['배우자', '가족', '연인', '친구', '모르는 사람', '기타'] },
    { id: 'assaultCondition', label: '피해 상태', options: ['부어오름', '피가 남', '뼈가 부러짐', '멍', '외부 상처 없음', '기타'] },
    { id: 'assaultMethod', label: '폭행 방법', options: ['멱살을 잡음', '밀침', '잡아당김', '주먹으로 때림', '발로 참', '물건을 던짐', '흉기를 휘두름', '기타'] },
    { id: 'assaultHospital', label: '병원 치료', options: ['치료받음', '치료받지 않음', '모름'] },
    { id: 'assaultMutual', label: '쌍방 폭행 여부', options: ['저도 때렸습니다', '벗어나기 위해 힘을 행사했습니다', '전혀 때리지 않았습니다', '모름'] },
  ],
}

export const checklistQuestions = {
  fraud: [
    { id: 'fraudFamily', label: '피고소인이 가족 또는 친척인가요?' },
    { id: 'fraudLivedTogether', label: '피고소인과 동거한 사실이 있나요?' },
    { id: 'fraudKnewLong', label: '피고소인과 오랫동안 알고 지낸 관계인가요?' },
    { id: 'fraudContactable', label: '피고소인과 현재 연락이 가능한가요?' },
    { id: 'fraudPreviousTrade', label: '피고소인과 이전에도 유사한 거래나 계약이 있었나요?' },
    { id: 'fraudPromise', label: '상대방이 재산 상황이나 이행 방법을 이야기하며 믿어달라고 했나요?' },
    { id: 'previousComplaint', label: '같은 내용의 고소장을 다른 경찰서나 검찰청에 제출했나요?' },
    { id: 'withdrawnComplaint', label: '같은 내용의 고소를 취소한 적이 있나요?' },
  ],
  defamation: [
    { id: 'defamationFamily', label: '피고소인이 가족 또는 친척인가요?' },
    { id: 'defamationKnown', label: '피고소인이 아는 사이인가요?' },
    { id: 'defamationIdentifiable', label: '해당 내용이 고소인을 가리키는 말이었나요?' },
    { id: 'defamationReputation', label: '해당 내용이 고소인의 평가에 영향을 주었나요?' },
    { id: 'defamationPublicPlace', label: '공개적인 장소에서 발생했나요?' },
    { id: 'defamationOthersKnew', label: '다른 사람이 내용을 알게 되었나요?' },
    { id: 'defamationOneToOne', label: '고소인과 피고소인 단둘이 있는 상황이었나요?' },
    { id: 'previousComplaint', label: '같은 내용의 고소장을 다른 경찰서나 검찰청에 제출했나요?' },
  ],
  assault: [
    { id: 'assaultSudden', label: '피고소인이 갑자기 폭행했나요?' },
    { id: 'assaultArgument', label: '폭행 전 말싸움이나 다툼이 있었나요?' },
    { id: 'assaultWitness', label: '폭행 당시 주변에 목격자가 있었나요?' },
    { id: 'assaultCctv', label: '폭행 당시 주변에 CCTV가 있었나요?' },
    { id: 'assaultWithdraw', label: '원만히 해결되면 고소를 취소할 의사가 있나요?' },
    { id: 'previousComplaint', label: '같은 내용의 고소장을 다른 경찰서나 검찰청에 제출했나요?' },
    { id: 'withdrawnComplaint', label: '같은 내용의 고소를 취소한 적이 있나요?' },
  ],
}
