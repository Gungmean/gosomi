import 'dotenv/config'
import express from 'express'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = Number(process.env.PORT || 8787)
const officialApiKey = process.env.LAW_API_OC || 'test'
const sampleKey = !process.env.LAW_API_OC
const lawApiRoot = 'https://www.law.go.kr/DRF'

app.disable('x-powered-by')
app.use(express.json({ limit: '300kb' }))
app.use('/api', (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store')
  next()
})

function plainText(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function getJson(url, options = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(18000), ...options })
  if (!response.ok) throw new Error(`외부 서비스 오류 (${response.status})`)
  return response.json()
}

app.get('/api/status', (_request, response) => {
  response.json({ ok: true, precedentSource: '국가법령정보센터', sampleKey })
})

app.get('/api/precedents', async (request, response) => {
  const userQuery = String(request.query.q || '').trim().slice(0, 80)
  const safeQuery = userQuery
    .replace(/01[016789][\s-]?\d{3,4}[\s-]?\d{4}/g, ' ')
    .replace(/\d{6}[\s-]?\d{7}/g, ' ')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, ' ')
    .trim()
  if (safeQuery.length < 2) {
    response.status(400).json({ error: '검색어를 두 글자 이상 입력해주세요.' })
    return
  }

  try {
    const offense = ['명예훼손', '모욕', '사기', '폭행', '협박', '스토킹', '횡령', '배임', '절도', '강요', '성폭력']
      .find((term) => safeQuery.includes(term))
    const query = safeQuery
    const searchUrl = new URL(`${lawApiRoot}/lawSearch.do`)
    Object.entries({
      OC: officialApiKey,
      target: 'prec',
      type: 'JSON',
      query,
      search: offense === safeQuery ? '1' : '2',
      display: '100',
      page: '1',
      datSrcNm: '대법원',
    }).forEach(([name, value]) => searchUrl.searchParams.set(name, value))

    const list = (await getJson(searchUrl)).PrecSearch?.prec || []
    const entries = (Array.isArray(list) ? list : [list])
      .filter((item) => item && item['사건종류명'] === '형사' && item['판례일련번호'] && (!offense || String(item['사건명'] || '').includes(offense)))
      .slice(0, 25)
    const specificWords = safeQuery.split(/[\s,]+/).filter((term) => term.length >= 2 && term !== offense)

    const details = await Promise.all(entries.map(async (item) => {
      const id = String(item['판례일련번호'])
      const detailUrl = new URL(`${lawApiRoot}/lawService.do`)
      Object.entries({ OC: officialApiKey, target: 'prec', type: 'JSON', ID: id })
        .forEach(([name, value]) => detailUrl.searchParams.set(name, value))
      try {
        const detail = (await getJson(detailUrl)).PrecService || {}
        const synopsis = plainText(detail['판결요지'] || detail['판시사항'])
        const bodyText = plainText(detail['판례내용'] || '').slice(0, 30000)
        const matchedTerm = specificWords.find((term) => bodyText.includes(term))
        const excerptStart = matchedTerm ? Math.max(0, bodyText.indexOf(matchedTerm) - 110) : 0
        const excerpt = bodyText.slice(excerptStart, excerptStart + 500).trim()
        return {
          id,
          title: String(detail['사건명'] || item['사건명'] || '판례'),
          caseNumber: String(detail['사건번호'] || item['사건번호'] || ''),
          court: String(detail['법원명'] || item['법원명'] || ''),
          decidedAt: formatLawDate(detail['선고일자'] || item['선고일자']),
          caseType: String(detail['사건종류명'] || item['사건종류명'] || ''),
          summary: synopsis.slice(0, 700) || excerpt,
          summaryKind: synopsis ? 'synopsis' : excerpt ? 'excerpt' : 'none',
          searchText: synopsis + ' ' + bodyText,
          url: `https://www.law.go.kr/LSW/precInfoP.do?precSeq=${encodeURIComponent(id)}`,
        }
      } catch {
        return {
          id,
          title: String(item['사건명'] || '판례'),
          caseNumber: String(item['사건번호'] || ''),
          court: String(item['법원명'] || ''),
          decidedAt: formatLawDate(item['선고일자']),
          caseType: String(item['사건종류명'] || ''),
          summary: '',
          summaryKind: 'none',
          searchText: '',
          url: `https://www.law.go.kr/LSW/precInfoP.do?precSeq=${encodeURIComponent(id)}`,
        }
      }
    }))

    const ranked = details.map((item) => ({
      item,
      score: (item.title.includes(query) ? 6 : 0) + specificWords.reduce((score, term) => score + (item.title.includes(term) ? 4 : 0) + (item.searchText.includes(term) ? 2 : 0), 0),
    })).filter(({ score }) => !specificWords.length || score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(({ item }) => {
      const { searchText, ...result } = item
      return result
    })
    response.json({ results: ranked, sampleKey })
  } catch {
    response.status(502).json({ error: '공식 판례 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' })
  }
})

function formatLawDate(value) {
  const text = String(value || '')
  return /^\d{8}$/.test(text) ? `${text.slice(0, 4)}.${text.slice(4, 6)}.${text.slice(6, 8)}.` : text
}

const draftFields = [
  'type', 'complainantName', 'complainantBirth', 'complainantAddress', 'complainantPhone',
  'accusedName', 'accusedAddress', 'accusedPhone', 'accusedOnlineId', 'accusedAccount',
  'incidentDate', 'incidentTime', 'incidentPlace', 'incidentSummary', 'damage', 'reason',
  'evidence', 'request', 'relatedCase',
]

function systemPrompt(draft, precedents) {
  const compactDraft = Object.fromEntries(Object.entries(draft || {}).flatMap(([key, value]) => {
    if (typeof value === 'string' && value.trim()) return [[key, value.slice(0, 1200)]]
    if (key === 'selections' && value && typeof value === 'object') {
      const selections = Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === 'string' && item.trim()).map(([name, item]) => [name, item.slice(0, 120)]))
      if (Object.keys(selections).length) return [[key, selections]]
    }
    return []
  }))
  const verifiedCases = Array.isArray(precedents) ? precedents.slice(0, 4).map((item) => ({
    title: String(item.title || '').slice(0, 160), caseNumber: String(item.caseNumber || '').slice(0, 80), court: String(item.court || '').slice(0, 80),
    decidedAt: String(item.decidedAt || '').slice(0, 40), summary: String(item.summary || '').slice(0, 450), summaryKind: item.summaryKind, url: String(item.url || '').slice(0, 300),
  })) : []
  return `당신은 한국어로 대화하는 고소장 작성 및 법률정보 보조 도우미 "고소미"입니다.
법률가를 자처하거나 결과를 보장하지 마세요. 사용자가 말하지 않은 사실을 만들지 마세요.
사용자의 질문에 먼저 직접 답하세요. 사실을 더 물어야 할 때도 질문만 나열하지 말고, 현재까지 확인된 내용으로 가능한 안내를 먼저 제공한 뒤 핵심 질문 1~2개만 덧붙이세요. 인사나 일반 질문에는 자연스럽게 응답하세요.
사건 상담에서는 대화와 문서에 이미 나온 사실을 다시 묻지 마세요. 필요에 따라 확인된 사실, 법적으로 살펴볼 쟁점, 지금 할 일과 보관할 증거를 구체적으로 설명하세요. 확인된 사실과 추정, 법률적 해석은 구분하세요.
법률 판단에는 단정 대신 조건과 불확실성을 밝혀 주세요. 조문이나 판례의 번호·내용을 기억으로 만들어 인용하지 마세요.
아래 verifiedCases에 있는 판례만 사건번호와 링크를 근거로 언급할 수 있습니다. 관련성이 불분명하면 언급하지 마세요.
사용자가 명시한 정보로만 draftPatch를 채우고, 기존 값을 임의로 지우지 마세요.
판례 검색이 유용하면 searchQuery에 사람 이름, 연락처, 계좌번호 등을 뺀 2~5단어의 법률 쟁점을 넣으세요. 아니면 빈 문자열로 두세요.
긴급한 안전 위협이 언급되면 신속한 기관/전문가 도움을 먼저 안내하세요.
필요한 확인 질문은 최대 4개까지 questions에 구조화하세요. 답이 예/아니오로 가능한 질문은 answerType을 yes_no로, 구체적인 설명이 필요한 질문은 text로 지정하세요. 예라고 답한 뒤 추가 설명이 필요한 yes_no 질문에는 detailPrompt를 넣으세요. 질문 문장은 message에 반복하지 말고 questions에만 넣으세요. 확인 질문이 필요 없으면 빈 배열을 반환하세요.
반드시 아래 형태의 JSON 객체 하나로만 답하세요:
{"message":"사용자에게 보일 충분하고 구체적인 한국어 답변","draftPatch":{"incidentDate":"..."},"searchQuery":"","questions":[{"id":"q1","text":"치료를 받으셨나요?","answerType":"yes_no","detailPrompt":"어느 병원에서 어떤 치료를 받으셨나요?"}]}
허용된 draftPatch 키: ${draftFields.join(', ')}
현재 문서 상태: ${JSON.stringify(compactDraft)}
확인된 판례: ${JSON.stringify(verifiedCases)}`
}

function parseAiOutput(output) {
  const source = String(output || '').trim()
  let parsed
  try {
    parsed = JSON.parse(source.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''))
  } catch {
    const start = source.indexOf('{')
    const end = source.lastIndexOf('}')
    try {
      parsed = JSON.parse(source.slice(start, end + 1))
    } catch {
      const messageMatch = source.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)/)
      if (messageMatch) {
        const salvaged = messageMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .trim()
        parsed = { message: salvaged || source }
      } else {
        parsed = { message: source }
      }
    }
  }
  const draftPatch = {}
  const inputPatch = parsed?.draftPatch && typeof parsed.draftPatch === 'object' ? parsed.draftPatch : {}
  for (const field of draftFields) {
    const value = inputPatch[field]
    if (typeof value === 'string' && value.trim()) {
      if (field !== 'type' || ['fraud', 'defamation', 'assault', 'general'].includes(value)) {
        draftPatch[field] = value.slice(0, 10000)
      }
    }
  }
  return {
    message: String(parsed?.message || '내용을 조금 더 자세히 알려주시겠어요?').slice(0, 12000),
    draftPatch,
    searchQuery: String(parsed?.searchQuery || '').slice(0, 80),
    followUpQuestions: (Array.isArray(parsed?.questions) ? parsed.questions : []).slice(0, 4).flatMap((question, index) => {
      const text = String(question?.text || '').trim().slice(0, 240)
      if (!text) return []
      const answerType = question?.answerType === 'text' ? 'text' : 'yes_no'
      return [{
        id: String(question?.id || `q${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || `q${index + 1}`,
        text,
        answerType,
        placeholder: String(question?.placeholder || '').trim().slice(0, 160),
        detailPrompt: String(question?.detailPrompt || '').trim().slice(0, 160),
      }]
    }),
  }
}

function normalizeProviderAndModel(settings) {
  const apiKey = String(settings.apiKey || '').replace(/\s+/g, '')
  let rawModel = String(settings.model || '')
    .trim()
    .replace(/^models\//i, '')
    .replace(/제미나이/g, 'gemini')
    .replace(/\s+/g, '-')
    .toLowerCase()

  let provider = settings.provider
  if (apiKey.startsWith('AIza') || /^(?:gemini|3\.[15678]|2\.[05]|4(?:-|$))/.test(rawModel)) {
    provider = 'gemini'
  } else if (apiKey.startsWith('sk-ant-') || rawModel.startsWith('claude')) {
    provider = 'anthropic'
  } else if (rawModel.startsWith('gpt-') || rawModel.startsWith('o1') || rawModel.startsWith('o3') || rawModel.startsWith('o4')) {
    provider = 'openai'
  }

  if (provider === 'gemini') {
    const geminiAliases = {
      '': 'gemini-3.8-flash',
      'gemini': 'gemini-3.8-flash',
      'gemini-3': 'gemini-3.8-flash',
      'gemini-3-flash': 'gemini-3.8-flash',
      '3.8': 'gemini-3.8-flash',
      '3.8-flash': 'gemini-3.8-flash',
      'gemini-3.8': 'gemini-3.8-flash',
      'gemini-3.8-pro': 'gemini-3.8-flash',
      'gemini-3.8-flash-latest': 'gemini-3.8-flash',
      '3.7': 'gemini-3.8-flash',
      '3.7-flash': 'gemini-3.8-flash',
      'gemini-3.7': 'gemini-3.8-flash',
      'gemini-3.7-flash': 'gemini-3.8-flash',
      '3.6': 'gemini-3.6-flash',
      '3.6-flash': 'gemini-3.6-flash',
      'gemini-3.6': 'gemini-3.6-flash',
      'gemini-3.6-pro': 'gemini-3.6-flash',
      'gemini-3.6-flash-latest': 'gemini-3.6-flash',
      '3.5': 'gemini-3.6-flash',
      '3.5-flash': 'gemini-3.6-flash',
      'gemini-3.5': 'gemini-3.6-flash',
      'gemini-3.5-flash': 'gemini-3.6-flash',
      '3.5-lite': 'gemini-3.5-flash-lite',
      '3.5-flash-lite': 'gemini-3.5-flash-lite',
      'gemini-3.5-lite': 'gemini-3.5-flash-lite',
      '3.1': 'gemini-3.1-pro-preview',
      'gemini-3.1': 'gemini-3.1-pro-preview',
      'gemini-3.1-pro': 'gemini-3.1-pro-preview',
      '2.5': 'gemini-2.5-flash',
      'gemini-2.5': 'gemini-2.5-flash',
      '4': 'gemini-4-argon',
      'gemini-4': 'gemini-4-argon',
    }
    if (geminiAliases[rawModel]) {
      rawModel = geminiAliases[rawModel]
    } else if (/^gemini-3\.[68]$/.test(rawModel)) {
      rawModel = `${rawModel}-flash`
    } else if (!rawModel.startsWith('gemini-') && !rawModel.startsWith('gemma-')) {
      rawModel = 'gemini-3.8-flash'
    }
  } else if (provider === 'openai' && (!rawModel || rawModel.startsWith('gemini') || rawModel.startsWith('claude'))) {
    rawModel = 'gpt-4.1-mini'
  } else if (provider === 'anthropic' && (!rawModel || rawModel.startsWith('gemini') || rawModel.startsWith('gpt-'))) {
    rawModel = 'claude-sonnet-4-5'
  }

  return { provider, model: rawModel, apiKey }
}

const geminiSafetySettings = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
]

function extractGeminiGenerateContentText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || []
  return parts
    .filter((item) => !item?.thought && typeof item?.text === 'string')
    .map((item) => item.text)
    .join('')
    .trim()
}

function extractGeminiInteractionsText(data) {
  if (Array.isArray(data?.steps)) {
    const text = data.steps
      .filter((step) => step?.type === 'model_output')
      .flatMap((step) => Array.isArray(step?.content) ? step.content : [])
      .filter((item) => (!item?.type || item.type === 'text') && typeof item?.text === 'string')
      .map((item) => item.text)
      .join('')
      .trim()
    if (text) return text
  }
  if (Array.isArray(data?.outputs)) {
    const text = data.outputs
      .filter((item) => (!item?.type || item.type === 'text') && typeof item?.text === 'string')
      .map((item) => item.text)
      .join('')
      .trim()
    if (text) return text
  }
  return ''
}

async function fetchWithRetry(url, options, maxAttempts = 3) {
  let response
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(45000),
    })
    if (![500, 502, 503, 504].includes(response.status) || attempt === maxAttempts - 1) break
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 450 * (attempt + 1)))
  }
  return response
}

function throwProviderHttpError(provider, apiKey, response, data) {
  const errorPayload = Array.isArray(data) ? data[0]?.error : data?.error
  const providerError = errorPayload || {}
  const providerDetail = String(providerError.message || providerError.status || '')
    .replaceAll(apiKey, '[숨김]')
    .replace(/\s+/g, ' ')
    .slice(0, 180)
  const googleApiKeyInvalid = Array.isArray(providerError.details)
    && providerError.details.some((detail) => detail?.reason === 'API_KEY_INVALID')
  if (response.status === 401 || response.status === 403 || googleApiKeyInvalid) {
    throw new Error('API 키가 유효하지 않습니다. 제공자와 키를 확인해주세요.')
  }
  if (response.status === 429) {
    const isZeroQuota = /limit:\s*0\b/i.test(providerDetail)
    const isDailyQuota = /per\s*day|PerDay|RPD/i.test(providerDetail)
    if (isZeroQuota) {
      throw new Error('현재 Google AI Studio API 키(무료 등급)에서 선택한 모델의 사용 한도가 0으로 제한되어 있습니다. Google AI Studio에서 새 프로젝트로 API 키를 발급받거나 결제 계정을 연결해주세요.')
    }
    if (isDailyQuota) {
      throw new Error('오늘 사용 가능한 AI 무료 요청 한도(일일 할당량)를 모두 소진했습니다. Google AI Studio에서 다른 프로젝트로 새 API 키를 발급받거나 잠시 후 다시 시도해주세요.')
    }
    throw new Error('AI 제공자의 분당 요청 한도(429)에 도달했습니다. 약 10~30초 후 다시 시도하거나 Google AI Studio에서 다른 프로젝트의 API 키를 사용해주세요.')
  }
  if (response.status === 503) {
    throw new Error(provider === 'gemini'
      ? 'Gemini 모델에 요청이 몰려 답변을 받지 못했습니다. 잠시 후 다시 시도해주세요.'
      : 'AI 제공자에 요청이 몰려 답변을 받지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
  if (response.status === 404) {
    throw new Error(`선택한 AI 모델을 찾을 수 없습니다. 제공자와 모델 이름을 확인해주세요.${providerDetail ? ` (${providerDetail})` : ''}`)
  }
  if (response.status >= 400 && response.status < 500) {
    throw new Error(`AI 제공자가 요청을 거부했습니다. 제공자와 모델 설정을 확인해주세요. (${response.status}${providerDetail ? `: ${providerDetail}` : ''})`)
  }
  throw new Error(`AI 제공자 요청에 실패했습니다. (${response.status}${providerDetail ? `: ${providerDetail}` : ''})`)
}

async function callGeminiSingleModel(model, apiKey, userPromptText, prompt) {
  const headers = { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' }
  const supportsThinkingLevel = /^gemini-(?:2\.5|3|4)/.test(model)
  const thinkingLevel = model.includes('lite') ? 'minimal' : 'low'
  const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const makeGenerateBody = (withThinking) => ({
    systemInstruction: { parts: [{ text: prompt }] },
    contents: [{ role: 'user', parts: [{ text: userPromptText }] }],
    safetySettings: geminiSafetySettings,
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 2400,
      ...(withThinking ? { thinkingConfig: { thinkingLevel } } : {}),
    },
  })

  let response = await fetchWithRetry(generateUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(makeGenerateBody(supportsThinkingLevel)),
  }, 2)
  let data = await response.json().catch(() => ({}))

  if (!response.ok && response.status === 400 && supportsThinkingLevel) {
    const errMsg = String((Array.isArray(data) ? data[0]?.error?.message : data?.error?.message) || '')
    if (/thinking/i.test(errMsg)) {
      response = await fetchWithRetry(generateUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(makeGenerateBody(false)),
      }, 2)
      data = await response.json().catch(() => ({}))
    }
  }

  return { response, data }
}

async function callGemini(model, apiKey, conversation, prompt) {
  const headers = { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' }
  const userPromptText = conversation.length <= 1
    ? (conversation[0]?.content || '안녕하세요.')
    : `[이전 대화 기록]\n${conversation.slice(0, -1).map((item) => `${item.role === 'assistant' ? '고소미(이전 답변)' : '사용자'}: ${item.content}`).join('\n\n')}\n\n[현재 사용자 입력]\n${conversation[conversation.length - 1].content}`

  // Fallback across active Gemini 3.x Flash models when a specific model hits 429 (quota/rate limit) or 503 (overload)
  const candidateModels = [
    model,
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
  ].filter((candidate, index, list) => Boolean(candidate) && list.indexOf(candidate) === index)

  let lastResponse = null
  let lastData = {}

  for (let i = 0; i < candidateModels.length; i += 1) {
    const candidate = candidateModels[i]
    const { response, data } = await callGeminiSingleModel(candidate, apiKey, userPromptText, prompt)
    if (!lastResponse || response.status !== 404) {
      lastResponse = response
      lastData = data
    }

    if (response.ok) {
      const text = extractGeminiGenerateContentText(data)
      if (text) return text
      const blockReason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason
      if (blockReason === 'SAFETY' || blockReason === 'BLOCKLIST' || blockReason === 'PROHIBITED_CONTENT') {
        throw new Error('입력 내용에 민감한 표현이 포함되어 AI 안전 정책에 의해 응답이 제한되었습니다. 표현을 완화해 다시 시도해주세요.')
      }
    }

    const googleKeyInvalid = (Array.isArray(data) ? data[0]?.error?.details : data?.error?.details)
      ?.some((detail) => detail?.reason === 'API_KEY_INVALID')
    if (googleKeyInvalid || response.status === 401 || response.status === 403) {
      throwProviderHttpError('gemini', apiKey, response, data)
    }

    // If rate-limited (429), overloaded (503), or unavailable (404), try the next Gemini model in the chain
    if ([429, 503, 404].includes(response.status) && i < candidateModels.length - 1) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 300))
      continue
    }
    break
  }

  // If generateContent failed with non-auth/non-quota error, try Interactions API as a backup
  if (lastResponse && ![401, 403, 429].includes(lastResponse.status)) {
    const supportsThinkingLevel = /^gemini-(?:2\.5|3|4)/.test(model)
    const thinkingLevel = model.includes('lite') ? 'minimal' : 'low'
    const interactionsUrl = 'https://generativelanguage.googleapis.com/v1beta/interactions'
    const interactionsBody = {
      model,
      store: false,
      system_instruction: prompt,
      input: userPromptText,
      generation_config: {
        max_output_tokens: 2400,
        ...(supportsThinkingLevel ? { thinking_level: thinkingLevel } : {}),
      },
      response_format: [
        { type: 'text', mime_type: 'application/json' },
      ],
    }
    const intResponse = await fetchWithRetry(interactionsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(interactionsBody),
    }, 1)
    const intData = await intResponse.json().catch(() => ({}))
    if (intResponse.ok) {
      const intText = extractGeminiInteractionsText(intData)
      if (intText) return intText
    }
  }

  if (lastResponse && !lastResponse.ok) {
    throwProviderHttpError('gemini', apiKey, lastResponse, lastData)
  }
  throw new Error('Gemini 모델로부터 유효한 응답 텍스트를 받지 못했습니다. 잠시 후 다시 시도해주세요.')
}

async function callProvider(settings, messages, prompt) {
  const { provider, model, apiKey } = normalizeProviderAndModel(settings)
  if (!apiKey || !/^[\x21-\x7E]{10,}$/.test(apiKey)) {
    throw new Error('API 키 형식이 올바르지 않습니다. 한글이나 공백이 아닌 영문·숫자로 된 API 키(예: AIza...)를 입력해주세요.')
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
    throw new Error('API 키와 모델 이름을 확인해주세요.')
  }

  let remainingChars = 18000
  const cleanedMessages = messages.filter((message) => {
    const text = String(message?.text || '').trim()
    if (!text) return false
    if (message?.role === 'assistant' && text.startsWith('연결에 문제가 생겼어요.')) return false
    return true
  })
  const conversation = cleanedMessages.slice(-8).reverse().map((message) => {
    const content = String(message.text || '').slice(0, Math.min(4000, remainingChars))
    remainingChars -= content.length
    return { role: message.role === 'assistant' ? 'assistant' : 'user', content }
  }).filter((message) => message.content).reverse()

  if (conversation.length === 0) {
    throw new Error('대화 내용을 확인해주세요.')
  }

  if (provider === 'gemini') {
    return callGemini(model, apiKey, conversation, prompt)
  }

  let url
  let headers
  let body
  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions'
    headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    body = { model, messages: [{ role: 'system', content: prompt }, ...conversation], temperature: 0.3 }
  } else if (provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages'
    headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }
    body = { model, system: prompt, messages: conversation, max_tokens: 2400 }
  } else {
    throw new Error('지원하지 않는 AI 제공자입니다.')
  }

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }, 1)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throwProviderHttpError(provider, apiKey, response, data)
  }
  if (provider === 'openai') return data.choices?.[0]?.message?.content || ''
  return data.content?.map((item) => item.text || '').join('') || ''
}

app.post('/api/chat', async (request, response) => {
  const { settings, messages, draft, precedents } = request.body || {}
  if (!settings || !Array.isArray(messages) || messages.length === 0) {
    response.status(400).json({ error: '대화 내용과 API 설정을 확인해주세요.' })
    return
  }
  try {
    const output = await callProvider(settings, messages, systemPrompt(draft, precedents))
    response.json(parseAiOutput(output))
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    const message = timedOut ? 'AI 응답이 제한 시간 안에 도착하지 않았습니다. 잠시 후 다시 시도해주세요.'
      : error instanceof Error ? error.message : 'AI 응답을 받지 못했습니다.'
    const status = message.startsWith('API 키') ? 401
      : message.includes('한도') ? 429
        : message.startsWith('AI 제공자가 요청을 거부했습니다.') ? 400
          : message.startsWith('선택한 AI 모델을 찾을 수 없습니다.') ? 400
          : timedOut ? 504
            : 502
    response.status(status).json({ error: message })
  }
})

export default app

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isDirectRun) {
  app.listen(port, '127.0.0.1', () => {
    process.stdout.write(`Gosomi API listening at http://127.0.0.1:${port}\n`)
  })
}
