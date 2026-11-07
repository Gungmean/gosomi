export function extractAssistantQuestions(value: unknown): Array<{
  id: string
  text: string
  answerType: 'yes_no' | 'text'
  placeholder: string
  detailPrompt: string
}>
export function cleanAssistantMetadata(value: unknown): string
