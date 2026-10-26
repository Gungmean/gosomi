export type ComplaintType = 'fraud' | 'defamation' | 'assault' | 'general'
export type Provider = 'openai' | 'anthropic' | 'gemini'

export interface ComplaintDraft {
  type: ComplaintType
  complainantName: string
  complainantBirth: string
  complainantAddress: string
  complainantPhone: string
  accusedName: string
  accusedAddress: string
  accusedPhone: string
  accusedOnlineId: string
  accusedAccount: string
  incidentDate: string
  incidentTime: string
  incidentPlace: string
  incidentSummary: string
  damage: string
  reason: string
  evidence: string
  request: string
  relatedCase: string
  selections: Record<string, string>
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: number
  followUpQuestions?: FollowUpQuestion[]
  followUpAnswers?: Record<string, FollowUpAnswer>
  followUpSubmitted?: boolean
}

export interface FollowUpQuestion {
  id: string
  text: string
  answerType: 'yes_no' | 'text'
  placeholder?: string
  detailPrompt?: string
}

export interface FollowUpAnswer {
  choice?: 'yes' | 'no' | 'unknown'
  text?: string
}

export interface Precedent {
  id: string
  title: string
  caseNumber: string
  court: string
  decidedAt: string
  caseType: string
  summary: string
  summaryKind?: 'synopsis' | 'excerpt' | 'none'
  url: string
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  draft: ComplaintDraft
  precedents: Precedent[]
}

export interface AiSettings {
  provider: Provider
  model: string
  apiKey: string
}

export const templateLabels: Record<ComplaintType, string> = {
  fraud: '사기',
  defamation: '모욕·명예훼손',
  assault: '폭행',
  general: '일반',
}

export const defaultModels: Record<Provider, string> = {
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4-5',
  gemini: 'gemini-3.8-flash',
}

export const blankDraft = (): ComplaintDraft => ({
  type: 'general',
  complainantName: '',
  complainantBirth: '',
  complainantAddress: '',
  complainantPhone: '',
  accusedName: '',
  accusedAddress: '',
  accusedPhone: '',
  accusedOnlineId: '',
  accusedAccount: '',
  incidentDate: '',
  incidentTime: '',
  incidentPlace: '',
  incidentSummary: '',
  damage: '',
  reason: '',
  evidence: '',
  request: '',
  relatedCase: '',
  selections: {},
})

export const createConversation = (type: ComplaintType = 'general'): Conversation => {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: '새 대화',
    createdAt: now,
    updatedAt: now,
    messages: [],
    draft: { ...blankDraft(), type },
    precedents: [],
  }
}
