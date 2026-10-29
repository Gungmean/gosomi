import type { AiSettings, CaseMode, ChatMessage, ComplaintDraft, FollowUpQuestion, Precedent } from './types'

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
): Promise<{ message: string; draftPatch: Partial<ComplaintDraft>; searchQuery: string; followUpQuestions: FollowUpQuestion[]; modelUsed?: string }> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings, messages, draft, precedents, caseMode }),
  })
  return readJson(response)
}

export async function searchPrecedents(query: string): Promise<{ results: Precedent[]; sampleKey: boolean }> {
  const response = await fetch(`/api/precedents?q=${encodeURIComponent(query)}`)
  return readJson(response)
}
