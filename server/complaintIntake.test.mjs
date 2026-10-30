import test from 'node:test'
import assert from 'node:assert/strict'
import { nextComplaintIntakeQuestion, applyCurrentIntakeAnswer, alignMessageWithIntakeQuestion, complaintIntakeSteps } from './complaintIntake.mjs'
const identity = ['complainantName','complainantAddress','complainantPhone','accusedName','accusedAddress','accusedPhone','accusedOnlineId','accusedAccount']
const filled = () => ({ type:'fraud', ...Object.fromEntries([...identity,...complaintIntakeSteps.map(x=>x.field)].map(k=>[k,'확인됨'])), selections:{} })
test('기본 사건 내용이 채워져도 유형별 질문은 계속된다',()=>{
 assert.equal(nextComplaintIntakeQuestion(filled(),[{role:'user',text:'네'}])[0].id,'fraudMethod')
})
test('기존 초안에서 짧은 메시지에도 빈 인적사항을 질문한다',()=>{
 assert.equal(nextComplaintIntakeQuestion({type:'fraud',incidentSummary:'송금 후 미배송'},[{role:'user',text:'다음'}])[0].id,'complainantName')
})
test('예 아니오 답변은 selections에 저장하고 기존 선택을 보존한다',()=>{
 const patch=applyCurrentIntakeAnswer({}, {selections:{fraudMethod:'일반 매매'}}, {questionId:'fraudFamily',choice:'no'})
 assert.deepEqual(patch.selections,{fraudMethod:'일반 매매',fraudFamily:'아니오'})
})
test('건너뛴 빈칸을 다시 묻지 않는다',()=>{
 const draft=filled(); delete draft.complainantName
 const messages=[{role:'assistant',followUpSubmitted:true,followUpQuestions:[{id:'complainantName'}],followUpAnswers:{complainantName:{text:'모름 / 건너뛰기'}}}]
 assert.equal(nextComplaintIntakeQuestion(draft,messages)[0].id,'fraudMethod')
 assert.equal(applyCurrentIntakeAnswer({}, {}, {questionId:'complainantName',text:'모름 / 건너뛰기'}).complainantName,undefined)
})
test('질문 카드와 충돌하는 마지막 질문 안내를 답변에서 제거한다',()=>{
 const message='고소장 초안이 업데이트되었습니다. 이제 마지막 질문입니다. (예: 사진, 영상, 기타 문서 등)'
 assert.equal(alignMessageWithIntakeQuestion(message,[{id:'accusedPhone'}]),'고소장 초안이 업데이트되었습니다.')
 assert.equal(alignMessageWithIntakeQuestion('내용을 반영했습니다. 이제 고소장 초안이 완성되었습니다.',[{id:'fraudMethod'}]),'내용을 반영했습니다.')
})
