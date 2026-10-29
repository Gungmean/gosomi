export type ComplaintType = 'fraud' | 'defamation' | 'assault' | 'general'
export type CaseMode = 'complainant' | 'respondent'
export interface ResponseDraft {
  receivedDocument: string
  agency: string
  receivedAt: string
  appearanceDate: string
  allegation: string
  claims: string
  confirmedFacts: string
  disputedPoints: string
  evidenceToPreserve: string
  questionsToConfirm: string
  nextSteps: string
}
export const blankResponseDraft = (): ResponseDraft => ({ receivedDocument: '', agency: '', receivedAt: '', appearanceDate: '', allegation: '', claims: '', confirmedFacts: '', disputedPoints: '', evidenceToPreserve: '', questionsToConfirm: '', nextSteps: '' })
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

export interface ReceivedDocument {
  id: string
  name: string
  mimeType: string
  size: number
  pageCount: number
  analyzed: boolean
  createdAt: number
}

export interface DocumentImage {
  name: string
  mimeType: 'image/jpeg'
  data: string
}

export interface DocumentInput {
  text: string
  images: DocumentImage[]
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  draft: ComplaintDraft
  precedents: Precedent[]
  caseMode?: CaseMode
  responseDraft?: ResponseDraft
  receivedDocuments?: ReceivedDocument[]
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

export const modelPresets: Record<Provider, { value: string; label: string }[]> = {
  gemini: [
    { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
    { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
    { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
  ],
  openai: [
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
  ],
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

export const createConversation = (type: ComplaintType = 'general', caseMode: CaseMode = 'complainant'): Conversation => {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: '새 대화',
    createdAt: now,
    updatedAt: now,
    messages: [],
    draft: { ...blankDraft(), type },
    precedents: [],
    caseMode,
    responseDraft: blankResponseDraft(),
    receivedDocuments: [],
  }
}
