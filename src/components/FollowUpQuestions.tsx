import { ArrowUpRight } from 'lucide-react'
import type { FollowUpAnswer, FollowUpQuestion } from '../types'

export default function FollowUpQuestions({
  questions,
  answers,
  submitted,
  busy,
  onAnswer,
  onSubmit,
}: {
  questions: FollowUpQuestion[]
  answers: Record<string, FollowUpAnswer>
  submitted: boolean
  busy: boolean
  onAnswer: (questionId: string, answer: FollowUpAnswer) => void
  onSubmit: () => void
}) {
  const complete = questions.every((question) => question.answerType === 'text'
    ? Boolean(answers[question.id]?.text?.trim())
    : Boolean(answers[question.id]?.choice))

  return <section className={`followup-card${submitted ? ' submitted' : ''}`} aria-label="추가 확인 질문">
    <div className="followup-heading">
      <strong>확인 질문</strong>
      <span>{submitted ? '답변을 보냈어요' : '선택하거나 직접 입력해 주세요'}</span>
    </div>
    <div className="followup-list">
      {questions.map((question, index) => {
        const answer = answers[question.id] || {}
        const needsDetail = question.answerType === 'text' || (answer.choice === 'yes' && Boolean(question.detailPrompt))
        return <div className="followup-question" key={question.id}>
          <div className="followup-question-title"><span>{index + 1}</span><strong>{question.text}</strong></div>
          {question.answerType === 'yes_no' && <div className="followup-options" role="group" aria-label={question.text}>
            {([
              ['yes', '예'], ['no', '아니오'], ['unknown', '잘 모르겠어요'],
            ] as const).map(([choice, label]) => <button
              key={choice}
              type="button"
              className={answer.choice === choice ? 'selected' : ''}
              aria-pressed={answer.choice === choice}
              disabled={submitted || busy}
              onClick={() => onAnswer(question.id, { ...answer, choice })}
            >{label}</button>)}
          </div>}
          {needsDetail && <label className="followup-detail">
            {question.detailPrompt && <span>{question.detailPrompt}</span>}
            {question.answerType === 'text'
              ? <textarea value={answer.text || ''} onChange={(event) => onAnswer(question.id, { ...answer, text: event.target.value })} placeholder={question.placeholder || '답변을 입력해 주세요'} rows={2} disabled={submitted || busy} />
              : <input value={answer.text || ''} onChange={(event) => onAnswer(question.id, { ...answer, text: event.target.value })} placeholder={question.placeholder || '추가 내용을 입력해 주세요 (선택)'} disabled={submitted || busy} />}
          </label>}
        </div>
      })}
    </div>
    {!submitted && <button type="button" className="followup-submit" disabled={!complete || busy} onClick={onSubmit}>
      답변 보내기 <ArrowUpRight size={16} />
    </button>}
  </section>
}
