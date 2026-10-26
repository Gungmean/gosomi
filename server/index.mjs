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
  const verifiedCases = Array.isArray(precedents) ? precedents.slice(0, 6).map((item) => ({
    title: item.title, caseNumber: item.caseNumber, court: item.court,
    decidedAt: item.decidedAt, summary: item.summary, summaryKind: item.summaryKind, url: item.url,
  })) : []
  return `당신은 한국어로 대화하는 고소장 작성 및 법률정보 보조 도우미 "고소미"입니다.
법률가를 자처하거나 결과를 보장하지 마세요. 사용자가 말하지 않은 사실을 만들지 마세요.
사건 일시, 장소, 상대방, 구체적 행위, 피해, 증거 중 가장 중요한 누락 정보 1~2개를 우선 질문하세요.
확인된 사실과 추정, 법률적 해석을 구분하세요. 조문/판례를 기억으로 만들어 인용하지 마세요.
아래 verifiedCases에 있는 판례만 사건번호와 링크를 근거로 언급할 수 있습니다. 관련성이 불분명하면 언급하지 마세요.
사용자가 명시한 정보로만 draftPatch를 채우고, 기존 값을 임의로 지우지 마세요.
판례 검색이 유용하면 searchQuery에 사람 이름, 연락처, 계좌번호 등을 뺀 2~5단어의 법률 쟁점을 넣으세요. 아니면 빈 문자열로 두세요.
긴급한 안전 위협이 언급되면 신속한 기관/전문가 도움을 먼저 안내하세요.
반드시 아래 형태의 JSON 객체 하나로만 답하세요:
{"message":"사용자에게 보일 간결한 한국어 답변","draftPatch":{"incidentDate":"..."},"searchQuery":"..."}
허용된 draftPatch 키: ${draftFields.join(', ')}
현재 문서 상태: ${JSON.stringify(draft || {})}
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
      parsed = { message: source }
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
  }
}

async function callProvider(settings, messages, prompt) {
  const provider = settings.provider
  const model = String(settings.model || '').trim()
  const apiKey = String(settings.apiKey || '').trim()
  if (!apiKey || !/^[a-zA-Z0-9._-]+$/.test(model)) {
    throw new Error('API 키와 모델 이름을 확인해주세요.')
  }

  const conversation = messages.slice(-14).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: String(message.text || '').slice(0, 9000),
  }))

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
    body = { model, system: prompt, messages: conversation, max_tokens: 1800 }
  } else if (provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    headers = { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' }
    body = {
      systemInstruction: { parts: [{ text: prompt }] },
      contents: conversation.map((item) => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] })),
      generationConfig: { responseMimeType: 'application/json' },
    }
  } else {
    throw new Error('지원하지 않는 AI 제공자입니다.')
  }

  const response = await fetch(url, {
    method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(55000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const googleApiKeyInvalid = data?.error?.details?.some((detail) => detail?.reason === 'API_KEY_INVALID')
    if (response.status === 401 || response.status === 403 || googleApiKeyInvalid) {
      throw new Error('API 키가 유효하지 않습니다. 제공자와 키를 확인해주세요.')
    }
    if (response.status === 429) throw new Error('AI 제공자의 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.')
    throw new Error(`AI 제공자 요청에 실패했습니다. (${response.status})`)
  }
  if (provider === 'openai') return data.choices?.[0]?.message?.content || ''
  if (provider === 'anthropic') return data.content?.map((item) => item.text || '').join('') || ''
  return data.candidates?.[0]?.content?.parts?.map((item) => item.text || '').join('') || ''
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
    const message = error instanceof Error ? error.message : 'AI 응답을 받지 못했습니다.'
    const status = message.startsWith('API 키가 유효하지 않습니다.') ? 401
      : message.startsWith('AI 제공자의 요청 한도') ? 429
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
