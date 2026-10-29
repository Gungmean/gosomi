import { useEffect, useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, FileText, Pencil, Printer, X } from 'lucide-react'
import type { ResponseDraft } from '../types'

const fields: { key: keyof ResponseDraft; label: string; group: string; multiline?: boolean }[] = [
  { key: 'receivedDocument', label: '받은 문서·연락 종류', group: '접수 정보' },
  { key: 'agency', label: '연락한 기관', group: '접수 정보' },
  { key: 'receivedAt', label: '받은 날짜', group: '접수 정보' },
  { key: 'appearanceDate', label: '출석·답변 일정', group: '접수 정보' },
  { key: 'allegation', label: '표시된 혐의', group: '접수 정보' },
  { key: 'claims', label: '상대방의 주장', group: '주장 검토', multiline: true },
  { key: 'confirmedFacts', label: '확인된 사실', group: '주장 검토', multiline: true },
  { key: 'disputedPoints', label: '다른 설명·확인할 불일치', group: '주장 검토', multiline: true },
  { key: 'evidenceToPreserve', label: '보존할 자료', group: '준비 사항', multiline: true },
  { key: 'questionsToConfirm', label: '확인할 질문', group: '준비 사항', multiline: true },
  { key: 'nextSteps', label: '다음에 할 일', group: '준비 사항', multiline: true },
]

export default function ResponsePanel({ draft, open, onOpen, onClose, onChange }: {
  draft: ResponseDraft
  open: boolean
  onOpen: () => void
  onClose: () => void
  onChange: (patch: Partial<ResponseDraft>) => void
}) {
  const [tab, setTab] = useState('preview')
  const startX = useRef<number | null>(null)
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])
  return <>
    {!open && <button className="edge-handle" aria-label="대응 메모 열기" title="대응 메모" onClick={onOpen}
      onPointerDown={(event) => { startX.current = event.clientX }}
      onPointerUp={(event) => { if (startX.current !== null && startX.current - event.clientX > 28) onOpen(); startX.current = null }}>
      <ChevronLeft size={15} strokeWidth={2.5} /><FileText size={18} /><span>대응 메모</span>
    </button>}
    <AnimatePresence initial={false}>
      {open && <motion.button key="response-scrim" className="panel-scrim" aria-label="대응 메모 닫기" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />}
      {open && <motion.aside key="response-panel" className="preview-panel" aria-label="대응 메모 패널" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: .24 }}>
        <div className="panel-header"><div className="panel-header-copy"><strong>고소장 수령 대응 메모</strong><span>대화에서 확인된 내용을 직접 수정할 수 있습니다</span></div><button className="icon-button" aria-label="패널 닫기" onClick={onClose}><X size={20} /></button></div>
        <Tabs.Root value={tab} onValueChange={setTab} className="panel-tabs-root">
          <Tabs.List className="panel-tabs" aria-label="대응 메모 보기 선택"><Tabs.Trigger value="preview"><FileText size={16} /> 미리보기</Tabs.Trigger><Tabs.Trigger value="edit"><Pencil size={16} /> 내용 수정</Tabs.Trigger></Tabs.List>
          <Tabs.Content value="preview" className="panel-content panel-preview-scroll"><div className="preview-notice"><span className="preview-notice-dot" /> 상담·조사 준비용 메모 · 공식 제출 서식 아님</div>
            <div className="document-print-root"><article className="paper response-paper"><div className="paper-head"><h1>고소장 수령 대응 메모</h1><p className="paper-subtitle">확인한 사실과 검토할 사항</p></div>
              {['접수 정보', '주장 검토', '준비 사항'].map((group) => <section className="response-section" key={group}><h2>{group}</h2>{fields.filter((field) => field.group === group).map((field) => <div className="response-row" key={field.key}><strong>{field.label}</strong><span className={draft[field.key] ? '' : 'response-empty'}>{draft[field.key] || '미확인'}</span></div>)}</section>)}
              <p className="response-caveat">이 문서는 대화 내용을 정리한 메모입니다. 사실·일정·기관 연락처를 원문과 확인하고, 제출이나 조사 대응 전 필요한 경우 변호사에게 검토받으세요.</p>
            </article></div>
          </Tabs.Content>
          <Tabs.Content value="edit" className="panel-content panel-edit-scroll"><div className="form-intro"><strong>대응 메모 수정</strong><p>확인한 내용만 입력하세요. 수정 내용은 미리보기에 바로 반영됩니다.</p></div>{['접수 정보', '주장 검토', '준비 사항'].map((group) => <div className="form-group" key={group}><h3>{group}</h3>{fields.filter((field) => field.group === group).map((field) => <label className="form-field" key={field.key}><span>{field.label}</span>{field.multiline ? <textarea rows={4} value={draft[field.key]} onChange={(event) => onChange({ [field.key]: event.target.value })} /> : <input value={draft[field.key]} onChange={(event) => onChange({ [field.key]: event.target.value })} />}</label>)}</div>)}</Tabs.Content>
        </Tabs.Root>
        <div className="panel-footer"><button className="footer-secondary" onClick={() => { setTab('preview'); window.setTimeout(() => window.print(), 80) }}><Printer size={17} /> 인쇄 / PDF 저장</button><button className="footer-primary" onClick={onClose}>대화 계속하기 <ChevronLeft size={17} className="rotate-180" /></button></div>
      </motion.aside>}
    </AnimatePresence>
  </>
}
