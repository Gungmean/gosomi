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
): Promise<{ message: string; draftPatch: Partial<ComplaintDraft>; responsePatch?: Partial<ResponseDraft>; searchQuery: string; followUpQuestions: FollowUpQuestion[]; modelUsed?: string }> {
  let response: Response
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, messages, draft, precedents, caseMode, responseDraft, documentInput }),
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
