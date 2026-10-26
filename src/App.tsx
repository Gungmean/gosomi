import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  ArrowRight, BookOpen, FileText, History,
  KeyRound, Menu, MessageCircle, MoreHorizontal, Plus, Scale,
  Send, ShieldCheck, Trash2, X,
} from 'lucide-react'
import { askAi, searchPrecedents } from './api'
import ComplaintPanel from './components/ComplaintPanel'
import PrecedentDialog from './components/PrecedentDialog'
import SettingsDialog from './components/SettingsDialog'
import { loadConversations, saveConversations } from './storage'
import type { AiSettings, ChatMessage, ComplaintDraft, ComplaintType, Conversation, Precedent } from './types'
import { blankDraft, createConversation, defaultModels } from './types'

function makeMessage(role: ChatMessage['role'], text: string): ChatMessage {
  return { id: crypto.randomUUID(), role, text, createdAt: Date.now() }
}

function dateLabel(timestamp: number) {
  const date = new Date(timestamp)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return '오늘'
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

function titleFrom(text: string) {
  const cleaned = text.trim().replace(/\s+/g, ' ')
  return cleaned.length > 25 ? `${cleaned.slice(0, 25)}…` : cleaned || '새 대화'
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations)
  const [activeId, setActiveId] = useState<string | null>(() => loadConversations().find((conversation) => conversation.messages.length > 0)?.id || null)
  const [settings, setSettings] = useState<AiSettings>({ provider: 'openai', model: defaultModels.openai, apiKey: '' })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [precedentOpen, setPrecedentOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const [startType, setStartType] = useState<ComplaintType>(() => loadConversations().find((conversation) => conversation.messages.length > 0)?.draft?.type || 'general')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const scrollEnd = useRef<HTMLDivElement>(null)
  const active = conversations.find((item) => item.id === activeId) || null
  const draft = active?.draft || blankDraft()
  const orderedConversations = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)

  useEffect(() => saveConversations(conversations), [conversations])
  useEffect(() => scrollEnd.current?.scrollIntoView({ behavior: 'smooth' }), [activeId, active?.messages.length, busy])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timer)
  }, [notice])

  function updateConversation(id: string, update: (conversation: Conversation) => Conversation) {
    setConversations((current) => current.map((conversation) => conversation.id === id ? update(conversation) : conversation))
  }

  function ensureConversation(type: ComplaintType = 'general') {
    if (active) return active
    const next = createConversation(type)
    setConversations((current) => [next, ...current])
    setActiveId(next.id)
    return next
  }

  function newConversation(type: ComplaintType = 'general', prompt = '') {
    const next = createConversation(type)
    setConversations((current) => [next, ...current])
    setActiveId(next.id)
    setStartType(type)
    setInput(prompt)
    setSidebarOpen(false)
    return next
  }

  function updateDraft(patch: Partial<ComplaintDraft>) {
    const target = ensureConversation(patch.type || 'general')
    updateConversation(target.id, (conversation) => ({
      ...conversation,
      draft: { ...conversation.draft, ...patch },
      updatedAt: Date.now(),
    }))
  }

  function updatePrecedents(results: Precedent[]) {
    const target = ensureConversation()
    updateConversation(target.id, (conversation) => ({ ...conversation, precedents: results, updatedAt: Date.now() }))
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || busy) return
    if (!settings.apiKey.trim()) {
      setSettingsOpen(true)
      setNotice('대화를 시작하려면 AI API 키를 입력해주세요.')
      return
    }
    const target = active || createConversation(startType)
    if (!active) {
      setConversations((current) => [target, ...current])
      setActiveId(target.id)
    }
    const userMessage = makeMessage('user', text)
    const messages = [...target.messages, userMessage]
    updateConversation(target.id, (conversation) => ({
      ...conversation,
      title: conversation.title === '새 대화' ? titleFrom(text) : conversation.title,
      messages,
      updatedAt: Date.now(),
    }))
    setInput('')
    setBusy(true)
    try {
      const result = await askAi(settings, messages, target.draft, target.precedents)
      updateConversation(target.id, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, makeMessage('assistant', result.message)],
        draft: { ...conversation.draft, ...result.draftPatch },
        updatedAt: Date.now(),
      }))
      if (result.searchQuery) {
        try {
          const found = await searchPrecedents(result.searchQuery)
          if (found.results.length) {
            updateConversation(target.id, (conversation) => ({ ...conversation, precedents: found.results, updatedAt: Date.now() }))
            setNotice(`공식 판례 ${found.results.length}건을 찾았습니다. 판례 보기에서 원문을 확인할 수 있어요.`)
          }
        } catch {
          setNotice('판례 자동 검색이 완료되지 않았습니다. 판례 검색에서 다시 시도할 수 있어요.')
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 응답을 받지 못했습니다.'
      updateConversation(target.id, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, makeMessage('assistant', `연결에 문제가 생겼어요. ${message}`)],
        updatedAt: Date.now(),
      }))
    } finally {
      setBusy(false)
    }
  }

  function deleteConversation(id: string) {
    if (!window.confirm('이 대화와 고소장 초안을 삭제할까요? 이 브라우저에서 복구할 수 없습니다.')) return
    setConversations((current) => current.filter((item) => item.id !== id))
    if (activeId === id) setActiveId(null)
  }

  function renameConversation(conversation: Conversation) {
    const title = window.prompt('대화 이름', conversation.title)?.trim()
    if (title) updateConversation(conversation.id, (item) => ({ ...item, title: title.slice(0, 50), updatedAt: Date.now() }))
  }

  function selectComplaintType(type: ComplaintType) {
    setStartType(type)
    if (active && active.messages.length === 0) {
      updateConversation(active.id, (conversation) => ({
        ...conversation,
        draft: { ...conversation.draft, type },
        updatedAt: Date.now(),
      }))
      return
    }
    newConversation(type)
  }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-head">
        <button className="brand" onClick={() => { setActiveId(null); setSidebarOpen(false) }} aria-label="고소미 홈으로">
          <img src="/gosomi-logo.png" alt="고소미 고소도우미" />
        </button>
        <button className="mobile-sidebar-close icon-button" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
      </div>
      <button className="new-chat-button" onClick={() => newConversation()}><Plus size={19} strokeWidth={2.4} /> 새 대화 시작</button>
      <div className="sidebar-section-label"><History size={15} /> 대화 기록 <span>{conversations.length}</span></div>
      <div className="conversation-list">
        {orderedConversations.length === 0 && <p className="sidebar-empty">아직 대화가 없습니다.<br />새 대화를 시작해보세요.</p>}
        {orderedConversations.map((conversation, index) => <div key={conversation.id}>
          {(index === 0 || dateLabel(orderedConversations[index - 1].updatedAt) !== dateLabel(conversation.updatedAt)) && <div className="conversation-date">{dateLabel(conversation.updatedAt)}</div>}
          <div className={`conversation-item ${activeId === conversation.id ? 'selected' : ''}`}>
              <button className="conversation-select" onClick={() => { setActiveId(conversation.id); setStartType(conversation.draft.type); setSidebarOpen(false) }}>
              <MessageCircle size={17} /><span>{conversation.title}</span>
            </button>
            <div className="conversation-actions">
              <button title="이름 변경" aria-label={`${conversation.title} 이름 변경`} onClick={() => renameConversation(conversation)}><MoreHorizontal size={16} /></button>
              <button title="삭제" aria-label={`${conversation.title} 삭제`} onClick={() => deleteConversation(conversation.id)}><Trash2 size={15} /></button>
            </div>
          </div>
        </div>)}
      </div>
      <div className="sidebar-footer">
        <button className="sidebar-settings" onClick={() => setSettingsOpen(true)}><span className="sidebar-settings-icon"><KeyRound size={18} /></span><span><strong>API 연결 설정</strong><small>{settings.apiKey ? `${settings.provider} 연결 준비됨` : '내 API 키 입력하기'}</small></span><ArrowRight size={17} /></button>
        <p>대화 기록은 이 브라우저에 저장됩니다.</p>
      </div>
    </aside>

    {sidebarOpen && <button className="mobile-sidebar-scrim" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)} />}

    <main className="workspace">
      <header className="topbar">
        <div className="topbar-left">
          <button className="mobile-menu-button icon-button" aria-label="대화 목록 열기" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
          <div className="topbar-title"><span className="topbar-eyebrow">AI 법률정보 도우미</span><strong>{active ? active.title : '새로운 대화'}</strong></div>
        </div>
        <div className="topbar-actions">
          <button className="topbar-link" onClick={() => setPrecedentOpen(true)}><BookOpen size={18} /><span>판례 검색</span>{Boolean(active?.precedents.length) && <b>{active?.precedents.length}</b>}</button>
          <button className="topbar-link topbar-preview" onClick={() => { ensureConversation(startType); setPreviewOpen(true) }}><FileText size={18} /><span>고소장 미리보기</span></button>
          <button className="topbar-avatar" onClick={() => setSettingsOpen(true)} aria-label="API 설정 열기"><KeyRound size={17} /></button>
        </div>
      </header>

      <div className="chat-scroll">
        {!active || active.messages.length === 0 ? <div className="welcome">
          <div className="welcome-intro">
            <span className="welcome-kicker">사건 정리</span>
            <h1>무슨 일이 있었는지<br className="welcome-mobile-break" /> 들려주세요.</h1>
            <p className="welcome-description">법률 용어나 날짜를 정확히 몰라도 괜찮아요.<br className="welcome-desktop-break" /> 기억나는 대로 적어주시면 필요한 내용을 하나씩 여쭤볼게요.</p>
          </div>
          <div className="incident-type-picker" role="group" aria-label="사건 종류 선택">
            <span>어떤 일에 가까운가요?</span>
            <div className="incident-type-options">
              {([
                ['fraud', '사기'], ['defamation', '모욕·명예훼손'], ['assault', '폭행'], ['general', '잘 모르겠어요'],
              ] as [ComplaintType, string][]).map(([type, label]) => <button key={type} className={startType === type ? 'selected' : ''} onClick={() => selectComplaintType(type)} aria-pressed={startType === type}>{label}</button>)}
            </div>
          </div>
          <div className="landing-composer">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSend() } }} placeholder="예: 중고거래 대금을 보냈는데 물건을 받지 못했고, 판매자가 연락을 끊었어요." rows={3} aria-label="사건 내용 입력" />
            <div className="landing-composer-footer"><span>상대방 이름이나 연락처는 꼭 필요한 경우에만 적어주세요.</span><button className="send-button" aria-label="사건 내용 보내기" disabled={!input.trim() || busy} onClick={handleSend}><Send size={18} /></button></div>
          </div>
          <div className="welcome-tools">
            <button onClick={() => setPrecedentOpen(true)}><BookOpen size={16} /> 판례 먼저 찾아보기</button>
            <button onClick={() => { ensureConversation(startType); setPreviewOpen(true) }}><FileText size={16} /> 고소장 양식 보기</button>
          </div>
          <p className="welcome-privacy"><ShieldCheck size={14} /> 대화는 이 브라우저에 저장되며, AI 답변은 검토용 초안으로 제공됩니다.</p>
        </div> : <div className="message-stream">
          <div className="stream-intro"><span>사건 기록</span><small>AI 답변은 제출 전 확인이 필요합니다.</small></div>
          {active.messages.map((message) => <div className={`message-row ${message.role}`} key={message.id}>
            {message.role === 'assistant' && <span className="assistant-avatar"><Scale size={17} /></span>}
            <div className="message-bubble">
              {message.role === 'assistant' && <span className="message-author">고소미</span>}
              <div className="message-body"><ReactMarkdown>{message.text}</ReactMarkdown></div>
              <span className="message-time">{new Date(message.createdAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          </div>)}
          {busy && <div className="message-row assistant"><span className="assistant-avatar"><Scale size={17} /></span><div className="typing-bubble"><span /><span /><span /></div></div>}
          {Boolean(active.precedents.length) && <button className="cases-inline" onClick={() => setPrecedentOpen(true)}><span className="cases-inline-icon"><BookOpen size={20} /></span><span><strong>관련 판례 {active.precedents.length}건을 찾았어요</strong><small>국가법령정보센터 원문에서 확인해보세요</small></span><ArrowRight size={18} /></button>}
          <div ref={scrollEnd} />
        </div>}
      </div>

      {active?.messages.length ? <div className="composer-zone">
        <div className="quick-prompts">
          <button onClick={() => setPrecedentOpen(true)}><BookOpen size={15} /> 판례 검색</button>
          <button onClick={() => { ensureConversation(); setPreviewOpen(true) }}><FileText size={15} /> 고소장 보기</button>
        </div>
        <div className="composer">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSend() } }} placeholder="추가로 알려주실 내용이 있나요?" rows={2} aria-label="메시지 입력" />
          <div className="composer-bottom"><span>Enter 전송 · Shift + Enter 줄바꿈</span><button className="send-button" aria-label="메시지 보내기" disabled={!input.trim() || busy} onClick={handleSend}><Send size={18} /></button></div>
        </div>
        <p className="composer-note">작성된 사실관계와 초안은 제출 전에 직접 확인해주세요.</p>
      </div> : null}
    </main>

    <ComplaintPanel draft={draft} open={previewOpen} onOpen={() => { ensureConversation(startType); setPreviewOpen(true) }} onClose={() => setPreviewOpen(false)} onChange={updateDraft} />
    <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} onChange={setSettings} />
    <PrecedentDialog open={precedentOpen} onOpenChange={setPrecedentOpen} precedents={active?.precedents || []} onResults={updatePrecedents} />
    {notice && <div className="toast" role="status">{notice}<button aria-label="알림 닫기" onClick={() => setNotice('')}><X size={15} /></button></div>}
  </div>
}
