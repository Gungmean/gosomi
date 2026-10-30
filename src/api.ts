import type { AiSettings, CaseMode, ChatMessage, ComplaintDraft, DocumentInput, FollowUpQuestion, Precedent, ResponseDraft } from './types'

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.error || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
  return body
}

export async function askAi(
  settings: AiSettings,
  messages: ChatMessage[],
  draft: ComplaintDraft,
  precedents: Precedent[],
  caseMode: CaseMode = 'complainant',
  responseDraft?: ResponseDraft,
  documentInput?: DocumentInput,
  intakeSubmission?: { questionId: string; text?: string; choice?: 'yes' | 'no' | 'unknown' },
): Promise<{ message: string; draftPatch: Partial<ComplaintDraft>; responsePatch?: Partial<ResponseDraft>; searchQuery: string; followUpQuestions: FollowUpQuestion[]; modelUsed?: string; instant?: boolean }> {
  let response: Response
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, messages, draft, precedents, caseMode, responseDraft, documentInput, intakeSubmission }),
      signal: AbortSignal.timeout(55000),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error('AI 응답이 55초 안에 도착하지 않았습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.')
    }
    throw error
  }
  return readJson(response)
}

export async function searchPrecedents(query: string): Promise<{ results: Precedent[]; sampleKey: boolean }> {
  const response = await fetch(`/api/precedents?q=${encodeURIComponent(query)}`)
  return readJson(response)
}

const precedentOffenses = ['명예훼손', '모욕', '사기', '폭행', '상해', '협박', '스토킹', '횡령', '배임', '절도', '강요', '성폭력']
const precedentIssues = ['기망', '편취', '변제', '고의', '공연성', '전파가능성', '사실적시', '허위사실', '정당방위', '상해진단서', '합의', '증거']

/** Build a short, PII-free query for the official criminal precedent search. */
export function getAutomaticPrecedentQuery(text: string): string {
  const safeText = text
    .replace(/01[016789][\s-]?\d{3,4}[\s-]?\d{4}/g, ' ')
    .replace(/\d{6}[\s-]?\d{7}/g, ' ')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, ' ')
  if (safeText.trim().length < 12) return ''

  const offense = precedentOffenses.find((term) => safeText.includes(term))
  if (!offense) return ''
  const issues = precedentIssues.filter((term) => safeText.includes(term) && term !== offense).slice(0, 2)
  return [offense, ...issues].join(' ')
}
