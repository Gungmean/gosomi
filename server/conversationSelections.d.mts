import type { ComplaintDraft, ChatMessage } from '../src/types'
export function applyConversationSelections(patch: Partial<ComplaintDraft>, draft: ComplaintDraft, messages: ChatMessage[]): Partial<ComplaintDraft>
