import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Download, FileText, ShieldCheck } from 'lucide-react'
import type { ComplaintDraft } from '../types'
import { templateLabels } from '../types'
import { decodeShareDraft } from '../shareCodec'
import { downloadComplaintPdf } from '../sharePdf'
import ComplaintDocument from './ComplaintDocument'

export default function ShareDownload({ payload }: { payload: string }) {
  const [draft, setDraft] = useState<ComplaintDraft | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const documentRoot = useRef<HTMLDivElement>(null)
  const autoAttempted = useRef(false)

  useEffect(() => {
    let cancelled = false
    decodeShareDraft(payload)
      .then((decoded) => { if (!cancelled) setDraft(decoded) })
      .catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'QR 문서를 열지 못했습니다.') })
    document.title = '고소장 PDF 받기 — 고소미'
    return () => { cancelled = true }
  }, [payload])

  async function download() {
    const element = documentRoot.current?.querySelector<HTMLElement>('.document-print-root')
    if (!draft || !element || busy) return
    setBusy(true)
    setError('')
    try {
      await document.fonts.ready
      await Promise.all(Array.from(element.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)))
      await downloadComplaintPdf(draft, element)
      setDownloaded(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'PDF를 내려받지 못했습니다. 아래 버튼을 다시 눌러주세요.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!draft || autoAttempted.current) return
    autoAttempted.current = true
    const timer = window.setTimeout(() => { void download() }, 650)
    return () => window.clearTimeout(timer)
  }, [draft])

  return <main className="share-download-page">
    <section className="share-download-card" aria-labelledby="share-download-title">
      <span className="share-download-mark"><FileText size={22} /></span>
      <p className="share-download-kicker">고소미 · 고소장 초안</p>
      <h1 id="share-download-title">{error ? '문서를 열 수 없어요' : '고소장 PDF를 준비했어요'}</h1>
      {draft ? <>
        <p className="share-download-summary">{draft.complainantName || '고소인'}님의 {templateLabels[draft.type]} 고소장</p>
        <button className="share-download-button" type="button" onClick={() => void download()} disabled={busy}>
          <Download size={19} />{busy ? 'PDF 만드는 중…' : downloaded ? 'PDF 다시 받기' : '고소장 PDF 내려받기'}
        </button>
        <p className="share-download-status" aria-live="polite">{busy ? '이 기기에서 문서를 만들고 있어요.' : downloaded ? '다운로드가 시작됐습니다. 파일 앱의 다운로드 폴더를 확인하세요.' : '다운로드가 자동으로 시작되지 않으면 위 버튼을 누르세요.'}</p>
        <div className="share-download-privacy"><ShieldCheck size={17} /><span>문서 정보는 QR에서 이 기기로 전달되며 서버에 저장되지 않습니다. 받은 뒤에는 이 페이지를 닫아주세요.</span></div>
      </> : error ? <>
        <p className="share-download-error"><AlertCircle size={16} />{error}</p>
        <p className="share-download-status">QR이 잘렸거나 오래된 형식일 수 있습니다. 고소미에서 새 QR을 띄워 다시 스캔해 주세요.</p>
      </> : <p className="share-download-status">QR 정보를 확인하고 있습니다…</p>}
    </section>
    {draft && <section className="share-document-section" aria-label="고소장 미리보기">
      <div className="share-document-heading"><strong>미리보기</strong><span>다운로드 전에 내용을 확인하세요</span></div>
      <div className="share-document-stage" ref={documentRoot}><ComplaintDocument draft={draft} onFieldClick={() => {}} /></div>
    </section>}
    <a className="share-download-home" href={`${window.location.pathname}${window.location.search}`}>고소미로 돌아가기</a>
  </main>
}
