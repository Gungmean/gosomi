import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useRef, useState } from 'react'
import { FileImage, FileText, LoaderCircle, Paperclip, Trash2, X } from 'lucide-react'
import { loadDocumentFile, MAX_DOCUMENT_PAGES } from '../documentStore'
import type { ReceivedDocument } from '../types'

export default function ReceivedDocuments({ documents, busy, uploading, onAdd, onRemove, onAnalyze, compact = false }: {
  documents: ReceivedDocument[]
  busy: boolean
  uploading: boolean
  onAdd: (files: File[]) => void
  onRemove: (document: ReceivedDocument) => void
  onAnalyze: () => void
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<ReceivedDocument | null>(null)
  const [compactOpen, setCompactOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewError, setPreviewError] = useState('')
  const pending = documents.filter((item) => !item.analyzed)

  useEffect(() => {
    if (!selected) return
    let url = ''
    let cancelled = false
    loadDocumentFile(selected.id).then((blob) => {
      if (cancelled) return
      if (!blob) { setPreviewError('저장된 원본을 찾지 못했습니다.'); return }
      url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    }).catch(() => setPreviewError('문서를 열지 못했습니다.'))
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); setPreviewUrl(''); setPreviewError('') }
  }, [selected])

  const fileInput = <input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" multiple onChange={(event) => { onAdd(Array.from(event.target.files || [])); event.target.value = '' }} />
  const documentItems = documents.map((item) => <div className="received-document-item" key={item.id}>
    <button type="button" className="received-document-open" onClick={() => setSelected(item)} aria-label={`${item.name} 미리보기`}>{item.mimeType === 'application/pdf' ? <FileText size={18} /> : <FileImage size={18} />}<span><strong>{item.name}</strong><small>{item.pageCount}쪽 · {item.analyzed ? 'AI 분석 완료' : '분석 대기'}</small></span></button>
    <button type="button" className="received-document-remove" aria-label={`${item.name} 삭제`} title="파일 삭제" disabled={busy || uploading} onClick={() => onRemove(item)}><Trash2 size={16} /></button>
  </div>)
  const previewDialog = <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content document-preview-dialog"><div className="document-preview-head"><Dialog.Title>{selected?.name || '첨부 문서'}</Dialog.Title><Dialog.Close className="icon-button" aria-label="닫기"><X size={20} /></Dialog.Close></div><Dialog.Description className="document-preview-description">받은 문서의 원본을 확인합니다.</Dialog.Description>{previewError ? <div className="inline-error">{previewError}</div> : previewUrl ? selected?.mimeType === 'application/pdf' ? <iframe title={selected.name} src={previewUrl} /> : <img src={previewUrl} alt={selected?.name} /> : <div className="document-preview-loading">문서를 여는 중…</div>}</Dialog.Content></Dialog.Portal></Dialog.Root>

  if (compact) return <div className="document-compact-wrap">
    {fileInput}
    <button className="document-compact-trigger" type="button" disabled={uploading || busy} title={documents.length ? `첨부 문서 ${documents.length}개 관리` : '고소장 파일 첨부'} aria-label={documents.length ? `고소장 파일 첨부 및 관리, ${documents.length}개 첨부됨` : '고소장 파일 첨부'} aria-expanded={compactOpen} onClick={() => documents.length ? setCompactOpen((open) => !open) : inputRef.current?.click()}>
      {uploading ? <LoaderCircle size={18} className="spin" /> : <Paperclip size={18} />}
      {documents.length > 0 && <span className="document-compact-count">{documents.length}</span>}
    </button>
    {compactOpen && <div className="document-compact-menu" role="dialog" aria-label="첨부 문서 관리">
      <div className="document-compact-menu-heading"><strong>받은 고소장</strong><span>{documents.length}개</span></div>
      <div className="received-document-list">{documentItems}</div>
      {pending.length > 0 && <button className="document-analyze-button" type="button" disabled={busy || uploading} onClick={onAnalyze}>첨부 문서 {pending.reduce((sum, item) => sum + item.pageCount, 0)}쪽 분석하기</button>}
      <button className="document-add-button" type="button" disabled={uploading || busy} onClick={() => inputRef.current?.click()}>{uploading ? <LoaderCircle size={17} className="spin" /> : <Paperclip size={17} />} 파일 추가</button>
    </div>}
    {previewDialog}
  </div>

  return <section className="received-documents" aria-label="받은 고소장 파일">
    <div className="received-documents-heading"><strong>받은 고소장 첨부</strong><span>PDF·JPG·PNG·WebP · 최대 {MAX_DOCUMENT_PAGES}쪽</span></div>
    {fileInput}
    <button className="document-add-button" type="button" disabled={uploading || busy} onClick={() => inputRef.current?.click()}>{uploading ? <LoaderCircle size={17} className="spin" /> : <Paperclip size={17} />} {uploading ? '파일 확인 중…' : '파일 여러 장 선택하기'}</button>
    {documents.length > 0 && <div className="received-document-list">{documentItems}</div>}
    {pending.length > 0 && <button className="document-analyze-button" type="button" disabled={busy || uploading} onClick={onAnalyze}>첨부 문서 {pending.reduce((sum, item) => sum + item.pageCount, 0)}쪽 분석하기</button>}
    <p className="document-upload-note">파일은 이 브라우저에 보관됩니다. 분석할 때만 선택한 AI 제공자에게 전송되며, 이름·주소 등은 가능하면 가린 뒤 첨부하세요.</p>
    {previewDialog}
  </section>
}
