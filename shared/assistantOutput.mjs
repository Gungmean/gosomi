const metadataPattern = /(?:^|\n)\s*(?:searchQuery|questions)\s*:/im

function normalizeQuestion(question, index) {
  const text = String(question?.text || '').trim().slice(0, 240)
  if (!text) return null
  const inferredId = /날짜|일시|언제/u.test(text) ? 'incidentDate'
    : /장소|어디서/u.test(text) ? 'incidentPlace'
      : /경위|어떤 일/u.test(text) ? 'incidentSummary'
        : /피해|금액/u.test(text) ? 'damage'
          : /증거|자료/u.test(text) ? 'evidence'
            : `q${index + 1}`
  return {
    id: String(question?.id || inferredId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || `q${index + 1}`,
    text,
    answerType: question?.answerType === 'text' ? 'text' : 'yes_no',
    placeholder: String(question?.placeholder || '').trim().slice(0, 160),
    detailPrompt: String(question?.detailPrompt || '').trim().slice(0, 160),
  }
}

export function extractAssistantQuestions(value) {
  const source = String(value || '')
  const block = source.match(/(?:^|\n)\s*questions\s*:\s*([\s\S]*?)(?=\n\s*(?:searchQuery|draftPatch|responsePatch)\s*:|$)/i)?.[1]?.trim()
  if (!block) return []
  const arrayStart = block.indexOf('[')
  if (arrayStart >= 0) {
    const arrayEnd = block.lastIndexOf(']')
    if (arrayEnd > arrayStart) {
      try {
        const parsed = JSON.parse(block.slice(arrayStart, arrayEnd + 1))
        if (Array.isArray(parsed)) return parsed.map(normalizeQuestion).filter(Boolean).slice(0, 4)
      } catch { /* Fall through to the readable question line format. */ }
    }
  }
  const text = block.split(/\n|\s*[-•]\s*/u).map((line) => line.trim()).find((line) => line && !/^\[?\s*(?:\{|id\s*:)/i.test(line))
  if (!text) return []
  const answerType = /answerType\s*[:=]\s*text/i.test(text) ? 'text' : 'yes_no'
  const cleanText = text.replace(/\s*\(?\s*answerType\s*[:=]\s*\w+\s*\)?\s*$/i, '').trim()
  const question = normalizeQuestion({ text: cleanText, answerType }, 0)
  return question ? [question] : []
}

export function cleanAssistantMetadata(value) {
  const source = String(value || '')
  const metadata = source.search(metadataPattern)
  const visible = metadata >= 0 ? source.slice(0, metadata) : source
  return visible.replace(/[\s\n]*[-—]{3,}\s*$/, '').trim()
}

