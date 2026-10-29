import { useEffect, useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, FileText, Pencil, Printer, X } from 'lucide-react'
import type { ComplaintDraft } from '../types'
import { templateLabels } from '../types'
import { checklistQuestions, officialFormSource, typeQuestions } from '../formConfig'
import ComplaintDocument from './ComplaintDocument'

type Field = Exclude<keyof ComplaintDraft, 'type' | 'selections'>

const fields: { key: Field; label: string; group: string; multiline?: boolean; placeholder?: string }[] = [
  { key: 'complainantName', label: '성명', group: '고소인' },
  { key: 'complainantBirth', label: '생년월일', group: '고소인', placeholder: '예: 1998. 03. 12.' },
  { key: 'complainantAddress', label: '주소', group: '고소인' },
  { key: 'complainantPhone', label: '연락처', group: '고소인' },
  { key: 'accusedName', label: '성명', group: '피고소인' },
  { key: 'accusedAddress', label: '주소', group: '피고소인' },
  { key: 'accusedPhone', label: '연락처', group: '피고소인' },
  { key: 'accusedOnlineId', label: 'ID 또는 닉네임', group: '피고소인' },
  { key: 'accusedAccount', label: '계좌번호', group: '피고소인' },
  { key: 'incidentDate', label: '피해 날짜', group: '사건 내용', placeholder: '예: 2026. 10. 20.' },
  { key: 'incidentTime', label: '시간', group: '사건 내용', placeholder: '예: 오후 3시경' },
  { key: 'incidentPlace', label: '장소', group: '사건 내용' },
  { key: 'incidentSummary', label: '구체적인 사건 경위', group: '사건 내용', multiline: true },
  { key: 'damage', label: '피해 내용 또는 금액', group: '사건 내용', multiline: true },
  { key: 'reason', label: '고소 이유', group: '사건 내용', multiline: true },
  { key: 'evidence', label: '증거자료', group: '증거와 요청', multiline: true },
  { key: 'request', label: '처벌 희망 또는 요청', group: '증거와 요청', multiline: true },
  { key: 'relatedCase', label: '관련 수사·재판', group: '증거와 요청' },
]

export default function ComplaintPanel({
  draft,
  open,
  animatedFields,
  onOpen,
  onClose,
  onChange,
}: {
  draft: ComplaintDraft
  open: boolean
  animatedFields?: Record<string, string>
  onOpen: () => void
  onClose: () => void
  onChange: (patch: Partial<ComplaintDraft>) => void
}) {
  const [tab, setTab] = useState('preview')
  const startX = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  function jumpToField(field: string) {
    setTab('edit')
    window.setTimeout(() => document.getElementById(`draft-${field}`)?.focus(), 40)
  }

  function onHandleEnd(event: React.PointerEvent<HTMLButtonElement>) {
    if (startX.current !== null && startX.current - event.clientX > 28) onOpen()
    startX.current = null
  }

  function setSelection(key: string, value: string) {
    onChange({ selections: { ...draft.selections, [key]: value } })
  }

  return (
    <>
      {!open && <button
        className="edge-handle"
        aria-label="고소장 미리보기 열기"
        title="고소장 미리보기"
        onClick={onOpen}
        onPointerDown={(event) => { startX.current = event.clientX }}
        onPointerUp={onHandleEnd}
      >
        <ChevronLeft size={15} strokeWidth={2.5} />
        <FileText size={18} />
        <span>고소장</span>
      </button>}
      <AnimatePresence initial={false}>
        {open && (
          <motion.button
            key="panel-scrim"
            className="panel-scrim"
            aria-label="미리보기 닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
          />
        )}
        {open && (
          <motion.aside
            key="preview-panel"
            className="preview-panel"
            aria-label="고소장 작성 패널"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="panel-header">
              <div className="panel-header-copy"><strong>고소장 작성</strong><span>입력한 내용이 문서에 바로 반영됩니다</span></div>
              <button className="icon-button" aria-label="패널 닫기" onClick={onClose}><X size={20} /></button>
            </div>
            <Tabs.Root value={tab} onValueChange={setTab} className="panel-tabs-root">
              <Tabs.List className="panel-tabs" aria-label="고소장 보기 선택">
                <Tabs.Trigger value="preview"><FileText size={16} /> 미리보기</Tabs.Trigger>
                <Tabs.Trigger value="edit"><Pencil size={16} /> 내용 수정</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="preview" className="panel-content panel-preview-scroll">
                <div className="preview-notice"><span className="preview-notice-dot" /> 실시간 초안 {draft.type !== 'general' ? <a href={officialFormSource} target="_blank" rel="noreferrer">경찰청 원본 양식 보기</a> : <span className="preview-form-caveat">일반 초안 · 공식 서식과 다름</span>}</div>
                <ComplaintDocument draft={draft} animatedFields={animatedFields} onFieldClick={jumpToField} />
              </Tabs.Content>
              <Tabs.Content value="edit" className="panel-content panel-edit-scroll">
                <div className="form-intro"><strong>문서 내용 수정</strong><p>내용을 바꾸면 미리보기에 즉시 반영됩니다.</p></div>
                <label className="form-field"><span>고소장 종류</span><select id="draft-type" value={draft.type} onChange={(event) => onChange({ type: event.target.value as ComplaintDraft['type'] })}>
                  {Object.entries(templateLabels).map(([value, label]) => <option key={value} value={value}>{label}{value === 'general' ? '형 초안' : ' 간이 고소장'}</option>)}
                </select></label>
                {['고소인', '피고소인', '사건 내용', '증거와 요청'].map((group) => <div className="form-group" key={group}>
                  <h3>{group}</h3>
                  {fields.filter((field) => field.group === group).map((field) => <label className="form-field" key={field.key}>
                    <span>{field.label}</span>
                    {field.multiline ? <textarea id={`draft-${field.key}`} rows={4} placeholder={field.placeholder || `${field.label}을 입력해주세요`} value={draft[field.key]} onChange={(event) => onChange({ [field.key]: event.target.value })} />
                      : <input id={`draft-${field.key}`} placeholder={field.placeholder || `${field.label}을 입력해주세요`} value={draft[field.key]} onChange={(event) => onChange({ [field.key]: event.target.value })} />}
                  </label>)}
                </div>)}
                {draft.type !== 'general' && <div className="form-group">
                  <h3>{templateLabels[draft.type]} 관련 선택 항목</h3>
                  {draft.type === 'assault' && <label className="form-field"><span>폭행을 당한 부위</span><input id="draft-assaultBodyPart" value={draft.selections.assaultBodyPart || ''} onChange={(event) => setSelection('assaultBodyPart', event.target.value)} placeholder="예: 오른쪽 팔, 뺨" /></label>}
                  {typeQuestions[draft.type].map((item) => <label className="form-field" key={item.id}><span>{item.label}</span><select id={`draft-${item.id}`} value={draft.selections[item.id] || ''} onChange={(event) => setSelection(item.id, event.target.value)}><option value="">선택해주세요</option>{item.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}
                  <h3 className="form-subheading">고소 관련 체크리스트</h3>
                  <p className="form-checklist-note">확인된 항목만 답해주세요. 모르는 내용은 모름으로 표시할 수 있어요.</p>
                  {checklistQuestions[draft.type].map((item) => <label className="form-field" key={item.id}><span>{item.label}</span><select id={`draft-${item.id}`} value={draft.selections[item.id] || ''} onChange={(event) => setSelection(item.id, event.target.value)}><option value="">선택해주세요</option><option value="예">예</option><option value="아니오">아니오</option><option value="모름">모름</option></select></label>)}
                </div>}
              </Tabs.Content>
            </Tabs.Root>
            <div className="panel-footer">
              <button className="footer-secondary" onClick={() => { setTab('preview'); window.setTimeout(() => window.print(), 80) }}><Printer size={17} /> 인쇄 / PDF 저장</button>
              <button className="footer-primary" onClick={onClose}>작성 계속하기 <ChevronLeft size={17} className="rotate-180" /></button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
