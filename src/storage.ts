import type { Conversation } from './types'
import { blankDraft } from './types'

const STORAGE_KEY = 'gosomi.conversations.v1'

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
