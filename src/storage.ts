import type { AiSettings, Conversation } from './types'
import { blankDraft, blankResponseDraft, defaultModels } from './types'

const STORAGE_KEY = 'gosomi.conversations.v1'
const SETTINGS_KEY = 'gosomi.settings.v1'

export function isValidApiKeyFormat(value: string): boolean {
  const cleaned = value.replace(/\s+/g, '')
  return /^[\x21-\x7E]{10,}$/.test(cleaned)
}

export function loadSettings(): AiSettings {
  const fallback: AiSettings = { provider: 'gemini', model: defaultModels.gemini, apiKey: '', rememberApiKey: false }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<AiSettings>
    const provider = parsed.provider === 'openai' || parsed.provider === 'anthropic' ? parsed.provider : 'gemini'
    const model = typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : defaultModels[provider]
    const rememberApiKey = parsed.rememberApiKey === true
    const rawKey = rememberApiKey && typeof parsed.apiKey === 'string' ? parsed.apiKey.replace(/\s+/g, '') : ''
    const apiKey = isValidApiKeyFormat(rawKey) ? rawKey : ''
    return { provider, model, apiKey, rememberApiKey }
  } catch {
    return fallback
  }
}

export function saveSettings(settings: AiSettings) {
  try {
    const cleanKey = settings.apiKey.replace(/\s+/g, '')
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      provider: settings.provider,
      model: settings.model,
      rememberApiKey: settings.rememberApiKey === true,
      apiKey: settings.rememberApiKey && isValidApiKeyFormat(cleanKey) ? cleanKey : '',
    }))
  } catch {
    // Ignore storage errors
  }
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is Conversation =>
      Boolean(item && typeof item === 'object' && 'id' in item && 'messages' in item),
    ).map((item) => ({
      ...item,
      draft: { ...blankDraft(), ...item.draft, selections: { ...(item.draft?.selections || {}) } },
      caseMode: item.caseMode === 'respondent' ? 'respondent' : 'complainant',
      responseDraft: { ...blankResponseDraft(), ...item.responseDraft },
      receivedDocuments: Array.isArray(item.receivedDocuments) ? item.receivedDocuments : [],
      precedents: Array.isArray(item.precedents) ? item.precedents : [],
    }))
  } catch {
    return []
  }
}

export function saveConversations(conversations: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  } catch {
    // Storage can be disabled or full; the current browser session remains usable.
  }
}
