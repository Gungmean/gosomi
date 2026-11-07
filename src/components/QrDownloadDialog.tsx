import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Download, QrCode, ShieldCheck, X } from 'lucide-react'
import QRCode from 'qrcode'
import type { ComplaintDraft } from '../types'
import { createShareUrl } from '../shareCodec'
import { downloadComplaintPdf } from '../sharePdf'
import ComplaintDocument from './ComplaintDocument'

export default function QrDownloadDialog({ open, draft, onClose }: { open: boolean; draft: ComplaintDraft; onClose: () => void }) {
  const [qrImage, setQrImage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setQrImage('')
    setShareUrl('')
    setError('')
    createShareUrl(draft)
      .then(async (url) => {
        const image = await QRCode.toDataURL(url, {
          errorCorrectionLevel: 'L',
          margin: 2,
          width: 280,
          color: { dark: '#123c1d', light: '#ffffff' },
        })
        if (!cancelled) {
          setShareUrl(url)
          setQrImage(image)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          const message = cause instanceof Error ? cause.message : ''
          setError(/too big|too large|overflow|code length/i.test(message)
            ? '초안이 커서 QR 하나에 담기 어렵습니다. 사건 경위와 별지 내용을 줄인 뒤 다시 만들어 주세요.'
            : message || 'QR 코드를 만들지 못했습니다.')
        }
      })
    return () => { cancelled = true }
  }, [open, draft])

  async function downloadHere() {
    const document = documentRef()
    if (!document) return
    setBusy(true)
    setError('')
    try {
      await downloadComplaintPdf(draft, document)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'PDF를 만들지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  function documentRef() {
    return window.document.querySelector<HTMLElement>('.qr-dialog-document .document-print-root')
  }

  return <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}>
    <Dialog.Portal>
      <Dialog.Overlay className="qr-dialog-overlay" />
      <Dialog.Content className="qr-dialog" aria-describedby="qr-dialog-description">
        <div className="qr-dialog-head">
          <span className="qr-dialog-icon"><QrCode size={22} /></span>
          <Dialog.Close className="qr-dialog-close" aria-label="닫기"><X size={20} /></Dialog.Close>
          <Dialog.Title>휴대폰으로 고소장 받기</Dialog.Title>
          <Dialog.Description id="qr-dialog-description">QR을 스캔하면 이 초안의 PDF를 내려받을 수 있습니다.</Dialog.Description>
        </div>
        <div className="qr-dialog-body">
          <div className="qr-image-frame">
            {qrImage ? <img src={qrImage} alt="휴대폰에서 고소장 PDF를 여는 QR 코드" /> : <div className="qr-image-loading">{error || 'QR 코드를 준비하고 있어요'}</div>}
          </div>
          <div className="qr-dialog-copy">
            <strong>휴대폰 카메라로 스캔하세요</strong>
            <span>스캔 후 열린 페이지에서 PDF가 준비됩니다. 자동 저장이 막히면 내려받기 버튼을 누르세요.</span>
          </div>
          <div className="qr-privacy-note"><ShieldCheck size={17} /><span>문서 내용은 QR에 포함되어 스캔한 기기에서 처리됩니다. 서버로 전송되지 않지만, QR을 볼 수 있는 사람은 내용을 열 수 있으니 본인에게만 보여주세요.</span></div>
          {error && <p className="qr-dialog-error" role="alert">{error}</p>}
          <button className="qr-download-here" type="button" onClick={downloadHere} disabled={busy || !qrImage}>
            <Download size={17} /> {busy ? 'PDF 만드는 중…' : '이 기기에서 PDF 저장'}
          </button>
          {shareUrl && <span className="qr-dialog-expiry">QR은 현재 초안으로 생성됐습니다. 내용을 수정한 뒤에는 새 QR을 띄우세요.</span>}
        </div>
        <div className="qr-dialog-document" aria-hidden="true"><ComplaintDocument draft={draft} onFieldClick={() => {}} /></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
